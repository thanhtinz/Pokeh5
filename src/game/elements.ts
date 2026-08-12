/**
 * Ngũ hành — the five phases. Two cycles govern them, and both matter:
 * generation (tương sinh) feeds cultivation rate, destruction (tương khắc)
 * decides combat multipliers.
 */
export type ElementId = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';

export const ELEMENTS: readonly ElementId[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];

export interface ElementInfo {
  id: ElementId;
  /** Vietnamese Sino name, the one the UI shows. */
  name: string;
  /** The Han character used as ornament on chips and seals. */
  han: string;
  /** CSS class carrying the element's colour. */
  css: string;
}

export const ELEMENT_INFO: Record<ElementId, ElementInfo> = {
  kim: { id: 'kim', name: 'Kim', han: '金', css: 'el-kim' },
  moc: { id: 'moc', name: 'Mộc', han: '木', css: 'el-moc' },
  thuy: { id: 'thuy', name: 'Thủy', han: '水', css: 'el-thuy' },
  hoa: { id: 'hoa', name: 'Hỏa', han: '火', css: 'el-hoa' },
  tho: { id: 'tho', name: 'Thổ', han: '土', css: 'el-tho' },
};

/** Tương khắc — what each phase overcomes. Kim ⟶ Mộc ⟶ Thổ ⟶ Thủy ⟶ Hỏa ⟶ Kim. */
const OVERCOMES: Record<ElementId, ElementId> = {
  kim: 'moc',
  moc: 'tho',
  tho: 'thuy',
  thuy: 'hoa',
  hoa: 'kim',
};

/** Tương sinh — what each phase produces. Mộc ⟶ Hỏa ⟶ Thổ ⟶ Kim ⟶ Thủy ⟶ Mộc. */
const GENERATES: Record<ElementId, ElementId> = {
  moc: 'hoa',
  hoa: 'tho',
  tho: 'kim',
  kim: 'thuy',
  thuy: 'moc',
};

export function overcomes(element: ElementId): ElementId {
  return OVERCOMES[element];
}

export function generates(element: ElementId): ElementId {
  return GENERATES[element];
}

/**
 * Damage multiplier of one phase against another. Overcoming is a real
 * advantage, being overcome is a real penalty, and everything else is flat —
 * so a lineup built around one phase has a shape rather than being strictly
 * better or worse.
 */
export function elementMultiplier(attacker: ElementId, defender: ElementId): number {
  if (OVERCOMES[attacker] === defender) return 1.5;
  if (OVERCOMES[defender] === attacker) return 0.7;
  return 1;
}

export function elementLabel(element: ElementId): string {
  return ELEMENT_INFO[element].name;
}
