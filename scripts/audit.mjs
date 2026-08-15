/**
 * Đi một vòng khắp game và nhặt mọi thứ kêu lên.
 *
 *   node scripts/audit.mjs
 *
 * ## Vì sao cần một cái nữa, đã có test rồi
 *
 * Bài test kiểm **luật chơi** — chúng chạy trong Node, không có DOM, và đó
 * chính là điểm mạnh của chúng. Nhưng cả lớp giao diện thì không bài nào sờ
 * tới: một `undefined` lọt vào `toFixed`, một khoá i18n gõ sai, một ảnh 404,
 * một lớp phủ mở ra mà không đóng lại được — không cái nào làm test đỏ, và
 * cũng không cái nào làm ảnh chụp màn hình xấu đi thấy được.
 *
 * Nên cái này bấm thật: đăng ký qua đúng cái cổng người chơi đi qua, bấm mọi
 * nút bấm được ở cả sáu màn, chạm bốn chục cái vào chỗ chạm, rồi in ra mọi
 * `pageerror`, mọi `console.error`, mọi phản hồi HTTP từ 400 trở lên.
 *
 * ## Tự dựng lấy máy chủ, tự dọn lấy kho
 *
 * Đúng lý do `screenshot.mjs` cũng làm thế: dùng máy chủ đang chạy sẵn thì
 * lượt soi phụ thuộc vào việc ai đó đã bật nó, và một kho dùng chung thì lần
 * chạy trước để lại tên tài khoản khiến lần sau ăn `name.taken` — hiện ra
 * thành "không qua được cổng", một câu không nói gì về nguyên nhân thật.
 *
 * ## Không bấm mấy nút phá ván
 *
 * "Đăng xuất", "Làm lại", "Xoá" đều bấm được, và bấm trúng một cái là toàn bộ
 * quãng còn lại chỉ soi được màn đăng nhập. Chúng bị loại theo chữ trên nút.
 * Đổi lại, nếu vẫn văng về cổng thì script ghi lại **tên nút vừa bấm** — vì
 * lúc ấy chính cái nút đó mới là phát hiện.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';

import { chromium } from 'playwright';
import { createServer } from 'vite';

const API_PORT = 8789;
const API_DB = 'shots/audit-api.sqlite';
const WEB_PORT = 5193;

process.env['API_URL'] = `http://localhost:${API_PORT}`;

for (const leftover of [API_DB, `${API_DB}-wal`, `${API_DB}-shm`]) {
  await rm(leftover, { force: true });
}

const apiServer = spawn('node', ['server/index.mjs'], {
  env: { ...process.env, PORT: String(API_PORT), DB_FILE: API_DB },
  stdio: 'ignore',
});
process.on('exit', () => apiServer.kill());

/** Đợi đúng máy chủ vừa dựng mở cổng. `uptime` phân biệt nó với một cái xác cũ. */
async function waitForApi() {
  for (let i = 0; i < 100; i += 1) {
    if (apiServer.exitCode !== null) {
      throw new Error(
        `máy chủ tài khoản tắt ngay lúc dựng (mã ${apiServer.exitCode}) — ` +
          `thường là cổng ${API_PORT} đang có người khác giữ.`,
      );
    }
    try {
      const health = await fetch(`http://localhost:${API_PORT}/api/health`).then((r) =>
        r.ok ? r.json() : null,
      );
      if (health) return true;
    } catch {
      // Chưa mở cổng, đợi tiếp.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

if (!(await waitForApi())) throw new Error('máy chủ tài khoản không mở cổng trong mười giây');

const web = await createServer({ server: { port: WEB_PORT }, logLevel: 'silent' });
await web.listen();

const PINNED = '/opt/pw-browsers/chromium';
const executablePath = process.env['CHROMIUM_PATH'] ?? (existsSync(PINNED) ? PINNED : undefined);
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });

const problems = [];
const note = (line) => problems.push(line);

page.on('pageerror', (error) => note(`PAGEERROR ${error.message}`));
page.on('console', (message) => {
  const kind = message.type();
  if (kind === 'error' || kind === 'warning') note(`${kind.toUpperCase()} ${message.text()}`);
});
page.on('response', (response) => {
  if (response.status() >= 400) note(`HTTP ${response.status()} ${response.url()}`);
});

/**
 * Dẹp mọi lớp phủ đang chắn đường.
 *
 * Màn mở đầu, thẻ cơ hội, mốc cuộc đời và báo cáo offline đều là `.scrim`, và
 * cái nào cũng có thể hiện ra giữa chừng. Không dẹp thì lượt soi dừng ở cái
 * đầu tiên và mọi màn phía sau không được sờ tới lần nào.
 */
async function clearOverlays() {
  for (let i = 0; i < 8; i += 1) {
    if (!(await page.locator('.scrim').count())) return;
    const button = page.locator('.scrim button').last();
    if (!(await button.count())) return;
    try {
      await button.click({ timeout: 700 });
    } catch {
      return;
    }
    await page.waitForTimeout(180);
  }
  note('LỚP PHỦ KHÔNG CHỊU ĐÓNG sau tám lần bấm');
}

const atGate = async () => (await page.locator('.gate').count()) > 0;

await page.goto(`http://localhost:${WEB_PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

if (await atGate()) {
  await page.locator('.auth__input').first().fill(`soi${Date.now().toString(36).slice(-6)}`);
  await page.locator('.auth__input').nth(1).fill('matkhaudaithat');
  await page.locator('.gate .btn--primary').first().click();
  await page.waitForTimeout(2500);
  if (await atGate()) note('KHÔNG QUA ĐƯỢC CỔNG ĐĂNG KÝ');
}

/*
 * Nút nào bấm vào là hỏng cả lượt soi.
 *
 * Phải có **cả hai thứ tiếng**: vòng soi bấm trúng cái nút đổi ngôn ngữ ở màn
 * Cuộc đời, nên từ đó trở đi mọi nhãn đều là tiếng Anh — lần chạy đầu tiên
 * chết đúng ở "Sign out" vì danh sách này mới chỉ có "đăng xuất".
 */
const AVOID =
  /đăng xuất|làm lại|xoá|xóa|thoát|đổi tài khoản|sign ?out|log ?out|reset|delete|start over|wipe/i;
let lastLabel = '(chưa bấm gì)';

outer: for (let round = 0; round < 2 && !(await atGate()); round += 1) {
  const tabs = await page.locator('.tab').count();
  if (tabs === 0) {
    note('KHÔNG THẤY THANH TAB nào sau khi vào game');
    break;
  }

  for (let i = 0; i < tabs; i += 1) {
    await clearOverlays();
    try {
      await page.locator('.tab').nth(i).click({ timeout: 2000 });
    } catch {
      note(`MẤT THANH TAB sau khi bấm "${lastLabel}"`);
      break outer;
    }
    await page.waitForTimeout(250);

    const buttons = page.locator('.screen button:not([disabled])');
    const count = Math.min(await buttons.count(), 12);

    for (let b = 0; b < count; b += 1) {
      const button = buttons.nth(b);
      let label = '';
      try {
        label = (await button.innerText({ timeout: 400 })).trim();
      } catch {
        continue;
      }
      if (AVOID.test(label)) continue;

      await clearOverlays();
      try {
        await button.click({ timeout: 700 });
        lastLabel = label || '(nút không chữ)';
      } catch {
        continue;
      }
      await page.waitForTimeout(90);

      if (await atGate()) {
        note(`VĂNG VỀ CỔNG sau khi bấm "${lastLabel}"`);
        break outer;
      }
    }
  }
}

if (!(await atGate())) {
  await clearOverlays();
  try {
    await page.locator('.tab').first().click({ timeout: 2000 });
    await page.waitForTimeout(250);
    const stage = page.locator('.stage');
    if (await stage.count()) {
      const box = await stage.boundingBox();
      for (let i = 0; i < 40; i += 1) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  } catch {
    note('KHÔNG VỀ ĐƯỢC MÀN CÀY để thử chạm');
  }
}

await page.waitForTimeout(600);

const found = [...new Set(problems)];
console.log(found.length ? found.join('\n') : 'Đi hết một vòng, không có gì kêu.');

await browser.close();
await web.close();
apiServer.kill();

for (const leftover of [API_DB, `${API_DB}-wal`, `${API_DB}-shm`]) {
  await rm(leftover, { force: true });
}

// Mã thoát khác 0 khi có phát hiện, để cắm được vào CI mà không phải đọc log.
process.exit(found.length ? 1 : 0);
