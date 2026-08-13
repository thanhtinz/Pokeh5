import { render } from 'preact';

import { derive, store } from './game/store';
import { account } from './net/account';
import { App } from './ui/App';
import { applyTheme } from './ui/theme';

import './styles/base.css';
import './styles/app.css';

/** How often the store notifies the UI. Ten a second reads as continuous. */
const FLUSH_SECONDS = 0.1;

const root = document.getElementById('app');
if (root) render(<App />, root);

/**
 * Thứ tự mở màn, và lý do nó là thứ tự này.
 *
 * Tài khoản trước, ván chơi sau. Nạp ván trước thì phải nạp *ván của ai* —
 * chưa biết thì chỉ còn cách đoán, mà đoán sai là người sau mượn máy thấy cơ
 * ngơi của người trước.
 *
 * Và vòng lặp mô phỏng chỉ chạy sau khi đã vào được game. Cho nó chạy sau lưng
 * cái cổng đăng nhập thì cơ sở vẫn quay, thẻ cơ hội vẫn rơi, tiền vẫn vào —
 * cho một ván mà chưa ai nhận là của mình.
 */
let looping = false;
let opening = false;

async function open(): Promise<void> {
  // `account.playing` về false lúc đăng xuất, nên hàm này phải chạy lại được
  // cho phiên sau; chỉ cái vòng lặp là dựng một lần duy nhất.
  if (opening || !account.signedIn || account.playing) return;
  opening = true;

  try {
    await account.openGame();
    if (!looping) {
      looping = true;
      startLoop();
    }
  } finally {
    opening = false;
  }
}

account.subscribe(() => void open());
void account.boot().then(open);

/**
 * Đăng ký service worker, để mở app lúc mất mạng vẫn ra game chứ không ra
 * trang trắng.
 *
 * Chỉ ở bản dựng thật và chỉ trên http(s). Lúc dev thì một cái kho nằm giữa
 * biến mọi lần sửa thành một cuộc điều tra; còn bản Capacitor chạy ở
 * `capacitor://` và đã có sẵn toàn bộ file trong máy rồi.
 *
 * Cái worker **không gọi `skipWaiting`**. Bản mới nằm chờ tới khi đóng hết tab
 * cũ mới lên. Đổi bộ file dưới chân một trang đang chạy thì nhanh hơn thật,
 * nhưng nó là cách để một lần nhập chunk muộn rơi vào khoảng trống giữa hai
 * bản — mà đây là game để mở suốt buổi, đúng loại trang sống lâu nhất.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {
      // Không đăng ký được thì game vẫn chạy, chỉ là mất mạng sẽ không mở nổi.
    });
  });
}

/**
 * One loop for the whole game.
 *
 * Simulation runs at frame rate so the refinery and cycle bars move smoothly;
 * the UI is notified at a tenth of that, because a phone has better uses for
 * its battery than re-rendering thirty-six rows sixty times a second.
 */
function startLoop(): void {
  const html = document.documentElement;
  let last = performance.now();
  let sinceFlush = 0;

  function frame(time: number): void {
    // Clamped so a stalled frame — a long GC, a dragged window — cannot pay
    // out minutes of income in one step.
    const dt = Math.min(1, (time - last) / 1000);
    last = time;

    // Đăng xuất giữa chừng thì ván đã rời khỏi bộ nhớ; đừng tính tiếp cho nó.
    if (store.ready) {
      store.tick(dt);
      sinceFlush += dt;

      if (sinceFlush >= FLUSH_SECONDS) {
        sinceFlush = 0;
        applyTheme(derive(store.state).netWorth, html);
        store.flush();
        // Tự chặn nhịp bên trong, nên gọi mỗi lần vẽ cũng chỉ đẩy mỗi phút một lần.
        void account.push();
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      store.suspend();
      void account.push(true);
      return;
    }
    // Frames stopped while hidden, so the clock has to be reset before the
    // first one lands with a delta measured in minutes.
    last = performance.now();
    store.resume();
  });

  // `pagehide` is the last event a mobile WebView reliably delivers.
  window.addEventListener('pagehide', () => store.suspend());
}
