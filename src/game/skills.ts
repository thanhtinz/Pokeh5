import type { ElementId } from './elements';

/**
 * Tiên thuật — the immortal arts fielded in the four loadout slots.
 *
 * Each art carries a phase, a tier, a realm requirement and a role. The roles
 * mirror the reference's tags: pure output, output that also applies an
 * effect, a pure effect, and healing. A lineup wants a mix, which is what
 * makes the four slots a decision rather than "equip the four biggest
 * numbers".
 */

export type SkillRole = 'output' | 'output-effect' | 'effect' | 'heal';

export const ROLE_LABEL: Record<SkillRole, string> = {
  output: 'Sát thương',
  'output-effect': 'Sát thương · Hiệu ứng',
  effect: 'Hiệu ứng',
  heal: 'Hồi phục',
};

export type SkillEffect =
  | { kind: 'poison'; turns: number; ratio: number }
  | { kind: 'bleed'; turns: number; ratio: number }
  | { kind: 'shield'; turns: number; ratio: number }
  | { kind: 'empower'; turns: number; amount: number }
  | { kind: 'weaken'; turns: number; amount: number }
  | { kind: 'none' };

export interface Skill {
  id: string;
  name: string;
  element: ElementId;
  /** 阶 — 1..9. Raises the damage ratio and gates on realm. */
  tier: number;
  role: SkillRole;
  /** Ladder index the art becomes usable at. */
  requires: number;
  /** Damage as a fraction of the caster's phase damage. */
  ratio: number;
  effect: SkillEffect;
  flavour: string;
}

/**
 * The catalogue. Deliberately compact — twenty arts that each do something
 * distinct beats sixty that differ only in a number.
 */
