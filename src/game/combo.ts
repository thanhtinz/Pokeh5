/**
 * Nhiệt — thứ biến việc bấm từ một thao tác thành một quyết định.
 *
 * Trước khi có file này, bấm tay là một phép cộng: mỗi lần chạm ra đúng chừng
 * ấy công, bấm nhanh hay chậm không khác gì nhau ngoài số lần trên giây. Nghĩa
 * là người chơi không có gì để *chơi* — chỉ có một cái nút trả tiền theo tần
 * số. Đó là chỗ mà một game bấm khác một cái nút.
 *
 * Luật:
 *
 *  - Mỗi lần chạm cộng một điểm nhiệt, trần là `HEAT_CAP`.
 *  - Ngừng tay thì nhiệt **nguội theo thời gian thật**, `COOL_PER_SECOND` điểm
 *    mỗi giây, và nguội ngay chứ không có thời gian ân hạn.
 *  - Công mỗi lần chạm nhân với `1 + nhiệt × HEAT_STEP`, tối đa gấp ba.
 *
 * Ba lựa chọn ở trên, mỗi cái đóng một lỗ:
 *
 * **Nguội theo giờ thật, không theo lượt chạm.** Đếm theo lượt thì mở game ra,
 * bấm ba mươi cái, đi pha cà phê, quay lại bấm tiếp — vẫn nguyên nhiệt. Nhiệt
 * đo *nhịp tay*, mà nhịp tay thì chỉ có nghĩa khi gắn với đồng hồ.
 *
 * **Không lưu vào bản lưu.** Nhiệt sống trong bộ nhớ của phiên chơi. Lưu lại
 * thì tắt game lúc đang nóng, mở lại vẫn nóng, và cái căng thẳng "giữ cho nó
 * đừng nguội" biến mất — thay vào đó là một con số phải nhớ đi nạp lại.
 *
 * **Chỉ nhân phần chạm tay.** Thu nhập tự động, tiền công, cổ tức đều không
 * dính. Cho nhiệt nhân vào thu nhập tự động thì cả game biến thành "bấm liên
 * tục mọi lúc", và một game idle mà phải bấm liên tục mọi lúc là một game hỏng.
 */

/** Nhiệt tối đa. */
export const HEAT_CAP = 20;

/** Mỗi điểm nhiệt cộng bao nhiêu phần vào sản lượng mỗi lần chạm. */
export const HEAT_STEP = 0.1;

/** Nguội bao nhiêu điểm mỗi giây khi ngừng tay. */
export const COOL_PER_SECOND = 4;

/** Nhân tối đa, kể cả khi nhiệt kịch trần. */
export const HEAT_MAX_MULTIPLIER = 1 + HEAT_CAP * HEAT_STEP;

/**
 * Nhiệt sau khi để yên `seconds` giây.
 *
 * Tách riêng khỏi phần cộng, vì đây là hàm mà cả vòng lặp vẽ lẫn tầng luật
 * chơi đều gọi, mỗi bên một nhịp khác nhau.
 */
export function cooled(heat: number, seconds: number): number {
  if (!Number.isFinite(heat) || heat <= 0) return 0;
  if (!Number.isFinite(seconds) || seconds <= 0) return Math.min(HEAT_CAP, heat);
  return Math.max(0, Math.min(HEAT_CAP, heat) - COOL_PER_SECOND * seconds);
}

/** Nhiệt sau một lần chạm, biết lần chạm trước cách đây bao lâu. */
export function heated(heat: number, sinceSeconds: number): number {
  return Math.min(HEAT_CAP, cooled(heat, sinceSeconds) + 1);
}

/** Nhân sản lượng chạm tay ứng với mức nhiệt này. */
export function heatMultiplier(heat: number): number {
  if (!Number.isFinite(heat) || heat <= 0) return 1;
  return 1 + Math.min(HEAT_CAP, heat) * HEAT_STEP;
}

/**
 * Nhiệt còn giữ được bao lâu nữa, tính bằng giây.
 *
 * Đây là con số cái vòng nhiệt trên màn hình vẽ ra, và cũng là con số duy nhất
 * người chơi thật sự để ý: còn bao lâu trước khi công sức vừa rồi tan mất.
 */
export function heatSecondsLeft(heat: number): number {
  return Math.max(0, Math.min(HEAT_CAP, heat)) / COOL_PER_SECOND;
}
