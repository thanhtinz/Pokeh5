import rawDex from './pokedex.json';
import rawChart from './typechart.json';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface DexEntry {
  id: number;
  name: string;
  slug: string;
  types: string[];
  base: BaseStats;
  bst: number;
  /** 1 (common) to 5 (legendary); drives summon odds and card colour. */
  rarity: number;
  evolvesFrom: number | null;
}

export const DEX: readonly DexEntry[] = rawDex as DexEntry[];

const BY_ID = new Map<number, DexEntry>(DEX.map((entry) => [entry.id, entry]));

export function dexEntry(id: number): DexEntry {
  const entry = BY_ID.get(id);
  if (!entry) throw new Error(`Unknown Pokemon id ${id}`);
  return entry;
}

export function dexEntryOrNull(id: number): DexEntry | null {
  return BY_ID.get(id) ?? null;
}

/** Species that nothing evolves into — the natural first members of a line. */
export const BASE_FORMS: readonly DexEntry[] = DEX.filter((entry) => entry.evolvesFrom === null);

const EVOLVES_TO = new Map<number, number[]>();
for (const entry of DEX) {
  if (entry.evolvesFrom === null) continue;
  const list = EVOLVES_TO.get(entry.evolvesFrom) ?? [];
  list.push(entry.id);
  EVOLVES_TO.set(entry.evolvesFrom, list);
}

export function evolutionsOf(id: number): readonly number[] {
  return EVOLVES_TO.get(id) ?? [];
}

export const DEX_BY_RARITY: ReadonlyMap<number, readonly DexEntry[]> = (() => {
  const groups = new Map<number, DexEntry[]>();
  for (const entry of DEX) {
    const list = groups.get(entry.rarity) ?? [];
    list.push(entry);
    groups.set(entry.rarity, list);
  }
  return groups;
})();

interface TypeChartFile {
  types: string[];
  /** Only non-neutral matchups are stored; anything absent is 1x. */
  chart: Record<string, Record<string, number>>;
}

const TYPE_CHART = rawChart as TypeChartFile;

export const TYPES: readonly string[] = TYPE_CHART.types;

/** Damage multiplier of one attacking type against a defender's type list. */
export function typeMultiplier(attacking: string, defending: readonly string[]): number {
  const row = TYPE_CHART.chart[attacking];
  if (!row) return 1;

  let multiplier = 1;
  for (const type of defending) {
    multiplier *= row[type] ?? 1;
  }
  return multiplier;
}
