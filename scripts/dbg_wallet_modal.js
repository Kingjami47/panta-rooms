/** Debug: why does fake phantom not connect? Dump modal + window state. */
const { chromium } = require("playwright");
const { execSync } = require("child_process");

const PREVIEW_HOST = "preview-chat-fake.space-z.ai";
const FAKE = execSync("node scripts/fake_phantom.js", { encoding: "utf8" }).trim();

(async () => {
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${PREVIEW_HOST} 127.0.0.1`],
  });
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 940 }, baseURL: `http://${PREVIEW_HOST}:3000` });
  await ctx.addInitScript(FAKE);
  // instrument AFTER the fake: count connect() calls + capture errors
  await ctx.addInitScript(`
    (() => {
      window.__connectCalls = 0;
      window.__connectErrs = [];
      const p = window.phantom && window.phantom.solana;
      if (!p) return;
      const orig = p.connect.bind(p);
      p.connect = async (...a) => {
        window.__connectCalls++;
        try { return await orig(...a); }
        catch (e) { window.__connectErrs.push(String(e && e.message || e)); throw e; }
      };
    })();
  `);
  const page = await ctx.newPage();
  page.on("console", (m) => { const t = m.text(); if (/fake|phantom|wallet|error/i.test(t)) console.log("[console]", t.slice(0, 160)); });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  const preState = await page.evaluate(() => ({
    hasPhantom: typeof window.phantom !== "undefined",
    hasFakeFlag: !!window.__fakePhantom,
    hasSolana: typeof window.solana !== "undefined",
  }));
  console.log("pre-connect state:", JSON.stringify(preState));

  await page.getByRole("button", { name: /connect wallet/i }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scripts/dbg_modal.png" });
  const modalText = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"], .wallet-adapter-modal, .wallet-adapter-modal-wrapper');
    return dlg ? dlg.textContent.slice(0, 400) : "(no dialog found) body=" + document.body.innerText.slice(0, 200);
  });
  console.log("modal:", JSON.stringify(modalText));

  const items = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".wallet-adapter-modal-list li, .wallet-adapter-modal-list button")).map((el) => el.textContent.trim())
  );
  console.log("wallet items:", JSON.stringify(items));

  if (items.length) {
    const target = items.find((t) => /phantom/i.test(t)) || items[0];
    await page.locator(`.wallet-adapter-modal-list li:has-text("${target.split("\n")[0].slice(0, 12)}")`).first().click();
    await page.waitForTimeout(3000);
    const post = await page.evaluate(() => ({
      nav: document.body.innerText.slice(0, 120).replace(/\n/g, " | "),
      connectCalls: window.__connectCalls,
      connectErrs: window.__connectErrs,
      modalOpen: !!document.querySelector(".wallet-adapter-modal"),
    }));
    console.log("after-click:", JSON.stringify(post, null, 1));
  }
  await browser.close();
})().catch((e) => { console.error("DBG ERROR:", e); process.exit(1); });
