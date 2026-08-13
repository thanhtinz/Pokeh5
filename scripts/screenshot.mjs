/**
 * Screenshots every screen against the built bundle.
 *
 * The point is to look at what actually renders rather than what the markup
 * implies: the theme is driven by a value that changes over the whole game, so
 * a screen is captured at both ends of it — deep in debt and well out of it.
 *
 *   node scripts/screenshot.mjs [outDir]
 */
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const OUT = process.argv[2] ?? 'shots';
const VIEWPORT = { width: 393, height: 852 };

const SAVE_KEY = 'broketoboss.save.v1';
const TOKEN_KEY = 'broketoboss.token';
const USER_KEY = 'broketoboss.user';

/**
 * Máy chủ tài khoản riêng cho lần chụp này, cổng riêng, kho riêng.
 *
 * Chụp màn bảng xếp hạng mà giả lập câu trả lời của máy chủ thì bức ảnh chỉ
 * chứng minh được cái giả lập chạy đúng. Dựng hẳn máy chủ thật rồi đăng ký
 * mấy tài khoản qua đúng đường mà game dùng thì bức ảnh mới nói được điều gì.
 */
const API_PORT = 8788;
const API_DB = `${OUT}-api.sqlite`;
const API = `http://localhost:${API_PORT}/api`;

process.env['API_URL'] = `http://localhost:${API_PORT}`;

// Dọn kho **trước** khi dựng, không phải chỉ sau khi xong. Lần chạy nào hỏng
// giữa chừng cũng để lại file cũ, và lần sau đăng ký mấy cái tên đó sẽ ăn
// `name.taken` — tức là không có token, tức là mọi màn hình đứng ở cổng, tức là
// một lỗi trông chẳng liên quan gì tới nguyên nhân.
for (const leftover of [API_DB, `${API_DB}-wal`, `${API_DB}-shm`]) {
  await rm(leftover, { force: true });
}

const apiServer = spawn('node', ['server/index.mjs'], {
  env: { ...process.env, PORT: String(API_PORT), DB_FILE: API_DB },
  stdio: 'ignore',
});

