#!/usr/bin/env node
/**
 * Pulls every third-party asset the game needs from public mirrors, converts it
 * into a mobile-friendly shape (trimmed texture atlases, one compact data file)
 * and writes it into `public/assets` and `src/game/data`.
 *
 * Sources and licences are listed in ASSETS.md. Nothing here is redistributed
 * in the repository; the fetched output is git-ignored.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { buildAtlas } from './lib/atlas.mjs';
import { parseCsv } from './lib/csv.mjs';
import { download, mapLimit } from './lib/net.mjs';

const VEEKUN = 'https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const FONTS = 'https://raw.githubusercontent.com/google/fonts/main/ofl';

const ASSET_DIR = path.resolve('public/assets');
const DATA_DIR = path.resolve('src/game/data');
const LAST_DEX_ID = 151; // Kanto only: one atlas page, instantly recognisable roster.

const STAT_KEYS = { 1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd', 6: 'spe' };

/** Items that back the shop, bag and reward tables. */
const ITEMS = [
  'poke-ball', 'great-ball', 'ultra-ball', 'master-ball',
  'rare-candy', 'exp-share', 'lucky-egg', 'amulet-coin',
  'potion', 'super-potion', 'hyper-potion', 'max-revive',
  'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone',
  'nugget', 'big-nugget', 'star-piece',
  'life-orb', 'choice-band', 'focus-sash', 'leftovers', 'assault-vest',
];

function log(...args) {
  console.log('[assets]', ...args);
}

async function csv(name) {
  const buf = await download(`${VEEKUN}/${name}`);
  if (!buf) throw new Error(`Missing dataset ${name}`);
  return parseCsv(buf.toString('utf8'));
}

function titleCase(identifier) {
  return identifier
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Rarity drives the gacha pool and the star rating shown on a card. Base stat
 * total is a crude proxy, so the handful of Kanto legendaries are pinned.
 */
const LEGENDARY = new Set([144, 145, 146, 150, 151]);
function rarityOf(id, bst, hasEvolution) {
  if (LEGENDARY.has(id)) return 5;
  if (bst >= 490) return 4;
  if (bst >= 420) return 3;
  return hasEvolution ? 1 : 2;
}

async function buildPokedex() {
  log('reading pokedex tables');
  const [pokemon, species, stats, types, typeNames, efficacy] = await Promise.all([
    csv('pokemon.csv'),
    csv('pokemon_species.csv'),
    csv('pokemon_stats.csv'),
    csv('pokemon_types.csv'),
    csv('types.csv'),
    csv('type_efficacy.csv'),
  ]);

  const typeById = new Map(typeNames.map((t) => [t.id, t.identifier]));

  const statsById = new Map();
  for (const row of stats) {
    const key = STAT_KEYS[row.stat_id];
    if (!key) continue;
    const bucket = statsById.get(row.pokemon_id) ?? {};
    bucket[key] = Number(row.base_stat);
    statsById.set(row.pokemon_id, bucket);
  }

  const typesById = new Map();
  for (const row of types.sort((a, b) => Number(a.slot) - Number(b.slot))) {
    const list = typesById.get(row.pokemon_id) ?? [];
    list.push(typeById.get(row.type_id));
    typesById.set(row.pokemon_id, list);
  }

  const evolvesFrom = new Map();
  for (const row of species) {
    const from = Number(row.evolves_from_species_id);
    if (from > 0) evolvesFrom.set(Number(row.id), from);
  }
  const hasEvolution = new Set(evolvesFrom.values());

  const entries = [];
  for (const row of pokemon) {
    const id = Number(row.id);
    if (id > LAST_DEX_ID || row.is_default !== '1') continue;

    const base = statsById.get(row.id);
    const monTypes = typesById.get(row.id);
    if (!base || !monTypes) continue;

    const bst = base.hp + base.atk + base.def + base.spa + base.spd + base.spe;
    entries.push({
      id,
      name: titleCase(row.identifier),
      slug: row.identifier,
      types: monTypes,
      base,
      bst,
      rarity: rarityOf(id, bst, hasEvolution.has(id)),
      evolvesFrom: evolvesFrom.get(id) ?? null,
    });
  }
  entries.sort((a, b) => a.id - b.id);

  // Only Kanto types can appear, so the chart stays a small dense matrix.
  const usedTypes = [...new Set(entries.flatMap((e) => e.types))].sort();
  const chart = {};
  for (const attacker of usedTypes) chart[attacker] = {};
  for (const row of efficacy) {
    const attacker = typeById.get(row.damage_type_id);
    const defender = typeById.get(row.target_type_id);
    if (!chart[attacker] || !usedTypes.includes(defender)) continue;
    const factor = Number(row.damage_factor) / 100;
    if (factor !== 1) chart[attacker][defender] = factor;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, 'pokedex.json'), JSON.stringify(entries));
  await writeFile(
    path.join(DATA_DIR, 'typechart.json'),
    JSON.stringify({ types: usedTypes, chart }),
  );

  log(`pokedex: ${entries.length} species, ${usedTypes.length} types`);
  return entries;
}

