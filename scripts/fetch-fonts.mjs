#!/usr/bin/env node
/**
 * Downloads the three webfonts the game uses and subsets them to the glyphs it
 * actually draws.
 *
 * This matters more than usual here. A full CJK face is 5–25 MB, which is
 * unshippable in a mobile app, and even the Latin faces carry scripts the game
 * never renders. Subsetting takes the whole set from roughly 32 MB to under
 * 200 KB, and it is the reason the calligraphic Chinese characters can be used
 * as ornament at all.
 *
 * Licences: all three are SIL Open Font License 1.1. See ASSETS.md.
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl';
const OUT = path.resolve('public/fonts');
const CACHE = path.resolve('.cache/fonts');

/**
 * Vietnamese needs base Latin plus every precomposed diacritic. Listing the
 * unicode ranges is more reliable than trying to enumerate the game's strings,
 * which change on every copy edit.
 */
const LATIN_VIET = [
  'U+0020-007E', // ASCII
  'U+00A0-00FF', // Latin-1 supplement
  'U+0100-017F', // Latin Extended-A
  'U+0180-024F', // Latin Extended-B
  'U+0300-036F', // combining marks
  'U+1EA0-1EF9', // Vietnamese precomposed
  'U+02C6,U+0303,U+0309,U+0323,U+0327',
  'U+2018-201D,U+2022,U+2026,U+2013,U+2014',
  'U+00D7,U+00F7,U+221E,U+2248,U+2260,U+2264,U+2265',
  'U+2190-2193,U+25B2,U+25BC,U+25C6,U+25CF,U+2605,U+2606',
].join(',');

/**
 * The Chinese characters used as ornament. Every one of these appears on
 * screen; nothing here is speculative, because each glyph costs bytes.
 */
const HAN_ORNAMENT = [
  '金木水火土', // the five elements
  '道法自然', // sect motto
  '修真仙侠', // genre words used as watermarks
  '突破渡劫', // breakthrough / tribulation stamps
  '練氣築基金丹元嬰化神飛昇', // realm names, traditional forms
  '陰陽乾坤', // yin-yang ornament
  '一二三四五六七八九十階', // rank numerals
].join('');

const FONTS = [
  {
    name: 'NotoSerif',
    url: `${GF}/notoserif/NotoSerif%5Bwdth%2Cwght%5D.ttf`,
    file: 'NotoSerif-subset.woff2',
    unicodes: LATIN_VIET,
    // Variable font: keep the weight axis, pin width to normal so the file
    // stays small while headings can still go bold.
    instance: 'wdth=100',
  },
  {
    name: 'BeVietnamPro',
    url: `${GF}/bevietnampro/BeVietnamPro-Regular.ttf`,
    file: 'BeVietnamPro-Regular-subset.woff2',
    unicodes: LATIN_VIET,
  },
  {
    name: 'BeVietnamProBold',
    url: `${GF}/bevietnampro/BeVietnamPro-Bold.ttf`,
    file: 'BeVietnamPro-Bold-subset.woff2',
    unicodes: LATIN_VIET,
  },
  {
    name: 'MaShanZheng',
    url: `${GF}/mashanzheng/MaShanZheng-Regular.ttf`,
    file: 'MaShanZheng-subset.woff2',
    text: HAN_ORNAMENT,
  },
];

async function download(url) {
  const key = createHash('sha1').update(url).digest('hex');
  const cached = path.join(CACHE, key);
  try {
    return await readFile(cached);
  } catch {
    // Not cached yet.
  }

  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await mkdir(CACHE, { recursive: true });
      await writeFile(cached, buffer);
      return buffer;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 400));
    }
  }
  throw new Error(`Failed to download ${url}: ${lastError?.message}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let totalIn = 0;
  let totalOut = 0;

  for (const font of FONTS) {
    const source = await download(font.url);
    totalIn += source.length;

    const raw = path.join(CACHE, `${font.name}.ttf`);
    await writeFile(raw, source);

    const args = [
      '-m',
      'fontTools.subset',
      raw,
      `--output-file=${path.join(OUT, font.file)}`,
      '--flavor=woff2',
      '--layout-features=kern,liga,ccmp,mark,mkmk',
      '--no-hinting',
      '--desubroutinize',
      '--drop-tables+=DSIG',
      '--name-IDs=1,2,3,4,6',
    ];
    if (font.unicodes) args.push(`--unicodes=${font.unicodes}`);
    if (font.text) args.push(`--text=${font.text}`);
    if (font.instance) args.push(`--instancer`, font.instance);

    // `--instancer` is not a subset flag; pin the axis with the dedicated tool
    // first when a font needs it.
    if (font.instance) {
      const pinned = path.join(CACHE, `${font.name}-pinned.ttf`);
      await run('python3', ['-m', 'fontTools.varLib.instancer', raw, font.instance, '-o', pinned]);
      args[2] = pinned;
      args.splice(args.indexOf('--instancer'), 2);
    }

    await run('python3', args, { maxBuffer: 32 * 1024 * 1024 });

    const info = await stat(path.join(OUT, font.file));
    totalOut += info.size;
    console.log(
      `[fonts] ${font.file.padEnd(34)} ${(source.length / 1024).toFixed(0).padStart(7)} KB -> ${(info.size / 1024).toFixed(1).padStart(7)} KB`,
    );
  }

  console.log(
    `[fonts] total ${(totalIn / 1024 / 1024).toFixed(1)} MB -> ${(totalOut / 1024).toFixed(1)} KB`,
  );
}

main().catch((error) => {
  console.error('[fonts] failed:', error.message);
  process.exitCode = 1;
});
