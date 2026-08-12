#!/usr/bin/env node
/**
 * Boots the game in headless Chromium at phone resolution, walks the screens
 * and saves screenshots. This is both the smoke test and the way the visual
 * work gets reviewed: if a layout collapses or a font fails to load, it shows
 * up here rather than on someone's phone.
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const OUT = path.resolve('screenshots');
const VIEWPORT = { width: 412, height: 892 };

/** Each step taps a selector, waits, then shoots. */
const STEPS = [
  { name: '01-cultivate', tap: null, wait: 1400 },
  { name: '02-loadout', tap: '.nav-item:nth-child(2)', wait: 500 },
  { name: '03-skill-picker', tap: '.slot-row', wait: 500, dismiss: '.modal-close' },
  { name: '04-trials', tap: '.nav-item:nth-child(4)', wait: 500 },
  { name: '05-duel', tap: '.tower:last-of-type', wait: 2600, dismiss: '.modal-close' },
  { name: '06-story', tap: '.nav-item:nth-child(5)', wait: 500 },
  { name: '07-sect', tap: '.nav-item:nth-child(1)', wait: 500 },
  { name: '08-spirit-root', tap: '.nav-item:nth-child(3)', wait: 400, then: '.feature:nth-child(3) .diamond', dismiss: '.modal-close' },
];

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
  await server.listen();

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
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`request: ${request.url()}`));

  await page.goto('http://localhost:5199/', { waitUntil: 'load' });
  await page.waitForSelector('.frame', { timeout: 20_000 });
  // Fonts change every metric on the page; shooting before they land produces
  // screenshots that do not match what a player sees.
  await page.evaluate(() => document.fonts.ready);

  // A fresh save has no offline report, but clear any dialog just in case.
  await page.locator('.modal-close').first().click({ timeout: 800 }).catch(() => {});

  for (const step of STEPS) {
    if (step.tap) {
      await page.locator(step.tap).first().click({ timeout: 4000 }).catch(() => {
        problems.push(`step ${step.name}: could not tap ${step.tap}`);
      });
    }
    if (step.then) {
      await page.waitForTimeout(300);
      await page.locator(step.then).first().click({ timeout: 4000 }).catch(() => {
        problems.push(`step ${step.name}: could not tap ${step.then}`);
      });
    }

    await page.waitForTimeout(step.wait);
    await page.screenshot({ path: path.join(OUT, `${step.name}.png`) });
    console.log(`[shot] ${step.name}.png`);

    if (step.dismiss) {
      await page.locator(step.dismiss).first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  const health = await page.evaluate(() => ({
    mounted: Boolean(document.querySelector('.frame')),
    bootHidden: document.getElementById('boot')?.classList.contains('gone') ?? false,
    // A missing webfont silently falls back, so the load is asserted directly.
    serif: document.fonts.check('16px "Noto Serif"'),
    brush: document.fonts.check('16px "Ma Shan Zheng"'),
    saved: (window.localStorage.getItem('vandao.save.v1') ?? '').length,
  }));

  await browser.close();
  await server.close();

  console.log('[shot]', health);

  const fail = (message) => {
    console.error(`[shot] ${message}`);
    process.exitCode = 1;
  };

  if (problems.length > 0) {
    console.error('[shot] problems:');
    for (const problem of [...new Set(problems)]) console.error('  -', problem);
    process.exitCode = 1;
    return;
  }
  if (!health.mounted) return fail('the app never mounted');
  if (!health.bootHidden) return fail('the boot screen never cleared');
  if (!health.serif || !health.brush) return fail('a webfont failed to load');
  if (health.saved === 0) return fail('the save was never written');

  console.log('[shot] clean run');
}

main().catch((error) => {
  console.error('[shot] failed:', error);
  process.exitCode = 1;
});
