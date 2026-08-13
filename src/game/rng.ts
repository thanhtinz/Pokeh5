/**
 * mulberry32 — small, fast and seedable.
 *
 * Seeding matters in two places here: stock prices have to walk the same path
 * for every session that reloads the same save, and a drawn card has to be the
 * same card after a refresh. Both read from a seed stored in the save.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick on an empty list');
    return items[Math.floor(this.next() * items.length)]!;
  }

  /**
   * Standard normal via Box–Muller. Stock moves need a bell curve, not a flat
   * one, or the walk looks like noise rather than a market.
   */
  normal(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Current internal state, so it can be persisted and resumed. */
  get seed(): number {
    return this.state;
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
