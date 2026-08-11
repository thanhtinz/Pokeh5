/** The design resolution every scene lays out against. */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

/** Height of the fixed chrome, so scenes know the free vertical band. */
export const HUD_HEIGHT = 186;
export const NAV_HEIGHT = 118;

export const COLORS = {
  bgDeep: 0x0b101c,
  bgPanel: 0x16203a,
  bgPanelAlt: 0x1e2b4d,
  bgSlot: 0x0f1830,
  stroke: 0x3a4d80,
  strokeSoft: 0x24325a,

  text: 0xeaf0ff,
  textDim: 0x94a3c7,
  textGold: 0xffd44d,

  accent: 0x4fc3f7,
  accentDeep: 0x1f6fb2,
  danger: 0xef4444,
  dangerDeep: 0x9b1c1c,
  success: 0x34d399,
  successDeep: 0x0f766e,
  warn: 0xf59e0b,
  purple: 0xa855f7,
  purpleDeep: 0x6b21a8,

  hpFull: 0x4ade80,
  hpMid: 0xfbbf24,
  hpLow: 0xf87171,
  expBar: 0x60a5fa,
} as const;

/** Rarity ramp, indexed 1..5, used by cards, borders and summon flashes. */
export const RARITY_COLORS = [
  0x94a3c7, 0x94a3c7, 0x6ee7b7, 0x60a5fa, 0xc084fc, 0xfbbf24,
] as const;

export const RARITY_NAMES = ['', 'Thường', 'Hiếm', 'Tinh Anh', 'Sử Thi', 'Huyền Thoại'] as const;

/** Colours for each Pokemon type, used on the type chips. */
export const TYPE_COLORS: Record<string, number> = {
  normal: 0xa8a878,
  fire: 0xf08030,
  water: 0x6890f0,
  electric: 0xf8d030,
  grass: 0x78c850,
  ice: 0x98d8d8,
  fighting: 0xc03028,
  poison: 0xa040a0,
  ground: 0xe0c068,
  flying: 0xa890f0,
  psychic: 0xf85888,
  bug: 0xa8b820,
  rock: 0xb8a038,
  ghost: 0x705898,
  dragon: 0x7038f8,
  dark: 0x705848,
  steel: 0xb8b8d0,
  fairy: 0xee99ac,
};

export const TYPE_NAMES_VI: Record<string, string> = {
  normal: 'Thường',
  fire: 'Lửa',
  water: 'Nước',
  electric: 'Điện',
  grass: 'Cỏ',
  ice: 'Băng',
  fighting: 'Giác Đấu',
  poison: 'Độc',
  ground: 'Đất',
  flying: 'Bay',
  psychic: 'Siêu Linh',
  bug: 'Bọ',
  rock: 'Đá',
  ghost: 'Ma',
  dragon: 'Rồng',
  dark: 'Bóng Tối',
  steel: 'Thép',
  fairy: 'Tiên',
};

/** Team size, matching the six slots the formation screen shows. */
export const TEAM_SIZE = 6;

/** Offline earnings stop accruing past this, so the game still wants opening. */
export const OFFLINE_CAP_HOURS = 12;
