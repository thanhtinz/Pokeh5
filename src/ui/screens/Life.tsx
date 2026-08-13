import { MILESTONES, describeBonus } from '../../game/life';
import { count, duration, money } from '../../game/money';
import { PRESTIGE_UNLOCK } from '../../game/prestige';
import { RIVALS, type RivalDef } from '../../game/rivals';
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

/** Bao nhiêu người hiện ở mỗi phía của mình. */
const AROUND = 3;

/**
 * Khúc bảng quanh chỗ mình đứng, xếp từ trên xuống, `null` là chính mình.
 *
 * Ở chót bảng thì phía dưới rỗng và phía trên tự dài ra, nên khung luôn đầy —
 * một danh sách bốn dòng ở lượt đầu rồi bảy dòng về sau trông như đang hỏng.
 */
function nearby(rank: number): (RivalDef | null)[] {
  const above = RIVALS.slice(rank, rank + AROUND);
  const below = RIVALS.slice(Math.max(0, rank - AROUND), rank);
  const pad = AROUND - below.length;

  return [
    ...RIVALS.slice(rank + AROUND, rank + AROUND + pad).reverse(),
    ...above.reverse(),
    null,
    ...below.reverse(),
  ];
}

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
            <b class="stat__value num">{money(state.bestNetWorth)}</b>
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

      {/* ---------------------------------------------------- bảng người ta -- */}
      <section class="panel board">
        <div class="prestige__head">
          <span class="section__title" style={{ margin: 0 }}>
            {t('rival.title')}
          </span>
          <span class="prestige__bonus num">
            {t('rival.rank', { rank: derived.rivals.rank, total: RIVALS.length })}
          </span>
        </div>

        {/* Ba người trên đầu, mình, rồi ba người vừa qua mặt. Cả bảng hai mươi
            bốn dòng thì thành một danh sách phải cuộn, mà thứ người chơi cần
            biết chỉ là mình đang kẹp giữa những ai. */}
        <div class="board__list">
          {nearby(derived.rivals.rank).map((rival) =>
            rival === null ? (
              <div key="you" class="board__row board__row--you">
                {/* Cột số là chỗ đứng của người ta trên bảng, mà mình thì nằm
                    *giữa* hai chỗ đứng. Hạng của mình đã có ở đầu khung rồi. */}
                <span class="board__rank" />

                <span class="board__body">
                  <span class="board__name">{t('rival.you')}</span>
                  <span class="board__job num">{money(state.peakNetWorth)}</span>
                </span>
              </div>
            ) : (
              <div
                key={rival.id}
                class={`board__row${
                  state.peakNetWorth >= rival.at ? ' board__row--under' : ''
                }`}
              >
                <span class="board__rank num">{RIVALS.indexOf(rival) + 1}</span>
                <span class="board__body">
                  <span class="board__name">{t(`rival.${rival.id}`)}</span>
                  <span class="board__job">{t(`rival.${rival.id}.job`)}</span>
                </span>
                <span class="board__worth num">{money(rival.at)}</span>
              </div>
            ),
          )}
        </div>

        <span class="bar">
          <span class="bar__fill" style={{ width: `${derived.rivals.progress * 100}%` }} />
        </span>
        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {derived.rivals.next === null
            ? t('rival.top')
            : t('rival.next', {
                amount: money(Math.max(0, derived.rivals.next.at - state.peakNetWorth)),
              })}
        </span>
      </section>

      <section class="life">
        {MILESTONES.map((milestone) => {
          const claimed = state.claimed.includes(milestone.id);
          // Đã chuộc rồi thì mãi mãi là của mình — làm lại không lấy đi được,
          // nên đừng đọc mỗi đỉnh của lượt đang chơi.
          const reached = claimed || state.peakNetWorth >= milestone.at;
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

      <section class="panel prestige">
        <div class="prestige__head">
          <span class="section__title" style={{ margin: 0 }}>
            {t('prestige.title')}
          </span>
          <span class="prestige__bonus num">
            {t('prestige.bonus', { multiplier: derived.reputationMultiplier.toFixed(2) })}
          </span>
        </div>

        <div class="market__summary" style={{ padding: 0 }}>
          <span class="stat">
            <span class="stat__label">{t('prestige.rep')}</span>
            <b class="stat__value num">{count(state.reputation)}</b>
          </span>
          <span class="stat">
            <span class="stat__label">{t('prestige.runs')}</span>
            <b class="stat__value num">{count(state.runs)}</b>
          </span>
          <span class="stat">
            <span class="stat__label">{t('prestige.record')}</span>
            <b class="stat__value num">{money(state.bestNetWorth)}</b>
          </span>
        </div>

        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {t('prestige.note')}
        </span>

        {derived.pendingReputation > 0 ? (
          <button
            class="btn btn--wide btn--primary"
            onClick={() => {
              const amount = count(derived.pendingReputation);
              if (window.confirm(t('prestige.confirm', { amount }))) game.prestige();
            }}
          >
            {t('prestige.title')} · +{count(derived.pendingReputation)} {t('prestige.rep')}
          </button>
        ) : (
          <button class="btn btn--wide" disabled>
            {state.bestNetWorth < PRESTIGE_UNLOCK
              ? t('prestige.locked', { amount: money(PRESTIGE_UNLOCK) })
              : t('prestige.wait')}
          </button>
        )}
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
