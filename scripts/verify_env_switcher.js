/**
 * E2E — Environment Switcher (one-click Live / Sandbox / Demo).
 * Run: node scripts/verify_env_switcher.js
 *
 * Covers:
 *  - Testing & Funding shows the Environment section with 3 honest options
 *  - Default = Live (legacy, no cookie)
 *  - Switch to Sandbox → chip + section reflect SANDBOX, persists across reload
 *  - Switch to Demo → chip DEMO DATA, feed serves sample rooms (DEMO badges)
 *  - Switch back to Live → chip LIVE · MAINNET
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const shot = (n) => `/home/z/my-project/scripts/es_${n}.png`;

function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
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

  // fresh context = no cookie → legacy default (live)
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  let text = await bodyText(page);
  check("default chip is LIVE · MAINNET (no cookie)", text.includes("LIVE · MAINNET"));

  // open Testing & Funding via header chip
  const chip = page.locator("header button", { hasText: "LIVE · MAINNET" });
  await chip.first().click();
  await page.waitForTimeout(600);
  text = await bodyText(page);
  check("Environment section visible in Testing & Funding", text.includes("Environment") && text.includes("Switch any time"));
  check("three honest options listed", text.includes("Live — Solana Mainnet") && text.includes("Sandbox — Panta test mode") && text.includes("Demo — sample data"));
  check("honest no-testnet note", text.includes("Panta has no testnet"));
  check("Live marked ACTIVE", text.includes("ACTIVE"));
  await page.screenshot({ path: shot("1_center_live") });

  // switch to Sandbox
  await page.getByRole("button", { name: /Sandbox — Panta test mode/ }).click();
  await page.waitForTimeout(1500);
  text = await bodyText(page);
  check("chip switches to SANDBOX", text.includes("SANDBOX"));
  check("sandbox line honest (fixtures, no chain)", text.includes("fixture responses") || text.includes("sandbox fixtures"));
  await page.screenshot({ path: shot("2_center_sandbox") });

  // persistence across reload
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  text = await bodyText(page);
  check("SANDBOX persists after reload (cookie)", text.includes("SANDBOX"));
  const bannerSandbox = text.includes("Panta serves fixture responses") || text.includes("sandbox fixtures");
  check("banner reflects sandbox", bannerSandbox);

  // close any open overlay + open center again via chip, switch to Demo
  const chip2 = page.locator("header button", { hasText: "SANDBOX" });
  await chip2.first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Demo — sample data/ }).click();
  await page.waitForTimeout(1500);
  text = await bodyText(page);
  check("chip switches to DEMO DATA", text.includes("DEMO DATA"));
  await page.screenshot({ path: shot("3_center_demo") });

  // feed should serve sample rooms with DEMO badges
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/#/discover`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  text = await bodyText(page);
  check("demo feed shows DEMO DATA badges", text.includes("DEMO DATA"));

  // back to Live
  const chip3 = page.locator("header button", { hasText: "DEMO DATA" });
  await chip3.first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Live — Solana Mainnet/ }).click();
  await page.waitForTimeout(1800);
  text = await bodyText(page);
  check("chip switches back to LIVE · MAINNET", text.includes("LIVE · MAINNET"));
  await page.screenshot({ path: shot("4_back_live") });

  const realErrors = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("net::ERR_ABORTED")
  );
  check("no console/page errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
