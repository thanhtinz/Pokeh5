/**
 * Talents unlocked by star ascension. Kept in its own module with no imports so
 * both the stat formula and the ascension screen can read it without either
 * having to depend on the other.
 */
export interface Talent {
  star: number;
  name: string;
  /** Flat attack granted once this star is reached. */
  atk: number;
}

export const TALENTS: readonly Talent[] = [
  { star: 3, name: 'Giác Ngộ', atk: 800 },
  { star: 5, name: 'Siêu Tiến Hoá', atk: 3_200 },
  { star: 6, name: 'Thức Tỉnh', atk: 9_600 },
];

export function talentAt(star: number): Talent | null {
  return TALENTS.find((talent) => talent.star === star) ?? null;
}

/** Total flat attack from every talent unlocked at or below `star`. */
export function talentAttack(star: number): number {
  return TALENTS.reduce((sum, talent) => (star >= talent.star ? sum + talent.atk : sum), 0);
}
