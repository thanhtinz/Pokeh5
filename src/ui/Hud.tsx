import { MILESTONES } from '../game/life';
import { money, rate, clock } from '../game/money';
import { STARTING_BALANCE, type PlayerState } from '../game/state';
import type { Derived } from '../game/store';

interface Props {
  state: PlayerState;
  derived: Derived;
  now: number;
}

/**
 * The balance, and how far it still has to climb.
 *
 * The headline number is the balance rather than net worth, because the balance
 * is the wound — it opens at minus a million and the player watches it. Net
 * worth sits underneath it as the quieter, truer figure.
 */
export function Hud({ state, derived, now }: Props) {
  const next = MILESTONES.find((milestone) => derived.netWorth < milestone.at);
  const previous = next
    ? (MILESTONES[MILESTONES.indexOf(next) - 1]?.at ?? STARTING_BALANCE)
    : STARTING_BALANCE;

  const span = next ? next.at - previous : 1;
  const progress = next ? Math.min(1, Math.max(0, (derived.netWorth - previous) / span)) : 1;

  const boostLeft = state.boost ? (state.boost.endsAt - now) / 1000 : 0;

  return (
    <header class="hud">
      <span class="hud__label">Balance</span>
      <strong class={`hud__cash num${state.cash < 0 ? ' hud__cash--debt' : ''}`}>
        {money(state.cash)}
      </strong>

      <div class="hud__stats">
        <span class="stat">
          <span class="stat__label">Net worth</span>
          {/* Cash plus assets: the number that decides what comes back. */}
          <b class="stat__value num">{money(derived.netWorth)}</b>
        </span>
        <span class="stat">
          <span class="stat__label">Automated</span>
          {/* Only what runs unattended, so hiring a manager visibly moves it. */}
          <b class="stat__value num">{rate(derived.income)}</b>
        </span>
        <span class="stat">
          <span class="stat__label">Credit</span>
          <b class="stat__value num">{money(derived.spendable)}</b>
        </span>
      </div>

      {state.boost && boostLeft > 0 && (
        <div class="hud__boost">
          <span>×{state.boost.multiplier}</span>
          <span class="num">{clock(boostLeft)}</span>
        </div>
      )}

      <div class="hud__next">
        <span>{next ? next.title : 'Nothing left to buy back'}</span>
        <div class="bar">
          <div class="bar__fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </header>
  );
}
