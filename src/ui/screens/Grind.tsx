import { useRef, useState } from 'preact/hooks';

import { JOBS, unlockedJobs } from '../../game/jobs';
import { clock, count, money, rate } from '../../game/money';
import type { PlayerState } from '../../game/state';
import { Icon, OreArt } from '../Icon';
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

interface Spark {
  id: number;
  text: string;
  offset: number;
}

/**
 * The refinery and the job board — everything the player does with their hands.
 *
 * This is the whole game for the first few minutes, so it has to feel good
 * before it is efficient: the tap target is large, responds on pointer-down
 * rather than click, and throws a number every time.
 */
export function Grind({ game, state, derived, now }: Props) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const nextId = useRef(0);

  function onTap() {
    const mined = game.tap();
    const id = nextId.current++;

    setSparks((current) => [
      // Only the last few are ever visible; the rest is memory nobody sees.
      ...current.slice(-5),
      { id, text: `+${count(mined)} ore`, offset: (id % 5) * 14 - 28 },
    ]);
    window.setTimeout(() => setSparks((current) => current.filter((s) => s.id !== id)), 850);
  }

  const oreFill = Math.min(1, state.ore / derived.oreCapacity);
  const tapCost = tapUpgradeCost(state.tapLevel);
  const refineryCost = refineryUpgradeCost(state.refineryLevel);

  return (
    <>
      <section class="panel refinery">
        <button class="refinery__tap" onPointerDown={onTap} aria-label="Mine ore">
          <span class="refinery__face">
            <OreArt />
            <span class="refinery__value num">{money(derived.tapValue)}</span>
            <span class="refinery__hint">per tap</span>
          </span>
          {sparks.map((spark) => (
            <span key={spark.id} class="spark" style={{ marginLeft: `${spark.offset}px` }}>
              {spark.text}
            </span>
          ))}
        </button>

        <div class="refinery__ore">
          <div class="refinery__ore-row">
            <span>
              Ore <b class="num">{count(state.ore)}</b> / {count(derived.oreCapacity)}
            </span>
            <span class="num">{rate(derived.refineryIncome)}</span>
          </div>
          <div class="bar bar--tall">
            <div class="bar__fill" style={{ width: `${oreFill * 100}%` }} />
          </div>
          <div class="refinery__ore-row">
            <span>Refining {count(derived.oreRate)} ore/s</span>
            <span>{money(derived.oreValue)} each</span>
          </div>
        </div>
      </section>

      <div class="upgrades">
        <button
          class={`upgrade${game.canAfford(tapCost) ? ' upgrade--ready' : ''}`}
          disabled={!game.canAfford(tapCost)}
          onClick={() => game.upgradeTap()}
        >
          <span class="upgrade__name">Better Pickaxe</span>
          <span class="upgrade__detail">
            Level {state.tapLevel} · {count(derived.tapOre)} ore per tap
          </span>
          <span class="upgrade__cost num">{money(tapCost)}</span>
        </button>

        <button
          class={`upgrade${game.canAfford(refineryCost) ? ' upgrade--ready' : ''}`}
          disabled={!game.canAfford(refineryCost)}
          onClick={() => game.upgradeRefinery()}
        >
          <span class="upgrade__name">Refinery Upgrade</span>
          <span class="upgrade__detail">
            Level {state.refineryLevel} · {money(derived.oreValue)} per ore
          </span>
          <span class="upgrade__cost num">{money(refineryCost)}</span>
        </button>
      </div>

      <section>
        <h2 class="section__title">
          <span>Work</span>
          <span>{state.job ? 'On shift' : 'Pick a shift'}</span>
        </h2>
        {JOBS.map((job) => {
          const unlocked = unlockedJobs(derived.netWorth).includes(job);
          const active = state.job?.jobId === job.id;
          const seconds = job.seconds / derived.bonuses.jobSpeed;
          const left = active ? Math.max(0, (state.job!.endsAt - now) / 1000) : seconds;
          const progress = active ? 1 - left / seconds : 0;

          if (!unlocked) {
            return (
              <div key={job.id} class="row" style={{ opacity: 0.4 }}>
                <span class="row__icon">
                  <Icon name="lock" />
                </span>
                <span class="row__body">
                  <span class="row__name">{job.name}</span>
                  <span class="row__meta">Unlocks at {money(job.unlockAt)} net worth</span>
                </span>
                <span class="row__side" />
              </div>
            );
          }

          return (
            <div key={job.id} class={`row${active ? ' row--lit' : ''}`}>
              <span class="row__icon">
                <Icon name={job.icon} />
              </span>
              <span class="row__body">
                <span class="row__name">{job.name}</span>
                <span class="row__meta">
                  {active ? job.description : `${clock(seconds)} · ${money(job.payout * derived.globalMultiplier)}`}
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
                    Start
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
