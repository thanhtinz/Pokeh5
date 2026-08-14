/**
 * Một ô trong bộ tile RPG Urban của Kenney.
 *
 * ## Vì sao dùng đồ người ta thay vì tự vẽ
 *
 * Bốn lần vẽ tay ở đây đều ra kết quả nghiệp dư, và lý do không phải là thiếu
 * cố gắng: vẽ được một bộ asset game tử tế là một nghề riêng. Kenney phát hành
 * hơn ba mươi nghìn asset dưới giấy phép **CC0** — tức là từ bỏ mọi quyền, dùng
 * thương mại thoải mái, không bắt buộc ghi công. Đây là cách đúng để một dự án
 * không có hoạ sĩ vẫn có hình tử tế, và cũng là cách mà rất nhiều game nhỏ trên
 * cửa hàng đang làm.
 *
 * Giấy phép nằm cạnh chính file ảnh, ở `src/assets/kenney/rpg-urban/`.
 *
 * ## Vì sao cắt bằng CSS chứ không cắt thành từng file
 *
 * Cả bộ nằm trong một tấm 432×288 gồm 27×18 ô, mỗi ô 16 pixel. Cắt ra 486 file
 * thì là 486 lượt tải; giữ nguyên một tấm rồi dịch `background-position` thì là
 * một lượt, và trình duyệt vốn sinh ra để làm đúng việc đó.
 */
import urbanUrl from '../assets/kenney/rpg-urban/tiles.png';
import cityUrl from '../assets/kenney/city/tiles.png';

/**
 * Hai bộ tile, hai hình dạng bảng.
 *
 * Bộ thứ hai — Roguelike Modern City — có **một pixel viền giữa các ô**, khác
 * bộ đầu xếp sát nhau. Bỏ qua chi tiết đó thì mọi ô lệch dần đi một pixel về
 * phía phải và phía dưới, và tới cột thứ mười thì cái đang vẽ là góc của bốn ô
 * khác nhau. Nên khoảng cách nằm ngay trong bảng mô tả bộ.
 */
const SHEETS = {
  urban: { url: urbanUrl, cols: 27, rows: 18, gap: 0 },
  city: { url: cityUrl, cols: 37, rows: 28, gap: 1 },
} as const;

export type SheetName = keyof typeof SHEETS;

interface Props {
  /** Số thứ tự ô, đếm từ trái sang phải rồi xuống dòng. */
  i: number;
  /** Một ô vẽ ra to bao nhiêu pixel. */
  size: number;
  sheet?: SheetName;
  class?: string;
  style?: Record<string, string | number>;
}

export function Pix({ i, size, sheet = 'urban', class: cls, style }: Props) {
  const { url, cols, rows, gap } = SHEETS[sheet];
  const step = size * (1 + gap / 16);

  const col = i % cols;
  const row = Math.floor(i / cols);

  return (
    <span
      class={`pix${cls ? ` ${cls}` : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url(${url})`,
        backgroundSize: `${cols * step}px ${rows * step}px`,
        backgroundPosition: `${-col * step}px ${-row * step}px`,
        ...style,
      }}
    />
  );
}
