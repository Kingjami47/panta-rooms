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

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-2.5" aria-label="Panta Rooms home">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-400 text-[15px] font-black text-zinc-950 shadow-lg shadow-black/40">
        P
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
