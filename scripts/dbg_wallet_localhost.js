/** Isolate: fake phantom connect via Playwright on localhost (no host override). */
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const FAKE = execSync("node scripts/fake_phantom.js", { encoding: "utf8" }).trim();

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 940 }, baseURL: "http://localhost:3000" });
  await ctx.addInitScript(FAKE);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 160)));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // how many wallets does the app see? (probe via modal)
  await page.getByRole("button", { name: /connect wallet/i }).first().click();
  await page.waitForTimeout(1200);
  const items = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".wallet-adapter-modal-list li button")).map((b) => b.textContent.trim())
  );
  console.log("wallet buttons:", JSON.stringify(items));

  // click the Phantom BUTTON specifically
  await page.locator('.wallet-adapter-modal-list li button:has-text("Phantom")').first().click();
  await page.waitForTimeout(3000);
  const post = await page.evaluate(() => document.body.innerText.slice(0, 130).replace(/\n/g, " | "));
  console.log("after-click:", post);
  await browser.close();
})().catch((e) => { console.error("ERR:", e); process.exit(1); });
