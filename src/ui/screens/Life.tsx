import { MILESTONES, describeBonus } from '../../game/life';
import { duration, money } from '../../game/money';
import type { PlayerState } from '../../game/state';
import type { Derived, Store } from '../../game/store';

interface Props {
  game: Store;
  state: PlayerState;
  derived: Derived;
  now: number;
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
            <span class="stat__label">Peak</span>
            <b class="stat__value num">{money(state.peakNetWorth)}</b>
          </span>
          <span class="stat">
            <span class="stat__label">Reclaimed</span>
            <b class="stat__value num">
              {state.claimed.length}/{MILESTONES.length}
            </b>
          </span>
          <span class="stat">
            <span class="stat__label">Climbing for</span>
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
              <span class="life__dot">{reached ? milestone.icon : '·'}</span>

              <span class="life__body">
                <span class="life__title">{milestone.title}</span>
                <span class="life__line">
                  {reached ? milestone.line : `At ${money(milestone.at)} net worth`}
                </span>
                <span class="life__bonus">{describeBonus(milestone.bonus)}</span>

                {status === 'ready' && (
                  <button
                    class="btn btn--sm btn--primary"
                    style={{ marginTop: '8px' }}
                    onClick={() => game.claimMilestone(milestone.id)}
                  >
                    Take it back
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </section>

      <section class="panel" style={{ padding: '14px', display: 'grid', gap: '10px' }}>
        <span class="row__meta">
          Offline earnings are capped at {derived.bonuses.offlineHours} hours. The save lives on
          this device and nowhere else.
        </span>
        <button
          class="btn btn--wide btn--ghost"
          onClick={() => {
            if (window.confirm('Wipe the save and start again at minus one million?')) game.reset();
          }}
        >
          Start over
        </button>
      </section>
    </>
  );
}
