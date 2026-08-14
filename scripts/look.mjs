/**
 * Soi một cảnh, thật to.
 *
 *   node scripts/look.mjs .yard out.png [width]
 *
 * Bảng soi asset chụp cả trang rồi mới xem, mà một cảnh vẽ sai thì phải nhìn
 * riêng nó ở cỡ lớn mới thấy — sai tỷ lệ, sai hướng sáng, hình nào lửng lơ.
 * Đây là cái kính lúp: mở trang soi, cắt đúng một phần tử, chụp.
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const selector = process.argv[2] ?? '.yard';
const out = process.argv[3] ?? 'look.png';
const width = Number(process.argv[4] ?? 720);

const server = await createServer({ server: { port: 5197 }, logLevel: 'warn' });
await server.listen();

const PINNED = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({
  viewport: { width: width + 80, height: 900 },
  deviceScaleFactor: 2,
});

await page.goto('http://localhost:5197/art.html?wealth=0', { waitUntil: 'networkidle' });
await page.waitForSelector(selector, { timeout: 15_000 });
await page.evaluate((w) => {
  document.documentElement.style.setProperty('--look', `${w}px`);
}, width);

const target = page.locator(selector).first();
await target.evaluate((element, w) => {
  const host = element.parentElement;
  if (host instanceof HTMLElement) host.style.width = `${w}px`;
}, width);

await page.waitForTimeout(400);
await target.screenshot({ path: out });

await browser.close();
await server.close();
process.exit(0);
