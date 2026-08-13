import { t as tr } from '../i18n';

/**
 * Money formatting.
 *
 * An idle tycoon runs from minus one million to numbers with sixty digits, and
 * both ends have to stay readable on a phone. Negatives matter more than usual
 * here: the whole first act of the game is spent below zero, so the minus sign
 * is part of the design rather than an edge case.
 */

/** Short scale to trillion, then the two-letter suffixes idle games use. */
const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'aa',
  'ab',
  'ac',
  'ad',
  'ae',
  'af',
  'ag',
  'ah',
  'ai',
  'aj',
  'ak',
  'al',
  'am',
  'an',
  'ao',
  'ap',
];

/** "$1.23M", "-$998.4K", "$0". */
export function money(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? '$∞' : '-$∞';

  const negative = value < 0;
  const magnitude = Math.abs(value);
  const body = magnitude < 1000 ? formatSmall(magnitude) : formatLarge(magnitude);

  return `${negative ? '-' : ''}$${body}`;
}

/** Under a thousand, cents only matter while the player is still counting them. */
function formatSmall(value: number): string {
  if (value === 0) return '0';
  if (value < 10) return value.toFixed(2).replace(/\.?0+$/, '');
  return Math.floor(value).toLocaleString('en-US');
}

function formatLarge(value: number): string {
  let n = value;
  let tier = 0;
  while (n >= 1000 && tier < SUFFIXES.length - 1) {
    n /= 1000;
    tier += 1;
  }

  // Three significant digits keeps every figure the same visual width, which
  // matters when a column of them is ticking upward.
  const digits = n >= 100 ? 1 : n >= 10 ? 2 : 3;
  return `${trim(n.toFixed(digits))}${SUFFIXES[tier]}`;
}

function trim(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** "$1.2M/s" — the rate label under every income source. */
export function rate(perSecond: number): string {
  return `${money(perSecond)}/s`;
}

/** Plain count, no currency: "1.23M". */
export function count(value: number): string {
  return money(value).replace('$', '');
}

/** Seconds to a compact clock: "1:04", "12s", "2:05:30". */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  if (s < 60) return `${s}s`;

  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Long-form duration for the offline dialog: "3h 12m". */
export function duration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? tr('time.hoursMinutes', { hours, minutes }) : tr('time.hours', { hours });
  }
  if (minutes > 0) return tr('time.minutes', { minutes });
  return tr('time.seconds', { seconds: s });
}

export function percent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

/** Signed percentage for stock moves: "+2.4%", "-0.8%". */
export function signedPercent(fraction: number): string {
  const sign = fraction >= 0 ? '+' : '';
  return `${sign}${(fraction * 100).toFixed(2)}%`;
}
