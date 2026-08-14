/**
 * Soi *vật thể*, không phải ô.
 *
 *   node scripts/rects.mjs out.png 'city:12,14,3,2 urban:6,10,2,2'
 *
 * Đây là công cụ sinh ra từ một chẩn đoán: mấy bộ tile này vẽ đồ vật **trải
 * qua nhiều ô** — cái ô tô chiếm hai cột bốn hàng, cái sạp hàng chiếm hai nhân
 * hai, cái cây chiếm một nhân hai. Lấy mỗi lần một ô thì cái nhận được không
 * phải đồ vật mà là *mảnh* của nó: một khúc ống, một tấm nệm ghế, một mẩu mái.
 * Nhìn ở cỡ ba mươi hai pixel thì mảnh nào cũng chỉ là vệt màu.
 *
 * Nên bảng soi này lấy theo **khối cột-hàng-rộng-cao**, đúng thứ mà lớp vẽ sẽ
 * lấy. Nhìn thấy nguyên cái xe thì mới biết nó là cái xe.
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const SHEETS = {
  city: { file: 'src/assets/kenney/city/tiles.png', cols: 37, rows: 28, gap: 1 },
  urban: { file: 'src/assets/kenney/rpg-urban/tiles.png', cols: 27, rows: 18, gap: 0 },
};

const out = process.argv[2] ?? 'rects.png';
const specs = (process.argv[3] ?? '').split(/\s+/).filter(Boolean);
const SIZE = Number(process.argv[4] ?? 40);

const cells = specs.map((spec) => {
  const [name, rest] = spec.split(':');
  const [col, row, w, h] = rest.split(',').map(Number);
  const sheet = SHEETS[name];
  const step = SIZE * (1 + sheet.gap / 16);
  const tiles = [];
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      tiles.push(
        `<i style="left:${dx * SIZE}px;top:${dy * SIZE}px;width:${SIZE}px;height:${SIZE}px;` +
          `background-image:url('http://localhost:5195/${sheet.file}');` +
          `background-size:${(sheet.cols * (16 + sheet.gap) - sheet.gap) * (SIZE / 16)}px ${(sheet.rows * (16 + sheet.gap) - sheet.gap) * (SIZE / 16)}px;` +
          `background-position:${-(col + dx) * step}px ${-(row + dy) * step}px"></i>`,
      );
    }
  }
  const first = row * sheet.cols + col;
  return (
    `<span class="c"><span class="box" style="width:${w * SIZE}px;height:${h * SIZE}px">` +
    `${tiles.join('')}</span><b>${name} ${col},${row} ${w}x${h}<br>#${first}</b></span>`
  );
});

const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: #14161c; font: 10px/1.3 monospace; color: #ffd; }
  .g { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; padding: 10px; }
  .c { display: grid; justify-items: center; gap: 3px; }
  .box { position: relative; outline: 1px solid #3a3f4a; }
  i { position: absolute; image-rendering: pixelated; background-repeat: no-repeat; }
</style><div class="g">${cells.join('')}</div>`;

const server = await createServer({ server: { port: 5195 }, logLevel: 'warn' });
await server.listen();

const PINNED = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({ viewport: { width: 1400, height: 400 } });
await page.setContent(html);
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: true });

await browser.close();
await server.close();
process.exit(0);
