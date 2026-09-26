/**
 * Simulated transaction provider (DEMO + SANDBOX modes only).
 *
 * Walks the SAME phase shape as a real Panta transaction (building → signing →
 * broadcasting → confirming) so the UI's loading, success, failure, rejection
 * and insufficient-balance states can all be exercised with zero real funds
 * (spec §2). It NEVER touches the network, NEVER constructs or signs a Solana
 * transaction, and NEVER returns anything resembling a real signature.
 *
 * The scenario input is a demo-only testing tool, clearly labeled in the UI.
 */

import type { DemoScenario, DemoTxPhase, DemoTxResult } from "./types";
import { newDemoTxId } from "./types";

export const DEMO_INSUFFICIENT_MESSAGE =
  "Demo scenario — simulated insufficient balance. (In MAINNET mode the preflight check blocks the transaction before signing and shows your current vs required balance.)";

export const DEMO_FAILED_MESSAGE =
  "Demo scenario — the simulated transaction failed on-chain. No real transaction was ever submitted.";

export const DEMO_REJECTED_MESSAGE =
  "Transaction rejected by wallet. (Demo scenario — no real signature was requested.)";

export interface RunDemoTxInput {
  scenario: DemoScenario;
  /** called for each phase so the UI shows the same progress shape as mainnet */
  onPhase?: (phase: DemoTxPhase) => void;
  /** per-phase delay in ms (defaults tuned to feel like the real flow) */
  stepMs?: number;
}

const DEFAULT_STEP_MS = 550;

/**
 * Replay the transaction phase shape and land on the selected outcome.
 * Resolves with a DemoTxResult the caller maps into its own state machine.
 */
export async function runDemoTransaction(input: RunDemoTxInput): Promise<DemoTxResult> {
  const step = input.stepMs ?? DEFAULT_STEP_MS;
  for (const phase of ["building", "signing", "broadcasting", "confirming"] as const) {
    input.onPhase?.(phase);
    await new Promise((r) => setTimeout(r, step));
  }

  switch (input.scenario) {
    case "failed":
      return { outcome: "failed", errorCode: "TX_FAILED", errorMessage: DEMO_FAILED_MESSAGE };
    case "rejected":
      return { outcome: "rejected", errorCode: "WALLET_REJECTED", errorMessage: DEMO_REJECTED_MESSAGE };
    case "insufficient":
      return { outcome: "insufficient", errorCode: "INSUFFICIENT_FUNDS", errorMessage: DEMO_INSUFFICIENT_MESSAGE };
    default:
      return { outcome: "success", demoTxId: newDemoTxId() };
  }
}
