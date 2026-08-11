import { dexEntry } from './data/pokedex';

/**
 * A second, coarser affinity layer sitting on top of the 17-type chart. The
 * type chart decides whether a move lands well; elements are what the Signs
 * boards, artifacts and roster filters are organised around, because five
 * buckets fit on a phone screen and eighteen do not.
 */
export type ElementId = 'fire' | 'water' | 'grass' | 'light' | 'dark';

export const ELEMENTS: readonly ElementId[] = ['fire', 'water', 'grass', 'light', 'dark'];

export const ELEMENT_NAMES: Record<ElementId, string> = {
  fire: 'Hoả',
  water: 'Thuỷ',
  grass: 'Mộc',
  light: 'Quang',
  dark: 'Ám',
};

export const ELEMENT_COLORS: Record<ElementId, number> = {
  fire: 0xff6b3d,
  water: 0x3ba9ff,
  grass: 0x4ade80,
  light: 0xffd44d,
  dark: 0xc07dff,
};

/**
 * Which element beats which. Fire, Grass and Water form the usual three-way
 * cycle; Light and Dark restrain each other, so neither is a safe default.
 */
const RESTRAINS: Record<ElementId, ElementId> = {
  water: 'fire',
  fire: 'grass',
  grass: 'water',
  light: 'dark',
  dark: 'light',
};

export function restrainedBy(element: ElementId): ElementId {
  return RESTRAINS[element];
}

/** Every type folded into the element its Pokemon reads as. */
const TYPE_TO_ELEMENT: Record<string, ElementId> = {
  fire: 'fire',
  ground: 'fire',
  rock: 'fire',
  fighting: 'fire',

  water: 'water',
  ice: 'water',
  flying: 'water',

  grass: 'grass',
  bug: 'grass',
  poison: 'grass',

  normal: 'light',
  electric: 'light',
  fairy: 'light',
  psychic: 'light',
  steel: 'light',

  dark: 'dark',
  ghost: 'dark',
  dragon: 'dark',
};

export function elementOfType(type: string): ElementId {
  return TYPE_TO_ELEMENT[type] ?? 'light';
}

/** A Pokemon's element comes from its primary type. */
export function elementOf(dexId: number): ElementId {
  const entry = dexEntry(dexId);
  return elementOfType(entry.types[0] ?? 'normal');
}

/**
 * Damage multiplier the attacker's element earns against the defender's, before
 * any Signs bonus. Kept mild so the type chart stays the dominant factor.
 */
export function elementMultiplier(attacker: ElementId, defender: ElementId): number {
  if (restrainedBy(attacker) === defender) return 1.15;
  if (restrainedBy(defender) === attacker) return 0.9;
  return 1;
}
