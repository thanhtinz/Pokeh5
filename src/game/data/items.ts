export interface ItemDef {
  id: string;
  name: string;
  description: string;
  /** Atlas frame in `items`; matches the id for everything fetched upstream. */
  icon: string;
  category: 'ball' | 'boost' | 'heal' | 'stone' | 'treasure' | 'gear';
  /** Sell value in gold; treasure exists purely to be sold. */
  value: number;
}

export const ITEMS: readonly ItemDef[] = [
  { id: 'poke-ball', name: 'Poké Ball', description: 'Dùng để triệu hồi Pokémon thường.', icon: 'poke-ball', category: 'ball', value: 200 },
  { id: 'great-ball', name: 'Great Ball', description: 'Tỉ lệ ra Pokémon hiếm cao hơn.', icon: 'great-ball', category: 'ball', value: 600 },
  { id: 'ultra-ball', name: 'Ultra Ball', description: 'Tỉ lệ ra Pokémon Sử Thi cao hơn.', icon: 'ultra-ball', category: 'ball', value: 1800 },
  { id: 'master-ball', name: 'Master Ball', description: 'Chắc chắn ra Pokémon Huyền Thoại.', icon: 'master-ball', category: 'ball', value: 25000 },

  { id: 'rare-candy', name: 'Kẹo Hiếm', description: 'Cộng thẳng EXP cho một Pokémon.', icon: 'rare-candy', category: 'boost', value: 800 },
  { id: 'exp-share', name: 'Chia EXP', description: 'Tăng EXP nhận được khi treo máy.', icon: 'exp-share', category: 'boost', value: 3000 },
  { id: 'lucky-egg', name: 'Trứng May Mắn', description: 'Nhân đôi EXP trong một khoảng thời gian.', icon: 'lucky-egg', category: 'boost', value: 4000 },
  { id: 'amulet-coin', name: 'Bùa Tiền', description: 'Tăng vàng nhận được khi treo máy.', icon: 'amulet-coin', category: 'boost', value: 3500 },

  { id: 'potion', name: 'Thuốc', description: 'Hồi máu sau trận đấu.', icon: 'potion', category: 'heal', value: 150 },
  { id: 'super-potion', name: 'Siêu Thuốc', description: 'Hồi nhiều máu hơn.', icon: 'super-potion', category: 'heal', value: 450 },
  { id: 'hyper-potion', name: 'Thuốc Cực Mạnh', description: 'Hồi máu lượng lớn.', icon: 'hyper-potion', category: 'heal', value: 1000 },
  { id: 'max-revive', name: 'Hồi Sinh Tối Đa', description: 'Hồi sinh toàn đội với máu đầy.', icon: 'max-revive', category: 'heal', value: 2500 },

  { id: 'fire-stone', name: 'Đá Lửa', description: 'Nguyên liệu tiến hoá hệ Lửa.', icon: 'fire-stone', category: 'stone', value: 2000 },
  { id: 'water-stone', name: 'Đá Nước', description: 'Nguyên liệu tiến hoá hệ Nước.', icon: 'water-stone', category: 'stone', value: 2000 },
  { id: 'thunder-stone', name: 'Đá Sét', description: 'Nguyên liệu tiến hoá hệ Điện.', icon: 'thunder-stone', category: 'stone', value: 2000 },
  { id: 'leaf-stone', name: 'Đá Lá', description: 'Nguyên liệu tiến hoá hệ Cỏ.', icon: 'leaf-stone', category: 'stone', value: 2000 },
  { id: 'moon-stone', name: 'Đá Mặt Trăng', description: 'Nguyên liệu tiến hoá hiếm.', icon: 'moon-stone', category: 'stone', value: 3200 },

  { id: 'nugget', name: 'Cục Vàng', description: 'Bán lấy vàng.', icon: 'nugget', category: 'treasure', value: 5000 },
  { id: 'big-nugget', name: 'Cục Vàng Lớn', description: 'Bán lấy rất nhiều vàng.', icon: 'big-nugget', category: 'treasure', value: 20000 },
  { id: 'star-piece', name: 'Mảnh Sao', description: 'Bán lấy vàng.', icon: 'star-piece', category: 'treasure', value: 9000 },

  { id: 'life-orb', name: 'Ngọc Sinh Mệnh', description: 'Trang bị: tăng sát thương.', icon: 'life-orb', category: 'gear', value: 12000 },
  { id: 'choice-band', name: 'Băng Chọn Lựa', description: 'Trang bị: tăng công vật lý.', icon: 'choice-band', category: 'gear', value: 12000 },
  { id: 'focus-sash', name: 'Đai Tập Trung', description: 'Trang bị: sống sót một đòn chí mạng.', icon: 'focus-sash', category: 'gear', value: 15000 },
  { id: 'leftovers', name: 'Đồ Ăn Thừa', description: 'Trang bị: hồi máu mỗi lượt.', icon: 'leftovers', category: 'gear', value: 14000 },
  { id: 'assault-vest', name: 'Áo Giáp Tấn Công', description: 'Trang bị: tăng kháng phép.', icon: 'assault-vest', category: 'gear', value: 13000 },
];

const BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function itemDef(id: string): ItemDef | null {
  return BY_ID.get(id) ?? null;
}
