/**
 * Vietnamese number formatting. Idle numbers outgrow a phone screen quickly,
 * so anything past ten thousand collapses to three significant digits and a
 * unit the player already reads in their own language.
 */
const UNITS = ['', 'N', 'Tr', 'Tỷ', 'NTỷ', 'TrTỷ', 'Tỷ²'];

export function num(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  const sign = value < 0 ? '-' : '';
  let n = Math.abs(value);

  if (n < 10_000) return sign + Math.floor(n).toLocaleString('vi-VN');

  let unit = 0;
  while (n >= 1000 && unit < UNITS.length - 1) {
    n /= 1000;
    unit += 1;
  }

  const digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
  return `${sign}${n.toFixed(digits)}${UNITS[unit]}`;
}

/** Rate label: "2.16N/giây". */
export function rate(perSecond: number): string {
  return `${num(perSecond)}/giây`;
}

/** Clock for reset timers: 07:33:21. */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Human duration for the offline dialog: "3 giờ 12 phút". */
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

/** Signed delta for stat comparisons: "+1.2N". */
export function delta(value: number): string {
  return value >= 0 ? `+${num(value)}` : num(value);
}
