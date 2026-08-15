/**
 * Bản chơi một mình — không máy chủ, không tài khoản, không bảng xếp hạng.
 *
 * ## Vì sao có nó
 *
 * Game này bắt đăng nhập, và cái đó có lý do thật: bản lưu thuộc về một người
 * chứ không thuộc về cái máy, và cái bảng xếp hạng chỉ có nghĩa khi mỗi tên là
 * một người. Nhưng nó kéo theo một máy chủ Node cộng một kho SQLite, mà **chỗ
 * host tĩnh thì không chạy được cái nào cả** — GitHub Pages chỉ trả file.
 *
 * Nên có hai bản dựng từ cùng một mã nguồn:
 *
 *  - *Bản đầy đủ* (mặc định): đúng như cũ, có cổng đăng nhập, có mây, có bảng.
 *  - *Bản một mình* (`VITE_SOLO=1`): vào thẳng, ván nằm trong máy, phần mạng
 *    tắt hẳn.
 *
 * ## Vì sao là cờ lúc dựng chứ không phải nút trong game
 *
 * Một cái nút "chơi ngoại tuyến" ngay cạnh ô đăng nhập nghe tiện hơn, nhưng nó
 * đổi luật của **bản đầy đủ**: từ đó ai cũng bấm được vào chơi mà không có tên
 * trên bảng, và cả lý do tồn tại của cái cổng biến mất. Cờ lúc dựng thì bản
 * nào ra bản đó — bản Pages không có máy chủ nên không có cổng, bản có máy chủ
 * thì giữ nguyên cổng.
 *
 * Cờ này **không** phải chỗ để tắt đăng nhập cho tiện lúc phát triển. Bật nó
 * lên là bỏ luôn quyền sở hữu ván: ai mở máy cũng thấy ván của người trước.
 */
import type { AccountUser } from './api';

export const SOLO = import.meta.env['VITE_SOLO'] === '1';

/**
 * Người chơi giả của bản một mình.
 *
 * Vẫn phải có một `id`, vì `loadSave` bỏ qua ván không đúng chủ — thiếu nó thì
 * mở lại app là mất sạch ván, một cách rất im lặng.
 */
export const SOLO_USER: AccountUser = {
  // Số 0 chứ không phải chuỗi: `ownerId` của bản lưu so bằng `===` với `id`,
  // và một `id` sai kiểu thì mọi ván đều "không phải của bạn" — mở lại app là
  // mất sạch, mà mất rất im lặng.
  id: 0,
  name: 'solo',
  createdAt: 0,
  bestNetWorth: 0,
  reputationTotal: 0,
  runs: 0,
  claimed: 0,
  updatedAt: 0,
};
