/**
 * Nướng bộ Fluent Emoji Flat thành **một tấm PNG** cộng một bảng tra.
 *
 *   node scripts/sprite.mjs
 *
 * ## Vì sao nướng sẵn rồi commit, chứ không sinh lúc dựng
 *
 * Bước này cần một trình duyệt để đọc SVG. Bắt `npm run build` phải có
 * Playwright thì bản dựng hỏng ở mọi máy chưa cài — mà cái nó sinh ra thì
 * *không đổi* giữa các lần chạy. Nên chạy tay khi sửa `icon-map.json`, rồi
 * commit cả tấm PNG lẫn `src/ui/icons.ts` vào Git, y như tấm tile vendor trước
 * đây. Ai sửa bảng ghép thì chạy lại lệnh trên và commit kết quả.
 *
 * ## Vì sao một tấm chứ không phải bốn mươi mốt file
 *
 * Bốn mươi mốt file là bốn mươi mốt lượt tải, và bốn mươi mốt dòng nữa trong
 * danh sách service worker phải nạp sẵn. Một tấm là một lượt. Đổi lại thì phải
 * cắt, mà cắt là chỗ đã sinh ra gần chục lỗi lệch một cột trong repo này —
 * nên lưới ở đây **đều tăm tắp, không viền, không khe**: ô thứ `i` nằm ở cột
 * `i % COLS`, hàng `floor(i / COLS)`, hết. Không có toạ độ nào viết tay.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

/** Một ô vuông bao nhiêu pixel trong tấm PNG. */
const CELL = 192;

/** Lưới bao nhiêu cột. Số hàng suy ra từ số hình. */
const COLS = 7;

const SHEET = 'src/assets/fluent/sheet.png';
const INDEX = 'src/ui/icons.ts';

const set = JSON.parse(
  readFileSync('node_modules/@iconify-json/fluent-emoji-flat/icons.json', 'utf8'),
);

/** Bảng ghép: nhóm → { id trong game: tên hình trong bộ Fluent }. */
const groups = JSON.parse(readFileSync('scripts/icon-map.json', 'utf8'));

/** Trải phẳng thành một danh sách, và **thứ tự này là thứ tự ô trong tấm**. */
const entries = Object.values(groups).flatMap((group) => Object.entries(group));

const missing = entries.filter(([, name]) => !set.icons[name]);
if (missing.length > 0) {
  console.error('Không có trong bộ Fluent:', missing.map(([id, name]) => `${id}→${name}`).join(', '));
  process.exit(1);
}

const duplicates = entries
  .map(([id]) => id)
  .filter((id, i, all) => all.indexOf(id) !== i);
if (duplicates.length > 0) {
  console.error('Trùng id:', duplicates.join(', '));
  process.exit(1);
}

const rows = Math.ceil(entries.length / COLS);

/**
 * Một hình dựng thành thẻ `<svg>` đủ dùng.
 *
 * `viewBox` phải lấy từ chính hình đó chứ không đóng cứng 32×32: bộ này có
 * hình khai kích thước riêng, và ép sai viewBox thì hình bị cắt hoặc thu nhỏ
 * lệch tâm — mà ở cỡ 192 pixel thì nhìn vẫn "như một cái icon".
 */
function svg(name) {
  const icon = set.icons[name];
  const w = icon.width ?? set.width ?? 32;
  const h = icon.height ?? set.height ?? 32;
  return `<svg viewBox="0 0 ${w} ${h}" width="${CELL}" height="${CELL}">${icon.body}</svg>`;
}

const cells = entries
  .map(([, name], i) => {
    const x = (i % COLS) * CELL;
    const y = Math.floor(i / COLS) * CELL;
    return `<div style="position:absolute;left:${x}px;top:${y}px;width:${CELL}px;height:${CELL}px">${svg(name)}</div>`;
  })
  .join('');

const html = `<body style="margin:0;background:transparent">
  <div style="position:relative;width:${COLS * CELL}px;height:${rows * CELL}px">${cells}</div>
</body>`;

const browser = await chromium.launch(
  process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {},
);
const page = await browser.newPage({
  viewport: { width: COLS * CELL, height: rows * CELL },
  deviceScaleFactor: 1,
});
await page.setContent(html);

mkdirSync('src/assets/fluent', { recursive: true });
// `omitBackground` để nền trong suốt: tấm này nằm trên nền tối của game, và
// một tấm có nền trắng thì mỗi hình hiện ra trong một cái ô vuông trắng.
await page.screenshot({ path: SHEET, omitBackground: true });
await browser.close();

const lines = entries.map(([id], i) => `  ${JSON.stringify(id)}: ${i},`).join('\n');

writeFileSync(
  INDEX,
  `/**
 * Bảng tra ô trong tấm sprite — **sinh tự động, đừng sửa tay**.
 *
 *   node scripts/sprite.mjs
 *
 * Nguồn là \`scripts/icon-map.json\`. Sửa bảng ghép ở đó rồi chạy lại lệnh
 * trên; sửa thẳng file này thì lần sinh sau mất hết.
 */

/** Lưới của tấm sprite: đều tăm tắp, không viền, không khe. */
export const ICON_COLS = ${COLS};
export const ICON_ROWS = ${rows};

/** Một ô vuông bao nhiêu pixel trong tấm PNG gốc. */
export const ICON_CELL = ${CELL};

/** Id trong game → số thứ tự ô, đếm từ trái sang phải rồi xuống dòng. */
export const ICONS: Record<string, number> = {
${lines}
};
`,
  'utf8',
);

console.log(`${SHEET} — ${entries.length} hình, lưới ${COLS}×${rows}, ô ${CELL}px`);
console.log(`${INDEX} — bảng tra`);
