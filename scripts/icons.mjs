/**
 * Vẽ `public/icon.svg` thành PNG.
 *
 *   node scripts/icons.mjs
 *
 * Chạy tay khi nào sửa cái SVG, kết quả commit vào repo — không nằm trong
 * `npm run build`. Lý do: dựng bản phát hành mà phải mở một cái trình duyệt
 * thì máy nào không có Chromium là không dựng nổi, và một cái biểu tượng đổi
 * vài năm một lần không đáng để đánh đổi chuyện đó.
 *
 * Vẫn cần PNG dù SVG nhẹ hơn và sắc hơn: Safari trên iOS không nhận biểu tượng
 * SVG cho màn hình chính, mà iOS lại đúng là chỗ người ta bấm "thêm vào màn
 * hình chính" nhiều nhất.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const SIZES = [192, 512];

const svg = await readFile('public/icon.svg', 'utf8');

const browser = await chromium.launch(
  process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {},
);

for (const size of SIZES) {
  const context = await browser.newContext({ viewport: { width: size, height: size } });
  const page = await context.newPage();

  // `omitBackground` để phần nào trong suốt thì ra trong suốt; cái SVG này phủ
  // kín nền nên không dùng tới, nhưng bản sau sửa thành bo góc thì cần.
  await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.waitForTimeout(80);

  const png = await page.screenshot({ omitBackground: true });
  await writeFile(`public/icon-${size}.png`, png);
  console.log(`icon-${size}.png`);

  await context.close();
}

await browser.close();
