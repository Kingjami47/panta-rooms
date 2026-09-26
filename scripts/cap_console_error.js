/** Capture console.error args during a standard-wallet registration to get the real TypeError. */
const script = `(async () => {
  if (!window.__capErr) {
    window.__capErr = [];
    const native = console.error.bind(console);
    console.error = function (...args) {
      try {
        const formatted = args.map((a) => {
          if (a instanceof Error) return a.stack || a.message;
          if (typeof a === "string") return a;
          try { return JSON.stringify(a).slice(0, 300); } catch { return String(a); }
        }).join(" | ");
        window.__capErr.push(formatted.slice(0, 1200));
      } catch {}
      return native(...args);
    };
  }
  window.__capErr.length = 0;

  const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
  const bytes = new Uint8Array([126,140,8,135,96,191,222,29,221,207,50,193,127,32,155,130,66,238,82,170,241,49,250,205,136,208,234,44,109,11,6,242]);
  const reject = () => { const e = new Error("User rejected the request"); e.code = 4001; throw e; };
  const listeners = {};
  const account = {
    publicKey: bytes, address,
    chains: Object.freeze(["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]),
    features: Object.freeze(["standard:connect", "standard:events", "standard:disconnect", "solana:signTransaction"]),
  };
  const makeWallet = (name) => ({
    name, version: "1.0.0", icon: "data:image/svg+xml;base64,PHN2Zy8+",
    chains: Object.freeze(["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]),
    features: Object.freeze({
      "standard:connect": { version: "1.0.0", connect: async () => ({ accounts: [account] }) },
      "standard:events": { version: "1.0.0", on: (ev, l) => { (listeners[ev] ||= []).push(l); return () => { listeners[ev] = (listeners[ev] || []).filter((x) => x !== l); }; } },
      "standard:disconnect": { version: "1.0.0", disconnect: async () => { (listeners["disconnect"] || []).forEach((l) => l()); } },
      "solana:signTransaction": { version: "1.0.0", signTransaction: async () => reject() },
    }),
    accounts: [account],
  });
  window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", {
    detail: (api) => api.register(makeWallet("Probe " + Math.floor(Math.random() * 1e6))),
  }));
  await new Promise((r) => setTimeout(r, 1200));
  return JSON.stringify(window.__capErr.length ? window.__capErr : ["console.error not called"]);
})()`;
console.log(script);
