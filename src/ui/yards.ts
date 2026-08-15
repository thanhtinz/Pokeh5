/**
 * Tấm hình giữa màn Cày: đang làm gì thì hiện cái đó.
 *
 * ## Vì sao không còn là cái sân lát tile
 *
 * Vòng trước chỗ này là một lưới tám nhân sáu ô lát kín nền, có một nhân vật
 * hai khung hình đứng giữa và đổi tư thế theo từng cú chạm. Ba thứ đó cộng lại
 * đọc ra một **màn chơi**: có mặt đất, có đường kẻ ô, có người đi trên đó. Mắt
 * nhìn vào là chờ được điều khiển cái người ấy, chờ đi sang ô bên cạnh.
 *
 * Nhưng game này là idle tycoon. Người chơi mở lên, đọc số, bấm vài nút, tắt
 * máy, rồi tiền tự chạy tiếp. Không có ai đi đâu cả. Cái lưới ấy vừa không nói
 * thêm được gì, vừa hứa một thứ trò chơi mà phần còn lại của game không có —
 * và một lời hứa hụt thì tệ hơn là không hứa.
 *
 * ## Hai câu hỏi, và câu nào gấp hơn thì thắng
 *
 * Khung này chỉ đủ chỗ cho một hình, mà có hai thứ muốn nói:
 *
 *  - *đang giàu tới đâu* — trả lời bằng cơ sở đầu của khu đang đứng, đổi vài
 *    giờ một lần;
 *  - *đang làm gì ngay lúc này* — trả lời bằng cái việc đang chạy, đổi vài
 *    chục giây một lần.
 *
 * Cái thứ hai gấp hơn, nên nó thắng khi cả hai cùng có. Người chơi vừa bấm
 * "Làm" xong thì thứ họ chờ thấy là **việc vừa bấm**, không phải cái khu họ đã
 * đứng từ nãy — và khi việc xong, hình tự quay về cái khu, đúng lúc chỗ đó lại
 * là thứ duy nhất còn đáng nói.
 *
 * Nhờ vậy khung này còn kiêm luôn một việc thứ hai: nó là chỗ **báo việc còn
 * đang chạy**. Trước đó, dấu hiệu duy nhất là chữ "ĐANG LÀM" bé tí ở đầu danh
 * sách phía dưới, mà danh sách ấy thường đã cuộn khuất.
 */
import { BUSINESSES, DISTRICTS } from '../game/businesses';
import { ICONS } from './icons';

/**
 * Cơ sở đại diện cho mỗi khu — cơ sở **đầu**, không phải cái đắt nhất.
 *
 * Đó là thứ người chơi mua trước, nên tấm hình khớp với cái họ vừa bấm mua chứ
 * không phải cái còn cách vài giờ nữa.
 */
export const YARD_ICONS: readonly string[] = DISTRICTS.map(
  (district) =>
    BUSINESSES.find((def) => def.district === district && ICONS[def.id] !== undefined)!.id,
);

/** Kẹp bậc về trong khoảng. Bậc ngoài khoảng thì lấy hai đầu chứ không vỡ. */
function clamp(tier: number): number {
  return Math.min(Math.max(tier, 0), YARD_ICONS.length - 1);
}

/**
 * Id hình cho khung giữa: việc đang làm nếu có, không thì cơ sở của khu.
 *
 * `working` nhận cả id lạ mà vẫn không vỡ — id nào không có hình thì rơi về
 * cái khu. Cần thế vì `working` đi ra từ bản lưu, và một bản lưu cũ có thể còn
 * giữ tên một việc đã bị xoá khỏi game.
 */
export function yardIcon(tier: number, working: string | null = null): string {
  if (working !== null && ICONS[working] !== undefined) return working;
  return YARD_ICONS[clamp(tier)]!;
}
