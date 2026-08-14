import { JOBS, unlockedJobs } from '../../game/jobs';
import { clock, count, money, rate } from '../../game/money';
import { t } from '../../i18n';
import type { PlayerState } from '../../game/state';
import { Sprite } from '../Sprite';
import { Icon } from '../Icon';
import { TapStage } from '../TapStage';
import {
  refineryUpgradeCost,
  tapUpgradeCost,
  type Derived,
  type Store,
} from '../../game/store';

interface Props {
  game: Store;
  state: PlayerState;
  derived: Derived;
  now: number;
}

/**
 * The refinery and the job board — everything the player does with their hands.
 *
 * This is the whole game for the first few minutes, so it has to feel good
 * before it is efficient. Chỗ chạm nằm hẳn trong `TapStage`: nó có vòng lặp,
 * có vật lý và có nhiệt, và không thứ nào trong ba thứ đó nên trộn chung với
 * cái danh sách công việc bên dưới.
 */
export function Grind({ game, state, derived, now }: Props) {
  const oreFill = Math.min(1, state.ore / derived.oreCapacity);
  const tapCost = tapUpgradeCost(state.tapLevel);
  const refineryCost = refineryUpgradeCost(state.refineryLevel);

  return (
    <>
      <section class="panel refinery">
        <TapStage game={game} derived={derived} />

        <div class="refinery__ore">
          <div class="refinery__ore-row">
            <span>
              {t('grind.ore')} <b class="num">{count(state.ore)}</b> / {count(derived.oreCapacity)}
            </span>
            <span class="num">{rate(derived.refineryIncome)}</span>
          </div>
          <div class="bar bar--tall">
            <div class="bar__fill" style={{ width: `${oreFill * 100}%` }} />
          </div>
          <div class="refinery__ore-row">
            <span>{t('grind.refining', { rate: count(derived.oreRate) })}</span>
            <span>{t('grind.each', { value: money(derived.oreValue) })}</span>
          </div>
        </div>
      </section>

      <div class="upgrades">
        <button
          class={`upgrade${game.canAfford(tapCost) ? ' upgrade--ready' : ''}`}
          disabled={!game.canAfford(tapCost)}
          onClick={() => game.upgradeTap()}
        >
          <span class="upgrade__name">{t('grind.pickaxe')}</span>
          <span class="upgrade__detail">
            {t('grind.pickaxeDetail', { level: state.tapLevel, ore: count(derived.tapOre) })}
          </span>
          <span class="upgrade__cost num">{money(tapCost)}</span>
        </button>

        <button
          class={`upgrade${game.canAfford(refineryCost) ? ' upgrade--ready' : ''}`}
          disabled={!game.canAfford(refineryCost)}
          onClick={() => game.upgradeRefinery()}
        >
          <span class="upgrade__name">{t('grind.refinery')}</span>
          <span class="upgrade__detail">
            {t('grind.refineryDetail', {
              level: state.refineryLevel,
              value: money(derived.oreValue),
            })}
          </span>
          <span class="upgrade__cost num">{money(refineryCost)}</span>
        </button>
      </div>

      <section>
        <h2 class="section__title">
          <span>{t('grind.work')}</span>
          <span>{state.job ? t('grind.onShift') : t('grind.pickShift')}</span>
        </h2>
        {JOBS.map((job) => {
          const unlocked = unlockedJobs(derived.netWorth).includes(job);
          const active = state.job?.jobId === job.id;
          const seconds = job.seconds / derived.bonuses.jobSpeed;
          const left = active ? Math.max(0, (state.job!.endsAt - now) / 1000) : seconds;
          const progress = active ? 1 - left / seconds : 0;

          if (!unlocked) {
            return (
              <div key={job.id} class="row row--locked">
                <span class="row__icon">
                  <Icon name="lock" />
                </span>
                <span class="row__body">
                  <span class="row__name">{t(`job.${job.id}`)}</span>
                  <span class="row__meta">{t('grind.locked', { amount: money(job.unlockAt) })}</span>
                </span>
                <span class="row__side" />
              </div>
            );
          }

          return (
            <div key={job.id} class={`row${active ? ' row--lit' : ''}`}>
              <span class="row__icon">
                <Sprite id={job.id} />
              </span>
              <span class="row__body">
                <span class="row__name">{t(`job.${job.id}`)}</span>
                <span class="row__meta">
                  {active
                    ? t(`job.${job.id}.desc`)
                    : `${clock(seconds)} · ${money(job.payout * derived.globalMultiplier)}`}
                </span>
              </span>
              <span class="row__side">
                {active ? (
                  <span class="num" style={{ fontWeight: 700 }}>
                    {clock(left)}
                  </span>
                ) : (
                  <button
                    class="btn btn--sm btn--primary"
                    disabled={state.job !== null}
                    onClick={() => game.startJob(job.id)}
                  >
                    {t('grind.start')}
                  </button>
                )}
              </span>
              {active && (
                <span class="row__bar bar">
                  <span class="bar__fill" style={{ width: `${progress * 100}%` }} />
                </span>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
