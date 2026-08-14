/**
 * Bộ dựng hình isometric.
 *
 * ## Vì sao đổi sang isometric
 *
 * Tấm vẽ tay trước đó hỏng vì thiếu bước dựng hình, chứ không phải vì vẽ chưa
 * khéo. Nó xếp chồng mấy khối bezier rời nhau: cánh tay lơ lửng trên thân, đôi
 * giày không dính vào chân, đường bao không đọc ra hình gì. Và ánh sáng thì
 * mỗi hình một hướng, dù phần chú thích nói là trên-trái.
 *
 * Isometric chữa đúng những chỗ đó, vì nó **tính ra được** thay vì phải đoán:
 *
 *  - Mọi hình khối chiếu qua đúng một phép chiếu, nên không có hình nào lệch hệ.
 *  - Mỗi khối hộp có ba mặt, và **ba mặt luôn nhận ba sắc độ cố định**: mặt
 *    trên sáng nhất, mặt trái vừa, mặt phải tối. Ánh sáng thành một luật của
 *    cả cảnh chứ không phải một lựa chọn của từng hình.
 *  - Vật thể nằm ở đâu trong không gian là một phép cộng, nên không có chuyện
 *    một món đồ trôi lửng lơ cách mặt đất mấy pixel.
 *
 * Đây cũng là ngôn ngữ hình của đúng dòng game này — tycoon nhìn nghiêng —
 * nên nó vừa dựng được vừa đúng thể loại.
 *
 * ## Phép chiếu
 *
 * Toạ độ thế giới `(x, y, z)`: `x` chạy về phía dưới-phải, `y` về phía
 * dưới-trái, `z` lên trên. Một ô là 2 rộng × 1 cao trên màn hình, tức là kiểu
 * "2:1" của game chứ không phải 30° hình học thật — góc thoải hơn, và mọi cạnh
 * rơi đúng vào lưới pixel thay vì rơi vào số lẻ.
 */
import type { JSX } from 'preact';

/** Nửa chiều rộng và nửa chiều cao của một ô. */
export const TILE_X = 16;
export const TILE_Y = 8;
/** Một đơn vị chiều cao. */
export const TILE_Z = 14;

export type Tone = readonly [hue: number, sat: number, light: number];

/** Ba mặt, ba sắc độ. Đây là toàn bộ luật ánh sáng của cả bộ hình. */
const FACE = { top: 1, left: 0.76, right: 0.55 } as const;
export type Face = keyof typeof FACE;

export function shade(tone: Tone, face: Face, lift = 0): string {
  const [hue, sat, light] = tone;
  return `hsl(${hue} ${sat}% ${Math.max(3, Math.min(96, light * FACE[face] + lift))}%)`;
}

/** Một điểm trong thế giới thành một điểm trên màn hình. */
export function project(x: number, y: number, z: number): [number, number] {
  return [(x - y) * TILE_X, (x + y) * TILE_Y - z * TILE_Z];
}

function poly(points: readonly [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

export interface BoxProps {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  tone: Tone;
  /** Cộng thêm vào độ sáng của cả ba mặt — dùng cho chỗ đón sáng mạnh. */
  lift?: number;
  class?: string;
}

/**
 * Một khối hộp.
 *
 * Vẽ đúng ba mặt nhìn thấy được. Không vẽ viền: viền đen quanh từng khối làm
 * cảnh vỡ vụn thành từng mảnh rời; chỗ tiếp giáp đã tự tách nhau nhờ ba sắc độ.
 */
export function Box({ x, y, z, w, d, h, tone, lift = 0, class: cls }: BoxProps): JSX.Element {
  const top = z + h;

  const a = project(x, y, top);
  const b = project(x + w, y, top);
  const c = project(x + w, y + d, top);
  const e = project(x, y + d, top);

  const f = project(x, y + d, z);
  const g = project(x + w, y + d, z);
  const i = project(x + w, y, z);

  return (
    <g class={cls}>
      <polygon points={poly([e, c, g, f])} fill={shade(tone, 'left', lift)} />
      <polygon points={poly([c, b, i, g])} fill={shade(tone, 'right', lift)} />
      <polygon points={poly([a, b, c, e])} fill={shade(tone, 'top', lift)} />
    </g>
  );
}

export interface CylProps {
  /** Tâm đáy. */
  x: number;
  y: number;
  z: number;
  r: number;
  h: number;
  tone: Tone;
  lift?: number;
}

/**
 * Một khối trụ đứng — thùng phuy, cuộn dây, cái xô.
 *
 * Thân trụ chia làm hai nửa sáng tối theo đúng luật của khối hộp, nên trụ và
 * hộp đứng cạnh nhau vẫn nhận cùng một nguồn sáng.
 */
export function Cyl({ x, y, z, r, h, tone, lift = 0 }: CylProps): JSX.Element {
  const [cx, cyTop] = project(x, y, z + h);
  const [, cyBottom] = project(x, y, z);
  const rx = r * TILE_X;
  const ry = r * TILE_Y;

  return (
    <g>
      {/* Thân: một hình chữ nhật bo hai đầu bằng cung của hai mặt đáy. */}
      <path
        d={`M${cx - rx} ${cyTop} L${cx - rx} ${cyBottom} A${rx} ${ry} 0 0 0 ${cx} ${cyBottom + ry} L${cx} ${cyTop + ry} A${rx} ${ry} 0 0 1 ${cx - rx} ${cyTop}Z`}
        fill={shade(tone, 'left', lift)}
      />
      <path
        d={`M${cx + rx} ${cyTop} L${cx + rx} ${cyBottom} A${rx} ${ry} 0 0 1 ${cx} ${cyBottom + ry} L${cx} ${cyTop + ry} A${rx} ${ry} 0 0 0 ${cx + rx} ${cyTop}Z`}
        fill={shade(tone, 'right', lift)}
      />
      <ellipse cx={cx} cy={cyTop} rx={rx} ry={ry} fill={shade(tone, 'top', lift)} />
    </g>
  );
}

/**
 * Bóng đổ trên mặt đất.
 *
 * Một hình thoi mờ nằm đúng ô mà vật thể chiếm. Không có nó thì mọi thứ trông
 * như dán lên nền, và đó là chỗ dễ nhận ra nhất giữa một cảnh và một mớ hình.
 */
export function Shadow({
  x,
  y,
  w,
  d,
  opacity = 0.3,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  opacity?: number;
}): JSX.Element {
  const points = poly([
    project(x, y, 0),
    project(x + w, y, 0),
    project(x + w, y + d, 0),
    project(x, y + d, 0),
  ]);
  return <polygon points={points} fill="#000" opacity={opacity} />;
}

/** Mặt nền: một ô sàn phẳng. */
export function Tile({
  x,
  y,
  w,
  d,
  tone,
  lift = 0,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  tone: Tone;
  lift?: number;
}): JSX.Element {
  const points = poly([
    project(x, y, 0),
    project(x + w, y, 0),
    project(x + w, y + d, 0),
    project(x, y + d, 0),
  ]);
  return <polygon points={points} fill={shade(tone, 'top', lift)} />;
}
