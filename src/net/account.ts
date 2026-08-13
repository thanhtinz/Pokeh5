/**
 * Tài khoản và đồng bộ bản lưu.
 *
 * Nguyên tắc trên hết: **đăng nhập là thứ thêm vào, không phải thứ bắt buộc.**
 * Không mạng, không tài khoản, máy chủ sập — game vẫn chạy y như trước, vì bản
 * lưu thật vẫn nằm trong máy và lớp này chỉ soi gương nó lên mây. Bất kỳ chỗ
 * nào ở đây hỏng cũng chỉ được phép làm mất phần đồng bộ, không được đụng tới
 * ván đang chơi.
 *
 * Đụng độ giải bằng **`lastSeenAt` mới hơn thì thắng** — đúng cái luật mà bản
 * lưu gương trên máy Android đang dùng. Một luật cho mọi bản sao thì còn suy
 * luận được; hai luật thì tới lúc lệch nhau chẳng ai biết cái nào đúng.
 */
import { api, type AccountUser, type Board, type Score } from './api';
import { saveNow } from '../game/save';
import type { PlayerState } from '../game/state';
import { store } from '../game/store';

const TOKEN_KEY = 'broketoboss.token';

/** Đẩy bản lưu lên mây cách nhau ít nhất chừng này. */
const PUSH_INTERVAL = 60_000;

export type SyncState = 'off' | 'idle' | 'busy' | 'error';

type Listener = () => void;

export class Account {
  token: string | null = readToken();
  user: AccountUser | null = null;
  board: Board | null = null;

  sync: SyncState = 'off';
  /** Id lỗi gần nhất, để màn hình biết hiện câu gì. */
  error: string | null = null;
  /** Đang gọi mạng cho một nút bấm nào đó. */
  busy = false;

  private listeners = new Set<Listener>();
  private lastPush = 0;
  private pulled = false;

  get signedIn(): boolean {
    return this.token !== null && this.user !== null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /**
   * Lấy lại phiên cũ lúc mở app.
   *
   * Token hỏng thì dọn đi luôn, chứ không giữ lại để mỗi lần đồng bộ lại ăn một
   * lần 401 — người chơi sẽ thấy một cái chấm đỏ mãi mãi mà không hiểu vì sao.
   */
  async boot(): Promise<void> {
    if (this.token === null) return;

    const result = await api.me(this.token);
    if (!result.ok) {
      if (result.error === 'auth.required') this.forget();
      else this.sync = 'error';
      this.emit();
      return;
    }

    this.user = result.data.user;
    this.sync = 'idle';
    this.emit();
    await this.merge();
  }

  async register(name: string, password: string): Promise<boolean> {
    return this.enter(() => api.register(name, password));
  }

  async login(name: string, password: string): Promise<boolean> {
    return this.enter(() => api.login(name, password));
  }

  private async enter(
    call: () => Promise<
      { ok: true; data: { token: string; user: AccountUser } } | { ok: false; error: string }
    >,
  ): Promise<boolean> {
    this.busy = true;
    this.error = null;
    this.emit();

    const result = await call();
    this.busy = false;

    if (!result.ok) {
      this.error = result.error;
      this.emit();
      return false;
    }

    this.token = result.data.token;
    this.user = result.data.user;
    this.sync = 'idle';
    this.pulled = false;
    writeToken(this.token);
    this.emit();

    await this.merge();
    void this.refreshBoard();
    return true;
  }

  async logout(): Promise<void> {
    const token = this.token;
    this.forget();
    this.emit();
    // Xoá ở máy trước, báo máy chủ sau: nút Đăng xuất phải ăn ngay kể cả khi
    // đang không có mạng.
    if (token) await api.logout(token);
  }

  private forget(): void {
    this.token = null;
    this.user = null;
    this.sync = 'off';
    this.pulled = false;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Không xoá được thì phiên này vẫn coi như đã đăng xuất.
    }
  }

  /**
   * Gộp bản lưu trên mây với bản trong máy, một lần cho mỗi lần đăng nhập.
   *
   * Bên nào `lastSeenAt` mới hơn thì bên đó thắng. Bằng nhau — cùng một máy,
   * vừa đẩy lên xong — thì giữ nguyên bản trong máy, vì nó là bản đang chạy.
   */
  private async merge(): Promise<void> {
    if (this.token === null || this.pulled) return;
    this.pulled = true;

    const result = await api.pullSave(this.token);
    if (!result.ok) {
      this.sync = 'error';
      this.emit();
      return;
    }

    const remote = result.data.save;
    if (remote && Number(remote.lastSeenAt) > store.state.lastSeenAt) {
      store.adopt(remote);
    }

    this.sync = 'idle';
    this.emit();
    await this.push(true);
  }

  /**
   * Đẩy bản lưu lên. `force` bỏ qua nhịp chờ, dùng lúc app đóng lại.
   *
   * Ghi xuống ổ đĩa trước rồi mới gửi đi, để `lastSeenAt` gửi lên đúng bằng cái
   * đang nằm trong máy — lệch hai con số này là lần đăng nhập sau sẽ gộp sai bên.
   */
  async push(force = false): Promise<void> {
    if (this.token === null || !store.ready) return;

    const now = Date.now();
    if (!force && now - this.lastPush < PUSH_INTERVAL) return;
    this.lastPush = now;

    store.state.lastSeenAt = now;
    saveNow(store.state);

    this.sync = 'busy';
    this.emit();

    const result = await api.pushSave(this.token, store.state, scoreOf(store.state));
    if (result.ok) {
      this.user = result.data.user;
      this.sync = 'idle';
      this.error = null;
    } else {
      if (result.error === 'auth.required') this.forget();
      else this.sync = 'error';
      this.error = result.error;
    }
    this.emit();
  }

  async refreshBoard(): Promise<void> {
    const result = await api.board(this.token);
    if (result.ok) {
      this.board = result.data;
      this.error = null;
    } else {
      this.error = result.error;
    }
    this.emit();
  }
}

/** Phần của bản lưu mà bảng xếp hạng đọc. */
export function scoreOf(state: PlayerState): Score {
  return {
    bestNetWorth: state.bestNetWorth,
    reputationTotal: state.reputationTotal,
    runs: state.runs,
    claimed: state.claimed.length,
  };
}

function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Trình duyệt chặn localStorage thì phiên này vẫn đăng nhập được, chỉ là
    // mở lại app phải đăng nhập lần nữa.
  }
}

export const account = new Account();
