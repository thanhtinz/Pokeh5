/**
 * Mùa — bảng xếp hạng của tuần này.
 *
 * Bảng mọi thời có một tật không sửa được bằng cách sắp xếp lại: nó là một bức
 * tường. Người chơi ngày đầu mở bảng ra, thấy đứng đầu là 4e30, và hiểu ngay
 * một điều đúng — không đời nào đuổi kịp. Một cái bảng mà nhìn phát biết mình
 * không có cửa thì nó không phải là lý do để chơi tiếp, nó là lý do để nghỉ.
 *
 * Nên có bảng thứ hai, và nó không đo *giàu tới đâu* mà đo **tuần này leo được
 * mấy bậc**. Thứ hai hàng tuần mọi người về lại vạch xuất phát chung.
 *
 * ## Vì sao đo bằng bậc mười, không đo bằng tiền kiếm thêm
 *
 * Đo bằng tiền kiếm thêm thì tuần nào người giàu nhất cũng thắng, vĩnh viễn:
 * một người đang ở 1e30 ngồi không cũng "kiếm thêm" nhiều hơn cả gia tài của
 * người mới gấp tỉ lần. Vẫn là bức tường cũ, chỉ dán giấy mới.
 *
 * Đo bằng bậc mười thì người mới đi từ 1e3 lên 1e9 được sáu bậc, còn người cũ
 * đi từ 1e30 lên 1e33 được ba. Người mới thắng — và thắng xứng đáng, vì trong
 * game này mỗi bậc về sau đều đắt hơn bậc trước. Đây cũng đúng cái thước mà
 * `rivals.ts` đang dùng để đo khoảng cách, nên hai chỗ nói cùng một ngôn ngữ.
 *
 * ## Vì sao không cần cron dọn bảng
 *
 * Mỗi người mang theo nhãn tuần của riêng mình. Ai không gửi bản lưu trong tuần
 * này thì nhãn của họ là tuần cũ, và câu truy vấn lọc theo nhãn tuần hiện tại
 * đơn giản là không thấy họ. Không có tiến trình nào phải chạy lúc nửa đêm, và
 * không có cái nửa đêm nào bị lỡ vì máy chủ đang khởi động lại.
 */

/**
 * Mốc không của thước đo.
 *
 * Ván mới bắt đầu ở âm một tỷ, nên cộng thêm đúng chừng đó cộng một là người
 * vừa vào game đứng ở `log10(1) = 0`. Không có ai âm hơn mức đó, nên không có
 * logarit của số âm.
 */
export const FLOOR = 1e9;

/** Tuần bắt đầu lúc 0h thứ Hai, giờ Việt Nam. */
export const TZ_OFFSET = 7 * 3_600_000;

const WEEK = 7 * 86_400_000;
const LEAD = 3 * 86_400_000;

/**
 * Tài sản thành bậc.
 *
 * Đơn vị là bậc mười: từ trắng tay lên một triệu là sáu bậc, từ một triệu lên
 * một tỷ là ba bậc nữa.
 */
export function orders(netWorth) {
  const value = typeof netWorth === 'number' && Number.isFinite(netWorth) ? netWorth : -FLOOR;
  return Math.log10(Math.max(1, value + FLOOR + 1));
}

/**
 * Số tuần chứa mốc thời gian này, tính từ thứ Hai đầu tiên của giờ Unix.
 *
 * Trả về một con số chứ không phải chuỗi `2026-W33`: số thì so sánh được, cộng
 * trừ được, và không có cái bẫy "tuần 53" của lịch ISO.
 *
 * Ba ngày là chỗ dễ đếm lộn. Mốc 0 của giờ Unix rơi vào **thứ Năm**, nên ngày
 * thứ Hai đầu tiên là ngày thứ tư kể từ đó; cộng ba ngày thì mốc chia hết cho
 * một tuần rơi đúng vào ngày thứ tư ấy, chứ không phải Chủ nhật.
 */
export function weekOf(now) {
  return Math.floor((now + TZ_OFFSET + LEAD) / WEEK);
}

/** Tuần này hết lúc nào, theo mốc thời gian thật. */
export function weekEnds(now) {
  return (weekOf(now) + 1) * WEEK - LEAD - TZ_OFFSET;
}

/**
 * Nhãn tuần của một người sau khi ghi điểm mới.
 *
 * `row` là dòng cũ trong kho, `best` là kỷ lục sau lần ghi này. Trả về ba cột
 * mới, ghi đè thẳng.
 *
 * Chỗ đáng nói là `base` lúc sang tuần mới: nó lấy **kỷ lục cũ**, tức là chỗ
 * người ta đứng lúc bước vào tuần, chứ không lấy kỷ lục mới. Lấy kỷ lục mới thì
 * lần ghi đầu tiên của tuần luôn ra 0 bậc, và người chơi mất trắng mọi thứ leo
 * được từ lúc sang tuần tới lúc bản lưu kịp gửi lên.
 *
 * Người mới tinh có `best_net_worth` mặc định là âm một tỷ, nên `base` của họ
 * bằng 0 và cả quãng đường tuần đầu được tính đủ.
 */
export function seasonOf(row, best, now) {
  const week = weekOf(now);
  const base = row.week_key === week ? row.week_base : orders(row.best_net_worth);
  return { key: week, base, climb: Math.max(0, orders(best) - base) };
}
