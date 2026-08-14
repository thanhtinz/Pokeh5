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
import tilesUrl from '../assets/kenney/rpg-urban/tiles.png';

/** Bộ tile: 27 ô ngang, 18 ô dọc. */
export const TILE_COLS = 27;
export const TILE_ROWS = 18;

interface Props {
  /** Số thứ tự ô, đếm từ trái sang phải rồi xuống dòng. */
  i: number;
  /** Một ô vẽ ra to bao nhiêu pixel. */
  size: number;
  class?: string;
  style?: Record<string, string | number>;
}

export function Pix({ i, size, class: cls, style }: Props) {
  const col = i % TILE_COLS;
  const row = Math.floor(i / TILE_COLS);

  return (
    <span
      class={`pix${cls ? ` ${cls}` : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url(${tilesUrl})`,
        backgroundSize: `${TILE_COLS * size}px ${TILE_ROWS * size}px`,
        backgroundPosition: `${-col * size}px ${-row * size}px`,
        ...style,
      }}
    />
  );
}
