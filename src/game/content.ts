import { ELEMENTS, ELEMENT_INFO, type ElementId } from './elements';
import { Rng } from './rng';
import { stageAt } from './realms';
import { SKILLS } from './skills';
import { computeStats, emptySpiritRoot, type Stats } from './stats';
import type { Duelist } from './battle';

/**
 * The content loop: story chapters, the phase trial towers, and the quick
 * training claim. All three are generated from their index rather than stored,
 * so chapter 40 is the same fight for every player and nothing has to be
 * shipped as data.
 */

// -------------------------------------------------------------- chapters ----

export interface Chapter {
  index: number;
  name: string;
  /** Ladder index the opponent is built at. */
  opponentStage: number;
  /** Spirit stones per second granted while this chapter is the furthest cleared. */
  income: number;
}

const CHAPTER_NAMES = [
  'Thanh Vân Tiểu Trấn',
  'Hắc Phong Lâm',
  'Lạc Nhật Cốc',
  'Vân Mộng Trạch',
  'Bắc Hoang Nguyên',
  'Tàn Kiếm Uyên',
  'Cửu U Địa Cung',
  'Lưu Ly Hải',
  'Thiên Khuyết Sơn',
  'Vô Tận Hư Không',
];

export const MAX_CHAPTER = 120;

export function chapterAt(index: number): Chapter {
  const clamped = Math.max(1, Math.min(MAX_CHAPTER, Math.floor(index)));
  const name = CHAPTER_NAMES[Math.min(CHAPTER_NAMES.length - 1, Math.floor((clamped - 1) / 12))]!;

  return {
    index: clamped,
    name: `Chương ${clamped} · ${name}`,
    // Chapters run a little ahead of where a player comfortably sits, so the
    // story is always the thing pulling them forward.
    opponentStage: Math.min(80, Math.floor(clamped * 0.68)),
    income: Math.floor(14 * Math.pow(clamped, 1.42)),
  };
}

// ----------------------------------------------------------------- towers ---

export type TowerId = ElementId | 'chaos';

export interface Tower {
  id: TowerId;
  name: string;
  han: string;
  /** Weekdays the tower opens, 0 = Sunday. Empty means always open. */
  days: number[];
  css: string;
}

export const TOWERS: readonly Tower[] = [
  { id: 'kim', name: 'Tháp Kim', han: '金', days: [1, 2, 6], css: 'el-kim' },
  { id: 'moc', name: 'Tháp Mộc', han: '木', days: [2, 3, 6], css: 'el-moc' },
  { id: 'thuy', name: 'Tháp Thủy', han: '水', days: [3, 4, 6], css: 'el-thuy' },
  { id: 'hoa', name: 'Tháp Hỏa', han: '火', days: [4, 5, 0], css: 'el-hoa' },
  { id: 'tho', name: 'Tháp Thổ', han: '土', days: [1, 5, 0], css: 'el-tho' },
  // Always open, and mixes every phase — the fallback when the day's towers
  // do not suit the build.
  { id: 'chaos', name: 'Tháp Hỗn Độn', han: '陰', days: [], css: '' },
];

export function towerById(id: TowerId): Tower {
  return TOWERS.find((tower) => tower.id === id) ?? TOWERS[TOWERS.length - 1]!;
}

export function isTowerOpen(tower: Tower, date: Date = new Date()): boolean {
  return tower.days.length === 0 || tower.days.includes(date.getDay());
}

export function towerDaysLabel(tower: Tower): string {
  if (tower.days.length === 0) return 'Mở mỗi ngày';
  const names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return tower.days
    .slice()
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((day) => names[day])
    .join(', ');
}

/** The opponent waiting on a given floor. */
export function towerOpponent(tower: Tower, floor: number): Duelist {
  const rng = new Rng(0x9e3779b9 ^ (floor * 2654435761) ^ tower.id.charCodeAt(0) * 7919);

  // Chaos mixes every phase; an element tower leans hard on its own.
  const element: ElementId =
    tower.id === 'chaos' ? rng.pick(ELEMENTS) : (tower.id as ElementId);

  // Floor 1 sits where a brand-new cultivator does; the climb, not the
  // entry fee, is what makes a tower hard.
  const stage = Math.min(80, Math.floor(floor * 1.2));
  const stats = computeStats({
    stage,
    spiritRoot: { ...emptySpiritRoot(), [element]: 40 },
    cycles: 0,
  });

  return {
    name: `${ELEMENT_INFO[element].name} Linh Vệ tầng ${floor}`,
    realmLabel: stageAt(stage).label,
    stats: scaleForTower(stats, floor),
    loadout: pickLoadout(element, stage, rng),
  };
}

/** Floors get steadily meaner so a tower stays a wall rather than a corridor. */
function scaleForTower(stats: Stats, floor: number): Stats {
  const scale = 1 + floor * 0.035;
  const damage = {} as Record<ElementId, number>;
  for (const element of ELEMENTS) damage[element] = Math.floor(stats.damage[element] * scale);
  return {
    chanKhi: Math.floor(stats.chanKhi * scale),
    canCot: Math.floor(stats.canCot * scale),
    thePhach: Math.floor(stats.thePhach * scale),
    damage,
  };
}

/** Four arts of a phase the opponent can actually use at its stage. */
function pickLoadout(element: ElementId, stage: number, rng: Rng): (string | null)[] {
  const pool = SKILLS.filter((skill) => skill.element === element && skill.requires <= stage);
  const fallback = SKILLS.filter((skill) => skill.requires <= stage);
  const source = pool.length > 0 ? pool : fallback;

  return Array.from({ length: 4 }, () => (source.length > 0 ? rng.pick(source).id : null));
}

/** The story chapter's opponent, built the same way but from the chapter. */
export function chapterOpponent(chapter: Chapter): Duelist {
  const rng = new Rng(0x85ebca6b ^ (chapter.index * 2246822519));
  const element = rng.pick(ELEMENTS);
  const stats = computeStats({
    stage: chapter.opponentStage,
    spiritRoot: { ...emptySpiritRoot(), [element]: 30 },
    cycles: 0,
  });

  const titles = ['Tán Tu', 'Yêu Tu', 'Ma Tu', 'Kiếm Tu', 'Đạo Nhân', 'Linh Thú'];

  return {
    name: `${rng.pick(titles)} ${ELEMENT_INFO[element].name} Linh`,
    realmLabel: stageAt(chapter.opponentStage).label,
    stats,
    loadout: pickLoadout(element, chapter.opponentStage, rng),
  };
}

// --------------------------------------------------------- quick training ---

/** Hours of banked income a single quick-training claim grants. */
export const QUICK_TRAINING_HOURS = 2;
export const QUICK_TRAINING_PER_DAY = 5;

/** Daily-reset stamp. Local midnight, so it matches what a player expects. */
export function dayStamp(at: number = Date.now()): number {
  const date = new Date(at);
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000,
  );
}

/** Seconds until the next local midnight, for the reset countdown. */
export function secondsUntilReset(at: number = Date.now()): number {
  const date = new Date(at);
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return Math.max(0, (next.getTime() - at) / 1000);
}
