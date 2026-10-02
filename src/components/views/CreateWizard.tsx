"use client";

/**
 * Create Room wizard (spec §11–13):
 *   1. Question        — "What do you want people to predict?"
 *   2. AI structuring  — NL → structured proposal (never predicts; flags ambiguity)
 *   3. Review          — user reviews/edits the proposed market details
 *   4. Market creation — Panta fee quote → build tx → wallet signs → broadcast → register
 *   5. Room            — redirect to the fresh Room
 *
 * DEMO MODE: creates a demo room clearly labeled DEMO DATA.
 */

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { ApiError, friendlyMessage, pantaProxy, registerRoom, structureQuestion } from "@/lib/api-client";
import { broadcast, deserializeVersionedTx, walletErrorCode } from "@/lib/solana-client";
import { useTestingCenter } from "@/components/wallet/center-context";
import { isDemoTxId, runDemoTransaction, type DemoScenario } from "@/lib/tx-provider";
import { requiredUsdcForCreate } from "@/lib/preflight";
import { useMainnetPreflight } from "@/components/trade/use-preflight";
import { PreflightCard } from "@/components/trade/preflight-card";
import { DemoScenarioPicker } from "@/components/trade/demo-scenario";
import { useAppStore } from "@/store/app-store";
import { CREATE_FEE_USDC } from "@/lib/environment";
import { categoryTabs, normalizeCategory } from "@/lib/panta-categories";
import { FundsHint } from "@/components/wallet/funding-center";
import type { AIProposal, CreateStepState } from "@/lib/types";
import type { CreateQuoteResponse, CreateBuildResponse, CreateRegisterResponse } from "@/server/panta/types";
import { NoticeBanner, Spinner } from "@/components/shared/ui-bits";

/**
 * Local category covers — used ONLY for demo rooms (stored/displayed by us,
 * no external dependency). NEVER send these to Panta: its quote endpoint
 * soft-fetches imageUrl and rejects localhost / private-network / preview
 * hosts (SSRF guard) and non-raster files, so local .svg URLs always fail.
 */
const LOCAL_COVER = (category: string): string => {
  const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "";
  return `${origin}/covers/${category}.svg`;
};

/**
 * Public, Panta-safe cover images for the LIVE creation path.
 * Verified 2026-09-22: each returns 200 image/jpeg (1024×1024) and passes
 * Panta's quote soft-check (a live quote succeeded with the crypto URL).
 */
const CATEGORY_COVER: Record<string, string> = {
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1024&h=1024&fit=crop&q=80",
  crypto: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1024&h=1024&fit=crop&q=80",
  politics: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1024&h=1024&fit=crop&q=80",
  // Panta's real catalog slugs (verified 2026-10-02).
  stocks: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1024&h=1024&fit=crop&q=80",
  commodities: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1024&h=1024&fit=crop&q=80",
  macroeconomics: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1024&h=1024&fit=crop&q=80",
  "pop-culture": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1024&h=1024&fit=crop&q=80",
  "space-universe": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1024&h=1024&fit=crop&q=80",
  world: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1024&h=1024&fit=crop&q=80",
  // Legacy slugs kept for old demo rooms created before the catalog fix.
  entertainment: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1024&h=1024&fit=crop&q=80",
  finance: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1024&h=1024&fit=crop&q=80",
  science: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1024&h=1024&fit=crop&q=80",
  other: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1024&h=1024&fit=crop&q=80",
};

function coverUrl(category: string): string {
  return CATEGORY_COVER[category] ?? CATEGORY_COVER.other;
}

/**
 * Creation-specific insufficient-funds guidance (spec §19 — friendly errors).
 * The generic wallet/server line can't know what THIS flow costs, so state it
 * plainly: the verified 50 USDC creation fee, the small SOL gas, and the
 * honest zero-cost alternatives (Sandbox fixtures / Demo data).
 */
const FUNDS_MSG = `Creating a market costs ${CREATE_FEE_USDC} USDC (10 of it stays in your market as liquidity) plus a little SOL for network fees — your wallet doesn't have enough for that right now. Fund your wallet via Testing & Funding, or switch to Sandbox or Demo mode to test the full create flow for free.`;

