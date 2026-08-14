/**
 * Bảng soi tile: cắt nguyên tấm sheet ra từng ô, phóng to, ghi số lên.
 *
 *   node scripts/contact.mjs city out.png [colTừ] [colĐến] [hàngTừ] [hàngĐến]
 *
 * Đây là công cụ đã thiếu hai vòng trước, và thiếu nó thì hỏng hai vòng: tôi
 * đọc số ô từ một bảng dựng bằng hình học khác với hình học `Pix` dùng để vẽ,
 * nên mọi số đọc ra đều lệch — có lần lệch thành một cái thùng gỗ đứng giữa
 * mặt tiền cao ốc kính. Nên script này **lấy đúng công thức của `Pix`**:
 * `step = size * (1 + gap / 16)`. Sai chỗ khác thì sửa được, sai chỗ này thì
 * mọi thứ đọc ra sau đó đều sai mà nhìn vẫn hợp lý.
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const SHEETS = {
  city: { file: 'src/assets/kenney/city/tiles.png', cols: 37, rows: 28, gap: 1 },
  urban: { file: 'src/assets/kenney/rpg-urban/tiles.png', cols: 27, rows: 18, gap: 0 },
};

const name = process.argv[2] ?? 'city';
const out = process.argv[3] ?? 'contact.png';
const c0 = Number(process.argv[4] ?? 0);
const c1 = Number(process.argv[5] ?? SHEETS[name].cols);
const r0 = Number(process.argv[6] ?? 0);
const r1 = Number(process.argv[7] ?? SHEETS[name].rows);

const sheet = SHEETS[name];
const SIZE = 48;
const step = SIZE * (1 + sheet.gap / 16);

const cells = [];
for (let row = r0; row < r1; row += 1) {
  for (let col = c0; col < c1; col += 1) {
    const i = row * sheet.cols + col;
    cells.push(
      `<span class="c"><i style="background-size:${(sheet.cols * (16 + sheet.gap) - sheet.gap) * (SIZE / 16)}px ${(sheet.rows * (16 + sheet.gap) - sheet.gap) * (SIZE / 16)}px;` +
        `background-position:${-col * step}px ${-row * step}px"></i><b>${i}</b></span>`,
    );
  }
}

const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: #111; font: 11px/1 monospace; color: #ffd; }
  .g { display: grid; grid-template-columns: repeat(${c1 - c0}, ${SIZE + 6}px); gap: 2px; padding: 4px; }
  .c { display: grid; justify-items: center; gap: 1px; }
  i { width: ${SIZE}px; height: ${SIZE}px; image-rendering: pixelated;
      background-image: url('/${sheet.file}'); background-repeat: no-repeat;
      outline: 1px solid #333; }
</style><div class="g">${cells.join('')}</div>`;

const server = await createServer({ server: { port: 5196 }, logLevel: 'warn' });
await server.listen();

const PINNED = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({ viewport: { width: (c1 - c0) * (SIZE + 8) + 16, height: 400 } });
// Ảnh phải qua vite mới nạp được, nên trỏ thẳng vào máy chủ chứ không dùng
// đường dẫn tương đối — `setContent` không có gốc để giải nó ra.
await page.setContent(html.replace(`/${sheet.file}`, `http://localhost:5196/${sheet.file}`));
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: true });

await browser.close();
await server.close();
process.exit(0);
