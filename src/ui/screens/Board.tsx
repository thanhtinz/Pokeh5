import { useEffect } from 'preact/hooks';

import { money } from '../../game/money';
import type { Account } from '../../net/account';
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
    </section>
  );
}

// ---------------------------------------------------------------- bảng ------

function Table({ account }: { account: Account }) {
  const board = account.board;

  return (
    <section class="panel panel--inset board">
      <div class="prestige__head">
        <span class="section__title" style={{ margin: 0 }}>
          {t('board.title')}
        </span>
        <button class="board__refresh" onClick={() => void account.refreshBoard()}>
          {board ? t('board.players', { count: board.total }) : t('board.load')}
        </button>
      </div>

      {board === null ? (
        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {t('board.empty')}
        </span>
      ) : (
        <>
          <div class="board__list">
            {board.rows.map((row) => (
              <div
                key={row.name}
                class={`board__row${
                  board.you && row.name === board.you.name ? ' board__row--you' : ''
                } board__row--under`}
              >
                <span class="board__rank num">{row.rank}</span>
                <span class="board__body">
                  <span class="board__name">{row.name}</span>
                  <span class="board__job num">
                    {t('board.detail', { runs: row.runs, claimed: row.claimed })}
                  </span>
                </span>
                <span class="board__worth num">{money(row.bestNetWorth)}</span>
              </div>
            ))}
          </div>

          {/* Ngoài top thì vẫn phải thấy mình đứng đâu — đó mới là con số người
              chơi mở màn này lên để xem. */}
          {board.you && !board.rows.some((row) => row.name === board.you!.name) && (
            <div class="board__row board__row--you">
              <span class="board__rank num">{board.you.rank}</span>
              <span class="board__body">
                <span class="board__name">{board.you.name}</span>
                <span class="board__job num">
                  {t('board.detail', { runs: board.you.runs, claimed: board.you.claimed })}
                </span>
              </span>
              <span class="board__worth num">{money(board.you.bestNetWorth)}</span>
            </div>
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

/** Id lỗi từ máy chủ thành một câu; id lạ thì rơi về câu chung. */
function errorText(code: string): string {
  const text = t(`err.${code}`);
  return text === `err.${code}` ? t('err.server.error') : text;
}
