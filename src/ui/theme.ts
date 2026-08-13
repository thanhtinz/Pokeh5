/**
 * The debt-to-wealth palette.
 *
 * The pitch for this game is "watch a red, empty screen slowly fill with income
 * and the life you lost", so the palette is not decoration — it is the progress
 * bar. Every colour in the stylesheet is derived from two custom properties
 * written here, and both are a function of net worth: a deep, desaturated
 * blood red at minus one million, warming through ember and brass to gold.
 *
 * Only two properties are written per frame, so a full repaint of the theme
 * costs the same as moving a single element.
 */

import { STARTING_BALANCE } from '../game/state';

/** Net worth at which the palette is fully gold. */
const WEALTH_CEILING = 1e15;

/**
 * Net worth to 0..1.
 *
 * The climb out of debt is half the bar even though it is a rounding error in
 * absolute terms, because it is most of the emotional distance and all of the
 * first session. Above zero the scale goes logarithmic, which is the only way
 * a range ending in the quadrillions has any resolution at the bottom.
 */
export function wealthProgress(netWorth: number): number {
  if (!Number.isFinite(netWorth)) return netWorth > 0 ? 1 : 0;

  if (netWorth <= STARTING_BALANCE) return 0;
  if (netWorth < 0) {
    const climbed = (netWorth - STARTING_BALANCE) / -STARTING_BALANCE;
    // Eased so the first few thousand earned visibly move the colour.
    return 0.5 * Math.pow(climbed, 0.7);
  }

  const decades = Math.log10(Math.max(1, netWorth)) / Math.log10(WEALTH_CEILING);
  return 0.5 + 0.5 * Math.min(1, decades);
}

export interface Palette {
  /** Accent hue, wrapping through zero from red to gold. */
  hue: number;
  /** Accent saturation, in percent. */
  saturation: number;
  /** How far up the climb, for CSS that scales an effect with progress. */
  progress: number;
}

export function paletteFor(progress: number): Palette {
  const p = Math.min(1, Math.max(0, progress));

  // 352 → 402, taken modulo 360 so it sweeps red → ember → amber → gold rather
  // than the long way round through green.
  const hue = (352 + 50 * p) % 360;

  // Debt is saturated and airless; wealth is warmer but calmer.
  const saturation = 74 - 12 * p;

  return { hue, saturation, progress: p };
}

let lastHue = Number.NaN;

/** Writes the palette to the document root, skipping no-op repaints. */
export function applyTheme(netWorth: number, root: HTMLElement): void {
  const palette = paletteFor(wealthProgress(netWorth));

  // Colour moves slowly by design; a tenth of a degree is below perception and
  // not worth a style recalculation on every frame.
  if (Math.abs(palette.hue - lastHue) < 0.1) return;
  lastHue = palette.hue;

  root.style.setProperty('--hue', palette.hue.toFixed(2));
  root.style.setProperty('--sat', `${palette.saturation.toFixed(1)}%`);
  root.style.setProperty('--wealth', palette.progress.toFixed(3));
}