export const SKILLS: readonly Skill[] = [
  // --- Kim: precision and armour breaking -------------------------------
  { id: 'kim-1', name: 'Kim Quang Trảm', element: 'kim', tier: 2, role: 'output', requires: 0, ratio: 1.15, effect: { kind: 'none' }, flavour: 'Một đạo kiếm quang xé gió.' },
  { id: 'kim-2', name: 'Phá Giáp Chùy', element: 'kim', tier: 4, role: 'output-effect', requires: 12, ratio: 0.95, effect: { kind: 'weaken', turns: 3, amount: 0.18 }, flavour: 'Đánh vào chỗ hở của hộ thể.' },
  { id: 'kim-3', name: 'Vạn Kiếm Quy Tông', element: 'kim', tier: 6, role: 'output', requires: 30, ratio: 1.75, effect: { kind: 'none' }, flavour: 'Ngàn kiếm cùng về một mối.' },
  { id: 'kim-4', name: 'Canh Kim Sát', element: 'kim', tier: 8, role: 'output-effect', requires: 52, ratio: 1.5, effect: { kind: 'bleed', turns: 4, ratio: 0.3 }, flavour: 'Vết thương kim khí khó lành.' },

  // --- Mộc: sustain --------------------------------------------------------
  { id: 'moc-1', name: 'Mộc Linh Dưỡng', element: 'moc', tier: 2, role: 'heal', requires: 0, ratio: 0.75, effect: { kind: 'none' }, flavour: 'Sinh cơ chảy về thân thể.' },
  { id: 'moc-2', name: 'Triền Đằng Phược', element: 'moc', tier: 3, role: 'output-effect', requires: 9, ratio: 0.8, effect: { kind: 'poison', turns: 3, ratio: 0.34 }, flavour: 'Dây leo siết chặt, nhựa độc thấm vào.' },
  { id: 'moc-3', name: 'Thanh Mộc Trường Sinh', element: 'moc', tier: 5, role: 'heal', requires: 27, ratio: 1.3, effect: { kind: 'shield', turns: 2, ratio: 0.4 }, flavour: 'Cây xanh không chết giữa mùa đông.' },
  { id: 'moc-4', name: 'Vạn Mộc Phệ Thiên', element: 'moc', tier: 7, role: 'output-effect', requires: 45, ratio: 1.4, effect: { kind: 'poison', turns: 5, ratio: 0.42 }, flavour: 'Rừng già nuốt cả trời.' },

  // --- Thủy: control and effects ------------------------------------------
  { id: 'thuy-1', name: 'Hàn Băng Thích', element: 'thuy', tier: 2, role: 'output', requires: 0, ratio: 1.1, effect: { kind: 'none' }, flavour: 'Băng nhọn xuyên qua sương.' },
  { id: 'thuy-2', name: 'Yên Vũ Quyết', element: 'thuy', tier: 4, role: 'effect', requires: 14, ratio: 0, effect: { kind: 'empower', turns: 3, amount: 0.25 }, flavour: 'Khói mưa che mắt, đạo tâm càng sáng.' },
  { id: 'thuy-3', name: 'Huyền Băng Phong', element: 'thuy', tier: 5, role: 'output-effect', requires: 27, ratio: 1.25, effect: { kind: 'weaken', turns: 3, amount: 0.22 }, flavour: 'Đóng băng kinh mạch đối thủ.' },
  { id: 'thuy-4', name: 'Bắc Minh Hải Triều', element: 'thuy', tier: 8, role: 'output', requires: 54, ratio: 1.95, effect: { kind: 'none' }, flavour: 'Sóng Bắc Minh cuốn phăng núi non.' },

  // --- Hỏa: burst ----------------------------------------------------------
  { id: 'hoa-1', name: 'Liệt Diễm Phù', element: 'hoa', tier: 2, role: 'output', requires: 0, ratio: 1.25, effect: { kind: 'none' }, flavour: 'Bùa lửa cháy rực trong tay.' },
  { id: 'hoa-2', name: 'Phần Thiên Ấn', element: 'hoa', tier: 4, role: 'output-effect', requires: 16, ratio: 1.1, effect: { kind: 'bleed', turns: 3, ratio: 0.28 }, flavour: 'Ấn quyết đốt cháy cả tầng mây.' },
  { id: 'hoa-3', name: 'Tam Muội Chân Hỏa', element: 'hoa', tier: 6, role: 'output', requires: 33, ratio: 1.85, effect: { kind: 'none' }, flavour: 'Lửa thật không cần củi.' },
  { id: 'hoa-4', name: 'Nam Ly Kiếp Hỏa', element: 'hoa', tier: 9, role: 'output-effect', requires: 63, ratio: 1.7, effect: { kind: 'bleed', turns: 5, ratio: 0.38 }, flavour: 'Lửa kiếp nạn thiêu tận nhân quả.' },

  // --- Thổ: defence --------------------------------------------------------
  { id: 'tho-1', name: 'Hậu Thổ Bích', element: 'tho', tier: 2, role: 'effect', requires: 0, ratio: 0, effect: { kind: 'shield', turns: 3, ratio: 0.45 }, flavour: 'Đất dày chở che vạn vật.' },
  { id: 'tho-2', name: 'Địa Sát Chùy', element: 'tho', tier: 3, role: 'output', requires: 11, ratio: 1.2, effect: { kind: 'none' }, flavour: 'Búa đất giáng xuống như núi đổ.' },
  { id: 'tho-3', name: 'Bất Động Minh Vương', element: 'tho', tier: 6, role: 'effect', requires: 36, ratio: 0, effect: { kind: 'shield', turns: 4, ratio: 0.75 }, flavour: 'Ngồi yên, muôn pháp không lay.' },
  { id: 'tho-4', name: 'Sơn Hà Xã Tắc', element: 'tho', tier: 8, role: 'output-effect', requires: 58, ratio: 1.45, effect: { kind: 'empower', turns: 4, amount: 0.3 }, flavour: 'Núi sông vào trong một quyển.' },
];

const BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));

export function skillById(id: string): Skill | null {
  return BY_ID.get(id) ?? null;
}

export const LOADOUT_SLOTS = 4;

/** Slot names, matching the reference's 仙术一 … 仙术四. */
export const SLOT_LABELS = ['Tiên thuật nhất', 'Tiên thuật nhị', 'Tiên thuật tam', 'Tiên thuật tứ'];

export function isUnlocked(skill: Skill, stage: number): boolean {
  return stage >= skill.requires;
}

/** Rank numerals for the tier badge: "tứ giai". */
const TIER_NAMES = ['', 'nhất', 'nhị', 'tam', 'tứ', 'ngũ', 'lục', 'thất', 'bát', 'cửu'];

export function tierLabel(tier: number): string {
  return `${TIER_NAMES[Math.max(1, Math.min(9, tier))]} giai`;
}

export function effectLabel(effect: SkillEffect): string | null {
  switch (effect.kind) {
    case 'poison':
      return `Trúng độc ${effect.turns} lượt`;
    case 'bleed':
      return `Thiêu đốt ${effect.turns} lượt`;
    case 'shield':
      return `Hộ thể ${effect.turns} lượt`;
    case 'empower':
      return `Tăng công ${Math.round(effect.amount * 100)}%`;
    case 'weaken':
      return `Giảm công địch ${Math.round(effect.amount * 100)}%`;
    default:
      return null;
  }
}
