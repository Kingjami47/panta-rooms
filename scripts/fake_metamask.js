/**
 * Fake MetaMask Solana wallet injection — mirrors how real MetaMask (native
 * Solana support, May 2025+) registers with the Solana Wallet Standard.
 * Usage: agent-browser eval "$(node scripts/fake_metamask.js)"
 * signTransaction rejects with 4001 — proves detection + connect + handoff.
 */
const script = `(() => {
  if (window.__fakeMetaMask) return "already-injected";
  const address = "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T";
  const bytes = new Uint8Array([70,79,180,226,196,90,151,113,168,181,240,114,15,133,219,163,190,190,36,158,142,172,110,157,90,19,151,43,123,172,11,150]);
  const reject = () => { const e = new Error("User rejected the request"); e.code = 4001; throw e; };
  const account = {
    publicKey: bytes,
    address,
    chains: Object.freeze(["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]),
    features: Object.freeze(["standard:connect", "standard:events", "standard:disconnect", "solana:signTransaction"]),
  };
  const listeners = {};
  const wallet = {
    name: "MetaMask",
    version: "1.0.0",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=",
    get chains() { return Object.freeze(["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]); },
    get features() {
      return Object.freeze({
        "standard:connect": { version: "1.0.0", connect: async () => ({ accounts: [account] }) },
        "standard:events": {
          version: "1.0.0",
          on: (event, listener) => { (listeners[event] ||= []).push(listener); return () => { listeners[event] = (listeners[event] || []).filter((l) => l !== listener); }; },
        },
        "standard:disconnect": { version: "1.0.0", disconnect: async () => { (listeners["disconnect"] || []).forEach((l) => l()); } },
        "solana:signTransaction": { version: "1.0.0", signTransaction: async () => reject(), supportedTransactionVersions: ["legacy", 0] },
      });
    },
    get accounts() { return [account]; },
  };
  try {
    window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", {
      detail: (api) => {
        try { api.register(wallet); } catch (e) { console.log("[FakeMetaMask] register failed:", e && e.message); }
      },
    }));
  } catch (e) { return "event-failed: " + (e && e.message); }
  window.__fakeMetaMask = true;
  return "metamask-injected";
})()`;
console.log(script);
