/**
 * Phần cắm dây của âm thanh.
 *
 * Ba luật của trình duyệt định hình cả file này, và cái nào bỏ qua cũng ra một
 * lỗi khó tìm:
 *
 *  1. **Không được tự phát nhạc.** `AudioContext` dựng trước một cú chạm thì
 *     sinh ra ở trạng thái `suspended`, và mọi thứ phát vào đó rơi vào im lặng.
 *     Nên nó chỉ được dựng ở lần phát đầu tiên, và lần đầu tiên đó luôn nằm
 *     trong một sự kiện do người chơi bấm.
 *  2. **Một context là đủ cho cả đời ứng dụng.** Dựng mới mỗi lần phát thì vài
 *     chục cái là trình duyệt bắt đầu từ chối.
 *  3. **Tab chạy nền bị treo context.** Quay lại thì phải `resume()`, không thì
 *     game im tiếng cho tới lần tải lại.
 *
 * Và một luật không phải của trình duyệt: **tắt được**. Một game bấm liên tục
 * mà kêu, chơi trên xe buýt, thì cái nút tắt không phải là tuỳ chọn.
 */
import type { CueId } from '../game/store';
import { buzzFor, nextStreak, notesFor } from './cues';

const MUTE_KEY = 'broketoboss.muted';

/** Âm lượng chung. Để thấp: đây là tiếng nghe hàng nghìn lần một buổi. */
const MASTER = 0.22;

type Listener = () => void;

class Sound {
  muted = readMuted();

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private streak = 0;
  private lastTapAt = 0;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  toggle(): void {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // Chế độ riêng tư chặn localStorage. Tắt tiếng cho phiên này vẫn chạy.
    }
    for (const listener of this.listeners) listener();
  }

  play(cue: CueId): void {
    if (this.muted) return;

    // Chuỗi bấm đếm kể cả lúc đang tắt tiếng thì không cần thiết, nhưng đếm ở
    // đây thì nó nằm cùng chỗ với thứ duy nhất dùng tới nó.
    const now = Date.now();
    if (cue === 'tap') {
      this.streak = nextStreak(this.streak, now - this.lastTapAt);
      this.lastTapAt = now;
    }

    this.buzz(buzzFor(cue));

    const ctx = this.context();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') void ctx.resume();

    for (const note of notesFor(cue, this.streak)) {
      const at = ctx.currentTime + note.start / 1000;
      const ends = at + note.ms / 1000;

      const osc = ctx.createOscillator();
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, at);

      // Vào nhanh, ra theo hàm mũ. Cắt thẳng biên độ về 0 là nghe được một cái
      // "tách" ở cuối mỗi nốt — đó là sóng bị cắt ngang, không phải nốt nhạc.
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, note.gain), at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, ends);

      osc.connect(gain).connect(this.master);
      osc.start(at);
      osc.stop(ends + 0.02);
    }
  }

  /** Rung, nếu máy có và người chơi chưa tắt tiếng. */
  private buzz(ms: number): void {
    if (ms <= 0) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      // Có máy khai báo `vibrate` rồi ném lỗi khi gọi ngoài cử chỉ người dùng.
    }
  }

  /** Dựng context ở lần cần đầu tiên, và chỉ một lần. */
  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;

    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER;
      this.master.connect(this.ctx.destination);
    } catch {
      // Không có Web Audio thì game vẫn chơi được, chỉ là im.
      this.ctx = null;
    }

    return this.ctx;
  }
}

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export const sound = new Sound();