/** Đợi máy chủ mở cổng, tối đa mười giây. */
async function waitForApi() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) return true;
    } catch {
      // Chưa lên. Thử lại.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

const PASSWORD = 'matkhaudaingoangoan';

/**
 * Vài người chơi để cái bảng có gì mà xếp.
 *
 * `tinz` cố tình nằm giữa bảng chứ không đứng đầu: hạng nhất thì không nhìn ra
 * được dòng "mình" kẹp giữa những người khác trông thế nào.
 *
 * Có một bước không hiển nhiên ở giữa. Máy chủ chặn tài khoản vừa lập mà đã
 * khai tài sản lớn — đó là toàn bộ tác dụng của `ceilingFor` — nên gửi thẳng
 * 9,4 nghìn tỷ vào một tài khoản mới toanh thì bị trả về `score.tooFast`, đúng
 * như nó phải thế. Cách chữa không phải là nới cổng, mà là **cho mấy tài khoản
 * này già đi một tuần** rồi mới gửi điểm. Đăng ký và gửi điểm vẫn đi qua đúng
 * hai đường mà game dùng; thứ duy nhất bị làm giả là thời gian.
 */
async function seedBoard() {
  // Xếp quanh mức mà bản lưu giàu thật sự đạt tới. Con số của `tinz` ở đây chỉ
  // là chỗ giữ hàng: client đăng nhập xong sẽ tự đẩy kỷ lục thật của nó lên, và
  // kỷ lục thì chỉ đi lên, nên cái to hơn sẽ thắng.
  const people = [
    ['ba_tam', 9.4e21, 96, 4],
    ['chu_bay', 2.2e20, 46, 3],
    ['co_hai', 8.1e19, 28, 2],
    ['tinz', 1e19, 60, 2],
    ['anh_tu', 4.4e18, 2, 1],
    ['di_ba', 6.6e17, 0, 0],
  ];

  const tokens = new Map();
  for (const [name] of people) {
    const registered = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, password: PASSWORD }),
    }).then((response) => response.json());
    tokens.set(name, registered);
  }

  // Người chơi của bản "mới toanh": có tài khoản, chưa có ván nào.
  const rookie = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'moi_choi', password: PASSWORD }),
  }).then((response) => response.json());

  const db = new DatabaseSync(API_DB);
  db.prepare('UPDATE users SET created_at = ?').run(Date.now() - 7 * 86_400_000);
  db.close();

  for (const [name, best, reputationTotal, runs] of people) {
    await fetch(`${API}/save`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokens.get(name).token}`,
      },
      body: JSON.stringify({
        save: { version: 1, lastSeenAt: 1 },
        score: { bestNetWorth: best, reputationTotal, runs, claimed: 8 },
      }),
    });
  }

  return { rich: tokens.get('tinz'), rookie };
}

/** Cùng phép tính với `dayIndex` trong `src/game/daily.ts`. */
function dayIndex(at) {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 86_400_000);
}

/** A save far enough along that every screen has something on it. */
function richSave(now, ownerId) {
  return {
    version: 1,
    ownerId,
    createdAt: now - 9_000_000,
    lastSeenAt: now,
    cash: 4.2e9,
    peakNetWorth: 6.1e9,
    ore: 320,
    tapLevel: 22,
    refineryLevel: 18,
    businesses: { cans: 320, cart: 210, wash: 140, busk: 90, scrap: 45, flip: 26, forklift: 12 },
    managers: ['cans', 'cart', 'wash', 'busk', 'scrap'],
    cycles: { flip: 12 },
    holdings: { grnd: { shares: 1400, avgCost: 38_000 }, moon: { shares: 90_000, avgCost: 2_100 } },
    marketTick: 900,
    marketSeed: 12345,
    autoTrader: true,
    job: { jobId: 'night', endsAt: now + 402_000 },
    card: null,
    nextCardAt: now + 600_000,
    boost: { multiplier: 3, endsAt: now + 41_000 },
    claimed: ['phone', 'dog', 'car', 'room', 'mother', 'zero', 'friends', 'kids'],
    bestNetWorth: 6.1e12,
    reputation: 40,
    reputationTotal: 60,
    runs: 2,
    perks: { offline: 2, tap: 3 },
    upgrades: { cans: 3, cart: 2, wash: 1 },
    achievements: ['tap1', 'tap2', 'card1', 'job1', 'unit1', 'unit2', 'mgr1', 'mgr2', 'up1', 'rich1'],
    dailyClaimedAt: 0,
    dailyStreak: 3,
    // Hôm nay, với mốc thấp hơn số đếm một chút, để ba việc hiện ra đang dở —
    // và "mở thêm 40 suất" thì vừa đủ xong, cho thấy nút nhận lúc sáng lên.
    questDay: dayIndex(now),
    questIds: ['tapB', 'tradeA', 'unitA'],
    questBase: { taps: 4190, cards: 17, jobs: 25, trades: 10, units: 1200, upgrades: 5 },
    questDone: [],
    stats: { taps: 4200, cards: 18, jobs: 26, trades: 12, units: 1240, upgrades: 6 },
    rngSeed: 777,
  };
}

const TABS = ['grind', 'empire', 'market', 'life', 'board', 'more'];

const apiUp = await waitForApi();
if (!apiUp) throw new Error('the account api did not start; every screen is behind it now');
const players = await seedBoard();

const server = await createServer({ server: { port: 5199 }, logLevel: 'warn' });
await server.listen();
const base = `http://localhost:5199`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Honour a pre-installed browser when the environment pins one, rather than
// downloading a second copy to match the bundled revision.
const executablePath = process.env['CHROMIUM_PATH'];
const browser = await chromium.launch(executablePath ? { executablePath } : {});

/** Mọi màn game giờ nằm sau cổng, nên fixture nào cũng phải mang một phiên. */
async function signedIn(page, save, who = players.rich) {
  await page.addInitScript(
    ([saveKey, seed, tokenKey, token, userKey, user]) => {
      if (seed) window.localStorage.setItem(saveKey, JSON.stringify(seed));
      window.localStorage.setItem(tokenKey, token);
      window.localStorage.setItem(userKey, JSON.stringify(user));
    },
    [SAVE_KEY, save, TOKEN_KEY, who.token, USER_KEY, who.user],
  );
}

// Cái cổng: chưa đăng nhập thì đây là toàn bộ game.
{
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.gate', { timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/gate.png` });
  await context.close();
}

for (const stage of ['broke', 'rich']) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  // Phải đăng nhập mới vào được game, nên cả hai bản đều mang sẵn một phiên.
  // Bản nợ là tài khoản vừa lập chưa có ván nào; bản giàu có ván đóng dấu đúng
  // chủ của nó — sai dấu là `loadSave` bỏ qua và ảnh chụp ra một ván trắng.
  const who = stage === 'rich' ? players.rich : players.rookie;
  await signedIn(page, stage === 'rich' ? richSave(Date.now(), who.user.id) : null, who);

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.shell', { timeout: 15_000 });

  // Dismiss the offline report if the seeded save triggered one.
  const sheet = page.locator('.sheet .btn--primary');
  if (await sheet.count()) await sheet.first().click();

  for (const [index, tab] of TABS.entries()) {
    await page.locator('.tab').nth(index).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${stage}-${tab}.png` });
  }

  // The colour of the whole interface at this point on the climb.
  const hue = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--hue'),
  );
  console.log(`${stage}: hue ${hue.trim()}`);

  await context.close();
}

// Every business at once, so all thirty-six drawn icons can be reviewed
// together rather than one district per session.
{
  const now = Date.now();
  const save = richSave(now, players.rich.user.id);
  save.lastSeenAt = now;
  save.job = null;
  save.boost = null;
  save.businesses = Object.fromEntries(
    ['cans','cart','wash','busk','scrap','flip','forklift','crate','fish','tug','customs','yard',
     'food','laundry','gym','cafe','cinema','hotel','fund','bank','insure','broker','ratings',
     'exchange','gallery','auction','yacht','jet','vineyard','island','tower','media','space',
     'fusion','bank2','empire'].map((id) => [id, 1]),
  );

  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1.5 });
  const page = await context.newPage();
  await signedIn(page, save);

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.shell', { timeout: 15_000 });
  const sheet = page.locator('.sheet .btn--primary');
  if (await sheet.count()) await sheet.first().click();
  await page.locator('.tab').nth(1).click();

  // Let the page grow to its content so one capture covers every row.
  await page.addStyleTag({
    content: 'html,body,#app,.shell{height:auto!important}.screen{overflow:visible!important}',
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/icons.png`, fullPage: true });
  await context.close();
}

