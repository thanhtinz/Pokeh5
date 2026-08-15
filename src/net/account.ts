/**
 * Tài khoản, và cánh cổng vào game.
 *
 * Phải đăng nhập mới chơi được. Kéo theo hai chuyện phải làm cho đúng, và cả
 * hai đều là chuyện dễ làm sai:
 *
 *  - **Bản lưu thuộc về một người, không thuộc về cái máy.** Hai anh em mượn
 *    chung một điện thoại thì người sau không được thấy cơ ngơi của người
 *    trước, càng không được đẩy nó lên tài khoản mình. Ván nào cũng đóng dấu
 *    `ownerId`, và `loadSave` bỏ qua ván không phải của người đang đăng nhập.
 *  - **Mất mạng không được khoá cửa.** Đây là game một người chơi ngoại tuyến
 *    được; bắt buộc đăng nhập là để có tên trên bảng, không phải để biến một
 *    lúc rớt sóng thành một buổi tối không chơi được. Nên phiên đã đăng nhập
 *    một lần thì được nhớ trong máy, và lần sau mở app mà không gọi được máy
 *    chủ thì vẫn vào chơi — chỉ phần đồng bộ là nằm chờ.
 *
 * Chỉ đúng một chuyện khoá cửa thật: máy chủ trả lời rằng token không còn giá
 * trị. Đó không phải mất mạng, đó là "tài khoản này không còn là của phiên này
 * nữa", và lúc đó thì phải đăng nhập lại.
 */
import { api, type AccountUser, type Board, type BoardMode, type Score } from './api';
import { saveNow } from '../game/save';
import type { PlayerState } from '../game/state';
import { store } from '../game/store';
import { SOLO, SOLO_USER } from './solo';

const TOKEN_KEY = 'broketoboss.token';
const USER_KEY = 'broketoboss.user';

/** Đẩy bản lưu lên mây cách nhau ít nhất chừng này. */
const PUSH_INTERVAL = 60_000;

export type SyncState = 'idle' | 'busy' | 'error' | 'offline';

type Listener = () => void;

export class Account {
  token: string | null = read(TOKEN_KEY);
  user: AccountUser | null = readUser();
  board: Board | null = null;
  /** Bảng nào đang xem. Bắt đầu ở tuần này, vì đó là bảng người mới có cửa. */
  boardMode: BoardMode = 'week';

  /** Đã hỏi xong máy chủ chưa — trước lúc đó chưa biết nên hiện cổng hay game. */
  checked = false;
  /** Vào chơi được chưa: có phiên, và ván đã nạp xong. */
  playing = false;

  sync: SyncState = 'idle';
  error: string | null = null;
  busy = false;

  private listeners = new Set<Listener>();
  private lastPush = 0;

