/**
 * Điểm gửi lên đáng tin tới đâu.
 *
 * Nói thẳng trước: **cả luật chơi chạy ở máy người chơi**, nên một người biết
 * việc hoàn toàn có thể gửi lên bất kỳ con số nào. Muốn chống được thật thì
 * phải bê cả vòng lặp mô phỏng lên máy chủ, và đó là một kiến trúc game khác
 * hẳn, không phải một cái hàm kiểm tra.
 *
 * Nên chỗ này không cố làm cái nó không làm được. Nó chặn ba thứ rẻ tiền mà
 * chặn được, và chặn được thì bảng xếp hạng dùng được cho người chơi thật:
 *
 *  1. **Số vô nghĩa.** `1e308`, `Infinity`, `NaN`, số âm vô hạn — luật chơi
 *     không sinh ra nổi, nên vứt.
 *  2. **Tài khoản vừa lập đã đứng đầu bảng.** Trần nới theo tuổi tài khoản,
 *     nên "đăng ký xong gửi 1e40" không đi tới đâu.
 *  3. **Tụt xuống.** Kỷ lục chỉ có tăng. Gửi số nhỏ hơn thì giữ số cũ.
 *
 * Ai muốn qua mặt vẫn qua được — chỉ là phải ngồi đợi vài tiếng, mà ngồi đợi
 * vài tiếng thì cũng gần bằng đi chơi thật rồi.
 */

/** Trần tuyệt đối. Cơ ngơi cuối cùng giá 2,9e41, leo hết bảng cũng không tới đây. */
export const ABSOLUTE_CEILING = 1e45;

/** Trần lúc tài khoản vừa lập: cỡ một nghìn tỷ, tức là vài chục phút chơi thật. */
export const OPENING_CEILING = 1e12;

/** Cứ chừng này giây thì trần nới thêm một bậc mười. */
export const SECONDS_PER_ORDER = 300;

/**
 * Trần của một tài khoản `ageSeconds` giây tuổi.
 *
 * Một bậc mười mỗi năm phút, tính từ một nghìn tỷ. Sau chừng ba tiếng là chạm
 * trần tuyệt đối và cánh cửa mở hẳn — đúng như ý: hàm này không phải để bắt
 * người chơi chậm lại, mà để "đăng ký cái rồi đứng đầu bảng ngay" không xảy ra.
 */
export function ceilingFor(ageSeconds) {
  const age = Number.isFinite(ageSeconds) ? Math.max(0, ageSeconds) : 0;
  const grown = OPENING_CEILING * Math.pow(10, age / SECONDS_PER_ORDER);
  return Math.min(ABSOLUTE_CEILING, grown);
}

/**
 * Một trường điểm, hoặc null nếu nó không phải là số.
 *
 * Đòi đúng kiểu `number` chứ không ép kiểu, vì `Number(null)` và `Number('')`
 * đều ra 0 — nghĩa là gửi lên `null` sẽ được nhận như "tài sản bằng không" thay
 * vì bị loại. JSON vốn có sẵn kiểu số, nên không có lý do gì phải ép.
 */
function clean(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Gạn một gói điểm gửi lên thành thứ ghi được vào bảng.
 *
 * Trả về `{ ok: true, score }` hoặc `{ ok: false, reason }`. Không bao giờ ném
 * lỗi: đây là dữ liệu từ ngoài vào, và một cái `throw` ở đây là một cách để
 * người lạ làm sập máy chủ.
 */
export function gradeScore(raw, { ageSeconds, previousBest = null } = {}) {
  if (typeof raw !== 'object' || raw === null) return { ok: false, reason: 'score.shape' };

  const best = clean(raw.bestNetWorth);
  if (best === null) return { ok: false, reason: 'score.shape' };

  const reputation = clean(raw.reputationTotal) ?? 0;
  const runs = clean(raw.runs) ?? 0;
  const claimed = clean(raw.claimed) ?? 0;

  if (best > ABSOLUTE_CEILING) return { ok: false, reason: 'score.impossible' };
  if (best > ceilingFor(ageSeconds)) return { ok: false, reason: 'score.tooFast' };
  if (reputation < 0 || runs < 0 || claimed < 0) return { ok: false, reason: 'score.shape' };

  // Uy tín và số lần làm lại cũng có trần, tính từ chính kỷ lục đã gửi: uy tín
  // là căn bậc hai của đỉnh chia một tỷ, nên nó không thể vượt quá cái đó.
  const repCeiling = Math.floor(Math.sqrt(Math.max(0, best) / 1e9)) + 1;
  if (reputation > repCeiling) return { ok: false, reason: 'score.impossible' };

  return {
    ok: true,
    score: {
      // Kỷ lục chỉ đi lên. Gửi số nhỏ hơn không phải gian lận — đổi máy, khôi
      // phục bản lưu cũ — nhưng cũng không phải lý do để xoá thành tích cũ.
      bestNetWorth: previousBest === null ? best : Math.max(previousBest, best),
      reputationTotal: Math.floor(reputation),
      runs: Math.floor(Math.min(runs, 1e6)),
      claimed: Math.floor(Math.min(claimed, 12)),
    },
  };
}
