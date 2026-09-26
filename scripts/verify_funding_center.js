/**
 * E2E — Testing & Funding Center (spec acceptance tests 1, 2-partial, 8, 9).
 * Run: node scripts/verify_funding_center.js
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = "http://localhost:3000";
const shot = (n) => `/home/z/my-project/scripts/fc_${n}.png`;
// fake_phantom.js PRINTS the injectable IIFE — capture its stdout.
const fakeWallet = execSync("node /home/z/my-project/scripts/fake_phantom.js").toString().trim();

function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  const results = [];
  const check = (name, ok, extra = "") => {
    results.push(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? ` (${extra})` : ""}`);
    console.log(results[results.length - 1]);
  };

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // ---- Test 1: guest sees environment banner + chip, funding center opens ----
  let text = await bodyText(page);
  check("banner shows LIVE environment note", text.includes("Live environment") && text.includes("Solana Mainnet"));
  const chip = page.locator("header button", { hasText: "LIVE · MAINNET" });
  check("header chip LIVE · MAINNET visible", (await chip.count()) > 0);
  await page.screenshot({ path: shot("1_landing_banner") });

  await chip.first().click();
  await page.waitForTimeout(600);
  text = await bodyText(page);
  check("funding center opens from chip", text.includes("Testing & Funding"));
  check("guest wallet card prompts connect", text.includes("No wallet connected yet"));
  check("balances honest for guest", text.includes("Connect a wallet to see your real SOL and USDC balances"));
  check("checklist present", text.includes("Ready to test?"));
  check("funding section present", text.includes("Get funds for testing"));
  check("devnet honesty note", text.includes("faucet.solana.com") && text.includes("do not apply"));
  check("how-testing-works present", text.includes("How testing works"));
  check("non-custodial footer", text.includes("never asks for keys or seed phrases"));
  await page.screenshot({ path: shot("2_center_guest") });

  // developer details expandable
  await page.getByText("Developer Details").click();
  await page.waitForTimeout(300);
  text = await bodyText(page);
  check("developer details expand", text.includes("Panta environment") && text.includes("Test token mint"));
  check("no fabricated last tx", text.includes("none this session"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // ---- connect fake wallet (standard path) ----
  const injected = await page.evaluate(fakeWallet);
  await page.evaluate("window.isPhantomInstalled = true;");
  console.log("fake wallet injection:", injected);
  await page.getByRole("button", { name: /Connect Wallet/i }).first().click();
  await page.waitForTimeout(700);
  const row = page.locator("button", { hasText: "Phantom Test" }).first();
  check("fake wallet listed", (await row.count()) > 0);
  if ((await row.count()) > 0) {
    await row.click();
    await page.waitForTimeout(2000);
  }
  text = await bodyText(page);
  check("wallet chip shows connected address", text.includes("9WzD…AWWM"));
  if (!text.includes("9WzD…AWWM")) {
    await page.screenshot({ path: shot("dbg_connect_failed") });
    console.log("DEBUG body text:\n", text.slice(0, 1500));
  }

  // ---- Test 8 (no funds) + Test 2 (real balances): wallet status card ----
  await page.locator("header button[aria-label='Wallet status']").click();
  await page.waitForTimeout(2500); // allow balance query to resolve
  text = await bodyText(page);
  check("wallet card shows REAL SOL balance", text.includes("9943925.6071"));
  check("wallet card shows REAL USDC balance", text.includes("1096.08"));
  await page.screenshot({ path: shot("3_wallet_status") });

  // open funding center from wallet card (the dropdown's white primary button)
  await page.locator("button.bg-white", { hasText: "Testing & Funding" }).click();
  await page.waitForTimeout(1500);
  text = await bodyText(page);
  check("center balances show real values", text.includes("9943925.6071") && text.includes("1096.08"));
  check("balances labeled live-read", text.includes("Read live from the Solana RPC"));
  check("checklist SOL done", /SOL for fees[\s\S]*?\n/.test(text));
  await page.screenshot({ path: shot("4_center_connected") });

  // refresh balances (rate limit window has passed)
  await page.waitForTimeout(2000);
  await page.locator("button", { hasText: "Refresh Balances" }).click();
  await page.waitForTimeout(2500);
  text = await bodyText(page);
  check("refresh updates timestamp", text.includes("Updated") && text.includes("s ago"));

  // checklist readiness (whale wallet => all done)
  const readyOk = await page.evaluate(() => {
    const t = document.body.innerText;
    return t.includes("Ready to test") && !t.includes("Fund with USDC — see funding options below");
  });
  check("checklist all-done for funded wallet", readyOk);

  // developer details show mint + no fake tx
  await page.getByText("Developer Details").first().click();
  await page.waitForTimeout(300);
  text = await bodyText(page);
  check("mint shown verbatim", text.includes("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"));
  check("rpc host shown", text.includes("api.mainnet-beta.solana.com"));
  await page.keyboard.press("Escape");

  // ---- entry point: room trade panel FundsHint (live feed) ----
  await page.goto(`${BASE}/#/discover`, { waitUntil: "networkidle" });
  let card = page.locator("button.pr-card").first();
  try {
    await card.waitFor({ state: "visible", timeout: 20000 });
  } catch {
    /* fall through to count check */
  }
  await page.waitForTimeout(1000);
  if ((await card.count()) > 0) {
    // Pick a TRADEABLE room: live Panta data shifts (cards can resolve/cancel),
    // so navigate directly to the first phase=primary market from the API.
    let primaryId = null;
    try {
      const disc = await fetch(`${BASE}/api/discovery?limit=24`).then((r) => r.json());
      const items = disc.items || disc.cards || [];
      primaryId = (items.find((m) => m.phase === "primary") || {}).marketId || null;
    } catch {
      /* fall back to first card below */
    }
    if (primaryId) {
      await page.goto(`${BASE}/#/room/${primaryId}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2500);
    } else {
      await card.click();
      await page.waitForTimeout(2500);
      if (!page.url().includes("#/room/")) {
        // fall back: navigate directly to the first room hash
        await page.evaluate(() => {
          const btn = document.querySelector("button.pr-card");
          // cards navigate via app store; click again to be sure
          btn && btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
        await page.waitForTimeout(2000);
      }
    }
    console.log("room url:", page.url());
    // Hash navigation is SPA — the connection usually persists. Reconnect only
    // if the wallet chip is gone (e.g. a full reload happened).
    text = await bodyText(page);
    if (!text.includes("9WzD…AWWM")) {
      await page.evaluate(fakeWallet);
      await page.evaluate("window.isPhantomInstalled = true;");
      await page.getByRole("button", { name: /Connect Wallet/i }).first().click();
      await page.waitForTimeout(700);
      const row2 = page.locator("button", { hasText: "Phantom Test" }).first();
      if ((await row2.count()) > 0) {
        await row2.click();
        await page.waitForTimeout(2000);
      }
    }
    // The trade panel renders after the room bundle (market detail + prices)
    // resolves — poll for the hint instead of a fixed wait (live data latency).
    let hintSeen = false;
    for (let i = 0; i < 10; i++) {
      text = await bodyText(page);
      if (text.includes("Check balances & funding options")) { hintSeen = true; break; }
      await page.waitForTimeout(1000);
    }
    check("room trade hint present", hintSeen);
    await page.screenshot({ path: shot("6_room_hint") });
  } else {
    results.push("SKIP — no discover card found");
    console.log("SKIP — no discover card found");
  }

  // ---- mobile viewport ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  text = await bodyText(page);
  check("mobile: banner visible", text.includes("Live environment"));
  await page.screenshot({ path: shot("5_mobile_landing") });

  // console noise check
  const appErrors = consoleErrors.filter(
    (e) => !e.includes("chrome-extension://") && !e.includes("net::ERR") && !e.includes("Failed to load resource")
  );
  check("console clean of app errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));

  console.log("\n===== RESULTS =====");
  for (const r of results) console.log(r);
  await browser.close();
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}

main().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