async function buildBattleAtlas(entries) {
  log('downloading battle sprites');
  const sources = [];

  await mapLimit(entries, 12, async (entry) => {
    const buf = await download(`${SPRITES}/pokemon/${entry.id}.png`);
    if (buf) sources.push({ name: String(entry.id), buffer: buf });
  });

  const pages = await buildAtlas({
    name: 'mons',
    sources,
    outDir: path.join(ASSET_DIR, 'atlas'),
    maxSize: 2048,
  });
  for (const p of pages) {
    log(`atlas ${p.pageName}: ${p.frames} frames, ${p.size}, ${(p.bytes / 1024).toFixed(0)} KB`);
  }
}

async function buildPortraitAtlas(entries) {
  log('downloading artwork portraits');
  const sources = [];

  await mapLimit(entries, 8, async (entry) => {
    const buf = await download(`${SPRITES}/pokemon/other/official-artwork/${entry.id}.png`);
    if (!buf) return;
    // The originals are 475px squares — far more detail than a roster card or a
    // team slot ever shows on a phone.
    const resized = await sharp(buf)
      .resize(128, 128, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    sources.push({ name: String(entry.id), buffer: resized });
  });

  const pages = await buildAtlas({
    name: 'portraits',
    sources,
    outDir: path.join(ASSET_DIR, 'atlas'),
    maxSize: 2048,
    quantize: true,
  });
  for (const p of pages) {
    log(`atlas ${p.pageName}: ${p.frames} frames, ${p.size}, ${(p.bytes / 1024).toFixed(0)} KB`);
  }
}

async function buildItemAtlas() {
  log('downloading item icons');
  const sources = [];
  const missing = [];

  await mapLimit(ITEMS, 12, async (item) => {
    const buf = await download(`${SPRITES}/items/${item}.png`);
    if (buf) sources.push({ name: item, buffer: buf });
    else missing.push(item);
  });

  if (missing.length > 0) log(`WARNING: no icon upstream for ${missing.join(', ')}`);

  const pages = await buildAtlas({
    name: 'items',
    sources,
    outDir: path.join(ASSET_DIR, 'atlas'),
    maxSize: 512,
  });
  for (const p of pages) {
    log(`atlas ${p.pageName}: ${p.frames} frames, ${p.size}, ${(p.bytes / 1024).toFixed(0)} KB`);
  }
}

async function fetchFonts() {
  log('downloading fonts');
  const dir = path.join(ASSET_DIR, 'fonts');
  await mkdir(dir, { recursive: true });

  const font = await download(`${FONTS}/baloo2/Baloo2%5Bwght%5D.ttf`);
  if (!font) throw new Error('Baloo 2 is no longer at the expected path');
  await writeFile(path.join(dir, 'Baloo2.ttf'), font);
  log(`font Baloo2.ttf: ${(font.length / 1024).toFixed(0)} KB`);
}

async function main() {
  const entries = await buildPokedex();
  await buildBattleAtlas(entries);
  await buildPortraitAtlas(entries);
  await buildItemAtlas();
  await fetchFonts();
  log('done');
}

main().catch((err) => {
  console.error('[assets] failed:', err);
  process.exitCode = 1;
});
