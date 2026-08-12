/**
 * Cảnh giới — the cultivation ladder. Nine realms of nine ranks each, then
 * ascension, which resets the ladder and grants a permanent multiplier.
 *
 * The rank inside a realm is what the player crosses every few minutes; the
 * realm itself is the milestone that gates content and skills. Keeping the two
 * separate is what lets the pace stay quick without inflating the ladder.
 */

export interface RealmInfo {
  index: number;
  name: string;
  /** Traditional Han form, used as ornament beside the name. */
  han: string;
  /** Multiplier applied to every stat gained inside this realm. */
  power: number;
}

export const REALMS: readonly RealmInfo[] = [
  { index: 0, name: 'Luyện Khí', han: '練氣', power: 1 },
  { index: 1, name: 'Trúc Cơ', han: '築基', power: 2.6 },
  { index: 2, name: 'Kim Đan', han: '金丹', power: 7 },
  { index: 3, name: 'Nguyên Anh', han: '元嬰', power: 19 },
  { index: 4, name: 'Hóa Thần', han: '化神', power: 52 },
  { index: 5, name: 'Luyện Hư', han: '煉虛', power: 140 },
  { index: 6, name: 'Hợp Thể', han: '合體', power: 380 },
  { index: 7, name: 'Đại Thừa', han: '大乘', power: 1_020 },
  { index: 8, name: 'Độ Kiếp', han: '渡劫', power: 2_750 },
];

export const RANKS_PER_REALM = 9;
export const MAX_STAGE = REALMS.length * RANKS_PER_REALM - 1;

/** Rank numerals, so "Hóa Thần bát trọng" reads the way the genre does. */
const RANK_NAMES = ['nhất', 'nhị', 'tam', 'tứ', 'ngũ', 'lục', 'thất', 'bát', 'cửu'];

export interface Stage {
  /** Absolute position on the ladder, 0..MAX_STAGE. */
  index: number;
  realm: RealmInfo;
  /** 0-based rank inside the realm. */
  rank: number;
  /** "Hóa Thần bát trọng" */
  label: string;
  /** "Hóa Thần" — used where the rank would be noise. */
  realmName: string;
  isPeak: boolean;
}

export function stageAt(index: number): Stage {
  const clamped = Math.max(0, Math.min(MAX_STAGE, Math.floor(index)));
  const realm = REALMS[Math.floor(clamped / RANKS_PER_REALM)]!;
  const rank = clamped % RANKS_PER_REALM;

  return {
    index: clamped,
    realm,
    rank,
    label: `${realm.name} ${RANK_NAMES[rank]} trọng`,
    realmName: realm.name,
    isPeak: rank === RANKS_PER_REALM - 1,
  };
}

/**
 * Cultivation needed to cross from `index` to the next rank.
 *
 * The curve is polynomial rather than exponential: it still climbs fast enough
 * that a realm feels like an achievement, but it stays inside float precision
 * no matter how many times a player reincarnates.
 */
export function breakthroughCost(index: number): number {
  const stage = stageAt(index);
  const base = 900 * Math.pow(stage.index + 1, 2.35);
  // The last rank of a realm is the wall — the reference gates its tribulation
  // there too.
  return Math.floor(base * (stage.isPeak ? 3.4 : 1));
}

/** Cultivation gained per second at a given stage, before any bonuses. */
export function baseCultivationRate(index: number): number {
  const stage = stageAt(index);
  return 6 + stage.index * 5.2 + stage.realm.power * 2.4;
}

/**
 * Reincarnation (luân hồi) resets the ladder and multiplies everything after.
 * Only available once the ladder is finished, which is what makes it a goal
 * rather than a treadmill.
 */
export function reincarnationMultiplier(cycles: number): number {
  return Math.pow(1.85, Math.max(0, cycles));
}

export function canReincarnate(index: number): boolean {
  return index >= MAX_STAGE;
}
