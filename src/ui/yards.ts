/**
 * Tấm hình của màn Cày: một cơ sở của khu đang đứng.
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
 * ## Vì sao file này giờ chỉ còn một bảng tên
 *
 * Bản trước của nó dài trăm rưỡi dòng: khai chỗ đặt, tính khoảng cách, canh
 * đáy, kẹp cho khỏi tràn khung. Toàn bộ chỗ ấy tồn tại vì hình cũ **to nhỏ
 * khác nhau** — cái hai ô, cái ba ô, cái cao ba ô. Hình mới thì cái nào cũng
 * là một ô vuông, nên đặt nó vào giữa khung là việc của hai dòng CSS, và cái
 * file này chỉ còn phải trả lời đúng một câu: khu này thì lấy cơ sở nào.
 *
 * Cơ sở *đầu* của khu, chứ không phải cái đắt nhất: đó là thứ người chơi mua
 * trước, nên tấm hình khớp với cái họ vừa bấm mua chứ không phải cái còn cách
 * vài giờ nữa.
 */
import { BUSINESSES, DISTRICTS } from '../game/businesses';
import { ICONS } from './icons';

/**
 * Mỗi tấm bày bấy nhiêu hình — **một**.
 *
 * Vòng trước là ba, và ba thì sai theo hai hướng cùng lúc. Ba hình xếp ngang
 * trong một khung 2:1 thì mỗi hình chỉ còn rộng chưa tới một phần tư khung,
 * tức là bé hơn cái hình cùng nó nằm trong hàng danh sách ngay bên dưới — cái
 * khung to nhất màn hình mà đựng hình nhỏ hơn chỗ khác. Và ba hình đứng ngang
 * hàng nhau thì không hình nào là chủ: mắt phải quét cả ba rồi tự ghép lại
 * thành "à, khu này", trong khi thứ cần nói chỉ là *đang ở khu nào*.
 *
 * Một hình thì to gấp ba, và nó là chủ. Muốn xem cả khu thì đã có danh sách
 * bên màn Cơ ngơi, đúng chỗ của nó.
 */
export const YARD_ITEMS = 1;

/** Sáu tấm, mỗi tấm là mấy id cơ sở. Dựng đúng một lần lúc nạp module. */
export const YARD_SCENES: readonly (readonly string[])[] = DISTRICTS.map((district) =>
  BUSINESSES.filter((def) => def.district === district && ICONS[def.id] !== undefined)
    .slice(0, YARD_ITEMS)
    .map((def) => def.id),
);

/** Tấm hình của một bậc. Bậc ngoài khoảng thì kẹp về hai đầu. */
export function yardScene(tier: number): readonly string[] {
  return YARD_SCENES[Math.min(Math.max(tier, 0), YARD_SCENES.length - 1)]!;
}
