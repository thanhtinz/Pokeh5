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
  const scale = size / 16;
  const step = 16 * scale + gap * scale;

  /*
   * Bề rộng tấm sheet **không** phải `cols × step`.
   *
   * Viền một pixel nằm *giữa* các ô, nên tấm ảnh thiếu đúng một viền cuối:
   * 37 ô 16 pixel với 36 viền là 628, không phải 629. Nhân `cols × step` thì
   * trình duyệt phóng ảnh theo hệ số 1258/628 = 2,0032 thay vì đúng 2, và mọi
   * ô trôi dần — tới cột cuối là lệch một pixel nguồn. Lệch một pixel nguồn
   * hiện ra thành một **vệt tối chạy ngang** ở đáy mỗi ô, vì cái lọt vào khung
   * là một mẩu của viền. Nhìn thì tưởng ô nền vẽ sẵn cái vệt ấy; thật ra là
   * phép nhân này.
   */
  const sheetW = (cols * (16 + gap) - gap) * scale;
  const sheetH = (rows * (16 + gap) - gap) * scale;

  const col = i % cols;
  const row = Math.floor(i / cols);

  return (
    <span
      class={`pix${cls ? ` ${cls}` : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url(${url})`,
        backgroundSize: `${sheetW}px ${sheetH}px`,
        backgroundPosition: `${-col * step}px ${-row * step}px`,
        ...style,
      }}
    />
  );
}

/**
 * Một mảng ô liền nhau, và đây là chỗ vòng trước làm sai.
 *
 * Mấy bộ tile này vẽ đồ vật **trải qua nhiều ô**: cái ô tô chiếm hai nhân hai,
 * cái sạp hàng hai nhân hai, cái cây một nhân hai, dãy cửa cuốn kho ba nhân
 * hai. Lấy mỗi lần một ô thì thứ nhận được không phải đồ vật mà là *mảnh* của
 * nó — một khúc ống, một tấm nệm ghế, một mẩu mái tôn. Ở cỡ ba mươi hai pixel
 * thì mảnh nào cũng chỉ còn là vệt màu, và cả danh sách trông như icon giao
 * diện chứ không như đồ đạc.
 *
 * Nên đơn vị của lớp hình này là **khối**, không phải ô.
 */
export interface Block {
  sheet: SheetName;
  /** Ô trái-trên của khối, tính theo cột/hàng trong tấm sheet. */
  x: number;
  y: number;
  /** Khối rộng mấy ô, cao mấy ô. */
  w: number;
  h: number;
  /** Đặt vào đâu trong cảnh, tính bằng ô. Không khai thì là góc trái-trên. */
  at?: readonly [number, number];
}

/** Một cảnh: khung rộng `w`×`h` ô, xếp chồng vài khối lên nhau. */
export interface Scene {
  w: number;
  h: number;
  layers: readonly Block[];
}

/**
 * Vẽ một cảnh ở **một cỡ ô cố định**.
 *
 * Cỡ ô cố định chứ không phải "phóng cảnh cho vừa khung": phóng cho vừa thì
 * cái cảnh hai ô và cái cảnh ba ô ra hai mật độ pixel khác nhau, và hai mật độ
 * pixel đứng cạnh nhau trong cùng một danh sách cuộn thì mắt thấy ngay là hai
 * bộ hình khác nhau — đúng cái lỗi đã phải sửa một lần rồi. Cảnh nhỏ thì nằm
 * giữa khung và để trống xung quanh; trống thì được, vênh thì không.
 */
export function PixScene({ scene, unit = 16 }: { scene: Scene; unit?: number }) {
  const tiles = [];

  for (const layer of scene.layers) {
    const [ax, ay] = layer.at ?? [0, 0];
    for (let dy = 0; dy < layer.h; dy += 1) {
      for (let dx = 0; dx < layer.w; dx += 1) {
        const cols = SHEETS[layer.sheet].cols;
        tiles.push(
          <Pix
            key={`${layer.sheet}-${layer.x}-${layer.y}-${dx}-${dy}-${ax}-${ay}`}
            sheet={layer.sheet}
            i={(layer.y + dy) * cols + layer.x + dx}
            size={unit}
            style={{
              position: 'absolute',
              left: `${(ax + dx) * unit}px`,
              top: `${(ay + dy) * unit}px`,
            }}
          />,
        );
      }
    }
  }

  return (
    <span class="pix-scene" style={{ width: `${scene.w * unit}px`, height: `${scene.h * unit}px` }}>
      {tiles}
    </span>
  );
}
