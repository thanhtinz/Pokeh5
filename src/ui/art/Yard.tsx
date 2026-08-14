/**
 * Bãi phế liệu — cảnh của màn Cày, dựng trên hệ isometric.
 *
 * Bản vẽ tay trước đó sai ở khâu dựng hình, nên bản này bắt đầu từ khâu đó.
 * Mọi vật thể là khối hộp hoặc khối trụ đặt bằng toạ độ `(x, y, z)`, và ba mặt
 * của mỗi khối nhận ba sắc độ cố định. Hệ quả là những thứ trước kia phải căn
 * bằng mắt thì giờ đúng theo phép cộng: không có món nào lửng lơ cách mặt đất,
 * không có hình nào bắt sáng khác hướng, và thứ tự che nhau là một con số so
 * sánh được chứ không phải một phán đoán.
 *
 * ## Ba điều học được khi soi bản dựng đầu ở cỡ lớn
 *
 *  1. **Khung phải ôm lấy cảnh.** Bản đầu để một mảnh sân 7×7 trong một khung
 *     rộng, và nửa trên khung trống trơn. Khung bây giờ tính từ chính kích
 *     thước mảnh sân, và mảnh sân thu lại còn 4,6 ô — máy ảnh lại gần hơn.
 *  2. **Nhân vật phải to.** Ở bản đầu anh ta chiếm chừng một phần mười hai
 *     chiều cao khung, tức là một cái chấm. Tâm điểm của cảnh mà phải đi tìm
 *     thì cảnh đó không có tâm điểm.
 *  3. **Mặt người phải có mắt.** Một khối màu da không thành cái đầu. Hai ô
 *     nhỏ nhô ra khỏi mặt trước là đủ, và nó vẫn nằm trong hệ khối chứ không
 *     phải một nét vẽ dán lên.
 *
 * ## Phân cấp sắc độ
 *
 * Nền tối, phế liệu tông trung, **người sáng nhất và bão hoà nhất**. Đó là chỗ
 * mắt phải rơi vào trước tiên.
 */
import { Box, Cyl, Shadow, Tile, project, type Tone } from './iso';

interface Props {
  /** Nhóm cánh tay cầm búa, để vòng lặp xoay quanh khớp vai. */
  armRef?: (element: SVGGElement | null) => void;
}

// Bảng vật liệu: mỗi dòng là một chất liệu, không phải một hình. Cùng một chất
// thì mọi chỗ dùng chung, nên cả cảnh trông như làm từ một bộ vật liệu.
const DIRT: Tone = [26, 15, 32];
const DIRT_EDGE: Tone = [24, 14, 22];
const WORN: Tone = [28, 14, 38];
const RUST: Tone = [17, 54, 46];
const RUST_DARK: Tone = [13, 48, 33];
const STEEL: Tone = [210, 10, 60];
const COPPER: Tone = [27, 60, 54];
const RUBBER: Tone = [226, 8, 19];

const SKIN: Tone = [26, 54, 74];
const SHIRT: Tone = [202, 55, 56];
const SHIRT_DARK: Tone = [206, 45, 40];
const PANTS: Tone = [220, 18, 34];
const HAT: Tone = [45, 58, 68];
const WOOD: Tone = [28, 50, 52];
const DARK: Tone = [222, 20, 12];

/** Mảnh sân. Cả khung nhìn tính ra từ hai con số này. */
const PLOT = 4.6;

/** Khớp vai phải, toạ độ thế giới. Cánh tay xoay quanh đúng điểm này. */
const SHOULDER: readonly [number, number, number] = [1.98, 2.28, 1.42];