// The opportunity card, which only ever exists for twenty-five seconds.
{
  const now = Date.now();
  const save = richSave(now, players.rich.user.id);
  save.cash = 18_400;
  save.peakNetWorth = -120_000;
  save.businesses = { cans: 40, cart: 22, wash: 9 };
  save.managers = ['cans', 'cart'];
  save.holdings = {};
  save.claimed = ['phone', 'dog', 'car', 'room'];
  save.boost = null;
  save.card = {
    key: 'debt',
    kind: 'cash',
    value: 86_400,
    seconds: 0,
    icon: 'coins',
    expiresAt: now + 19_000,
  };

  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await signedIn(page, save);

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sheet', { timeout: 15_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/card.png` });
  await context.close();
}

// The milestone payoff, which only appears for a moment when one is claimed.
{
  const now = Date.now();
  const save = richSave(now, players.rich.user.id);
  save.lastSeenAt = now;
  save.cash = 900_000;
  save.peakNetWorth = 900_000;
  save.businesses = { cans: 60, cart: 40, wash: 20, busk: 8 };
  save.managers = ['cans', 'cart', 'wash'];
  save.holdings = {};
  save.job = null;
  save.boost = null;
  // Reached but unclaimed, so the Life screen offers it.
  save.claimed = ['phone', 'dog', 'car', 'room', 'mother', 'zero'];

  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await signedIn(page, save);

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.shell', { timeout: 15_000 });
  const offline = page.locator('.sheet .btn--primary');
  if (await offline.count()) await offline.first().click();

  await page.locator('.tab').nth(3).click();
  await page.locator('.life__item--ready .btn').first().click();
  await page.waitForSelector('.sheet--art', { timeout: 5_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/milestone.png` });
  await context.close();
}

await browser.close();
await server.close();

apiServer.kill();
await rm(API_DB, { force: true });
await rm(`${API_DB}-wal`, { force: true });
await rm(`${API_DB}-shm`, { force: true });

console.log(`Wrote ${TABS.length * 2 + 4} screenshots to ${OUT}/`);
