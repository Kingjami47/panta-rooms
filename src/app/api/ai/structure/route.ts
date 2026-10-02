import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { PANTA_CATEGORIES, normalizeCategory } from "@/lib/panta-categories";

export const dynamic = "force-dynamic";

/**
 * AI question structuring (spec §12):
 * natural-language question → structured prediction-market proposal.
 * The AI is NOT a prediction engine — it never estimates probabilities,
 * gives betting advice, or recommends trades. It structures + flags ambiguity.
 */

// Panta's real catalog slugs (verified 2026-10-02 — their /categories/
// directory lists phantom slugs that match zero market rows).
const VALID_CATEGORIES: string[] = [...PANTA_CATEGORIES];

interface StructureResult {
  ok: boolean;
  measurable: boolean;
  question: string;
  title: string;
  description: string;
  category: string;
  resolutionRule: string;
  sourcesOfTruth: string[];
  suggestedDays: number;
  ambiguityNote: string | null;
  clarifiedQuestion: string | null;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a prediction-market structuring assistant for Panta Rooms.

Your ONLY job: transform a natural-language question into a well-formed binary (YES/NO) prediction market proposal. You are NOT a prediction engine. You must NEVER estimate probabilities, predict outcomes, give betting advice, or recommend trading.

Rules:
1. The question must be objectively measurable by a defined public source (e.g. "CoinGecko daily BTC close in UTC", "official match result on the league website").
2. If the user's question is subjective, vague, or unmeasurable (e.g. "Will Arsenal have a good season?"), set measurable=false, explain why in ambiguityNote, and propose a clarified measurable alternative in clarifiedQuestion.
3. resolutionRule must state EXACTLY what happens YES vs NO, reference the named source, and include the cutoff time in UTC.
4. category must be one of: ${VALID_CATEGORIES.join(", ")}.
5. sourcesOfTruth: 1-3 public URLs or unambiguous source names (e.g. "https://www.coingecko.com", "BBC Sport results page").
6. suggestedDays: sensible time window until resolution (2-120 days).
7. Keep the user's intent — do not change what is being asked, only make it measurable.
8. description: 1-2 sentences of neutral context. reasoning: 1-2 sentences on what you adjusted and why (for the user's review).

Respond with STRICT JSON only (no markdown fences):
{
  "measurable": boolean,
  "question": string,            // the structured question (or best measurable version)
  "title": string,               // short title, max 80 chars
  "description": string,
  "category": string,
  "resolutionRule": string,
  "sourcesOfTruth": string[],
  "suggestedDays": number,
  "ambiguityNote": string | null,
  "clarifiedQuestion": string | null,
  "reasoning": string
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = String(body.question || "").trim();
    if (!input) {
      return NextResponse.json({ code: "INVALID", message: "Please enter a question first." }, { status: 400 });
    }
    if (input.length > 300) {
      return NextResponse.json({ code: "INVALID", message: "Question is too long (max 300 characters)." }, { status: 400 });
    }

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Structure this prediction question:\n\n"${input}"` },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed: Partial<StructureResult>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { code: "AI_PARSE_FAILED", message: "The AI response could not be parsed. Please try again." },
        { status: 502 }
      );
    }

    const result: StructureResult = {
      ok: true,
      measurable: parsed.measurable !== false,
      question: String(parsed.question || input).slice(0, 512),
      title: String(parsed.title || parsed.question || input).slice(0, 80),
      description: String(parsed.description || "").slice(0, 500),
      category: VALID_CATEGORIES.includes(normalizeCategory(parsed.category ?? ""))
        ? normalizeCategory(parsed.category ?? "") // AI may still emit legacy slugs
        : "other",
      resolutionRule: String(parsed.resolutionRule || "").slice(0, 2048),
      sourcesOfTruth: Array.isArray(parsed.sourcesOfTruth)
        ? parsed.sourcesOfTruth.filter((s) => typeof s === "string").slice(0, 3)
        : [],
      suggestedDays: Math.min(Math.max(Number(parsed.suggestedDays) || 14, 2), 120),
      ambiguityNote: parsed.ambiguityNote ? String(parsed.ambiguityNote).slice(0, 500) : null,
      clarifiedQuestion: parsed.clarifiedQuestion ? String(parsed.clarifiedQuestion).slice(0, 512) : null,
      reasoning: String(parsed.reasoning || "").slice(0, 500),
    };

    return NextResponse.json({ result });
  } catch (e) {
    console.error("AI structuring failed:", e);
    return NextResponse.json(
      { code: "AI_UNAVAILABLE", message: "AI structuring is temporarily unavailable. You can still define the market manually." },
      { status: 503 }
    );
  }
}
