import { ACHIEVEMENTS, nextInLadder } from '../../game/achievements';
import { CYCLE, REWARD_SECONDS } from '../../game/daily';
import { count, money } from '../../game/money';
import { PERKS, describePerk, perkCost } from '../../game/perks';
import { perkLevel, type PlayerState } from '../../game/state';
import type { Derived, Store } from '../../game/store';
import { t } from '../../i18n';
import { Art } from '../Art';
import { Icon } from '../Icon';

interface Props {
  game: Store;
  state: PlayerState;
  derived: Derived;
}

/**
 * Ba thứ giữ người chơi quay lại, gom một chỗ.
 *
 * Điểm danh là lý do mở app hôm nay, thành tựu là cái đuôi dài luôn còn một ô
 * chưa tích, đổi uy tín là chỗ mỗi lượt chơi đi một hướng khác. Cả ba đều
 * không thuộc vòng lặp kiếm tiền, nên nhét vào ba màn kia thì màn nào cũng dài
 * ra mà chẳng màn nào nhận.
 */
export function More({ game, state, derived }: Props) {
  const done = ACHIEVEMENTS.filter((achievement) => state.achievements.includes(achievement.id));
  const upNext = nextInLadder(derived.metrics, state.achievements);

  return (
    <>
      {/* ------------------------------------------------------- điểm danh -- */}
      <section class="panel daily">
        <div class="prestige__head">
          <span class="section__title" style={{ margin: 0 }}>
            {t('daily.title')}
          </span>
          <span class="prestige__bonus num">
            {t('daily.streak', { days: count(derived.daily.streak) })}
          </span>
        </div>

        <div class="daily__row">
          {REWARD_SECONDS.map((_, index) => {
            const passed = index < derived.daily.day;
            const today = index === derived.daily.day;
            return (
              <span
                key={index}
                class={`daily__cell${passed ? ' daily__cell--done' : ''}${
                  today && derived.daily.available ? ' daily__cell--today' : ''
                }`}
              >
                <span class="daily__day">{index + 1}</span>
              </span>
            );
          })}
        </div>

        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {t('daily.note')}
        </span>

        <button
          class={`btn btn--wide${derived.daily.available ? ' btn--primary' : ''}`}
          disabled={!derived.daily.available}
          onClick={() => game.claimDaily()}
        >
          {derived.daily.available
            ? `${t('daily.claim')} · ${t('daily.day', { day: (derived.daily.day % CYCLE) + 1 })}`
            : t('daily.done')}
        </button>
      </section>

      {/* ------------------------------------------------------ đổi uy tín -- */}
      <section class="panel prestige">
        <div class="prestige__head">
          <span class="section__title" style={{ margin: 0 }}>
            {t('perk.title')}
          </span>
          <span class="prestige__bonus num">
            {t('perk.balance', { amount: count(state.reputation) })}
          </span>
        </div>

        {PERKS.map((perk) => {
          const level = perkLevel(state, perk.id);
          const maxed = level >= perk.max;
          const cost = perkCost(perk, level);
          const step = describePerk(perk.id, level);

          return (
            <div key={perk.id} class="row">
              <span class="row__icon">
                <Art name={PERK_ART[perk.id] ?? 'coin'} />
              </span>
              <span class="row__body">
                <span class="row__name">{t(`perk.${perk.id}`)}</span>
                <span class="row__meta">
                  {t('perk.level', { level, max: perk.max })} ·{' '}
                  {perk.id === 'seed' ? money(Number(step.current)) : step.current}
                  {!maxed &&
                    ` → ${perk.id === 'seed' ? money(Number(step.next)) : step.next}`}
                </span>
              </span>
              <span class="row__side">
                <button
                  class={`btn btn--sm${!maxed && state.reputation >= cost ? ' btn--primary' : ''}`}
                  disabled={maxed || state.reputation < cost}
                  onClick={() => game.buyPerk(perk.id)}
                >
                  {maxed ? t('perk.maxed') : t('perk.buy', { cost: count(cost) })}
                </button>
              </span>
            </div>
          );
        })}
      </section>

      {/* ------------------------------------------------------- thành tựu -- */}
      <section>
        <h2 class="section__title">
          <span>{t('ach.title')}</span>
          <span class="num">
            {t('ach.count', { done: done.length, total: ACHIEVEMENTS.length })} ·{' '}
            {t('ach.bonus', { multiplier: derived.achievementMultiplier.toFixed(2) })}
          </span>
        </h2>

        {/* Ô sắp tích của mỗi nhánh lên trên: đó mới là thứ kéo người chơi đi
            tiếp, chứ không phải một danh sách bốn mươi ô đã xong. */}
        {upNext.map((achievement) => {
          const current = derived.metrics[achievement.metric];
          return (
            <div key={achievement.id} class="row">
              <span class="row__icon">
                <Icon name="lock" />
              </span>
              <span class="row__body">
                <span class="row__name">{t(`ach.${achievement.id}`)}</span>
                <span class="row__meta">
                  {achievement.metric === 'best'
                    ? `${money(current)} / ${money(achievement.target)}`
                    : t('ach.progress', {
                        current: count(Math.min(current, achievement.target)),
                        target: count(achievement.target),
                      })}
                </span>
              </span>
              <span class="row__side">
                <span class="row__bar bar" style={{ width: '54px' }}>
                  <span
                    class="bar__fill"
                    style={{
                      width: `${Math.min(100, (current / achievement.target) * 100 || 0)}%`,
                    }}
                  />
                </span>
              </span>
            </div>
          );
        })}

        {done.length > 0 && (
          <>
            <h2 class="section__title" style={{ marginTop: '14px' }}>
              <span>{t('ach.done')}</span>
            </h2>
            <div class="ach__grid">
              {done.map((achievement) => (
                <span key={achievement.id} class="ach__chip">
                  {t(`ach.${achievement.id}`)}
                </span>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

/** Đặc quyền mượn asset của thứ nó tác động, khỏi phải vẽ thêm sáu cái. */
const PERK_ART: Record<string, string> = {
  offline: 'moon',
  tap: 'ore',
  speed: 'gear',
  card: 'coins',
  credit: 'vault',
  seed: 'wallet',
};
