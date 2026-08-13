import { useEffect, useState } from 'preact/hooks';

import { fixed, money } from '../../game/money';
import type { Account } from '../../net/account';
import type { BoardMode, BoardRow } from '../../net/api';
import { t } from '../../i18n';
import { Icon } from '../Icon';

interface Props {
  account: Account;
}

/**
 * Bảng xếp hạng, và tài khoản đang đăng nhập.
 *
 * Không có nhánh "chưa đăng nhập" ở đây, vì tới được màn này thì đã đăng nhập
 * rồi — cái cổng ở `Gate.tsx` là đường duy nhất vào game. Giữ lại một bản form
 * thứ hai cho chắc nghe thì phòng thủ, nhưng thực ra là một màn hình không ai
 * chạy tới bao giờ, và những màn hình đó là những màn hình hỏng mà không ai biết.
 */
export function Board({ account }: Props) {
  // Mở màn này ra là tải bảng, một lần. Bắt người chơi bấm một nút "tải" để
  // thấy thứ duy nhất trên màn hình thì cái nút đó là một bước thừa.
  useEffect(() => {
    if (account.board === null) void account.refreshBoard();
  }, [account]);

  return (
    <>
      <Signed account={account} />
      <Table account={account} />
    </>
  );
}

function Signed({ account }: { account: Account }) {
  const user = account.user!;
  const [open, setOpen] = useState(false);

  return (
    <section class="panel panel--inset auth">
      <div class="prestige__head">
        <span class="section__title" style={{ margin: 0 }}>
          {user.name}
        </span>
        <span class={`auth__sync auth__sync--${account.sync}`}>{t(`sync.${account.sync}`)}</span>
      </div>

      <span class="row__meta" style={{ whiteSpace: 'normal' }}>
        {account.sync === 'error' && account.error
          ? errorText(account.error)
          : t('auth.syncNote')}
      </span>

      <div class="auth__actions">
        <button class="btn btn--sm" onClick={() => void account.push(true)}>
          {t('auth.pushNow')}
        </button>
        <button class="btn btn--sm btn--ghost" onClick={() => void account.logout()}>
          {t('auth.logout')}
        </button>
      </div>

      {/* Đổi mật khẩu và xoá tài khoản gấp lại. Hai thứ này phải có mặt, nhưng
          bày thẳng ra cạnh nút Đăng xuất thì có ngày ai đó bấm nhầm cái không
          hoàn tác được. */}
      <button class="auth__more" onClick={() => setOpen(!open)}>
        {open ? t('auth.hideSettings') : t('auth.settings')}
      </button>

      {open && <Danger account={account} />}
    </section>
  );
}

/**
 * Hai việc không hoàn tác được.
 *
 * Cả hai đều bắt nhập lại mật khẩu hiện tại. Với đổi mật khẩu thì đó là điều
 * hiển nhiên; với xoá tài khoản thì nó là cái phanh — một cái điện thoại mở sẵn
 * bị người khác cầm không xoá được ván chơi của mình.
 */
