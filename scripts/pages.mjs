/**
 * Thử bản Pages đúng như người lạ sẽ mở nó.
 *
 *   npm run pages:check
 *
 * ## Vì sao typecheck với test không đủ
 *
 * Hai cái đó kiểm mã nguồn. Bản Pages hỏng theo hai kiểu mà mã nguồn vẫn xanh:
 *
 *  - **Vẫn hiện cổng đăng nhập.** `VITE_SOLO` không tới được lớp tài khoản, và
 *    người mở link nhận được một ô đăng nhập trỏ vào một máy chủ không tồn
 *    tại. Không có gì đỏ, không có lỗi nào trên console.
 *  - **404 vì nằm dưới thư mục con.** Pages của một repo phục vụ ở
 *    `/<tên-repo>/`, không phải ở gốc. Một đường dẫn tuyệt đối lọt vào đâu đó
 *    là cả bó asset không tải được — mà trên máy dev thì nó chạy, vì ở đó
 *    game nằm ngay gốc.
 *
 * Nên script này dựng thật, bày ra **dưới một thư mục con**, mở bằng trình
 * duyệt thật, rồi đòi ba thứ: vào thẳng được không cần đăng nhập, đủ sáu tab,
 * và không một lỗi nào — kể cả 404.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

import { chromium } from 'playwright';

/** Tên thư mục con giả lập `/<tên-repo>/` của GitHub Pages. */
const REPO = 'Pokeh5';
const PORT = 4321;

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} → ${code}`))));
  });
}

console.log('Dựng bản một mình…');
await run('npm', ['run', 'build:solo']);

const root = await mkdtemp(join(tmpdir(), 'btb-pages-'));
await cp('dist', join(root, REPO), { recursive: true });

const web = createServer(async (request, response) => {
  let path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('không có');
  }
});
await new Promise((resolve) => web.listen(PORT, resolve));

const PINNED = '/opt/pw-browsers/chromium';
const executablePath = process.env['CHROMIUM_PATH'] ?? (existsSync(PINNED) ? PINNED : undefined);
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });

const found = [];
page.on('pageerror', (error) => found.push(`PAGEERROR ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') found.push(`ERROR ${message.text()}`);
});
page.on('response', (response) => {
  if (response.status() >= 400) found.push(`HTTP ${response.status()} ${response.url()}`);
});

await page.goto(`http://localhost:${PORT}/${REPO}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Cổng đăng nhập ở bản Pages là hỏng, không phải là một trạng thái.
if (await page.locator('.gate').count()) {
  found.push('CÒN CỔNG ĐĂNG NHẬP — `VITE_SOLO` không tới được lớp tài khoản');
}

// Dẹp màn mở đầu rồi đi một vòng.
for (let i = 0; i < 5; i += 1) {
  const button = page.locator('.scrim button').last();
  if (!(await button.count())) break;
  await button.click().catch(() => {});
  await page.waitForTimeout(220);
}

const tabs = await page.locator('.tab').count();
if (tabs !== 6) found.push(`CHỈ CÓ ${tabs} TAB, phải có sáu`);

for (let i = 0; i < tabs; i += 1) {
  await page.locator('.tab').nth(i).click();
  await page.waitForTimeout(320);
}

await page.screenshot({ path: 'shots/pages.png' });

await browser.close();
await new Promise((resolve) => web.close(resolve));
await rm(root, { recursive: true, force: true });

const unique = [...new Set(found)];
console.log(unique.length ? unique.join('\n') : `Bản Pages chạy được dưới /${REPO}/, sáu tab, không lỗi.`);
process.exit(unique.length ? 1 : 0);
