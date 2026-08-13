/**
 * Làm lại — vòng lặp dài của game.
 *
 * Leo hết một lượt rồi thì bán sạch cơ ngơi, quay về Xóm Nước Đen và đi lại từ
 * đầu. Thứ ở lại là **uy tín**: người ta biết tên mình rồi, và trong làm ăn đó
 * mới là tài sản. Mỗi điểm uy tín cộng thẳng vào mọi khoản thu, vĩnh viễn.
 *
 * Hai quyết định đáng ghi lại:
 *
 *  - Uy tín tính từ **đỉnh của lượt này** chứ không cộng dồn từng lần. Người
 *    chơi nhận phần chênh so với chỗ đã có, nên làm lại liên tục ở mức thấp
 *    không ra thêm gì — muốn thêm uy tín thì phải leo cao hơn lần trước.
 *  - Mốc cuộc đời đã chuộc thì **không mất**. Cơ ngơi là thứ mua được nên bán
 *    được; con chó, cái xe máy, cuộc gọi của mẹ thì không phải hàng hoá, và
 *    bắt người chơi mất chúng lần nữa để đổi lấy chỉ số là phản lại toàn bộ
 *    câu chuyện của game.
 */

/** Phải qua vạch nợ một quãng đủ xa mới mở: một trăm tỷ. */
export const PRESTIGE_UNLOCK = 1e11;

/** Mỗi điểm uy tín cộng thêm bao nhiêu vào mọi khoản thu. */
export const REPUTATION_RATE = 0.02;

/** Mẫu số của căn bậc hai — một tỷ, đúng bằng món nợ mở màn. */
const SCALE = 1e9;

/** Tổng uy tín tương ứng với một đỉnh tài sản. */
export function reputationFrom(peakNetWorth: number): number {
  if (!Number.isFinite(peakNetWorth) || peakNetWorth < PRESTIGE_UNLOCK) return 0;
  return Math.floor(Math.sqrt(peakNetWorth / SCALE));
}

/**
 * Uy tín nhận thêm nếu làm lại ngay bây giờ — phần chênh, nên bằng không khi
 * lượt này chưa vượt được lượt trước.
 *
 * Tham số là **tổng đã từng kiếm**, không phải số dư. Lấy số dư thì tiêu uy tín
 * xong làm lại ở đúng cái đỉnh cũ là đúc lại được chỗ vừa tiêu, và cửa hàng
 * thành ra miễn phí.
 */
export function pendingReputation(peakNetWorth: number, reputationTotal: number): number {
  return Math.max(0, reputationFrom(peakNetWorth) - reputationTotal);
}

/** Hệ số nhân vĩnh viễn từ uy tín đang có. */
export function reputationMultiplier(reputation: number): number {
  return 1 + REPUTATION_RATE * Math.max(0, reputation);
}

/** Đã đủ điều kiện làm lại chưa. */
export function canPrestige(peakNetWorth: number, reputationTotal: number): boolean {
  return pendingReputation(peakNetWorth, reputationTotal) > 0;
}
