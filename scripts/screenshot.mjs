/**
 * Screenshots every screen against the built bundle.
 *
 * The point is to look at what actually renders rather than what the markup
 * implies: the theme is driven by a value that changes over the whole game, so
 * a screen is captured at both ends of it — deep in debt and well out of it.
 *
 *   node scripts/screenshot.mjs [outDir]
 */
import { mkdir, rm } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const OUT = process.argv[2] ?? 'shots';
const VIEWPORT = { width: 393, height: 852 };

const SAVE_KEY = 'broketoboss.save.v1';

/** A save far enough along that every screen has something on it. */
function richSave(now) {
  return {
    version: 1,
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
    holdings: { grnd: { shares: 1400, avgCost: 38 }, moon: { shares: 90_000, avgCost: 2.1 } },
    marketTick: 900,
    marketSeed: 12345,
    autoTrader: true,
    job: { jobId: 'night', endsAt: now + 402_000 },
    card: null,
    nextCardAt: now + 600_000,
    boost: { multiplier: 3, endsAt: now + 41_000 },
    claimed: ['phone', 'dog', 'car', 'room', 'mother', 'zero', 'friends', 'kids'],
    rngSeed: 777,
  };
}

const TABS = ['grind', 'empire', 'market', 'life'];

const server = await createServer({ server: { port: 5199 }, logLevel: 'warn' });
await server.listen();
const base = `http://localhost:5199`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Honour a pre-installed browser when the environment pins one, rather than
// downloading a second copy to match the bundled revision.
const executablePath = process.env['CHROMIUM_PATH'];
const browser = await chromium.launch(executablePath ? { executablePath } : {});

for (const stage of ['broke', 'rich']) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  if (stage === 'rich') {
    await page.addInitScript(
      ([key, save]) => window.localStorage.setItem(key, JSON.stringify(save)),
      [SAVE_KEY, richSave(Date.now())],
    );
  }

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

// The opportunity card, which only ever exists for twenty-five seconds.
{
  const now = Date.now();
  const save = richSave(now);
  save.cash = 18_400;
  save.peakNetWorth = -120_000;
  save.businesses = { cans: 40, cart: 22, wash: 9 };
  save.managers = ['cans', 'cart'];
  save.holdings = {};
  save.claimed = ['phone', 'dog', 'car', 'room'];
  save.boost = null;
  save.card = {
    id: 'shot',
    kind: 'cash',
    title: 'Old Debt Repaid',
    flavour: 'A friend from before it all went wrong.',
    value: 86_400,
    seconds: 0,
    icon: '🤝',
    expiresAt: now + 19_000,
  };

  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, JSON.stringify(value)),
    [SAVE_KEY, save],
  );

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sheet', { timeout: 15_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/card.png` });
  await context.close();
}

await browser.close();
await server.close();
console.log(`Wrote ${TABS.length * 2} screenshots to ${OUT}/`);
