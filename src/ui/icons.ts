/**
 * Bảng tra ô trong tấm sprite — **sinh tự động, đừng sửa tay**.
 *
 *   node scripts/sprite.mjs
 *
 * Nguồn là `scripts/icon-map.json`. Sửa bảng ghép ở đó rồi chạy lại lệnh
 * trên; sửa thẳng file này thì lần sinh sau mất hết.
 */

/** Lưới của tấm sprite: đều tăm tắp, không viền, không khe. */
export const ICON_COLS = 7;
export const ICON_ROWS = 6;

/** Một ô vuông bao nhiêu pixel trong tấm PNG gốc. */
export const ICON_CELL = 192;

/** Id trong game → số thứ tự ô, đếm từ trái sang phải rồi xuống dòng. */
export const ICONS: Record<string, number> = {
  "cans": 0,
  "cart": 1,
  "wash": 2,
  "busk": 3,
  "scrap": 4,
  "flip": 5,
  "forklift": 6,
  "crate": 7,
  "fish": 8,
  "tug": 9,
  "customs": 10,
  "yard": 11,
  "food": 12,
  "laundry": 13,
  "gym": 14,
  "cafe": 15,
  "cinema": 16,
  "hotel": 17,
  "fund": 18,
  "bank": 19,
  "insure": 20,
  "broker": 21,
  "ratings": 22,
  "exchange": 23,
  "gallery": 24,
  "auction": 25,
  "yacht": 26,
  "jet": 27,
  "vineyard": 28,
  "island": 29,
  "tower": 30,
  "media": 31,
  "space": 32,
  "fusion": 33,
  "bank2": 34,
  "empire": 35,
  "flyers": 36,
  "dishes": 37,
  "moving": 38,
  "night": 39,
  "rig": 40,
};