  get signedIn(): boolean {
    // Bản một mình không có phiên nào để kiểm — vào thẳng. Xem `solo.ts` về
    // chuyện vì sao đây là cờ lúc dựng chứ không phải một cái nút trong game.
    if (SOLO) return true;
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
   * Xác nhận phiên cũ lúc mở app.
   *
   * Gọi được máy chủ thì lấy bản mới nhất của tài khoản. Không gọi được thì
   * **vẫn tính là đã đăng nhập** với bản đã nhớ trong máy — chỉ 401 mới đá ra.
   */
  async boot(): Promise<void> {
    if (SOLO) {
      this.user = SOLO_USER;
      this.checked = true;
      this.emit();
      return;
    }

    if (this.token === null) {
      this.checked = true;
      this.emit();
      return;
    }

    const result = await api.me(this.token);
    if (result.ok) {
      this.user = result.data.user;
      writeUser(this.user);
      this.sync = 'idle';
    } else if (result.error === 'auth.required') {
      this.forget();
    } else {
      // Mạng hỏng, không phải phiên hỏng.
      this.sync = this.user ? 'offline' : 'error';
      this.error = result.error;
      if (!this.user) this.forget();
    }

    this.checked = true;
    this.emit();
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
    write(TOKEN_KEY, this.token);
    writeUser(this.user);
    this.emit();
    return true;
  }

  /**
   * Nạp ván của tài khoản này và quyết định lấy bản nào.
   *
   * Ba trường hợp, và trường hợp thứ ba là chỗ dễ mất tiến độ nhất:
   *
   *  1. Máy có ván của chính người này → so `lastSeenAt`, bên nào mới hơn thắng.
   *  2. Máy không có gì, trên mây có → lấy trên mây, khỏi so.
   *  3. Máy không có gì, trên mây cũng không → ván mới.
   *
   * Trường hợp 2 phải tách ra chứ không gộp vào luật "mới hơn thì thắng", vì
   * một ván trắng vừa tạo có `lastSeenAt` là bây giờ — đem so thì nó luôn thắng
   * bản trên mây, và đổi sang máy mới là mất sạch.
   */
  async openGame(): Promise<void> {
    if (!this.signedIn || this.playing) return;

    const fresh = await store.boot(this.user!.id);

    if (this.token !== null) {
      const pulled = await api.pullSave(this.token);
      if (pulled.ok) {
        const remote = pulled.data.save;
        if (remote && (fresh || Number(remote.lastSeenAt) > store.state.lastSeenAt)) {
          store.adopt({ ...remote, ownerId: this.user!.id });
        }
        this.sync = 'idle';
      } else {
        this.sync = pulled.error === 'auth.required' ? 'error' : 'offline';
        this.error = pulled.error;
      }
    }

    this.playing = true;
    this.emit();
    await this.push(true);
  }

  /**
   * Đổi mật khẩu. Trả về `null` khi xong, hoặc id lỗi để màn hình hiện câu.
   *
   * Máy chủ giết mọi phiên khác, giữ lại phiên này — nên không phải đăng nhập
   * lại ở đây, còn cái máy kia thì lần đồng bộ sau sẽ ăn 401 và bị đá ra, đúng
   * như ý.
   */
  async changePassword(current: string, next: string): Promise<string | null> {
    if (this.token === null) return 'auth.required';

    this.busy = true;
    this.error = null;
    this.emit();

    const result = await api.changePassword(this.token, current, next);
    this.busy = false;
    this.error = result.ok ? null : result.error;
    this.emit();
    return result.ok ? null : result.error;
  }

  /** Xoá tài khoản, rồi trở về đúng chỗ một người lạ đứng: cái cổng. */
  async deleteAccount(password: string): Promise<string | null> {
    if (this.token === null) return 'auth.required';

    this.busy = true;
    this.error = null;
    this.emit();

    const result = await api.deleteAccount(this.token, password);
    this.busy = false;

    if (!result.ok) {
      this.error = result.error;
      this.emit();
      return result.error;
    }

    // Ván trong máy cũng phải đi theo. Để lại một bản lưu mang dấu một tài
    // khoản không còn tồn tại là để lại một cái xác không ai dọn được.
    store.wipe();
    this.forget();
    this.emit();
    return null;
  }

  async logout(): Promise<void> {
    const token = this.token;
    this.forget();
    store.unload();
    this.emit();
    // Xoá ở máy trước, báo máy chủ sau: nút Đăng xuất phải ăn ngay kể cả khi
    // đang không có mạng.
    if (token) await api.logout(token);
  }

  private forget(): void {
    this.token = null;
    this.user = null;
    this.board = null;
    this.playing = false;
    this.sync = 'idle';
    remove(TOKEN_KEY);
    remove(USER_KEY);
  }

  /**
   * Đẩy bản lưu lên. `force` bỏ qua nhịp chờ, dùng lúc app đóng lại.
   *
   * Ghi xuống ổ đĩa trước rồi mới gửi đi, để `lastSeenAt` gửi lên đúng bằng cái
   * đang nằm trong máy — lệch hai con số này là lần mở sau sẽ chọn sai bên.
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
      writeUser(this.user);
      this.sync = 'idle';
      this.error = null;
    } else if (result.error === 'auth.required') {
      // Phiên hết hiệu lực thật. Ván đang chơi vẫn nằm trong máy, nhưng từ đây
      // phải đăng nhập lại mới đi tiếp được.
      this.forget();
      store.unload();
    } else {
      this.sync = 'offline';
      this.error = result.error;
    }
    this.emit();
  }

  async refreshBoard(mode: BoardMode = this.boardMode): Promise<void> {
    // Bản một mình không có máy chủ nào để hỏi. Không chặn ở đây thì mỗi lần
    // mở tab Bảng là một cú `fetch` vào hư không, và người chơi nhận được
    // "mất mạng" — sai nguyên nhân, mà lại còn gợi ý là thử lại thì được.
    if (SOLO) {
      this.board = null;
      this.error = 'solo.noBoard';
      this.emit();
      return;
    }

    // Đổi bảng thì xoá bảng cũ đi trước khi hỏi: để nguyên thì trong lúc chờ
    // mạng, tiêu đề nói "tuần này" mà mấy dòng bên dưới vẫn là bảng mọi thời.
    if (mode !== this.boardMode) {
      this.boardMode = mode;
      this.board = null;
      this.emit();
    }

    const result = await api.board(this.token, mode);
    // Bấm nhanh qua lại thì câu trả lời có thể về sau khi đã đổi ý; bảng của
    // chế độ không còn xem nữa thì bỏ.
    if (result.ok && result.data.mode !== this.boardMode) return;
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

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Trình duyệt chặn localStorage thì phiên này vẫn chạy, chỉ là mở lại app
    // phải đăng nhập lần nữa.
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Không xoá được thì phiên này vẫn coi như đã đăng xuất.
  }
}

/** Bản sao tài khoản trong máy, để mở app lúc mất mạng vẫn biết mình là ai. */
function readUser(): AccountUser | null {
  const raw = read(USER_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as AccountUser;
    return typeof parsed?.id === 'number' && typeof parsed?.name === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function writeUser(user: AccountUser): void {
  write(USER_KEY, JSON.stringify(user));
}

export const account = new Account();
