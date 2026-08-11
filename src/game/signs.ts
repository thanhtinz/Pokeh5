import { ELEMENTS, restrainedBy, type ElementId } from './elements';

/**
 * The Signs boards: one constellation per element, whose lit stars raise that
 * element's damage against the element it restrains. Each board is a fixed
 * layout of nodes lit in order, so progress is legible at a glance.
 */

export interface SignNode {
  /** Normalised position inside the board, 0..1 on both axes. */
  x: number;
  y: number;
}

export const NODES_PER_BOARD = 12;

/** Bonus damage each lit star contributes, as a fraction. */
export const BONUS_PER_NODE = 0.1;

/**
 * Hand-placed so each board reads as a distinct constellation rather than a
 * grid. Order matters: stars light along this path.
 */
const LAYOUTS: Record<ElementId, SignNode[]> = {
  fire: [
    { x: 0.50, y: 0.10 }, { x: 0.36, y: 0.24 }, { x: 0.64, y: 0.24 },
    { x: 0.26, y: 0.42 }, { x: 0.74, y: 0.42 }, { x: 0.50, y: 0.44 },
    { x: 0.34, y: 0.62 }, { x: 0.66, y: 0.62 }, { x: 0.50, y: 0.72 },
    { x: 0.22, y: 0.80 }, { x: 0.78, y: 0.80 }, { x: 0.50, y: 0.92 },
  ],
  water: [
    { x: 0.22, y: 0.16 }, { x: 0.42, y: 0.10 }, { x: 0.64, y: 0.20 },
    { x: 0.80, y: 0.34 }, { x: 0.62, y: 0.40 }, { x: 0.40, y: 0.36 },
    { x: 0.24, y: 0.48 }, { x: 0.44, y: 0.58 }, { x: 0.68, y: 0.62 },
    { x: 0.82, y: 0.76 }, { x: 0.54, y: 0.80 }, { x: 0.30, y: 0.88 },
  ],
  grass: [
    { x: 0.50, y: 0.08 }, { x: 0.50, y: 0.26 }, { x: 0.30, y: 0.34 },
    { x: 0.70, y: 0.34 }, { x: 0.50, y: 0.44 }, { x: 0.20, y: 0.52 },
    { x: 0.80, y: 0.52 }, { x: 0.36, y: 0.62 }, { x: 0.64, y: 0.62 },
    { x: 0.50, y: 0.72 }, { x: 0.50, y: 0.86 }, { x: 0.50, y: 0.96 },
  ],
  light: [
    { x: 0.50, y: 0.12 }, { x: 0.68, y: 0.22 }, { x: 0.78, y: 0.40 },
    { x: 0.72, y: 0.60 }, { x: 0.58, y: 0.74 }, { x: 0.42, y: 0.74 },
    { x: 0.28, y: 0.60 }, { x: 0.22, y: 0.40 }, { x: 0.32, y: 0.22 },
    { x: 0.50, y: 0.36 }, { x: 0.50, y: 0.52 }, { x: 0.50, y: 0.90 },
  ],
  dark: [
    { x: 0.18, y: 0.14 }, { x: 0.82, y: 0.14 }, { x: 0.34, y: 0.30 },
    { x: 0.66, y: 0.30 }, { x: 0.50, y: 0.44 }, { x: 0.24, y: 0.52 },
    { x: 0.76, y: 0.52 }, { x: 0.38, y: 0.66 }, { x: 0.62, y: 0.66 },
    { x: 0.16, y: 0.84 }, { x: 0.84, y: 0.84 }, { x: 0.50, y: 0.94 },
  ],
};

/** Edges drawn between nodes; purely decorative, indices into the layout. */
const EDGES: Record<ElementId, [number, number][]> = {
  fire: [[0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [5, 6], [5, 7], [6, 8], [7, 8], [6, 9], [7, 10], [8, 11]],
  water: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [5, 4], [6, 7], [7, 8], [8, 9], [8, 10], [10, 11]],
  grass: [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 6], [4, 7], [4, 8], [7, 9], [8, 9], [9, 10], [10, 11]],
  light: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [0, 9], [9, 10], [10, 11]],
  dark: [[0, 2], [1, 3], [2, 4], [3, 4], [4, 5], [4, 6], [5, 7], [6, 8], [7, 8], [7, 9], [8, 10], [4, 11]],
};

export function boardNodes(element: ElementId): readonly SignNode[] {
  return LAYOUTS[element];
}

export function boardEdges(element: ElementId): readonly [number, number][] {
  return EDGES[element];
}

export type SignLevels = Record<ElementId, number>;

export function emptySignLevels(): SignLevels {
  return { fire: 0, water: 0, grass: 0, light: 0, dark: 0 };
}

/** Cost of lighting the next star. Steepens so late boards are a real goal. */
export function nodeCost(level: number): number {
  return Math.floor(12_000 * Math.pow(1.85, level));
}

export function isBoardComplete(level: number): boolean {
  return level >= NODES_PER_BOARD;
}

/** Damage bonus this board currently grants against the element it restrains. */
export function boardBonus(level: number): number {
  return Math.min(level, NODES_PER_BOARD) * BONUS_PER_NODE;
}

/**
 * Flattens the boards into "attacking element -> multiplier against the element
 * it restrains", which is the only shape the battle sim needs.
 */
export function signMultipliers(levels: SignLevels): Record<ElementId, number> {
  const result = {} as Record<ElementId, number>;
  for (const element of ELEMENTS) {
    result[element] = 1 + boardBonus(levels[element] ?? 0);
  }
  return result;
}

export function describeBoard(element: ElementId, level: number): string {
  const target = restrainedBy(element);
  return `Khắc chế ${target} +${Math.round(boardBonus(level) * 100)}%`;
}
