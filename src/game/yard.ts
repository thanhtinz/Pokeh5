/**
 * Cái sân người chơi đứng chạm — và nó phải leo lên cùng người chơi.
 *
 * ## Vì sao cần cái này
 *
 * Màn Cày là màn hình người chơi nhìn lâu nhất, và cho tới đây nó **không hề
 * đổi**: một người có mười một nghìn tỷ vẫn ngồi nhìn đúng cái bãi rác
 * có mấy thùng rác và một chiếc xe hỏng như lúc còn nợ một tỷ. Cả trò chơi tên
 * là "từ trắng tay thành ông chủ", mà chỗ duy nhất người chơi *ở* thì không
 * chứng minh câu đó lấy một lần.
 *
 * Số trên đầu màn hình có tăng, nhưng số thì đọc; cái sân thì **thấy**. Đổi
 * sân là phần thưởng duy nhất trong trò này không cần một dòng chữ nào giải
 * thích.
 *
 * ## Ngưỡng lấy từ giá cơ sở đầu tiên của mỗi khu
 *
 * Không đặt tay sáu con số mới. Sáu khu đã có sẵn một cái thang giá, và người
 * chơi đã học cái thang đó ở màn Cơ ngơi — nên sân đổi đúng lúc khu mới mở là
 * hai chuyện *cùng* nói một điều, thay vì hai cái thang rời nhau. Đặt tay thì
 * chỉ cần một lần chỉnh giá cơ sở là hai bên lệch nhau mà không ai biết.
 *
 * ## Đọc đỉnh, không đọc số dư
 *
 * Cùng lý do như `checkRivals`: mua một cái cao ốc xong thì số dư tụt, và nếu
 * sân đọc số dư thì người chơi vừa mua xong bị đá ngược về bãi rác. Đỉnh chỉ
 * đi lên trong một lượt, nên sân cũng chỉ đi lên — trừ lúc làm lại, và lúc ấy
 * quay về xóm liều đúng là điều nên xảy ra.
 */
import { BUSINESSES, DISTRICTS, type District } from './businesses';

/**
 * Ngưỡng của từng sân: giá cơ sở đầu tiên của khu tương ứng.
 *
 * Sân đầu tiên không có ngưỡng thật — người chơi bắt đầu ở đó khi còn đang nợ,
 * tức là dưới mọi con số. Vòng dò ở `yardOf` bắt đầu từ 0 nên chuyện đó tự
 * đúng, không cần một trường hợp riêng.
 */
export const YARD_AT: readonly number[] = DISTRICTS.map(
  (district) => BUSINESSES.find((def) => def.district === district)!.baseCost,
);

/** Sân nào ứng với khu nào. Cùng thứ tự với `DISTRICTS`. */
export const YARDS: readonly District[] = DISTRICTS;

/** Chỉ số sân ứng với đỉnh tài sản đã đạt. */
export function yardOf(peakNetWorth: number): number {
  let tier = 0;
  for (let i = 1; i < YARD_AT.length; i += 1) {
    if (peakNetWorth >= YARD_AT[i]!) tier = i;
  }
  return tier;
}

/** Còn bao nhiêu nữa thì đổi sân, hoặc `null` nếu đã ở sân cuối. */
export function nextYardAt(peakNetWorth: number): number | null {
  const tier = yardOf(peakNetWorth);
  if (tier >= YARD_AT.length - 1) return null;
  return YARD_AT[tier + 1]!;
}
