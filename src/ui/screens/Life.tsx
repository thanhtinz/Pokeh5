import { MILESTONES, describeBonus } from '../../game/life';
import { duration, money } from '../../game/money';
import type { PlayerState } from '../../game/state';
import type { Derived, Store } from '../../game/store';
import { locale, setLocale, t, type Locale } from '../../i18n';
import { Art } from '../Art';

interface Props {
  game: Store;
  state: PlayerState;
  derived: Derived;
  now: number;
}

const LANGUAGES: readonly { id: Locale; label: string }[] = [
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'en', label: 'English' },
];

/**
 * What the debt cost, listed in order, with the ones already bought back lit.
 *
 * Locked entries keep their title and their price but lose their line — the
 * sentence is the reward, and reading it early would spend it.
 */
export function Life({ game, state, derived, now }: Props) {
  return (
    <>
      <section class="panel" style={{ padding: '14px' }}>
        <div class="market__summary" style={{ padding: 0 }}>
          <span class="stat">
            <span class="stat__label">{t('life.peak')}</span>
            <b class="stat__value num">{money(state.peakNetWorth)}</b>
          </span>
          <span class="stat">
            <span class="stat__label">{t('life.reclaimed')}</span>
            <b class="stat__value num">
              {state.claimed.length}/{MILESTONES.length}
            </b>
          </span>
          <span class="stat">
            <span class="stat__label">{t('life.climbing')}</span>
            <b class="stat__value num">{duration((now - state.createdAt) / 1000)}</b>
          </span>
        </div>
      </section>

      <section class="life">
        {MILESTONES.map((milestone) => {
          const claimed = state.claimed.includes(milestone.id);
          const reached = state.peakNetWorth >= milestone.at;
          const status = claimed ? 'won' : reached ? 'ready' : 'locked';

          return (
            <div key={milestone.id} class={`life__item life__item--${status}`}>
              <span class="life__dot">
                {reached ? <Art name={milestone.icon} /> : <span class="life__pending" />}
              </span>

              <span class="life__body">
                <span class="life__title">{t(`life.${milestone.id}`)}</span>
                <span class="life__line">
                  {reached
                    ? t(`life.${milestone.id}.line`)
                    : t('life.locked', { amount: money(milestone.at) })}
                </span>
                <span class="life__bonus">{describeBonus(milestone.bonus)}</span>

                {status === 'ready' && (
                  <button
                    class="btn btn--sm btn--primary"
                    style={{ marginTop: '8px' }}
                    onClick={() => game.claimMilestone(milestone.id)}
                  >
                    {t('life.claim')}
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </section>

      <section class="panel" style={{ padding: '14px', display: 'grid', gap: '12px' }}>
        <span class="section__title" style={{ margin: 0 }}>
          {t('life.language')}
        </span>
        <div class="segments">
          {LANGUAGES.map((language) => (
            <button
              key={language.id}
              aria-pressed={locale() === language.id}
              onClick={() => {
                setLocale(language.id);
                // The store owns the only render loop, so a language change is
                // published the same way a game event is.
                game.refresh();
              }}
            >
              {language.label}
            </button>
          ))}
        </div>

        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {t('life.offlineNote', { hours: derived.bonuses.offlineHours })}
        </span>
        <button
          class="btn btn--wide btn--ghost"
          onClick={() => {
            if (window.confirm(t('life.resetConfirm'))) game.reset();
          }}
        >
          {t('life.reset')}
        </button>
      </section>
    </>
  );
}
