/**
 * Regression tests — Demo/Mainnet separation (spec §8/§9).
 * Run: bun test tests/regression.test.ts
 *
 * Covers the pure decision layers only (no React, no network):
 *   - mainnet preflight evaluation + required amounts (spec §4/§5)
 *   - provider resolution demo vs mainnet (spec §8)
 *   - demo transaction provider outcomes + tx-ID honesty (spec §2)
 *   - environment descriptions never fabricate a Panta testnet (spec §3)
 */

import { describe, expect, test } from "bun:test";

import {
  evaluateMainnetPreflight,
  isValidTradeAmount,
  requiredUsdcForCreate,
  requiredUsdcForTrade,
  tradeFeeUsdc,
  USDC_TRADE_MIN,
  CREATE_FEE_USDC,
  SOL_FEE_GUIDE,
} from "../src/lib/preflight";
import { describeEnvironment } from "../src/lib/environment";
import {
  isDemoTxId,
  newDemoTxId,
  resolveTxProvider,
  runDemoTransaction,
  DEMO_FAILED_MESSAGE,
  DEMO_INSUFFICIENT_MESSAGE,
  DEMO_REJECTED_MESSAGE,
} from "../src/lib/tx-provider";

// ---------- §4/§5 preflight ----------

const base = {
  connected: true,
  hasAddress: true,
  hasSigner: true,
  requiredUsdc: CREATE_FEE_USDC,
};

describe("mainnet preflight (spec §4)", () => {
  test("passes when wallet + balances are sufficient", () => {
    const r = evaluateMainnetPreflight({ ...base, sol: 0.5, usdc: 60 });
    expect(r.ok).toBe(true);
    expect(r.insufficientFunds).toBe(false);
    expect(r.checks.every((c) => c.state === "ok")).toBe(true);
  });

  test("detects insufficient USDC before any transaction flow", () => {
    const r = evaluateMainnetPreflight({ ...base, sol: 1, usdc: 2 });
    expect(r.ok).toBe(false);
    expect(r.insufficientFunds).toBe(true);
    const usdc = r.checks.find((c) => c.id === "usdc")!;
    expect(usdc.state).toBe("insufficient");
    expect(usdc.detail).toContain("Current USDC: 2");
    expect(usdc.detail).toContain(`required: ${CREATE_FEE_USDC}`);
  });

  test("detects insufficient SOL for network fees", () => {
    const r = evaluateMainnetPreflight({ ...base, sol: 0.01, usdc: 100 });
    expect(r.ok).toBe(false);
    expect(r.insufficientFunds).toBe(true);
    expect(r.checks.find((c) => c.id === "sol")!.state).toBe("insufficient");
  });

  test("unreadable balances are 'unknown', never treated as zero", () => {
    const r = evaluateMainnetPreflight({ ...base, sol: null, usdc: null });
    expect(r.ok).toBe(false);
    expect(r.insufficientFunds).toBe(false);
    expect(r.checks.find((c) => c.id === "sol")!.state).toBe("unknown");
    expect(r.checks.find((c) => c.id === "usdc")!.state).toBe("unknown");
  });

  test("disconnected wallet fails the wallet check and reads no balances", () => {
    const r = evaluateMainnetPreflight({ ...base, connected: false, hasAddress: false, sol: 5, usdc: 500 });
    expect(r.ok).toBe(false);
    expect(r.insufficientFunds).toBe(false);
    expect(r.checks.find((c) => c.id === "wallet")!.state).toBe("insufficient");
    // balances must be ignored when no wallet is connected
    expect(r.checks.find((c) => c.id === "usdc")!.state).toBe("unknown");
  });

  test("missing signer blocks the flow", () => {
    const r = evaluateMainnetPreflight({ ...base, hasSigner: false, sol: 1, usdc: 100 });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.id === "signer")!.state).toBe("insufficient");
  });
});

describe("required amounts (spec §4)", () => {
  test("creation requires the verified 50 USDC fee", () => {
    expect(requiredUsdcForCreate()).toBe(50);
    expect(CREATE_FEE_USDC).toBe(50);
  });

  test("trades require amount + ~2% fee, rounded up to cents", () => {
    expect(requiredUsdcForTrade(10)).toBe(10.2);
    expect(tradeFeeUsdc(1)).toBe(0.02);
    expect(requiredUsdcForTrade(1)).toBe(1.02);
  });

  test("SOL guide stays a small fee buffer", () => {
    expect(SOL_FEE_GUIDE).toBe(0.05);
  });

  test("trade amount validation", () => {
    expect(USDC_TRADE_MIN).toBe(1);
    expect(isValidTradeAmount(1)).toBe(true);
    expect(isValidTradeAmount(0.5)).toBe(false);
    expect(isValidTradeAmount(Number.NaN)).toBe(false);
  });
});

