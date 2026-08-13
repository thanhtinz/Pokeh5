import { useState } from 'preact/hooks';

import type { Account } from '../../net/account';
import { t } from '../../i18n';
import { CityScene } from '../Scene';

/**
 * Cổng vào.
 *
 * Không đăng nhập thì không có game. Nên màn này là thứ đầu tiên người lạ nhìn
 * thấy, và nó phải làm được hai việc cùng lúc: **nói game này là game gì**, rồi
 * mới xin tên với mật khẩu. Một cái form trần trên nền đen thì chẳng ai buồn
 * điền — người ta còn chưa biết đang đăng ký vào cái gì.
 *
 * Nền vẫn là cái bãi đất trống của lượt chơi đầu, ở đúng độ mờ của lúc còn nợ.
 * Cả game là leo lên từ chỗ đó, và đây là chỗ duy nhất được nói ra thành lời.
 */
export function Gate({ account }: { account: Account }) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
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
    <div class="gate">
      <CityScene />

      <div class="gate__body">
        <header class="gate__intro">
          <h1 class="gate__title">Broke to Boss</h1>
          <p class="gate__pitch">{t('gate.pitch')}</p>
        </header>

        <section class="panel panel--inset">
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
                  ? t('gate.start')
                  : t('auth.login')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

/** Id lỗi từ máy chủ thành một câu; id lạ thì rơi về câu chung. */
function errorText(code: string): string {
  const text = t(`err.${code}`);
  return text === `err.${code}` ? t('err.server.error') : text;
}
