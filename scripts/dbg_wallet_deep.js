/** Deep debug: modal click path with full telemetry (localhost). */
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const FAKE = execSync("node scripts/fake_phantom.js", { encoding: "utf8" }).trim();

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 940 }, baseURL: "http://localhost:3000" });
  await ctx.addInitScript(FAKE);
  await ctx.addInitScript(`
    (() => { const p = window.phantom && window.phantom.solana; if (!p) return;
      window.__connectCalls = 0; window.__discCalls = 0;
      const o = p.connect.bind(p); p.connect = async (...a) => { window.__connectCalls++; try { return await o(...a); } catch (e) { window.__connectErr = String(e && e.message || e); throw e; } };
      const d = p.disconnect.bind(p); p.disconnect = async (...a) => { window.__discCalls++; return d(...a); };
    })();`);
  const page = await ctx.newPage();
  page.on("console", (m) => console.log("[console]", m.type(), m.text().slice(0, 140)));
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 160)));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  await page.getByRole("button", { name: /connect wallet/i }).first().click();
  await page.waitForTimeout(1000);

  const items = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".wallet-adapter-modal-list li")).map((li) => {
      const b = li.querySelector("button");
      return { text: b?.textContent.trim(), cls: b?.className.slice(0, 60) };
    })
  );
  console.log("modal li:", JSON.stringify(items));

  // click the Phantom BUTTON element itself
  await page.locator('.wallet-adapter-modal-list li button').first().click();
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({
      c: window.__connectCalls, d: window.__discCalls, err: window.__connectErr ?? null,
      walletName: localStorage.getItem("walletName"),
      nav: document.body.innerText.slice(0, 100).replace(/\n/g, "|"),
      modal: !!document.querySelector(".wallet-adapter-modal"),
    }));
    console.log(`t=${(i + 1) * 600}ms`, JSON.stringify(st));
    if (st.c > 0) break;
  }
  await browser.close();
})().catch((e) => { console.error("ERR:", e); process.exit(1); });
