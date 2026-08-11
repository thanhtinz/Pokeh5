import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = path.resolve('.cache/downloads');

/**
 * Fetch a URL once and keep the bytes on disk, so re-running the pipeline
 * after a tweak costs nothing and works offline.
 */
export async function download(url, { retries = 4 } = {}) {
  const key = createHash('sha1').update(url).digest('hex');
  const cached = path.join(CACHE_DIR, key);

  try {
    return await readFile(cached);
  } catch {
    // Not cached yet — fall through and fetch it.
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cached, buf);
      return buf;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
      }
    }
  }
  throw new Error(`Failed to download ${url}: ${lastError?.message ?? 'unknown error'}`);
}

/** Run `worker` over every item, never more than `limit` at a time. */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}
