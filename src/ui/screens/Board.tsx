import { useEffect, useState } from 'preact/hooks';

import { money } from '../../game/money';
import type { PlayerState } from '../../game/state';
import type { Account } from '../../net/account';
import { t } from '../../i18n';
import { Icon } from '../Icon';

interface Props {
  account: Account;
  state: PlayerState;
}

/**
 * Bảng xếp hạng thật, và chỗ đăng nhập.
 *
 * Hai thứ này ở chung một màn vì chúng là một câu chuyện: bảng là **lý do** để
 * đăng nhập. Nhét form đăng nhập vào màn cài đặt rồi để bảng ở chỗ khác thì
 * người chơi nhìn form và hỏi "để làm gì".
 *
 * Nên chưa đăng nhập vẫn thấy bảng — mờ đi, chỉ mười dòng đầu, nhưng thấy. Một
 * cái ổ khoá to đùng che mất thứ đang mời người ta vào là cách nhanh nhất để
 * họ bỏ đi.
 */
export function Board({ account, state }: Props) {
  // Mở màn này ra là tải bảng, một lần. Bắt người chơi bấm một nút "tải" để
  // thấy thứ duy nhất trên màn hình thì cái nút đó là một bước thừa.
  useEffect(() => {
    if (account.board === null) void account.refreshBoard();
  }, [account]);

  return (
    <>
      {account.signedIn ? <Signed account={account} /> : <SignIn account={account} />}
      <Table account={account} state={state} />
    </>
  );
}

// ------------------------------------------------------------- đăng nhập ----

function SignIn({ account }: { account: Account }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const ready = name.trim().length >= 3 && password.length >= 8;

  async function submit(event: Event) {
    event.preventDefault();
    if (!ready || account.busy) return;
    if (mode === 'register') await account.register(name.trim(), password);
    else await account.login(name.trim(), password);
  }

  return (
    <section class="panel panel--inset auth">
      <div class="segments">
        <button aria-pressed={mode === 'register'} onClick={() => setMode('register')}>
          {t('auth.register')}
        </button>
        <button aria-pressed={mode === 'login'} onClick={() => setMode('login')}>
          {t('auth.login')}
        </button>
      </div>

      <form class="auth__form" onSubmit={submit}>
        <label class="auth__field">
          <span class="auth__label">{t('auth.name')}</span>
          <input
            class="auth__input"
            type="text"
            autocomplete="username"
            autocapitalize="none"
            spellcheck={false}
            maxLength={16}
            value={name}
            onInput={(event) => setName((event.target as HTMLInputElement).value)}
          />
        </label>

        <label class="auth__field">
          <span class="auth__label">{t('auth.password')}</span>
          <input
            class="auth__input"
            type="password"
            autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onInput={(event) => setPassword((event.target as HTMLInputElement).value)}
          />
        </label>

        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {t('auth.rules')}
        </span>

        {account.error && <span class="auth__error">{errorText(account.error)}</span>}

        <button class="btn btn--wide btn--primary" disabled={!ready || account.busy}>
          {account.busy
            ? t('auth.working')
            : mode === 'register'
              ? t('auth.register')
              : t('auth.login')}
        </button>
      </form>

      <span class="row__meta" style={{ whiteSpace: 'normal' }}>
        {t('auth.why')}
      </span>
    </section>
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

function Table({ account, state }: Props) {
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

          {!account.signedIn && (
            <span class="row__meta" style={{ whiteSpace: 'normal' }}>
              {t('board.anon', { amount: money(state.bestNetWorth) })}
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

/** Id lỗi từ máy chủ thành một câu; id lạ thì rơi về câu chung. */
function errorText(code: string): string {
  const text = t(`err.${code}`);
  return text === `err.${code}` ? t('err.server.error') : text;
}
