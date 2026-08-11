#!/usr/bin/env node
/**
 * Boots the game in headless Chromium at phone resolution, drives a few
 * interactions and saves screenshots. This is the smoke test: if the atlases,
 * fonts, save layer or scene wiring are broken, the run fails here rather than
 * on someone's phone.
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('screenshots');
const VIEWPORT = { width: 412, height: 915 }; // A typical Android portrait window.
const GAME = { width: 720, height: 1280 };

/**
 * Phaser's FIT mode letterboxes the canvas, so a tap has to be mapped from the
 * design resolution the layout is written in back to page pixels.
 */
const SCALE = Math.min(VIEWPORT.width / GAME.width, VIEWPORT.height / GAME.height);
const OFFSET_X = (VIEWPORT.width - GAME.width * SCALE) / 2;
const OFFSET_Y = (VIEWPORT.height - GAME.height * SCALE) / 2;

const toPage = (gx, gy) => [OFFSET_X + gx * SCALE, OFFSET_Y + gy * SCALE];

/** Any point on the scrim outside the dialog dismisses the top modal. */
const DISMISS = [40, 1240];

const STEPS = [
  { name: '01-city', tap: null, wait: 2600, dismiss: false },
  { name: '02-formation', tap: [496, 1096], wait: 900, dismiss: true },
  { name: '03-box', tap: [218, 1232], wait: 900, dismiss: true },
  { name: '04-summon', tap: [632, 1096], wait: 900, dismiss: true },
  { name: '05-quests', tap: [74, 246], wait: 900, dismiss: true },
  { name: '06-trials', tap: [502, 1232], wait: 900, dismiss: true },
  // The battle scene replaces the hub rather than opening a modal.
  { name: '07-battle', tap: [574, 995], wait: 2400, dismiss: false },
];

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const server = await createServer({
    server: { port: 5199, strictPort: true },
    logLevel: 'error',
  });
  await server.listen();

  // The image pins a Chromium build under PLAYWRIGHT_BROWSERS_PATH; prefer it
  // over whatever version this Playwright release would download.
  const browsersRoot = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  const pinned = (await readdir(browsersRoot).catch(() => []))
    .filter((entry) => entry.startsWith('chromium-'))
    .sort()
    .pop();

  const browser = await chromium.launch({
    ...(pinned ? { executablePath: path.join(browsersRoot, pinned, 'chrome-linux', 'chrome') } : {}),
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`request: ${req.url()}`));

  await page.goto('http://localhost:5199/', { waitUntil: 'load' });

  for (const step of STEPS) {
    if (step.tap) await page.mouse.click(...toPage(...step.tap));
    await page.waitForTimeout(step.wait);
    await page.screenshot({ path: path.join(OUT_DIR, `${step.name}.png`) });
    console.log(`[shot] ${step.name}.png`);

    if (step.dismiss) {
      await page.mouse.click(...toPage(...DISMISS));
      await page.waitForTimeout(400);
    }
  }

  // A live canvas plus a written save is the real proof it booted.
  const health = await page.evaluate(() => {
    const canvas = document.querySelector('#app canvas');
    return {
      hasCanvas: Boolean(canvas),
      width: canvas?.width ?? 0,
      height: canvas?.height ?? 0,
      saveBytes: window.localStorage.getItem('pokeh5.save.v1')?.length ?? 0,
    };
  });

  await browser.close();
  await server.close();

  console.log('[shot] canvas', health);

  const fail = (message) => {
    console.error(`[shot] ${message}`);
    process.exitCode = 1;
  };

  if (problems.length > 0) {
    console.error('[shot] problems detected:');
    for (const problem of [...new Set(problems)]) console.error('  -', problem);
    process.exitCode = 1;
    return;
  }
  if (!health.hasCanvas || health.width === 0) return fail('no canvas was rendered');
  if (health.saveBytes === 0) return fail('the save was never written');

  console.log('[shot] clean run');
}

main().catch((err) => {
  console.error('[shot] failed:', err);
  process.exitCode = 1;
});