type Step = 1 | 2 | 3 | 4;

export function CreateWizard() {
  const navigate = useAppStore((s) => s.navigate);
  const setLastTx = useAppStore((s) => s.setLastTx);
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [step, setStep] = useState<Step>(1);
  const [question, setQuestion] = useState("");
  const [aiState, setAiState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AIProposal | null>(null);
  const [useDemo, setUseDemo] = useState<boolean | null>(null); // null = auto (mode-dependent)
  const [create, setCreate] = useState<CreateStepState>({ phase: "idle" });
  const [showRawFee, setShowRawFee] = useState(false);
  /** true when the failure was specifically an insufficient-funds error —
   *  shows the one-click "Open Testing & Funding" help button. */
  const [fundsHint, setFundsHint] = useState(false);
  const { setVisible: setCenterVisible } = useTestingCenter();
  /** demo-only outcome simulation (spec §2/§9) — never used in mainnet mode */
  const [demoScenario, setDemoScenario] = useState<DemoScenario>("success");

  const status = useAppStore((s) => s.status);
  // Only Live uses real funds — Sandbox and Demo create clearly-labeled demo rooms.
  // (status undefined while the config loads: keep the previous live assumption.)
  const demoMode = useDemo ?? (status ? status.mode !== "live" : false);
  // Mainnet preflight (spec §4/§5) — wallet + SOL + USDC gates before quoting.
  const preflight = useMainnetPreflight(requiredUsdcForCreate(), !demoMode && connected);

  const canReview = useMemo(() => {
    if (!proposal) return false;
    return proposal.question.trim().length > 8 && proposal.resolutionRule.trim().length > 8 && proposal.sourcesOfTruth.length > 0;
  }, [proposal]);

  // ---- Step 1 → 2: AI structuring ----
  const runAI = async () => {
    const q = question.trim();
    if (q.length < 8) return;
    setAiState("working");
    setAiError(null);
    try {
      const { result } = await structureQuestion(q);
      setProposal(result);
      setAiState("done");
      setStep(2);
    } catch (e) {
      setAiState("error");
      setAiError(e instanceof ApiError ? e.friendly : "AI structuring failed. You can continue manually below.");
      // Manual fallback proposal so the user is never blocked
      setProposal({
        measurable: false,
        question: q,
        title: q.slice(0, 80),
        description: "",
        category: "other",
        resolutionRule: "",
        sourcesOfTruth: [],
        suggestedDays: 14,
        ambiguityNote: null,
        clarifiedQuestion: null,
        reasoning: "AI was unavailable — fill the details manually.",
      });
      setStep(2);
    }
  };

  // ---- Step 3 → 4: Panta market creation ----
  const times = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const start = now + 7200; // ≥ minimumStartDelay (3600s) with margin
    const end = start + (proposal?.suggestedDays ?? 14) * 86400;
    return { start, end, resolution: end + 3600 };
  }, [proposal?.suggestedDays]);

  const runCreation = async () => {
    if (!proposal) return;
    setFundsHint(false);

    // ---- DEMO path — SIMULATED transaction provider (spec §8 separation).
    // Walks the real flow's phase shape with zero network/blockchain contact.
    if (demoMode) {
      setCreate({ phase: "quoting" });
      await new Promise((r) => setTimeout(r, 700));
      const res = await runDemoTransaction({
        scenario: demoScenario,
        onPhase: (phase) => setCreate({ phase: phase === "confirming" ? "registering" : phase }),
      });
      if (res.outcome !== "success") {
        setFundsHint(res.outcome === "insufficient");
        setCreate({ phase: "error", error: res.errorMessage ?? "The simulated transaction did not complete." });
        return;
      }
      const slug = proposal.question.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48) || "demo";
      const marketId = `demo-${slug}-${Math.floor(Date.now() / 1000) % 100000}`;
      try {
        await registerRoom({
          marketId,
          title: proposal.title || proposal.question,
          description: proposal.description,
          category: normalizeCategory(proposal.category),
          imageUrl: LOCAL_COVER(proposal.category),
          creatorName: "Demo creator",
          creatorWallet: publicKey?.toBase58() ?? null,
          demo: true,
        });
        setCreate({ phase: "done", marketId, demoTxId: res.demoTxId });
        setTimeout(() => navigate(`/room/${encodeURIComponent(marketId)}`), 700);
      } catch {
        setCreate({ phase: "error", error: "Could not save the demo room." });
      }
      return;
    }

    // ---- LIVE path: Panta quote → build → sign → broadcast → register ----
    if (!connected || !publicKey || !signTransaction) {
      setCreate({ phase: "error", error: "Connect a Solana wallet first — the creation transaction must be signed by you." });
      return;
    }

    try {
      setCreate({ phase: "quoting" });
      const quoteBody = {
        wallet: publicKey.toBase58(),
        question: proposal.question,
        resolutionRule: proposal.resolutionRule,
        sourcesOfTruth: proposal.sourcesOfTruth,
        category: normalizeCategory(proposal.category),
        startTime: times.start,
        endTime: times.end,
        resolutionTime: times.resolution,
        marketType: "standard",
        title: proposal.title,
        description: proposal.description || proposal.question,
        imageUrl: coverUrl(proposal.category),
        region: "Global",
      };
      const fetchQuote = async (): Promise<CreateQuoteResponse> => {
        try {
          return await pantaProxy<CreateQuoteResponse>("markets/create/quote/", quoteBody);
        } catch (e) {
          // Panta's quote endpoint intermittently rejects VALID drafts with the
          // generic "unexpected create quote failure" (third-party audit
          // 2026-09-27 measured 19 of 20 identical quotes failing, with the
          // identical payload succeeding on some attempts). Retry up to twice
          // with growing backoff before giving up.
          if (e instanceof ApiError && e.transient) {
            for (const delay of [1200, 2500]) {
              await new Promise((r) => setTimeout(r, delay));
              try {
                return await pantaProxy<CreateQuoteResponse>("markets/create/quote/", quoteBody);
              } catch (e2) {
                if (!(e2 instanceof ApiError && e2.transient)) throw e2;
              }
            }
          }
          throw e;
        }
      };
      const quote = await fetchQuote();
      setCreate({
        phase: "quoted",
        createId: quote.createId,
        expectedEventPda: quote.expectedEventPda,
        feeUsdc: Number(quote.paymentUsdc) / 1e6,
      });

      setCreate((s) => ({ ...s, phase: "building" }));
      const build = await pantaProxy<CreateBuildResponse>("markets/create/build/", {
        createId: quote.createId,
        wallet: publicKey.toBase58(),
      });
      setCreate((s) => ({ ...s, createId: quote.createId }));

      setCreate((s) => ({ ...s, phase: "signing" }));
      const tx = deserializeVersionedTx(build.transaction);
      let signed;
      try {
        signed = await signTransaction(tx);
      } catch (e) {
        const { code, message } = walletErrorCode(e);
        const funds = code === "INSUFFICIENT_FUNDS";
        setFundsHint(funds);
        setCreate({ phase: "error", error: funds ? FUNDS_MSG : message, createId: quote.createId });
        return;
      }

      setCreate((s) => ({ ...s, phase: "broadcasting" }));
      let signature: string;
      try {
        signature = await broadcast(connection, signed);
      } catch (e) {
        const { code, message } = walletErrorCode(e);
        const funds = code === "INSUFFICIENT_FUNDS";
        setFundsHint(funds);
        setCreate({ phase: "error", error: funds ? FUNDS_MSG : message });
        return;
      }
      setCreate((s) => ({ ...s, signature }));
      // Real broadcast — remember it for Developer Details (demo path never sets this).
      setLastTx({ signature, kind: "create", at: Date.now() });

      setCreate((s) => ({ ...s, phase: "registering" }));
      const reg = await pantaProxy<CreateRegisterResponse>("markets/register/", {
        createId: quote.createId,
        signature,
      });

      // Register the Room
      await registerRoom({
        marketId: reg.marketId,
        title: reg.title || proposal.title || proposal.question,
        description: proposal.description,
        category: normalizeCategory(reg.category || proposal.category),
        imageUrl: reg.images?.[0] ?? coverUrl(proposal.category),
        creatorName: "You",
        creatorWallet: publicKey.toBase58(),
        demo: false,
      });

      setCreate({ phase: "done", marketId: reg.marketId, signature });
      setTimeout(() => navigate(`/room/${encodeURIComponent(reg.marketId)}`), 800);
    } catch (e) {
      if (e instanceof ApiError) {
        const funds = e.code === "INSUFFICIENT_FUNDS";
        setFundsHint(funds);
        setCreate({ phase: "error", error: funds ? FUNDS_MSG : e.friendly });
      } else {
        setCreate({ phase: "error", error: friendlyMessage("NETWORK_ERROR") });
      }
    }
  };

  const busyPhases = ["quoting", "building", "signing", "broadcasting", "registering"];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10 sm:px-6">
      {/* header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">Create a Room</h1>
        <p className="mt-2 text-[14px] text-zinc-400">
          Turn a question into a prediction market, then let your community discuss and trade it.
        </p>
      </div>

      {/* progress */}
      <div className="mb-8 flex items-center gap-2" aria-hidden>
        {(["Question", "Structure", "Review", "Create"] as const).map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done ? "bg-emerald-400/20 text-emerald-300" : active ? "bg-white text-zinc-950" : "bg-white/[0.06] text-zinc-500"
                }`}
              >
                {done ? "✓" : n}
              </div>
              <span className={`hidden text-[12.5px] sm:block ${active ? "text-zinc-200" : "text-zinc-500"}`}>{label}</span>
              {i < 3 && <div className="h-px flex-1 bg-white/[0.08]" />}
            </div>
          );
        })}
      </div>

      {/* STEP 1 — question */}
      {step === 1 && (
        <div className="pr-card pr-fade-up p-6 sm:p-8">
          <label htmlFor="q" className="text-[15px] font-semibold text-zinc-100">
            What do you want people to predict?
          </label>
          <textarea
            id="q"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="Will Arsenal win their next Premier League match?"
            className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-[15px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none"
          />
          <div className="mt-1.5 flex justify-between text-[11.5px] text-zinc-500">
            <span>One clear question. The AI will help structure it.</span>
            <span>{question.length}/300</span>
          </div>
          <button
            onClick={runAI}
            disabled={question.trim().length < 8 || aiState === "working"}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[15px] font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40"
          >
            {aiState === "working" ? <Spinner /> : <Wand2 className="size-4.5" />}
            {aiState === "working" ? "Structuring with AI…" : "Structure with AI"}
          </button>
          {aiError && (
            <div className="mt-4">
              <NoticeBanner text={aiError} tone="error" />
            </div>
          )}
        </div>
      )}

      {/* STEP 2 — AI structuring result */}
      {step === 2 && proposal && (
        <div className="pr-card pr-fade-up p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[13px] text-zinc-400">
            <Sparkles className="size-4 text-zinc-500" />
            Proposed market
          </div>

          {proposal.ambiguityNote && !proposal.measurable && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-[13px] leading-relaxed text-amber-200/90">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <div>
                <p className="font-semibold text-amber-200">This question is subjective or unmeasurable.</p>
                <p className="mt-0.5 text-amber-200/80">{proposal.ambiguityNote}</p>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {proposal.clarifiedQuestion && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Suggested clearer version</p>
                <p className="mt-1.5 text-[14px] text-zinc-200">{proposal.clarifiedQuestion}</p>
                <button
                  onClick={() => setProposal({ ...proposal, question: proposal.clarifiedQuestion!, title: proposal.clarifiedQuestion!.slice(0, 80), measurable: true })}
                  className="mt-2.5 rounded-lg border border-white/12 px-3 py-1 text-[12.5px] text-zinc-300 hover:bg-white/[0.06]"
                >
                  Use this version
                </button>
              </div>
            )}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Question</p>
              <p className="mt-1.5 text-[14.5px] font-medium leading-snug text-zinc-100">{proposal.question}</p>
              {proposal.reasoning && <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">{proposal.reasoning}</p>}
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Outcomes</p>
              <p className="mt-1.5 text-[14px] text-zinc-200">YES / NO — binary market</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2.5">
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 px-4 py-2.5 text-[13.5px] text-zinc-300 hover:bg-white/[0.06]">
              <ArrowLeft className="size-4" /> Edit question
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200"
            >
              Review details <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — review */}
      {step === 3 && proposal && (
        <div className="pr-card pr-fade-up p-6 sm:p-8">
          <p className="text-[15px] font-semibold text-zinc-100">Proposed Market</p>
          <p className="mt-1 text-[12.5px] text-zinc-500">Review and adjust — you approve the final version.</p>

          <div className="mt-5 space-y-4">
            <Field label="Question" value={proposal.question} onChange={(v) => setProposal({ ...proposal, question: v })} multiline maxLength={512} />
            <Field label="Short title" value={proposal.title} onChange={(v) => setProposal({ ...proposal, title: v })} maxLength={80} />
            <Field label="Description (optional)" value={proposal.description} onChange={(v) => setProposal({ ...proposal, description: v })} multiline maxLength={500} />
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Category</label>
              <select
                value={proposal.category}
                onChange={(e) => setProposal({ ...proposal, category: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-[14px] text-zinc-200 focus:border-white/25 focus:outline-none"
              >
                {categoryTabs().map((c) => (
                  <option key={c.slug} value={c.slug} className="bg-zinc-900">{c.label}</option>
                ))}
              </select>
            </div>
            <Field
              label="Resolution rule"
              hint="Exactly what makes it YES vs NO, from which source, by when (UTC)."
              value={proposal.resolutionRule}
              onChange={(v) => setProposal({ ...proposal, resolutionRule: v })}
              multiline
              maxLength={2048}
            />
            <Field
              label="Resolution source(s)"
              hint="Comma-separated public URLs or source names."
              value={proposal.sourcesOfTruth.join(", ")}
              onChange={(v) => setProposal({ ...proposal, sourcesOfTruth: v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3) })}
            />
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Trading window</label>
              <p className="mt-1.5 text-[13px] text-zinc-300">
                Opens ~2h from now (Panta requires a 1h minimum start delay) · runs for{" "}
                <input
                  type="number"
                  min={2}
                  max={120}
                  value={proposal.suggestedDays}
                  onChange={(e) => setProposal({ ...proposal, suggestedDays: Math.min(Math.max(Number(e.target.value) || 14, 2), 120) })}
                  className="mx-1 w-16 rounded-md border border-white/10 bg-black/25 px-2 py-0.5 text-center text-[13px] text-zinc-100 focus:outline-none"
                />
                days, then resolves.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2.5">
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 px-4 py-2.5 text-[13.5px] text-zinc-300 hover:bg-white/[0.06]">
              <ArrowLeft className="size-4" /> Back
            </button>
            <button
              onClick={() => {
                if (!canReview) return;
                setCreate({ phase: "idle" });
                setStep(4);
              }}
              disabled={!canReview}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-40"
            >
              Continue to creation <ArrowRight className="size-4" />
            </button>
          </div>
          {!canReview && (
            <p className="mt-3 text-[12px] text-amber-200/80">
              A measurable question, a resolution rule, and at least one source are required.
            </p>
          )}
        </div>
      )}

      {/* STEP 4 — create via Panta */}
      {step === 4 && proposal && (
        <div className="pr-card pr-fade-up p-6 sm:p-8">
          <p className="text-[15px] font-semibold text-zinc-100">Market Creation</p>
          <p className="mt-1 text-[12.5px] text-zinc-500">
            {demoMode
              ? "DEMO MODE — the market and Room will be simulated sample data, clearly labeled."
              : "Panta quotes the creation fee, builds the transaction, and your wallet signs and broadcasts it."}
          </p>

          {/* Fee + status */}
          {create.phase === "idle" && (
            <div className="mt-5">
              {!demoMode && !connected && (
                <div className="mb-4">
                  <NoticeBanner text="Connect a Solana wallet to create a real market. You can also switch to DEMO MODE below." />
                </div>
              )}
              {!demoMode && connected && (
                <div className="mb-4 space-y-2.5">
                  <FundsHint note={`Live mode — Panta will quote the real creation fee (${CREATE_FEE_USDC} USDC at current on-chain config).`} />
                  <PreflightCard p={preflight} />
                </div>
              )}
              {demoMode && <DemoScenarioPicker value={demoScenario} onChange={setDemoScenario} />}
              <button
                onClick={runCreation}
                disabled={(!demoMode && (!connected || !publicKey || !preflight.ok))}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[15px] font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40"
              >
                Create Market
              </button>
              {!demoMode && (
                <button
                  onClick={() => setUseDemo(true)}
                  className="mt-3 w-full rounded-xl border border-white/12 py-2.5 text-[13.5px] text-zinc-300 transition hover:bg-white/[0.06]"
                >
                  Create a demo room instead (no wallet needed)
                </button>
              )}
            </div>
          )}

          {busyPhases.includes(create.phase) && (
            <div className="mt-6 space-y-2.5">
              {[
                { k: "quoting", l: demoMode ? "Preparing demo market…" : "Quoting creation fee from Panta…" },
                { k: "building", l: demoMode ? "Simulating transaction build…" : "Building unsigned transaction…" },
                { k: "signing", l: demoMode ? "Simulating wallet signature…" : "Waiting for your wallet signature…" },
                { k: "broadcasting", l: demoMode ? "Simulating broadcast (demo — nothing is sent)…" : "Broadcasting to Solana…" },
                { k: "registering", l: demoMode ? "Recording the demo Room…" : "Registering the market with Panta…" },
              ].filter((s) => busyPhases.indexOf(s.k) <= busyPhases.indexOf(create.phase) || s.k === create.phase)
                .map((s) => (
                  <div key={s.k} className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-[13.5px] ${
                    s.k === create.phase ? "border-white/15 bg-white/[0.05] text-zinc-200" : "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-200/90"
                  }`}>
                    {s.k === create.phase ? <Loader2 className="size-4 animate-spin" /> : <span className="text-emerald-400">✓</span>}
                    {s.l}
                  </div>
                ))}
              <p className="pt-1 text-[11.5px] text-zinc-500">
                Your wallet always signs. Panta Rooms never sees or stores keys.
              </p>
            </div>
          )}

          {create.phase === "done" && (
            <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-5">
              <p className="text-[14px] font-semibold text-emerald-200">
                {demoMode ? "Demo room created!" : "Market registered on Panta!"}
              </p>
              <p className="mt-1 text-[13px] text-emerald-200/80">Opening your Room…</p>
              {create.demoTxId && (
                <p className="mt-2 break-all font-mono text-[11px] text-emerald-200/50">
                  Demo transaction ID (simulated — not a blockchain signature): {create.demoTxId}
                </p>
              )}
              {create.signature && !isDemoTxId(create.signature) && (
                <p className="mt-2 break-all font-mono text-[11px] text-emerald-200/50">signature: {create.signature}</p>
              )}
            </div>
          )}

          {create.phase === "error" && (
            <div className="mt-6 rounded-xl border border-red-400/25 bg-red-400/[0.06] p-5">
              <p className="text-[13.5px] font-medium text-red-200">{create.error}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={runCreation} className="rounded-lg border border-red-400/30 px-3.5 py-1.5 text-[13px] text-red-200 hover:bg-red-400/10">
                  Try again
                </button>
                {fundsHint && (
                  <button
                    onClick={() => setCenterVisible(true)}
                    className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-zinc-200 transition hover:bg-white/10"
                  >
                    Open Testing &amp; Funding
                  </button>
                )}
              </div>
            </div>
          )}

          {showRawFee && create.feeUsdc != null && (
            <p className="mt-3 font-mono text-[11px] text-zinc-500">fee: {create.feeUsdc} USDC</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  multiline,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength ?? 2048))}
          rows={3}
          className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-[13.5px] leading-relaxed text-zinc-100 focus:border-white/25 focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength ?? 512))}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-[13.5px] text-zinc-100 focus:border-white/25 focus:outline-none"
        />
      )}
      {hint && <p className="mt-1 text-[11.5px] text-zinc-500">{hint}</p>}
    </div>
  );
}
