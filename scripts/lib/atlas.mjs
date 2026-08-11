import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ALPHA_CUTOFF = 8;

/**
 * Find the tight bounding box of the visible pixels. Pokemon sprites sit in a
 * fixed-size canvas with a lot of empty space around them; trimming it away
 * roughly halves the packed atlas.
 */
async function measure(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] <= ALPHA_CUTOFF) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // A fully transparent image still needs a 1x1 frame so lookups don't fail.
  if (maxX < 0) return { left: 0, top: 0, width: 1, height: 1, sourceW: width, sourceH: height };

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    sourceW: width,
    sourceH: height,
  };
}

/**
 * Shelf packer: sort by descending height, lay sprites left to right in rows.
 * For same-sized sprite sets this wastes only a few percent, and it stays fast
 * and completely deterministic, which matters for reproducible builds.
 */
function pack(entries, maxSize, padding) {
  const pages = [];
  let page = { entries: [], width: 0, height: 0 };
  let shelfY = 0;
  let shelfH = 0;
  let cursorX = 0;

  const closePage = () => {
    if (page.entries.length === 0) return;
    page.height = shelfY + shelfH;
    pages.push(page);
    page = { entries: [], width: 0, height: 0 };
    shelfY = 0;
    shelfH = 0;
    cursorX = 0;
  };

  for (const entry of entries) {
    const w = entry.box.width + padding;
    const h = entry.box.height + padding;

    if (cursorX + w > maxSize) {
      shelfY += shelfH;
      shelfH = 0;
      cursorX = 0;
    }
    if (shelfY + h > maxSize) {
      closePage();
    }

    entry.x = cursorX;
    entry.y = shelfY;
    cursorX += w;
    shelfH = Math.max(shelfH, h);
    page.entries.push(entry);
    page.width = Math.max(page.width, cursorX);
  }

  closePage();

  // Power-of-two dimensions keep the GPU from re-allocating the texture and
  // let older Android drivers mipmap it.
  for (const p of pages) {
    p.width = nextPowerOfTwo(p.width);
    p.height = nextPowerOfTwo(p.height);
  }
  return pages;
}

function nextPowerOfTwo(value) {
  let n = 1;
  while (n < value) n *= 2;
  return n;
}

/**
 * Build one or more Phaser JSONArray atlases from `{ name, buffer }` sources.
 * Returns the written page descriptors.
 */
export async function buildAtlas({
  name,
  sources,
  outDir,
  maxSize = 2048,
  padding = 2,
  quantize = false,
}) {
  const entries = [];
  for (const source of sources) {
    const box = await measure(source.buffer);
    entries.push({ name: source.name, buffer: source.buffer, box, x: 0, y: 0 });
  }

  entries.sort((a, b) => b.box.height - a.box.height || a.name.localeCompare(b.name));

  const pages = pack(entries, maxSize, padding);
  await mkdir(outDir, { recursive: true });

  const written = [];
  for (const [index, page] of pages.entries()) {
    const pageName = pages.length === 1 ? name : `${name}-${index}`;
    const imageFile = `${pageName}.png`;

    const composites = await Promise.all(
      page.entries.map(async (entry) => ({
        input: await sharp(entry.buffer)
          .ensureAlpha()
          .extract({
            left: entry.box.left,
            top: entry.box.top,
            width: entry.box.width,
            height: entry.box.height,
          })
          .png()
          .toBuffer(),
        left: entry.x,
        top: entry.y,
      })),
    );

    const png = await sharp({
      create: {
        width: page.width,
        height: page.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      // Artwork pages are photographic and huge; an indexed palette cuts them
      // by roughly 4x with no visible loss at the size a phone actually draws.
      .png(
        quantize
          ? { compressionLevel: 9, palette: true, quality: 90, effort: 10 }
          : { compressionLevel: 9, palette: false },
      )
      .toBuffer();

    const json = {
      frames: page.entries.map((entry) => ({
        filename: entry.name,
        frame: { x: entry.x, y: entry.y, w: entry.box.width, h: entry.box.height },
        rotated: false,
        trimmed: true,
        spriteSourceSize: {
          x: entry.box.left,
          y: entry.box.top,
          w: entry.box.width,
          h: entry.box.height,
        },
        sourceSize: { w: entry.box.sourceW, h: entry.box.sourceH },
      })),
      meta: {
        app: 'pokeh5-asset-pipeline',
        image: imageFile,
        format: 'RGBA8888',
        size: { w: page.width, h: page.height },
        scale: '1',
      },
    };

    await writeFile(path.join(outDir, imageFile), png);
    await writeFile(path.join(outDir, `${pageName}.json`), JSON.stringify(json));
    written.push({ pageName, frames: page.entries.length, bytes: png.length, size: page.width + 'x' + page.height });
  }

  return written;
}
