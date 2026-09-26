/**
 * Fake Phantom injection for browser E2E of Panta Rooms.
 * Usage: agent-browser eval "$(node scripts/fake_phantom.js)"
 * Sets window.phantom.solana (PhantomAdapter path) AND dispatches the
 * wallet-standard:register-wallet event (Standard adapter path).
 * signTransaction throws code 4001 — enough to prove quote+build succeed.
 */
const script = `(() => {
  if (window.__fakePhantom) return "already-injected";
  const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
  const bytes = new Uint8Array([126,140,8,135,96,191,222,29,221,207,50,193,127,32,155,130,66,238,82,170,241,49,250,205,136,208,234,44,109,11,6,242]);
  const reject = () => { const e = new Error("User rejected the request"); e.code = 4001; throw e; };
  const fakeProvider = {
    isPhantom: true,
    publicKey: { toString: () => address, toBytes: () => bytes },
    connect: async () => ({ publicKey: fakeProvider.publicKey }),
    disconnect: async () => {},
    signTransaction: async () => reject(),
    signAllTransactions: async () => reject(),
    signAndSendTransaction: async () => reject(),
    on: () => {}, off: () => {},
  };
  window.phantom = { solana: fakeProvider };

  const account = {
    publicKey: bytes,
    address,
    chains: Object.freeze(["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]),
    features: Object.freeze(["standard:connect", "standard:events", "standard:disconnect", "solana:signTransaction"]),
  };
  const listeners = {};
  const wallet = {
    name: "Phantom Test",
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
    // Per @wallet-standard/app: the app's listener is
    //   ({ detail: callback }) => callback(api)   where api = { register }
    // so the wallet must dispatch a detail CALLBACK, not an object.
    window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", {
      detail: (api) => {
        try {
          api.register(wallet);
        } catch (e) {
          console.log("[FakePhantom] register failed:", e && e.message);
        }
      },
    }));
  } catch (e) { return "event-failed: " + (e && e.message); }
  window.__fakePhantom = true;
  return "injected";
})()`;
console.log(script);
