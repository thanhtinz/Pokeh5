/**
 * Một hình trong tấm sprite Fluent Emoji Flat.
 *
 * ## Vì sao bỏ pixel art của Kenney
 *
 * Bộ tile Kenney là pixel art 16×16, và mỗi món đồ trong đó **trải qua nhiều
 * ô**: cái xe ba ô, cái cây hai ô, dãy cửa cuốn ba ô. Muốn lấy một món ra thì
 * phải khai đúng cột, đúng hàng, đúng bề rộng, đúng bề cao — bốn con số cho
 * mỗi hình, bốn mươi mốt hình, và **không con số nào kiểm được bằng mắt ở cỡ
 * mười sáu pixel**. Lịch sử repo này là bằng chứng: cái xe mất đuôi, cái xe
 * mất đầu, cái cây cụt nóc, cái tán cây lơ lửng không gốc, một mái nhà hoá ra
 * vạch kẻ đường, một cái cửa hoá ra thùng gỗ. Mỗi lỗi mất một vòng để tìm, và
 * mỗi lần "sửa" lại đẻ ra một lỗi lệch theo hướng ngược lại.
 *
 * Bộ này thì một hình là **một ô vuông**, và cái ô ấy do máy xếp ra (xem
 * `scripts/sprite.mjs`). Không có bề rộng để khai sai, không có cột để đếm
 * lệch. Cả một lớp lỗi biến mất, không phải nhờ cẩn thận hơn mà nhờ bỏ hẳn cái
 * chỗ để sai.
 *
 * Đổi lại thì mất phong cách pixel — nhưng game này là idle tycoon, và tycoon
 * thì người chơi đọc một danh sách bốn mươi dòng. Hình phẳng nhiều màu đọc
 * được ở cỡ bốn mươi pixel; pixel art mười sáu pixel phóng lên thì không.
 *
 * ## Giấy phép
 *
 * Fluent Emoji của Microsoft, **MIT** — dùng thương mại thoải mái, chỉ cần giữ
 * bản quyền kèm theo. Giấy phép nằm cạnh chính file ảnh, ở `src/assets/fluent/`.
 *
 * Chỗ này từng định lấy hình từ Flaticon. Không được: gói miễn phí của họ bắt
 * ghi công ở **mọi chỗ dùng** và cấm phát tán lại file gốc — mà vendor vào Git
 * đúng là phát tán lại.
 *
 * ## Cắt bằng phần trăm, nên hình co giãn theo khung
 *
 * Lưới đều tăm tắp, không viền, không khe — nên cắt được bằng đúng hai công
 * thức phần trăm, không cần biết khung to bao nhiêu pixel. Cái này quan trọng
 * hơn nó nghe: khai `size` bằng pixel thì mỗi chỗ dùng phải tự tính lại
 * `background-size`, và chỗ nào tính lệch thì hình vẫn hiện ra, chỉ là hiện ra
 * một mẩu của hình bên cạnh. Để CSS lo bề rộng thì không có gì để tính lệch.
 */
import sheetUrl from '../assets/fluent/sheet.png';
import { ICONS, ICON_COLS, ICON_ROWS } from './icons';

interface Props {
  /** Id cơ sở hoặc id việc làm. Không có trong bảng thì không vẽ gì. */
  id: string;
  class?: string;
}

export function Sprite({ id, class: cls }: Props) {
  const cell = ICONS[id];
  if (cell === undefined) return null;

  const col = cell % ICON_COLS;
  const row = Math.floor(cell / ICON_COLS);

  return (
    <span
      class={`sprite${cls ? ` ${cls}` : ''}`}
      style={{
        backgroundImage: `url(${sheetUrl})`,
        backgroundSize: `${ICON_COLS * 100}% ${ICON_ROWS * 100}%`,
        // Mẫu số là `COLS - 1`, không phải `COLS`. Phần trăm của
        // `background-position` là "điểm này của ảnh chồng lên điểm này của
        // khung", nên nó trải đều trên khoảng *thừa ra*, mà khoảng thừa là
        // `COLS - 1` khung chứ không phải `COLS`. Lấy nhầm mẫu số thì cột đầu
        // và cột cuối vẫn đúng, mấy cột giữa trôi dần — kiểu lỗi tệ nhất.
        backgroundPosition: `${(col / (ICON_COLS - 1)) * 100}% ${(row / (ICON_ROWS - 1)) * 100}%`,
      }}
    />
  );
}
