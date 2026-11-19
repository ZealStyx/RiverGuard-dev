import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.goto("file:///workspace/.grok/og-card.html", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const box = await page.locator(".lockup").boundingBox();
const title = await page.locator("h1").boundingBox();
console.log(JSON.stringify({ lockup: box, title }));
await page.screenshot({ path: "/workspace/.grok/og-raw.png", type: "png" });
await browser.close();
