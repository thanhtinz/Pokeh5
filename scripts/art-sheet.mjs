/**
 * Chụp bảng soi asset.
 *
 *   node scripts/art-sheet.mjs [outDir]
 *
 * Tách khỏi `screenshot.mjs` vì nó trả lời một câu hỏi khác: kia hỏi "màn hình
 * này bày ra có đúng không", còn cái này hỏi "sáu mươi cái hình có ra hình
 * không". Trộn vào một chỗ thì mỗi lần muốn soi hình lại phải dựng cả máy chủ
 * tài khoản.
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const OUT = process.argv[2] ?? 'shots';

const server = await createServer({ server: { port: 5198 }, logLevel: 'warn' });
await server.listen();

await mkdir(OUT, { recursive: true });

const executablePath = process.env['CHROMIUM_PATH'];
const browser = await chromium.launch(executablePath ? { executablePath } : {});

// Hai đầu của thang màu chủ đề: hình nào không khai vật liệu thì vẫn chạy theo
// nó, và cái đĩa sáng ở hàng giữa cũng đổi màu theo.
for (const [name, wealth] of [
  ['art-broke', 0],
  ['art-rich', 1],
]) {
  const context = await browser.newContext({
    viewport: { width: 1180, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  await page.goto(`http://localhost:5198/art.html?wealth=${wealth}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('.sheet-grid', { timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

  await context.close();
}

await browser.close();
await server.close();
console.log(`Wrote the art sheets to ${OUT}/`);
