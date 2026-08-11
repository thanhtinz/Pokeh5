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
 * design resolution the layout is written in back to page pixels. The canvas
 * rect is measured rather than recomputed: guessing how the browser laid it out
 * is exactly how taps end up silently landing on the wrong thing.
 */
async function canvasRect(page) {
  const rect = await page.evaluate(() => {
    const canvas = document.querySelector('#app canvas');
    if (!canvas) return null;
    const { left, top, width, height } = canvas.getBoundingClientRect();
    return { left, top, width, height };
  });
  if (!rect || rect.width === 0) throw new Error('the game canvas was never laid out');
  return rect;
}

function mapper(rect) {
  return (gx, gy) => [
    rect.left + (gx / GAME.width) * rect.width,
    rect.top + (gy / GAME.height) * rect.height,
  ];
}

/** Any point on the scrim outside the dialog dismisses the top modal. */
const DISMISS = [40, 1240];

/**
 * Each step is a sequence of taps in design-resolution coordinates, then a
 * screenshot. Reaching the ascension and artifact screens takes three taps
 * (box, first card, action), which is exactly the path a player walks.
 */
const NAV = (index) => [88 + index * 136, 1205];
const FIRST_CARD = [360, 345];

/**
 * `expect` is what turns this from a screenshot dump into a test: `modal` means
 * a dialog must be open by the end of the step, `battle` that the Battle scene
 * must be running. A tap that silently misses now fails the run.
 */
const STEPS = [
  { name: '01-city', taps: [], wait: 2600, dismiss: false, expect: 'hub' },
  { name: '02-formation', taps: [NAV(3)], wait: 900, dismiss: true, expect: 'modal' },
  { name: '03-box', taps: [NAV(2)], wait: 900, dismiss: true, expect: 'modal' },
  { name: '04-summon', taps: [NAV(4)], wait: 900, dismiss: true, expect: 'modal' },
  { name: '05-quests', taps: [[110, 268]], wait: 900, dismiss: true, expect: 'modal' },
  { name: '06-signs', taps: [[610, 440]], wait: 1200, dismiss: true, expect: 'modal' },
  { name: '07-trials', taps: [[110, 612]], wait: 900, dismiss: true, expect: 'modal' },
  { name: '08-mon-detail', taps: [NAV(2), FIRST_CARD], wait: 900, dismiss: true, expect: 'modal' },
  { name: '09-ascend', taps: [NAV(2), FIRST_CARD, [200, 982]], wait: 900, dismiss: true, expect: 'modal' },
  { name: '10-artifacts', taps: [NAV(2), FIRST_CARD, [520, 982]], wait: 900, dismiss: true, expect: 'modal' },
  // The battle scene replaces the hub rather than opening a modal.
  { name: '11-battle', taps: [[546, 1094]], wait: 2400, dismiss: false, expect: 'battle' },
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
  await page.waitForFunction(() => Boolean(document.querySelector('#app canvas')), { timeout: 20_000 });

  const toPage = mapper(await canvasRect(page));

  for (const step of STEPS) {
    for (const tap of step.taps) {
      await page.mouse.click(...toPage(...tap));
      await page.waitForTimeout(650);
    }
    await page.waitForTimeout(step.wait);
    await page.screenshot({ path: path.join(OUT_DIR, `${step.name}.png`) });

    const state = await page.evaluate(() => {
      const game = window.__game;
      const ui = game?.scene.getScene('Ui');
      return {
        modals: ui?.modalCount ?? -1,
        battleRunning: Boolean(game?.scene.isActive('Battle')),
      };
    });

    const ok =
      step.expect === 'modal'
        ? state.modals > 0
        : step.expect === 'battle'
          ? state.battleRunning
          : state.modals === 0;

    console.log(`[shot] ${step.name}.png  modals=${state.modals} battle=${state.battleRunning}`);
    if (!ok) problems.push(`step ${step.name}: expected ${step.expect}, got ${JSON.stringify(state)}`);

    if (step.dismiss) {
      await page.mouse.click(...toPage(...DISMISS));
      await page.waitForTimeout(500);
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