export function Yard({ armRef }: Props) {
  const [sx, sy] = project(...SHOULDER);

  return (
    <svg class="yard" viewBox="-82 -34 164 122" aria-hidden="true">
      {/* ------------------------------------------------------------ nền -- */}

      <Tile x={-0.35} y={-0.35} w={PLOT + 0.7} d={PLOT + 0.7} tone={DIRT_EDGE} />
      <Tile x={0} y={0} w={PLOT} d={PLOT} tone={DIRT} />
      {/* Vệt đất mòn quanh chỗ đứng làm việc — dấu vết của việc đã làm ở đây
          nhiều lần, và là thứ kéo mắt về phía nhân vật. */}
      <Tile x={0.85} y={1.7} w={2.4} d={2.1} tone={WORN} />

      {/* ------------------------------------------------------ hàng rào -- */}

      {/* Tôn dựng tạm: cao thấp so le. Đều tăm tắp thì thành một bức tường xây;
          so le thì thành đồ nhặt về quây lại. */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Box
          key={`fx${i}`}
          x={i * 0.92}
          y={-0.3}
          z={0}
          w={0.86}
          d={0.14}
          h={1.25 + ((i * 7) % 3) * 0.14}
          tone={i % 2 === 0 ? RUST : RUST_DARK}
        />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Box
          key={`fy${i}`}
          x={-0.3}
          y={i * 0.92}
          z={0}
          w={0.14}
          d={0.86}
          h={1.15 + ((i * 5) % 3) * 0.16}
          tone={i % 2 === 0 ? RUST_DARK : RUST}
        />
      ))}

      {/* -------------------------------------------- phế liệu phía sau --- */}

      {/* Thùng phuy dựa góc. */}
      <Shadow x={0.15} y={0.15} w={0.95} d={0.95} opacity={0.34} />
      <Cyl x={0.63} y={0.62} z={0} r={0.38} h={1.05} tone={RUST} />
      <Cyl x={0.63} y={0.62} z={1.05} r={0.38} h={0.06} tone={RUST} lift={9} />

      <Shadow x={0.95} y={0.2} w={0.9} d={0.9} opacity={0.3} />
      <Cyl x={1.4} y={0.65} z={0} r={0.36} h={0.86} tone={COPPER} />
      <Cyl x={1.4} y={0.65} z={0.86} r={0.36} h={0.06} tone={COPPER} lift={9} />

      {/*
       * Đống sắt.
       *
       * Xếp thành cụm quanh một tâm và cao dần vào giữa, chứ không rải thành
       * hàng: rải hàng thì ra một cái kệ, chụm lại và cao dần thì ra một đống
       * người ta quăng vào.
       */}
      <Shadow x={2.95} y={0.9} w={1.8} d={1.8} opacity={0.36} />
      <Box x={3.05} y={1.0} z={0} w={1.3} d={1.05} h={0.34} tone={RUST_DARK} />
      <Box x={3.45} y={1.4} z={0} w={0.95} d={1.15} h={0.28} tone={STEEL} />
      <Box x={3.2} y={1.2} z={0.34} w={0.95} d={0.8} h={0.32} tone={COPPER} />
      <Box x={3.6} y={1.05} z={0.28} w={0.68} d={0.72} h={0.44} tone={RUST} />
      <Box x={3.35} y={1.35} z={0.66} w={0.64} d={0.58} h={0.26} tone={STEEL} />
      <Box x={3.5} y={1.25} z={0.92} w={0.38} d={0.36} h={0.2} tone={COPPER} />

      {/* Ống nước xếp dọc mép phải, ngắn lại để không cắt ngang cái lốp. */}
      <Box x={4.15} y={2.1} z={0} w={0.22} d={1.15} h={0.22} tone={COPPER} />
      <Box x={4.4} y={2.2} z={0} w={0.2} d={1} h={0.2} tone={RUST} />

      {/* Lốp xe nằm ở góc phải. Vẽ sau mấy cái ống vì nó đứng gần người xem
          hơn, và thứ tự vẽ ở đây chính là chiều sâu. */}
      <Shadow x={3.8} y={3.65} w={0.95} d={0.95} opacity={0.3} />
      <Cyl x={4.27} y={4.13} z={0} r={0.42} h={0.26} tone={RUBBER} />
      <Cyl x={4.27} y={4.13} z={0.26} r={0.17} h={0.03} tone={STEEL} lift={6} />

      {/* --------------------------------------------------- chỗ đập ------ */}

      {/* Khối đe, ngay trước mặt nhân vật: đây là chỗ búa rơi xuống, nên nó
          phải nằm đúng giữa khung và không bị thứ gì che. */}
      <Shadow x={2.02} y={2.5} w={0.92} d={0.92} opacity={0.42} />
      <Box x={2.08} y={2.56} z={0} w={0.8} d={0.8} h={0.42} tone={RUST_DARK} />
      <Box x={2.18} y={2.66} z={0.42} w={0.6} d={0.6} h={0.14} tone={STEEL} />
      <Box x={2.28} y={2.76} z={0.56} w={0.4} d={0.4} h={0.09} tone={COPPER} lift={8} />

      {/* ---------------------------------------------------- nhân vật ---- */}

      <Shadow x={1.12} y={1.98} w={0.9} d={0.9} opacity={0.44} />

      {/* Chân: hai khối lệch nhau theo chiều sâu, nên dáng đứng có bề dày. */}
      <Box x={1.2} y={2.32} z={0} w={0.32} d={0.32} h={0.16} tone={DARK} />
      <Box x={1.22} y={2.34} z={0.16} w={0.28} d={0.28} h={0.5} tone={PANTS} />
      <Box x={1.56} y={2.0} z={0} w={0.32} d={0.32} h={0.16} tone={DARK} />
      <Box x={1.58} y={2.02} z={0.16} w={0.28} d={0.28} h={0.5} tone={PANTS} />

      {/* Thân: rộng hơn chân, và có một vạt sẫm cắt ngang để không thành một
          khối màu duy nhất. */}
      <Box x={1.18} y={1.98} z={0.66} w={0.78} d={0.7} h={0.12} tone={PANTS} />
      <Box x={1.18} y={1.98} z={0.78} w={0.78} d={0.7} h={0.56} tone={SHIRT} />
      {/* Túi ngực. */}
      <Box x={1.15} y={2.28} z={0.98} w={0.04} d={0.24} h={0.2} tone={SHIRT_DARK} />

      {/* Tay trái buông xuống, có bàn tay riêng. */}
      <Box x={0.96} y={2.24} z={0.86} w={0.2} d={0.2} h={0.42} tone={SHIRT} />
      <Box x={0.96} y={2.24} z={0.7} w={0.2} d={0.2} h={0.17} tone={SKIN} />

      {/* Đầu, mặt và mũ. */}
      <Box x={1.3} y={2.12} z={1.34} w={0.5} d={0.46} h={0.42} tone={SKIN} />
      {/* Hai mắt: hai ô nhỏ nhô khỏi mặt trước. Vẫn là khối, không phải nét vẽ
          dán lên — nên chúng cũng nhận đúng luật sáng của cả cảnh. */}
      <Box x={1.38} y={2.56} z={1.55} w={0.09} d={0.03} h={0.09} tone={DARK} />
      <Box x={1.62} y={2.56} z={1.55} w={0.09} d={0.03} h={0.09} tone={DARK} />
      {/* Mũ: vành rộng hơn đầu, chóp nhỏ hơn vành. */}
      <Box x={1.2} y={2.02} z={1.76} w={0.7} d={0.66} h={0.08} tone={HAT} />
      <Box x={1.34} y={2.16} z={1.84} w={0.42} d={0.4} h={0.2} tone={HAT} />

      {/* Tay phải cầm búa, xoay quanh khớp vai. Búa dựng chếch ra ngoài đầu,
          không chồng lên nó — ở bản trước búa cắm thẳng vào cái mũ. */}
      <g
        class="yard__arm"
        style={{ transformOrigin: `${sx.toFixed(2)}px ${sy.toFixed(2)}px` }}
        ref={armRef ? (element) => armRef(element as SVGGElement | null) : undefined}
      >
        <Box x={1.94} y={2.2} z={0.86} w={0.2} d={0.2} h={0.46} tone={SHIRT} />
        <Box x={1.94} y={2.2} z={0.7} w={0.2} d={0.2} h={0.17} tone={SKIN} />

        {/* Cán, rồi đầu búa nằm ngang trên đỉnh cán. Cả cụm đẩy ra ngoài vai
            và nâng cao hơn cái mũ — ở bản trước đầu búa cắm thẳng vào vành mũ. */}
        <Box x={2.0} y={2.26} z={0.8} w={0.1} d={0.1} h={1.02} tone={WOOD} />
        <Box x={1.94} y={2.1} z={1.82} w={0.44} d={0.44} h={0.22} tone={STEEL} />
        <Box x={1.9} y={2.06} z={1.84} w={0.1} d={0.52} h={0.18} tone={STEEL} lift={10} />
      </g>
    </svg>
  );
}
