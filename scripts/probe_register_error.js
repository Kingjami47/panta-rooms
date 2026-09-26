/** Capture the real stack behind the WalletProvider render TypeError. */
const script = `(async () => {
  const errs = [];
  const onErr = (e) => errs.push(((e.error && e.error.stack) || e.message || String(e)).slice(0, 900));
  window.addEventListener("error", onErr);
  window.addEventListener("unhandledrejection", (e) => errs.push("rejection: " + ((e.reason && e.reason.stack) || e.message).slice(0, 900)));

  const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
  const bytes = new Uint8Array([126,140,8,135,96,191,222,29,221,207,50,193,127,32,155,130,66,238,82,170,241,49,250,205,136,208,234,44,109,11,6,242]);
  const reject = () => { const e = new Error("User rejected the request"); e.code = 4001; throw e; };
  const listeners = {};
  const account = {
    publicKey: bytes,
    address,
    chains: Object.freeze(["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]),
    features: Object.freeze(["standard:connect", "standard:events", "standard:disconnect", "solana:signTransaction"]),
  };
  const wallet = {
    name: "Probe Wallet",
    version: "1.0.0",
    icon: "data:image/svg+xml;base64,PHN2Zy8+",
    chains: Object.freeze(["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]),
    features: Object.freeze({
      "standard:connect": { version: "1.0.0", connect: async () => ({ accounts: [account] }) },
      "standard:events": { version: "1.0.0", on: (ev, l) => { (listeners[ev] ||= []).push(l); return () => { listeners[ev] = (listeners[ev] || []).filter((x) => x !== l); }; } },
      "standard:disconnect": { version: "1.0.0", disconnect: async () => { (listeners["disconnect"] || []).forEach((l) => l()); } },
      "solana:signTransaction": { version: "1.0.0", signTransaction: async () => reject() },
    }),
    accounts: [account],
  };
  window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", {
    detail: (api) => api.register(wallet),
  }));
  await new Promise((r) => setTimeout(r, 1500));
  window.removeEventListener("error", onErr);
  return JSON.stringify(errs.length ? errs : ["no errors captured"]);
})()`;
console.log(script);
