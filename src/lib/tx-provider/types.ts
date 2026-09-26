/**
 * Transaction-provider contract (spec §8 — environment separation).
 *
 * DEMO    → simulated transaction provider (src/lib/tx-provider/demo.ts)
 * MAINNET → real Panta transaction provider (the existing quote → build →
 *           sign → broadcast → submit/verify sequence in useTradeFlow /
 *           CreateWizard / ActivityView — verified working, NOT rewritten)
 *
 * The UI stays largely identical; only the execution layer differs. The mainnet
 * provider is intentionally NOT extracted into this folder: it is the existing,
 * audited Panta integration and moving it would risk the working flow. The
 * branch happens at the UI layer via resolveTxProvider() — demo NEVER falls
 * through into mainnet code and mainnet NEVER fakes success.
 */

import type { AppEnvMode } from "@/lib/api-client";

/** Outcomes a demo transaction can simulate (spec §2/§9 test matrix). */
export type DemoScenario = "success" | "failed" | "rejected" | "insufficient";

export const DEMO_SCENARIOS: Array<{ id: DemoScenario; label: string }> = [
  { id: "success", label: "Success" },
  { id: "failed", label: "Failed on-chain" },
  { id: "rejected", label: "Wallet rejected" },
  { id: "insufficient", label: "Insufficient balance" },
];

/** The phases a real Panta transaction walks through — demo replays the same shape. */
export type DemoTxPhase = "building" | "signing" | "broadcasting" | "confirming";

export interface DemoTxResult {
  outcome: DemoScenario;
  /**
   * Demo-only transaction id, ALWAYS prefixed `demo-sim-` and clearly labeled
   * by the UI (spec §2: never display a fake mainnet hash as real).
   */
  demoTxId?: string;
  /** friendly error line for failed / rejected / insufficient outcomes */
  errorCode?: "TX_FAILED" | "WALLET_REJECTED" | "INSUFFICIENT_FUNDS";
  errorMessage?: string;
}

export function isDemoTxId(id: string): boolean {
  return id.startsWith("demo-sim-");
}

/** Fresh, clearly-simulated transaction id — never base58, never explorer-ready. */
export function newDemoTxId(): string {
  return `demo-sim-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_679_616).toString(36)}`;
}

/**
 * Resolve which provider owns transaction execution for this environment.
 * sandbox + demo → simulated provider; live → the real Panta provider.
 */
export function resolveTxProvider(mode: AppEnvMode | string | undefined | null): "demo" | "mainnet" {
  return mode === "live" ? "mainnet" : "demo";
}
