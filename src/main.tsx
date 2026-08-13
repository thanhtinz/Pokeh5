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

// Ván chơi khởi động trước, tài khoản theo sau. Thứ tự này là cố ý: người chơi
// chạm được vào game ngay, còn phần mạng thì tới lúc nào cũng được.
void store.boot().then(() => {
  startLoop();
  void account.boot();
});

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

    store.tick(dt);
    sinceFlush += dt;

    if (sinceFlush >= FLUSH_SECONDS) {
      sinceFlush = 0;
      applyTheme(derive(store.state).netWorth, html);
      store.flush();
      // Tự chặn nhịp bên trong, nên gọi mỗi lần vẽ cũng chỉ đẩy mỗi phút một lần.
      void account.push();
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
