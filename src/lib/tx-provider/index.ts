/** Transaction-provider entrypoint (spec §8) — see types.ts for the contract. */
export { resolveTxProvider, isDemoTxId, newDemoTxId, DEMO_SCENARIOS } from "./types";
export type { DemoScenario, DemoTxPhase, DemoTxResult } from "./types";
export { runDemoTransaction, DEMO_FAILED_MESSAGE, DEMO_REJECTED_MESSAGE, DEMO_INSUFFICIENT_MESSAGE } from "./demo";
