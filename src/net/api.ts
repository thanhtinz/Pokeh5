/**
 * Nói chuyện với máy chủ tài khoản.
 *
 * Mọi hàm ở đây đều **không ném lỗi**. Chúng trả về `{ ok, data }` hoặc
 * `{ ok: false, error }`, vì gọi mạng hỏng là chuyện bình thường của một game
 * chơi được cả khi mất mạng — một cái `throw` ở đây rồi sẽ có ngày thành màn
 * hình trắng lúc người chơi đang ngồi trên tàu điện ngầm.
 *
 * Mã lỗi là **id chứ không phải câu chữ**, đúng luật của cả dự án: máy chủ trả
 * `name.taken`, `src/i18n/` mới biến nó thành một câu tiếng Việt.
 */
import type { PlayerState } from '../game/state';

/**
 * Địa chỉ máy chủ.
 *
 * Mặc định là `/api` cùng origin, để bản web dựng sau một proxy là chạy được
 * ngay. Bản Capacitor chạy ở `capacitor://localhost` nên không có "cùng origin"
 * nào cả, và phải đặt `VITE_API_URL` lúc build.
 */
const BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

/** Quá chừng này thì bỏ. Người chơi đang chờ, và game vẫn chạy được khi không có mạng. */
const TIMEOUT = 12_000;

export interface AccountUser {
  id: number;
  name: string;
  createdAt: number;
  bestNetWorth: number;
  reputationTotal: number;
  runs: number;
  claimed: number;
  updatedAt: number;
}

export type BoardMode = 'all' | 'week';

export interface BoardRow {
  /** Hạng 0 nghĩa là chưa vào bảng — tuần này chưa leo được bậc nào. */
  rank: number;
  name: string;
  bestNetWorth: number;
  reputationTotal: number;
  runs: number;
  claimed: number;
  /** Số bậc mười leo được trong tuần đang chạy. */
  weekClimb: number;
}

export interface Board {
  mode: BoardMode;
  rows: BoardRow[];
  total: number;
  you: BoardRow | null;
  /** Tuần này đóng sổ lúc nào. */
  endsAt: number;
}

export interface Score {
  bestNetWorth: number;
  reputationTotal: number;
  runs: number;
  claimed: number;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<Result<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      signal: controller.signal,
      headers: {
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (response.status === 204) return { ok: true, data: undefined as T };

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const code = payload && typeof payload.error === 'string' ? payload.error : 'server.error';
      return { ok: false, error: code };
    }
    return { ok: true, data: payload as T };
  } catch (error) {
    // Hết giờ và mất mạng là hai chuyện khác nhau với người chơi: một cái là
    // "thử lại đi", cái kia là "để lát nữa".
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return { ok: false, error: aborted ? 'net.timeout' : 'net.offline' };
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  register: (name: string, password: string) =>
    call<{ token: string; user: AccountUser }>('/register', {
      method: 'POST',
      body: { name, password },
    }),

  login: (name: string, password: string) =>
    call<{ token: string; user: AccountUser }>('/login', {
      method: 'POST',
      body: { name, password },
    }),

  logout: (token: string) => call<void>('/logout', { method: 'POST', token }),

  me: (token: string) => call<{ user: AccountUser }>('/me', { token }),

  changePassword: (token: string, current: string, next: string) =>
    call<void>('/password', { method: 'POST', token, body: { current, next } }),

  deleteAccount: (token: string, password: string) =>
    call<void>('/account', { method: 'DELETE', token, body: { password } }),

  pushSave: (token: string, save: PlayerState, score: Score) =>
    call<{ user: AccountUser }>('/save', { method: 'PUT', token, body: { save, score } }),

  pullSave: (token: string) =>
    call<{ save: PlayerState | null; seenAt: number }>('/save', { token }),

  board: (token: string | null, mode: BoardMode = 'all', limit = 50) =>
    call<Board>(`/board?mode=${mode}&limit=${limit}`, { token }),
};
