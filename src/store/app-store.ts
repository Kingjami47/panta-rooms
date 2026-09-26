"use client";

import { create } from "zustand";
import type { AppStatus } from "@/lib/types";

export type View = "landing" | "discover" | "room" | "create" | "activity" | "creator";

interface RouteState {
  view: View;
  marketId: string | null;
}

function parseHash(): RouteState {
  const h = window.location.hash.replace(/^#\/?/, "");
  const [head, ...rest] = h.split("/");
  const arg = rest.join("/") || null;
  switch (head) {
    case "discover":
      return { view: "discover", marketId: null };
    case "room":
      return arg ? { view: "room", marketId: decodeURIComponent(arg) } : { view: "discover", marketId: null };
    case "create":
      return { view: "create", marketId: null };
    case "activity":
      return { view: "activity", marketId: null };
    case "creator":
      return { view: "creator", marketId: null };
    default:
      return { view: "landing", marketId: null };
  }
}

interface AppStore {
  view: View;
  marketId: string | null;
  navigate: (to: string) => void;
  syncFromHash: () => void;

  status: AppStatus | null;
  setStatus: (s: AppStatus) => void;

  /** wallet display id used for comments/reactions identity */
  identity: string | null;
  setIdentity: (id: string | null) => void;

  /** demo trades recorded this session (DEMO MODE, labeled) */
  demoTrades: import("@/lib/types").DemoTrade[];
  addDemoTrade: (t: import("@/lib/types").DemoTrade) => void;

  /** last REAL broadcast signature this session (never demo) — Developer Details */
  lastTx: { signature: string; kind: string; at: number } | null;
  setLastTx: (t: { signature: string; kind: string; at: number }) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  view: "landing",
  marketId: null,
  navigate: (to) => {
    window.location.hash = to;
    const s = parseHash();
    set({ view: s.view, marketId: s.marketId });
    window.scrollTo({ top: 0 });
  },
  syncFromHash: () => {
    const s = parseHash();
    set({ view: s.view, marketId: s.marketId });
  },

  status: null,
  setStatus: (status) => set({ status }),

  identity: null,
  setIdentity: (identity) => set({ identity }),

  demoTrades: [],
  addDemoTrade: (t) => set((s) => ({ demoTrades: [t, ...s.demoTrades] })),

  lastTx: null,
  setLastTx: (t) => set({ lastTx: t }),
}));
