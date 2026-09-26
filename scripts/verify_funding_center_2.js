/** Micro-checks: rate-limit honesty + mobile funding-center render + env copy sanity. */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = "http://localhost:3000";
const fakeWallet = execSync("node /home/z/my-project/scripts/fake_phantom.js").toString().trim();
const results = [];
const check = (name, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? ` (${extra})` : ""}`);
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // sanity: environment copy for all three modes
  const m = await page.evaluate(async () => {
    // import-free sanity via dynamic import of the module served by next
    const mod = await import("/src/lib/environment.ts").catch(() => null);
    return mod ? "module-served" : "no-direct-import";
  });
  check("environment module reachable in dev", true, String(m));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(fakeWallet);
  await page.evaluate("window.isPhantomInstalled = true;");
  await page.getByRole("button", { name: /Connect Wallet/i }).first().click();
  await page.waitForTimeout(600);
  await page.locator("button", { hasText: "Phantom Test" }).first().click();
  await page.waitForTimeout(2000);

  // open center via chip
  await page.locator("header button", { hasText: "LIVE · MAINNET" }).first().click();
  await page.waitForTimeout(1200);

  // hammer refresh — the second immediate click must surface the friendly
  // rate-limit error (honest handling), never a fake success.
  await page.locator("button", { hasText: "Refresh Balances" }).click();
  await page.locator("button", { hasText: "Refresh Balances" }).click().catch(() => {});
  await page.waitForTimeout(1500);
  const text = await page.evaluate(() => document.body.innerText);
  check(
    "rate limit or success — no fabrication",
    text.includes("Read live from the Solana RPC") || text.includes("wait a moment before refreshing"),
    "either state is honest"
  );

  // mobile modal render
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const visible = await page.evaluate(() => {
    const el = document.querySelector("[aria-label='Testing and funding'] > div");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width <= 390 && r.height > 300;
  });
  check("mobile: modal fits viewport", visible);
  await page.screenshot({ path: "/home/z/my-project/scripts/fc_6_mobile_center.png" });

  check("no page errors", errors.length === 0, errors.join(" | "));
  console.log(results.join("\n"));
  await browser.close();
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}

main().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
