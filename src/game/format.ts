const UNITS = ['', 'K', 'M', 'B', 'T', 'Aa', 'Ab', 'Ac', 'Ad', 'Ae'];

/**
 * Idle games run numbers past what a phone can show, so everything above 10k
 * collapses to three significant digits and a unit: 3.48M, 79.9M, 1938.
 */
export function abbreviate(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  const sign = value < 0 ? '-' : '';
  let n = Math.abs(value);
  if (n < 10000) return sign + Math.floor(n).toLocaleString('en-US');

  let unit = 0;
  while (n >= 1000 && unit < UNITS.length - 1) {
    n /= 1000;
    unit += 1;
  }

  const digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
  return `${sign}${n.toFixed(digits)}${UNITS[unit]}`;
}

/** "1.2K/Hr" style rate label. */
export function rate(perHour: number): string {
  return `${abbreviate(perHour)}/Hr`;
}

/** Seconds to a clock: 01:28:40, or 28:40 under an hour. */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Coarse duration for the offline reward dialog: "3 giờ 12 phút". */
export function duration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  if (minutes > 0) return `${minutes} phút`;
  return `${s} giây`;
}

export function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
