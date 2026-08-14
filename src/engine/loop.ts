/**
 * Vòng lặp game. Một cái, cho cả ứng dụng.
 *
 * Từ trước tới giờ mọi thứ động đậy trong game này đều chạy bằng `setTimeout`
 * và transition của CSS — nghĩa là không có cái nào biết cái nào tồn tại, và
 * không có chỗ nào hỏi được câu "từ khung hình trước tới giờ là bao lâu". Đó là
 * cách làm một trang web. Một trò chơi thì có đúng một nhịp tim, và mọi thứ
 * chuyển động đều đập theo nhịp đó.
 *
 * Ba điều bắt buộc, và cái nào bỏ qua cũng ra một lỗi kinh điển:
 *
 *  1. **Cập nhật theo delta, không theo khung hình.** Máy 120Hz mà tính theo
 *     khung hình thì mọi thứ chạy nhanh gấp đôi máy 60Hz. Mọi hàm cập nhật ở
 *     đây đều nhận `dt` tính bằng giây.
 *  2. **Chặn trần delta.** Chuyển tab rồi quay lại là một bước nhảy mười giây;
 *     thả nguyên con số đó vào vật lý thì hạt bay xuyên qua mặt đất và lò xo
 *     nổ tung. Chặn ở một phần mười giây, chấp nhận chuyển động chậm lại một
 *     nhịp, đổi lấy việc không bao giờ vỡ.
 *  3. **Không chạy khi không có ai nhìn.** Không còn người đăng ký thì dừng
 *     hẳn `requestAnimationFrame`, và tab chạy nền thì trình duyệt tự treo —
 *     nhưng vẫn phải đặt lại mốc thời gian lúc quay ra, không thì điều 2 phải
 *     làm việc thay.
 */

export type Step = (dt: number, elapsed: number) => void;

/** Trần của một bước, tính bằng giây. */
const MAX_DT = 0.1;

const steps = new Set<Step>();

let frame = 0;
let last = 0;
let elapsed = 0;

function tick(now: number): void {
  frame = requestAnimationFrame(tick);

  const dt = Math.min(MAX_DT, (now - last) / 1000);
  last = now;
  elapsed += dt;

  // Chép ra mảng trước khi chạy: một `step` có quyền tự huỷ đăng ký của chính
  // nó, và sửa Set trong lúc đang duyệt nó là một lỗi im lặng.
  for (const step of [...steps]) step(dt, elapsed);
}

function start(): void {
  if (frame !== 0) return;
  last = performance.now();
  frame = requestAnimationFrame(tick);
}

function stop(): void {
  if (frame === 0) return;
  cancelAnimationFrame(frame);
  frame = 0;
}

/** Đăng ký một hàm chạy mỗi khung hình. Trả về hàm huỷ. */
export function onFrame(step: Step): () => void {
  steps.add(step);
  start();

  return () => {
    steps.delete(step);
    if (steps.size === 0) stop();
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    // Quay lại tab: đặt lại mốc, không thì khung hình đầu tiên mang theo cả
    // quãng thời gian đi vắng.
    if (document.hidden) stop();
    else if (steps.size > 0) start();
  });
}
