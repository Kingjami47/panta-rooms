/**
 * E2E: create-room wizard blocked-flow on preview host — returning-user path.
 * Seeds localStorage("walletName")="Phantom" so WalletProvider autoConnect runs
 * (adapter.autoConnect → window.phantom.solana.connect) without modal clicks.
 * Verifies A) step-4 preview notice (connected) B) WALLET_BLOCKED guidance on
 * sign rejection C) localhost hides the notice.
 */
const { chromium } = require("playwright");
const { execSync } = require("child_process");

const PREVIEW_HOST = "preview-chat-fake.space-z.ai";
const FAKE = execSync("node scripts/fake_phantom.js", { encoding: "utf8" }).trim();

async function connectViaModal(ctx, origin) {
  const page = await ctx.newPage();
  await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  await page.getByRole("button", { name: /connect wallet/i }).first().click();
  await page.waitForTimeout(1000);
  // modal click → select("Phantom") → autoConnect → provider.connect()
  await page.locator('.wallet-adapter-modal-list li button:has-text("Phantom")').first().click();
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => ({
    nav: document.body.innerText.slice(0, 160).replace(/\n/g, " | "),
    connectCalls: window.__connectCalls ?? -1,
  }));
  const connected = /Disconnect/.test(st.nav);
  return { page, connected, st };
}

async function walkWizardToStep4(page) {
  await page.getByRole("button", { name: "Create a Room" }).first().click();
  await page.waitForTimeout(900);
  await page.fill("textarea#q", "Will Ethereum stake above $5000 by March 2026?");
  await page.getByRole("button", { name: /structure with ai/i }).click();
  await page.waitForTimeout(7000);
  await page.getByRole("button", { name: /review details/i }).click();
  await page.waitForTimeout(700);
  // fill empty required fields (AI fallback leaves them blank)
  await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll("textarea"));
    for (const t of boxes) {
      if (t.value.trim()) continue;
      const label = t.closest("div")?.querySelector("label")?.textContent || "";
      if (/resolution rule/i.test(label)) t.value = "Resolve YES if ETH/USDC closes above $5000 on Coinbase on Mar 31, 2026; else NO.";
      else if (/description/i.test(label)) t.value = "ETH price threshold market.";
    }
    const inputs = Array.from(document.querySelectorAll("input"));
    for (const i of inputs) {
      const label = i.closest("div")?.querySelector("label")?.textContent || "";
      if (/source/i.test(label) && !i.value.trim()) i.value = "https://www.coinbase.com";
    }
  });
  await page.getByRole("button", { name: /continue to creation/i }).click();
  await page.waitForTimeout(900);
}

(async () => {
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${PREVIEW_HOST} 127.0.0.1`],
  });
  const results = [];
  const log = (k, v) => { results.push(v === true); console.log(`${k}: ${v === true ? "PASS" : v === false ? "FAIL" : v}`); };

  // instrumented fake: flag for the adapter's scopePollingDetectionStrategy
  // (PhantomWalletAdapter requires window.isPhantomInstalled to mark Installed)
  const instrumented = FAKE.replace(
    "window.__fakePhantom = true;",
    `window.__fakePhantom = true; window.isPhantomInstalled = true;
     (() => { const p = window.phantom.solana; window.__connectCalls = 0;
       const o = p.connect.bind(p); p.connect = async (...a) => { window.__connectCalls++; return o(...a); }; })();`
  );

  // ---- A+B: preview host, connected, create → sign → blocked guidance ----
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 940 }, baseURL: `http://${PREVIEW_HOST}:3000` });
  await ctx.addInitScript(instrumented);
  const { page, connected } = await connectViaModal(ctx, "");
  log("A0. fake-phantom auto-connected (preview host)", connected);
  log("A0b. connect() invoked on provider", await page.evaluate(() => (window.__connectCalls || 0) > 0));

  await walkWizardToStep4(page);
  log("A. step-4 shows preview wallet notice (connected)", await page.evaluate((s) => document.body.innerText.includes(s), "Request blocked"));
  await page.screenshot({ path: "scripts/preview_banner_wizard_step4.png" });

  await page.getByRole("button", { name: "Create Market" }).click();
  let errText = "";
  try {
    await page.waitForFunction(
      () => /Proceed anyway \(unsafe\)|Your wallet rejected/.test(document.body.innerText),
      { timeout: 60000 }
    );
    errText = await page.evaluate(() =>
      (Array.from(document.querySelectorAll("p, div")).find((e) =>
        /Proceed anyway \(unsafe\)|Your wallet rejected/.test(e.textContent || "") && e.children.length === 0
      )?.textContent || "")
    );
  } catch { /* timeout */ }
  log("B. rejection shows WALLET_BLOCKED guidance", errText.includes("Proceed anyway (unsafe)") ? true : `FAIL (${errText.slice(0, 90) || "no error shown"})`);
  await page.screenshot({ path: "scripts/preview_wizard_blocked_error.png" });

  // ---- C: localhost, connected → notice hidden ----
  const ctx2 = await browser.newContext({ viewport: { width: 1380, height: 940 }, baseURL: "http://localhost:3000" });
  await ctx2.addInitScript(instrumented);
  const { page: p2, connected: connected2 } = await connectViaModal(ctx2, "");
  log("C0. fake-phantom auto-connected (localhost)", connected2);
  await walkWizardToStep4(p2);
  log("C. localhost step-4 hides notice (connected)", !(await p2.evaluate((s) => document.body.innerText.includes(s), "Request blocked")));

  console.log("\nRESULT: " + (results.every(Boolean) ? "ALL PASS" : "SOME FAILED"));
  await browser.close();
})().catch((e) => { console.error("E2E ERROR:", e); process.exit(1); });