// ---------- §8 provider separation ----------

describe("provider resolution (spec §8)", () => {
  test("live → mainnet provider", () => {
    expect(resolveTxProvider("live")).toBe("mainnet");
  });

  test("sandbox + demo → simulated provider", () => {
    expect(resolveTxProvider("demo")).toBe("demo");
    expect(resolveTxProvider("test")).toBe("demo");
    expect(resolveTxProvider(undefined)).toBe("demo");
    expect(resolveTxProvider(null)).toBe("demo");
  });
});

// ---------- §2 demo transaction provider ----------

describe("demo tx ids are honest (spec §2)", () => {
  test("always demo-sim- prefixed and flagged", () => {
    const id = newDemoTxId();
    expect(id.startsWith("demo-sim-")).toBe(true);
    expect(isDemoTxId(id)).toBe(true);
    expect(id.length).toBeLessThan(60);
  });

  test("can never pass as a real Solana signature (base58, 87-88 chars)", () => {
    const looksReal = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
    for (let i = 0; i < 25; i++) {
      const id = newDemoTxId();
      expect(looksReal.test(id)).toBe(false);
      // the '-' alone is outside the base58 alphabet
      expect(id.includes("-")).toBe(true);
    }
  });
});

describe("demo transaction outcomes (spec §2/§9)", () => {
  test("success walks the full phase shape and returns a labeled id", async () => {
    const phases: string[] = [];
    const r = await runDemoTransaction({
      scenario: "success",
      stepMs: 1,
      onPhase: (p) => phases.push(p),
    });
    expect(phases).toEqual(["building", "signing", "broadcasting", "confirming"]);
    expect(r.outcome).toBe("success");
    expect(r.demoTxId).toBeDefined();
    expect(isDemoTxId(r.demoTxId!)).toBe(true);
    expect(r.errorCode).toBeUndefined();
  });

  test("failed scenario maps to TX_FAILED", async () => {
    const r = await runDemoTransaction({ scenario: "failed", stepMs: 1 });
    expect(r.outcome).toBe("failed");
    expect(r.errorCode).toBe("TX_FAILED");
    expect(r.errorMessage).toBe(DEMO_FAILED_MESSAGE);
    expect(r.demoTxId).toBeUndefined();
  });

  test("rejected scenario maps to WALLET_REJECTED", async () => {
    const r = await runDemoTransaction({ scenario: "rejected", stepMs: 1 });
    expect(r.outcome).toBe("rejected");
    expect(r.errorCode).toBe("WALLET_REJECTED");
    expect(r.errorMessage).toBe(DEMO_REJECTED_MESSAGE);
  });

  test("insufficient scenario maps to INSUFFICIENT_FUNDS", async () => {
    const r = await runDemoTransaction({ scenario: "insufficient", stepMs: 1 });
    expect(r.outcome).toBe("insufficient");
    expect(r.errorCode).toBe("INSUFFICIENT_FUNDS");
    expect(r.errorMessage).toBe(DEMO_INSUFFICIENT_MESSAGE);
  });
});

// ---------- §3 no fabricated Panta testnet ----------

describe("environment honesty (spec §3)", () => {
  test("live is the only environment with real funds", () => {
    expect(describeEnvironment("live").realFunds).toBe(true);
    expect(describeEnvironment("test").realFunds).toBe(false);
    expect(describeEnvironment("demo").realFunds).toBe(false);
  });

  test("live chip names MAINNET; sandbox/demo never claim a blockchain", () => {
    expect(describeEnvironment("live").chip).toContain("MAINNET");
    expect(describeEnvironment("test").network).not.toMatch(/solana/i);
    expect(describeEnvironment("demo").network).not.toMatch(/solana/i);
  });

  test("no environment label fabricates a Panta testnet/devnet", () => {
    for (const mode of ["live", "test", "demo"] as const) {
      const env = describeEnvironment(mode);
      expect(env.label).not.toMatch(/testnet/i);
      expect(env.label).not.toMatch(/devnet/i);
      expect(env.chip).not.toMatch(/testnet/i);
    }
  });
});