function Danger({ account }: { account: Account }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [done, setDone] = useState(false);

  async function changePassword(event: Event) {
    event.preventDefault();
    if (account.busy || current.length < 1 || next.length < 8) return;

    const failure = await account.changePassword(current, next);
    if (failure === null) {
      setCurrent('');
      setNext('');
      setDone(true);
    }
  }

  async function remove() {
    if (current.length < 1 || account.busy) return;
    if (!window.confirm(t('auth.deleteConfirm', { name: account.user?.name ?? '' }))) return;
    await account.deleteAccount(current);
  }

  return (
    <form class="auth__form" onSubmit={changePassword}>
      <label class="auth__field">
        <span class="auth__label">{t('auth.currentPassword')}</span>
        <input
          class="auth__input"
          type="password"
          autocomplete="current-password"
          value={current}
          onInput={(event) => {
            setCurrent((event.target as HTMLInputElement).value);
            setDone(false);
          }}
        />
      </label>

      <label class="auth__field">
        <span class="auth__label">{t('auth.newPassword')}</span>
        <input
          class="auth__input"
          type="password"
          autocomplete="new-password"
          value={next}
          onInput={(event) => {
            setNext((event.target as HTMLInputElement).value);
            setDone(false);
          }}
        />
      </label>

      {account.error && <span class="auth__error">{errorText(account.error)}</span>}
      {done && <span class="auth__done">{t('auth.passwordChanged')}</span>}

      <button
        class="btn btn--wide"
        disabled={account.busy || current.length < 1 || next.length < 8}
      >
        {t('auth.changePassword')}
      </button>

      <button
        type="button"
        class="btn btn--wide auth__danger"
        disabled={account.busy || current.length < 1}
        onClick={() => void remove()}
      >
        {t('auth.deleteAccount')}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- bảng ------

const MODES: readonly BoardMode[] = ['week', 'all'];

function Table({ account }: { account: Account }) {
  const board = account.board;
  const mode = account.boardMode;

  return (
    <section class="panel panel--inset board">
      <div class="prestige__head">
        <span class="section__title" style={{ margin: 0 }}>
          {t(`board.title.${mode}`)}
        </span>
        <button class="board__refresh" onClick={() => void account.refreshBoard()}>
          {board ? t('board.players', { count: board.total }) : t('board.load')}
        </button>
      </div>

      {/* Bảng tuần đứng trước, và mở màn là nó. Bảng mọi thời là bảng của
          những người đã chơi hàng tháng; mở ra thấy nó đầu tiên thì người mới
          học được đúng một điều, là mình không có cửa. */}
      <div class="board__modes">
        {MODES.map((id) => (
          <button
            key={id}
            class="board__mode"
            aria-current={mode === id ? 'true' : undefined}
            onClick={() => void account.refreshBoard(id)}
          >
            {t(`board.mode.${id}`)}
          </button>
        ))}
      </div>

      <span class="row__meta board__note">
        {mode === 'week'
          ? board
            ? t('board.weekNote', { left: leftText(board.endsAt) })
            : t('board.weekWhat')
          : t('board.allNote')}
      </span>

      {board === null ? (
        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {t('board.empty')}
        </span>
      ) : (
        <>
          <div class="board__list">
            {board.rows.map((row) => (
              <Row key={row.name} row={row} mode={mode} you={row.name === board.you?.name} />
            ))}
          </div>

          {/* Ngoài top thì vẫn phải thấy mình đứng đâu — đó mới là con số người
              chơi mở màn này lên để xem. */}
          {board.you && !board.rows.some((row) => row.name === board.you!.name) && (
            <Row row={board.you} mode={mode} you />
          )}

          {board.rows.length === 0 && (
            <span class="row__meta" style={{ whiteSpace: 'normal' }}>
              {t('board.weekEmpty')}
            </span>
          )}
        </>
      )}

      <span class="row__meta board__fair">
        <Icon name="lock" />
        {t('board.fair')}
      </span>
    </section>
  );
}

function Row({ row, mode, you }: { row: BoardRow; mode: BoardMode; you: boolean }) {
  const week = mode === 'week';

  return (
    <div class={`board__row${you ? ' board__row--you' : ''}${you ? '' : ' board__row--under'}`}>
      {/* Hạng 0 là "chưa vào bảng": tuần này chưa leo được bậc nào, và một dấu
          gạch nói điều đó gọn hơn bất cứ câu nào. */}
      <span class="board__rank num">{row.rank > 0 ? row.rank : '—'}</span>
      <span class="board__body">
        <span class="board__name">{row.name}</span>
        <span class="board__job num">
          {week
            ? money(row.bestNetWorth)
            : t('board.detail', { runs: row.runs, claimed: row.claimed })}
        </span>
      </span>
      {/* Cột phải luôn là cột đang xếp hạng: ở bảng tuần là số bậc, ở bảng mọi
          thời là tổng tài sản. Cột kia lùi xuống dòng phụ. */}
      <span class={`board__worth num${week ? ' board__worth--lead' : ''}`}>
        {week ? t('board.climb', { steps: fixed(row.weekClimb) }) : money(row.bestNetWorth)}
      </span>
    </div>
  );
}

/** Còn bao lâu nữa hết tuần, làm tròn tới giờ — không ai cần tới giây. */
function leftText(endsAt: number): string {
  const left = Math.max(0, endsAt - Date.now());
  const hours = Math.floor(left / 3_600_000);
  return hours >= 24
    ? t('board.leftDays', { days: Math.floor(hours / 24), hours: hours % 24 })
    : t('board.leftHours', { hours });
}

/** Id lỗi từ máy chủ thành một câu; id lạ thì rơi về câu chung. */
function errorText(code: string): string {
  const text = t(`err.${code}`);
  return text === `err.${code}` ? t('err.server.error') : text;
}
