/**
 * E2E: create-room wizard on a preview-shaped hostname with a wallet that
 * rejects signing (what Phantom's "Request blocked → Close" produces).
 * Verifies:
 *   A. Step 4 shows the PreviewWalletNotice when wallet connected (preview host)
 *   B. Sign rejection surfaces the new WALLET_BLOCKED guidance (not the old
 *      misleading "Your wallet rejected the transaction")
 *   C. Same wizard on localhost does NOT show the notice
 */
const { chromium } = require("playwright");
const fs = require("fs");

const { execSync } = require("child_process");

const PREVIEW_HOST = "preview-chat-fake.space-z.ai";
// fake_phantom.js prints the injection IIFE to stdout — use that, not the file text
const FAKE = execSync("node scripts/fake_phantom.js", { encoding: "utf8" }).trim();

(async () => {
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${PREVIEW_HOST} 127.0.0.1`],
  });
  const log = (k, v) => console.log(`${k}: ${v}`);
  const ok = [];

  // ---------- Preview host context with fake Phantom ----------
  const ctx = await browser.newContext({
    viewport: { width: 1380, height: 940 },
    baseURL: `http://${PREVIEW_HOST}:3000`,
  });
  await ctx.addInitScript(FAKE);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // connect wallet
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /connect wallet/i }).first().click();
  await page.waitForTimeout(1200);
  // wallet modal: click the Phantom entry
  await page.locator('li:has-text("Phantom"), button:has-text("Phantom")').first().click();
  await page.waitForTimeout(2500);
  const connected = await page.evaluate(() => !document.body.innerText.includes("Connect Wallet") || document.body.innerText.includes("Disconnect"));
  log("A0. wallet connected (fake phantom)", connected ? "PASS" : "FAIL"); ok.push(connected);

  // create wizard: step 1
  await page.getByRole("button", { name: "Create a Room" }).first().click();
  await page.waitForTimeout(1000);
  await page.fill("textarea#q", "Will Ethereum stake above $5000 by March 2026?");
  await page.getByRole("button", { name: /structure with ai/i }).click();
  await page.waitForTimeout(6000); // AI structuring (or manual fallback)
  // step 2 → review
  await page.getByRole("button", { name: /review details/i }).click();
  await page.waitForTimeout(800);

  // ensure required fields are valid (AI fallback may leave them empty)
  const needRule = await page.evaluate(() => document.body.innerText.includes("A measurable question, a resolution rule"));
  if (needRule) {
    const tas = page.locator("textarea");
    const n = await tas.count();
    // resolution rule is the field after Description; fill all empty textareas conservatively
    for (let i = 0; i < n; i++) {
      const v = await tas.nth(i).inputValue();
      if (!v.trim()) {
        const label = await page.locator("textarea").nth(i).evaluate((el) =>
          el.closest("div")?.querySelector("label")?.textContent || ""
        );
        if (/resolution rule/i.test(label)) await tas.nth(i).fill("Resolve YES if ETH/USDC closes above $5000 on Coinbase on Mar 31, 2026; else NO.");
        if (/description/i.test(label)) await tas.nth(i).fill("ETH price threshold market.");
      }
    }
    const src = page.locator("input").filter({ hasText: "" });
    // sources field
    const inputs = page.locator("input");
    const m = await inputs.count();
    for (let i = 0; i < m; i++) {
      const label = await inputs.nth(i).evaluate((el) =>
        el.closest("div")?.querySelector("label")?.textContent || ""
      );
      if (/source/i.test(label) && !(await inputs.nth(i).inputValue()).trim()) {
        await inputs.nth(i).fill("https://www.coinbase.com");
      }
    }
  }

  // step 3 → step 4
  await page.getByRole("button", { name: /continue to creation/i }).click();
  await page.waitForTimeout(1000);
  const bannerVisible = await page.evaluate((s) => document.body.innerText.includes(s), "Request blocked");
  log("A. step-4 shows preview wallet notice (connected)", bannerVisible ? "PASS" : "FAIL"); ok.push(bannerVisible);
  await page.screenshot({ path: "scripts/preview_banner_wizard_step4.png" });

  // trigger creation → fake wallet rejects at signing
  await page.getByRole("button", { name: "Create Market" }).click();
  // wait for quote → build → signing → rejection (real Panta API roundtrips)
  let errText = "";
  try {
    await page.waitForFunction(
      () => document.body.innerText.includes("Proceed anyway (unsafe)") || document.body.innerText.includes("Your wallet rejected"),
      { timeout: 45000 }
    );
    errText = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("p, div")).find((e) =>
        /Proceed anyway \(unsafe\)|Your wallet rejected/.test(e.textContent || "") && e.children.length === 0
      );
      return el?.textContent || "";
    });
  } catch { /* timeout */ }
  const blockedMsg = errText.includes("Proceed anyway (unsafe)");
  log("B. rejection shows WALLET_BLOCKED guidance", blockedMsg ? "PASS" : `FAIL (${errText.slice(0, 80) || "no error shown"})`);
  ok.push(blockedMsg);
  await page.screenshot({ path: "scripts/preview_wizard_blocked_error.png" });

  // ---------- localhost context: banner must be hidden even when connected ----------
  const ctx2 = await browser.newContext({ viewport: { width: 1380, height: 940 }, baseURL: "http://localhost:3000" });
  await ctx2.addInitScript(FAKE);
  const p2 = await ctx2.newPage();
  await p2.goto("/", { waitUntil: "domcontentloaded" });
  await p2.waitForTimeout(3000);
  await p2.getByRole("button", { name: /connect wallet/i }).first().click();
  await p2.waitForTimeout(1000);
  await p2.locator('li:has-text("Phantom"), button:has-text("Phantom")').first().click();
  await p2.waitForTimeout(2000);
  await p2.getByRole("button", { name: "Create a Room" }).first().click();
  await p2.waitForTimeout(800);
  await p2.fill("textarea#q", "Will Solana flip $300 by June 2026?");
  await p2.getByRole("button", { name: /structure with ai/i }).click();
  await p2.waitForTimeout(6000);
  await p2.getByRole("button", { name: /review details/i }).click();
  await p2.waitForTimeout(800);
  await p2.getByRole("button", { name: /continue to creation/i }).click();
  await p2.waitForTimeout(1000);
  const bannerLocal = await p2.evaluate((s) => document.body.innerText.includes(s), "Request blocked");
  log("C. localhost step-4 hides notice (connected)", !bannerLocal ? "PASS" : "FAIL"); ok.push(!bannerLocal);

  log("PAGE ERRORS (preview ctx)", String(pageErrors.length) + (pageErrors.length ? " -> " + pageErrors[0].slice(0, 120) : ""));
  console.log("\nRESULT: " + (ok.every(Boolean) && pageErrors.length === 0 ? "ALL PASS" : "SOME FAILED"));
  await browser.close();
})().catch((e) => { console.error("E2E ERROR:", e); process.exit(1); });
