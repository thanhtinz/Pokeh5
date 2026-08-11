import { COLORS } from '../config';

export const FONT_FAMILY = '"Baloo 2", system-ui, -apple-system, "Segoe UI", sans-serif';

function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

type Style = Phaser.Types.GameObjects.Text.TextStyle;

function base(size: number, color: number, weight = '700'): Style {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: weight,
    color: css(color),
    // Every label sits on artwork, so a dark rim is what keeps it readable.
    stroke: '#08101f',
    strokeThickness: Math.max(2, Math.round(size * 0.14)),
    resolution: 2,
  };
}

export const TEXT = {
  title: base(38, COLORS.text),
  heading: base(28, COLORS.text),
  body: base(22, COLORS.text),
  bodyDim: base(22, COLORS.textDim),
  small: base(18, COLORS.text),
  smallDim: base(18, COLORS.textDim),
  tiny: base(15, COLORS.textDim),
  stat: base(24, COLORS.textGold),
  button: base(26, 0xffffff),
  buttonSmall: base(20, 0xffffff),
  badge: base(16, 0xffffff),
} as const;

/** A copy with one field overridden, so callers never mutate the shared style. */
export function styled(style: Style, overrides: Style): Style {
  return { ...style, ...overrides };
}

export function colorText(style: Style, color: number): Style {
  return { ...style, color: css(color) };
}

export { css as cssColor };
