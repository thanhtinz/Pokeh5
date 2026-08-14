/**
 * Sáu cái sân của màn Cày, một cái cho mỗi khu.
 *
 * ## Bố cục có chỗ cấm, và chỗ cấm ấy là lý do cả sáu sân cùng một khung
 *
 * Trên cảnh có ba thứ **không phải cảnh** đè lên: giá mỗi lần chạm ở góc trái
 * trên, dòng "mỗi chạm" ngay dưới nó, và bội số nhiệt ở góc phải trên. Cộng
 * thêm nhân vật đứng giữa, ở ô cột 3 hàng 2–3.
 *
 * Nên chỗ đặt được đồ chỉ còn sáu ô hai nhân hai, và cả sáu sân dùng chung
 * đúng sáu chỗ đó. Nghe như gò bó, nhưng nó giải quyết được thứ khó nhất của
 * việc này: **người chơi phải nhận ra sân vừa đổi**. Giữ nguyên bố cục và chỉ
 * đổi vật liệu thì mắt so sánh được ngay — cùng một chỗ, hôm qua là thùng rác,
 * hôm nay là container. Đổi cả bố cục thì thành hai bức tranh khác nhau, và
 * hai bức tranh khác nhau thì không so được với nhau.
 *
 * ## Cái thang đọc bằng vật liệu
 *
 *   nhựa đường nứt  → bê tông cảng  → vỉa hè sạch
 *   → nền lát       → bãi cỏ        → sàn gỗ
 *
 *   rác và xe hỏng  → container     → sạp và ô che
 *   → cây chậu, ATM → cây và ghế    → ăng-ten và ô che
 *
 * Không dòng chữ nào giải thích, và không cần.
 */
import type { Block, Scene } from './Pix';

function c(x: number, y: number, w: number, h: number, at: readonly [number, number]): Block {
  return { sheet: 'city', x, y, w, h, at };
}

function u(x: number, y: number, w: number, h: number, at: readonly [number, number]): Block {
  return { sheet: 'urban', x, y, w, h, at };
}

/** Sân rộng tám ô, cao sáu ô — đúng 128×96 pixel gốc của khung cảnh. */
export const YARD_COLS = 8;
export const YARD_ROWS = 6;

/**
 * Sáu chỗ đặt đồ.
 *
 * Cột 0–2 và 6–7 ở hàng 0–1 bị chữ đè, cột 3–4 hàng 2–3 là chỗ nhân vật đứng.
 * Sáu ô còn lại là đây, viết ra thành hằng số để mỗi sân khỏi tự đoán lại — và
 * để lúc chữ trên màn hình đổi chỗ thì chỉ phải sửa đúng một nơi.
 */
const SLOT = {
  top: [3, 0],
  left: [0, 2],
  right: [6, 2],
  lowLeft: [0, 4],
  lowMid: [3, 4],
  lowRight: [6, 4],
} as const;

export interface Yard {
  /** Ô nền, lát kín cả sân. */
  ground: Block;
  /** Đồ đạc, đặt vào sáu chỗ trên. */
  props: readonly Block[];
}

export const YARD_SCENES: readonly Yard[] = [
  // Xóm Liều — nhựa đường nứt, rác, một chiếc xe hỏng.
  {
    ground: { sheet: 'urban', x: 7, y: 16, w: 1, h: 1 },
    props: [
      u(16, 9, 2, 2, SLOT.top),
      u(8, 9, 2, 2, SLOT.left),
      u(6, 10, 2, 2, SLOT.right),
      u(15, 16, 2, 2, SLOT.lowLeft),
      c(12, 14, 2, 1, SLOT.lowMid),
      u(3, 10, 2, 2, SLOT.lowRight),
    ],
  },

  // Cảng — bê tông, container, thùng phuy, xe tải công trường.
  {
    ground: { sheet: 'city', x: 2, y: 24, w: 1, h: 1 },
    props: [
      c(32, 24, 2, 2, SLOT.top),
      c(26, 26, 2, 2, SLOT.left),
      c(20, 26, 2, 2, SLOT.right),
      c(15, 13, 3, 1, SLOT.lowLeft),
      c(12, 14, 2, 1, SLOT.lowMid),
      c(13, 15, 2, 2, SLOT.lowRight),
    ],
  },

  // Phố Thị — vỉa hè sạch, ô che, sạp hàng, xe giao hàng.
  {
    ground: { sheet: 'urban', x: 9, y: 1, w: 1, h: 1 },
    props: [
      c(34, 14, 2, 2, SLOT.top),
      u(6, 8, 2, 2, SLOT.left),
      u(4, 10, 2, 2, SLOT.right),
      c(31, 18, 2, 2, SLOT.lowLeft),
      u(3, 11, 2, 1, SLOT.lowMid),
      u(6, 10, 2, 2, SLOT.lowRight),
    ],
  },

  // Tài Chính — nền lát, cây chậu, một tường ATM, két, xe con.
  {
    ground: { sheet: 'city', x: 7, y: 19, w: 1, h: 1 },
    props: [
      u(16, 9, 2, 2, SLOT.top),
      u(8, 11, 2, 1, [0, 2]),
      u(8, 11, 2, 1, [0, 3]),
      c(32, 20, 2, 2, SLOT.right),
      u(10, 12, 1, 1, [0, 4]),
      u(10, 12, 1, 1, [1, 4]),
      u(4, 6, 2, 2, SLOT.lowMid),
      c(12, 15, 2, 2, SLOT.lowRight),
    ],
  },

  // Uptown — bãi cỏ, cây, bụi, ô che, xe đẹp.
  {
    ground: { sheet: 'city', x: 0, y: 24, w: 1, h: 1 },
    props: [
      c(31, 12, 3, 1, SLOT.top),
      u(16, 9, 2, 2, SLOT.left),
      c(31, 18, 2, 2, SLOT.right),
      u(16, 8, 2, 1, SLOT.lowLeft),
      c(34, 14, 2, 2, SLOT.lowMid),
      u(16, 9, 2, 2, SLOT.lowRight),
    ],
  },

  // Heights — sàn gỗ, ăng-ten, cây chậu, ô che, xe đen.
  {
    ground: { sheet: 'city', x: 4, y: 19, w: 1, h: 1 },
    props: [
      u(0, 6, 1, 2, [3, 0]),
      u(3, 6, 1, 2, [4, 0]),
      u(16, 9, 2, 2, SLOT.left),
      c(31, 22, 2, 2, SLOT.right),
      c(12, 15, 2, 2, SLOT.lowLeft),
      c(34, 14, 2, 2, SLOT.lowMid),
      u(16, 8, 2, 1, [6, 4]),
      u(16, 8, 2, 1, [6, 5]),
    ],
  },
];

/** Một sân dựng thành `Scene` để `PixScene` vẽ được. */
export function yardScene(tier: number): Scene {
  const yard = YARD_SCENES[Math.min(Math.max(tier, 0), YARD_SCENES.length - 1)]!;
  const layers: Block[] = [];

  for (let y = 0; y < YARD_ROWS; y += 1) {
    for (let x = 0; x < YARD_COLS; x += 1) {
      layers.push({ ...yard.ground, w: 1, h: 1, at: [x, y] });
    }
  }

  layers.push(...yard.props);
  return { w: YARD_COLS, h: YARD_ROWS, layers };
}
