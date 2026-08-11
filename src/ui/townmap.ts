import Phaser from 'phaser';

import { GAME_WIDTH, HUD_HEIGHT } from '../config';

/**
 * The town the hub is laid out on. There is no painted background art to ship,
 * so the map is drawn: grass blocks, a lake, an arena and the streets between
 * them. One Graphics object, drawn once, crisp at any density — and it gives
 * the building nodes somewhere to actually sit.
 *
 * Buildings sit on street junctions, so the grid is exported rather than
 * duplicated: `COLUMNS` and `ROWS` are the single source of both.
 */

export const MAP_TOP = HUD_HEIGHT - 6;
export const MAP_BOTTOM = 965;

/** Street grid. Every landmark is placed at one of these intersections. */
export const COLUMNS = [110, 360, 610] as const;
export const ROWS = [268, 440, 612, 784] as const;

const GRASS_BASE = 0x1c4530;
const GRASS_BLOCK = 0x2a6244;
const GRASS_EDGE = 0x173527;
const PATH = 0x6b5b45;
const PATH_EDGE = 0x8a7658;
const WATER = 0x14567d;
const WATER_SHALLOW = 0x1d76a8;
const ARENA = 0x3b4a6b;
const ARENA_EDGE = 0x5c6f9c;

/** Decorative grass parcels filling the blocks between the streets. */
const PARCELS: [number, number, number, number][] = [
  [140, 300, 190, 110],
  [390, 300, 190, 110],
  [140, 472, 190, 110],
  [140, 644, 190, 110],
  [140, 816, 190, 110],
  [390, 816, 190, 110],
  [640, 644, 70, 110],
];

function parcel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(GRASS_EDGE, 1);
  g.fillRoundedRect(x - 5, y - 5, w + 10, h + 10, 24);
  g.fillStyle(GRASS_BLOCK, 1);
  g.fillRoundedRect(x, y, w, h, 20);
}

/** Draws the whole town. Everything is static, so this runs exactly once. */
export function drawTown(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();

  g.fillStyle(GRASS_BASE, 1);
  g.fillRect(0, MAP_TOP, GAME_WIDTH, MAP_BOTTOM - MAP_TOP);

  for (const [x, y, w, h] of PARCELS) parcel(g, x, y, w, h);

  // Lake, with a lighter shallow rim along the top edge.
  g.fillStyle(WATER, 1);
  g.fillRoundedRect(392, 644, 186, 112, 48);
  g.fillStyle(WATER_SHALLOW, 0.5);
  g.fillRoundedRect(410, 658, 150, 44, 28);

  const first = COLUMNS[0];
  const last = COLUMNS[COLUMNS.length - 1]!;
  const top = ROWS[0];
  const bottom = ROWS[ROWS.length - 1]!;

  // Streets: two passes so each has a lighter kerb under a darker surface.
  for (const [width, color] of [
    [30, PATH_EDGE],
    [22, PATH],
  ] as const) {
    g.lineStyle(width, color, 1);
    for (const x of COLUMNS) g.lineBetween(x, top, x, bottom);
    for (const y of ROWS) g.lineBetween(first, y, last, y);
  }

  // The arena is drawn last so it reads as sitting on the junction, not under
  // the streets that meet there.
  g.fillStyle(ARENA, 1);
  g.fillRoundedRect(250, 366, 220, 148, 28);
  g.lineStyle(4, ARENA_EDGE, 0.95);
  g.strokeRoundedRect(250, 366, 220, 148, 28);

  return g;
}
