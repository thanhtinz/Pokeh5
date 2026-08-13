import { useState } from 'preact/hooks';

import {
  BUSINESSES,
  DISTRICTS,
  affordableUnits,
  bulkCost,
  cyclePayout,
  incomePerSecond,
  nextMilestone,
  unitCost,
} from '../../game/businesses';
import { clock, count, money, rate } from '../../game/money';
import { hasManager, ownedOf, type PlayerState } from '../../game/state';
import type { Derived, Store } from '../../game/store';

interface Props {
  game: Store;
  state: PlayerState;
  derived: Derived;
}

type Amount = 1 | 10 | 100 | 'max';

const AMOUNTS: readonly Amount[] = [1, 10, 100, 'max'];

/**
 * How far down the list to show. Everything owned, plus a few rungs above it —
 * enough that there is always something to want, not so much that the list is a
 * wall of numbers the player cannot read yet.
 */
const LOOKAHEAD = 4;

export function Empire({ game, state, derived }: Props) {
  const [amount, setAmount] = useState<Amount>(1);

  let lastOwned = -1;
  BUSINESSES.forEach((def, index) => {
    if (ownedOf(state, def.id) > 0) lastOwned = index;
  });
  const visibleCount = Math.max(LOOKAHEAD, lastOwned + 1 + LOOKAHEAD);

  return (
    <>
      <div class="segments">
        {AMOUNTS.map((option) => (
          <button
            key={String(option)}
            aria-pressed={amount === option}
            onClick={() => setAmount(option)}
          >
            {option === 'max' ? 'MAX' : `×${option}`}
          </button>
        ))}
      </div>

      {DISTRICTS.map((district) => {
        const defs = BUSINESSES.filter(
          (def, index) => def.district === district && index < visibleCount,
        );
        if (defs.length === 0) return null;

        const districtIncome = defs.reduce(
          (sum, def) =>
            sum +
            (hasManager(state, def.id)
              ? incomePerSecond(def, ownedOf(state, def.id), derived.globalMultiplier, 1)
              : 0),
          0,
        );

        return (
          <section key={district}>
            <h2 class="section__title">
              <span>{district}</span>
              <span class="num">{rate(districtIncome)}</span>
            </h2>

            {defs.map((def) => {
              const owned = ownedOf(state, def.id);
              const managed = hasManager(state, def.id);
              const units =
                amount === 'max' ? affordableUnits(def, owned, derived.spendable) : amount;
              const cost = units > 0 ? bulkCost(def, owned, units) : unitCost(def, owned);
              const affordable = units > 0 && game.canAfford(cost);

              const progress = (state.cycles[def.id] ?? 0) / def.cycleSeconds;
              const target = nextMilestone(owned);

              return (
                <div key={def.id} class={`row${affordable ? ' row--lit' : ''}`}>
                  <button
                    class="row__icon"
                    disabled={owned <= 0 || managed || progress > 0}
                    onClick={() => game.runBusiness(def.id)}
                    aria-label={`Run ${def.name}`}
                  >
                    {def.icon}
                  </button>

                  <span class="row__body">
                    {/* The name gets its own line: an owned count appended to it
                        is the first thing an ellipsis eats. */}
                    <span class="row__name">{def.name}</span>
                    <span class="row__meta">
                      {owned > 0
                        ? `×${count(owned)} · ${money(cyclePayout(def, owned, derived.globalMultiplier))} / ${clock(def.cycleSeconds)}${target ? ` · ×2 at ${target}` : ''}`
                        : `${money(def.basePayout * derived.globalMultiplier)} / ${clock(def.cycleSeconds)}`}
                    </span>
                  </span>

                  <span class="row__side">
                    <button
                      class="btn btn--sm btn--primary"
                      disabled={!affordable}
                      onClick={() => game.buyBusiness(def.id, amount)}
                    >
                      {money(cost)}
                      {units > 1 && ` ·${count(units)}`}
                    </button>

                    {owned > 0 &&
                      (managed ? (
                        <span class="row__meta">Automated</span>
                      ) : (
                        <button
                          class="btn btn--sm btn--ghost"
                          disabled={!game.canAfford(def.managerCost)}
                          onClick={() => game.hireManager(def.id)}
                        >
                          Manager {money(def.managerCost)}
                        </button>
                      ))}
                  </span>

                  {owned > 0 && (
                    <span class="row__bar bar">
                      <span class="bar__fill" style={{ width: `${Math.min(1, progress) * 100}%` }} />
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
