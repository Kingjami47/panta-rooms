"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { WalletConnectButton } from "@/components/Providers";
import { EnvironmentChip } from "@/components/wallet/funding-center";
import { LandingView } from "@/components/views/LandingView";
import { DiscoverView } from "@/components/views/DiscoverView";
import { CommunityView } from "@/components/views/CommunityView";
import { RoomView } from "@/components/views/RoomView";
import { CreateWizard } from "@/components/views/CreateWizard";
import { ActivityView } from "@/components/views/ActivityView";
import { CreatorView } from "@/components/views/CreatorView";

/**
 * Brand mark — must stay pixel-identical to the official "PR" monogram asset
 * (scripts/render_pr_logo_light.py) submitted to Colosseum / Superteam Earn:
 * light zinc gradient tile (from-zinc-100 to-zinc-400) + dark zinc-950 PR glyph.
 * Any brand change here must be synced with public/logo.svg + src/app/icon.svg.
 */
const PR_GLYPH_PATH =
  "M 5.33,42.29 L 23.42,42.29 L 25.38,42.23 L 28.94,41.78 L 32.04,40.88 L 34.67,39.54 L 35.81,38.70 L 36.82,37.75 L 38.44,35.58 L 39.52,33.03 L 40.06,30.10 L 40.13,28.49 L 40.06,26.88 L 39.52,23.93 L 38.44,21.37 L 36.82,19.19 L 35.81,18.25 L 34.67,17.41 L 32.04,16.07 L 28.94,15.18 L 25.38,14.73 L 23.42,14.67 L 16.23,14.67 L 16.23,0.00 L 5.33,0.00 L 5.33,42.29 Z M 16.23,34.38 L 16.23,22.57 L 22.26,22.57 L 23.75,22.67 L 26.20,23.44 L 27.16,24.12 L 27.92,24.97 L 28.78,27.16 L 28.89,28.49 L 28.78,29.83 L 27.92,32.00 L 27.16,32.85 L 26.20,33.52 L 23.75,34.29 L 22.26,34.38 L 16.23,34.38 Z M 63.33,23.54 L 64.92,23.61 L 67.37,24.25 L 68.24,24.80 L 68.89,25.55 L 69.63,27.64 L 69.72,29.00 L 69.63,30.34 L 68.89,32.41 L 68.24,33.13 L 67.37,33.68 L 64.92,34.30 L 63.33,34.38 L 58.74,34.38 L 58.74,23.54 L 63.33,23.54 Z M 58.74,16.00 L 58.74,0.00 L 47.84,0.00 L 47.84,42.29 L 64.49,42.29 L 68.38,42.11 L 73.18,41.19 L 75.69,40.13 L 76.73,39.48 L 77.64,38.73 L 79.10,36.92 L 80.08,34.70 L 80.56,32.08 L 80.63,30.61 L 80.50,28.61 L 79.48,25.17 L 78.60,23.73 L 77.46,22.48 L 74.41,20.49 L 72.50,19.77 L 73.59,19.43 L 75.59,18.28 L 76.50,17.45 L 78.29,15.20 L 80.09,12.01 L 86.01,0.00 L 74.40,0.00 L 69.24,10.50 L 68.46,11.96 L 66.88,14.13 L 66.08,14.84 L 65.22,15.35 L 63.09,15.93 L 61.82,16.00 L 58.74,16.00 Z";

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-2.5" aria-label="Panta Rooms home">
      <span className="flex size-8 items-center justify-center shadow-lg shadow-black/40 transition-transform duration-200 group-hover:scale-105">
        <svg viewBox="0 0 100 100" className="size-8" aria-hidden="true">
          <defs>
            <linearGradient id="pr-tile-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F4F4F5" />
              <stop offset="1" stopColor="#A1A1AA" />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="94" height="94" rx="24" fill="url(#pr-tile-grad)" stroke="#A1A1AA" strokeWidth="1" />
          <g transform="translate(4.33,71.14) scale(1,-1)" fill="#09090B" fillRule="evenodd">
            <path d={PR_GLYPH_PATH} />
          </g>
        </svg>
      </span>
      <span className="text-[15px] font-bold tracking-tight text-zinc-100">
        Panta <span className="text-zinc-400 transition-colors group-hover:text-zinc-200">Rooms</span>
      </span>
    </button>
  );
}

export function AppShell() {
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const syncFromHash = useAppStore((s) => s.syncFromHash);

  useEffect(() => {
    syncFromHash();
    const onHash = () => syncFromHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [syncFromHash]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0b0d10]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo onClick={() => navigate("/")} />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {[
                { key: "discover", label: "Explore" },
                { key: "community", label: "Community" },
                { key: "activity", label: "My Activity" },
                { key: "creator", label: "Creator" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => navigate(`/${item.key}`)}
                  className={`rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                    view === item.key ? "bg-white/[0.08] text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/create")}
              className="hidden rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 sm:block"
            >
              Create a Room
            </button>
            <EnvironmentChip />
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {/* EnvironmentBanner removed (user request 2026-10-02): the persistent
          MAINNET strip sat above every page and could not be dismissed. The
          header chip (LIVE · MAINNET / DEMO / SANDBOX) still announces the
          active environment on every screen. */}

      <main className="flex-1">
        {view === "landing" && <LandingView />}
        {view === "discover" && <DiscoverView />}
        {view === "community" && <CommunityView />}
        {view === "room" && <RoomView />}
        {view === "create" && <CreateWizard />}
        {view === "activity" && <ActivityView />}
        {view === "creator" && <CreatorView />}
      </main>

      <footer className="mt-auto border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[12.5px] text-zinc-500 sm:flex-row sm:px-6">
          <p>Panta Rooms — a social layer for prediction markets. Markets, pricing and settlement are provided by the Panta API.</p>
          <a
            href="https://www.panta.market/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-medium text-zinc-300 transition hover:text-white"
          >
            Powered by <span className="font-bold">Panta</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
