import { useState } from 'preact/hooks';

import { count, money, signedPercent } from '../../game/money';
import { holdingOf, type PlayerState } from '../../game/state';
import { portfolioValue, type Store } from '../../game/store';
import { STOCKS, changeOver, priceOf, seriesFor, unrealised } from '../../game/stocks';

interface Props {
  game: Store;
  state: PlayerState;
}

/** A price line with no axes, no labels and no library. */
function Sparkline({ values, rising }: { values: number[]; rising: boolean }) {
  if (values.length < 2) return <svg class="spark-line" viewBox="0 0 100 100" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const d = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / span) * 100;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg class="spark-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} stroke={rising ? 'var(--up)' : 'var(--down)'} />
    </svg>
  );
}

/**
 * Thirty parody tickers would not fit a phone; twelve do, and each one is a
 * different temperament rather than a different name. The manager toggle at the
 * top is the idle half — it trades small while the player is elsewhere.
 */
export function Market({ game, state }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const invested = Object.values(state.holdings).reduce(
    (sum, holding) => sum + holding.shares * holding.avgCost,
    0,
  );
  const value = portfolioValue(state);
  const profit = value - invested;

  return (
    <>
      <section class="panel market__summary">
        <span class="stat">
          <span class="stat__label">Cash</span>
          <b class="stat__value num">{money(Math.max(0, state.cash))}</b>
        </span>
        <span class="stat">
          <span class="stat__label">Portfolio</span>
          <b class="stat__value num">{money(value)}</b>
        </span>
        <span class="stat">
          <span class="stat__label">Profit</span>
          <b class={`stat__value num ${profit >= 0 ? 'up' : 'down'}`}>{money(profit)}</b>
        </span>
      </section>

      <div class="row">
        <span class="row__icon">🤖</span>
        <span class="row__body">
          <span class="row__name">Trading Manager</span>
          <span class="row__meta">Buys the dips, takes profit at +25%</span>
        </span>
        <span class="row__side">
          <button
            class={`btn btn--sm ${state.autoTrader ? 'btn--primary' : ''}`}
            onClick={() => game.toggleAutoTrader()}
          >
            {state.autoTrader ? 'On' : 'Off'}
          </button>
        </span>
      </div>

      <section>
        <h2 class="section__title">
          <span>Market</span>
          <span>{state.cash > 0 ? 'Open' : 'Cash only'}</span>
        </h2>

        {STOCKS.map((stock) => {
          const price = priceOf(state.marketSeed, state.marketTick, stock.id);
          const change = changeOver(state.marketSeed, state.marketTick, stock.id);
          const holding = holdingOf(state, stock.id);
          const expanded = open === stock.id;
          const gain = unrealised(holding, price);

          return (
            <div key={stock.id} class={`row${holding.shares > 0 ? ' row--lit' : ''}`}>
              <button
                class="row__icon"
                style={{ fontSize: '12px', fontWeight: 700 }}
                onClick={() => setOpen(expanded ? null : stock.id)}
                aria-expanded={expanded}
              >
                {stock.ticker.slice(0, 4)}
              </button>

              <span class="row__body" onClick={() => setOpen(expanded ? null : stock.id)}>
                <span class="row__name">{stock.name}</span>
                <span class="row__meta">
                  {holding.shares > 0
                    ? `${count(holding.shares)} shares · ${money(holding.shares * price)}`
                    : stock.sector}
                </span>
              </span>

              <span class="row__side">
                <Sparkline
                  values={seriesFor(state.marketSeed, state.marketTick, stock.id, 24)}
                  rising={change >= 0}
                />
                <span class="num" style={{ fontSize: '12px' }}>
                  {money(price)}{' '}
                  <b class={change >= 0 ? 'up' : 'down'}>{signedPercent(change)}</b>
                </span>
              </span>

              {expanded && (
                <span class="trade">
                  {holding.shares > 0 && (
                    <span class="row__meta">
                      Average {money(holding.avgCost)} ·{' '}
                      <b class={gain >= 0 ? 'up' : 'down'}>{signedPercent(gain)}</b>
                    </span>
                  )}

                  <span class="trade__row">
                    {([0.1, 0.25, 1] as const).map((fraction) => {
                      const shares = game.affordableShares(stock.id, fraction);
                      return (
                        <button
                          key={fraction}
                          class="btn btn--sm btn--primary"
                          disabled={shares <= 0}
                          onClick={() => game.buyStock(stock.id, shares)}
                        >
                          Buy {fraction === 1 ? 'max' : `${fraction * 100}%`}
                        </button>
                      );
                    })}
                  </span>

                  <span class="trade__row">
                    <button
                      class="btn btn--sm"
                      disabled={holding.shares <= 0}
                      onClick={() => game.sellStock(stock.id, holding.shares / 2)}
                    >
                      Sell half
                    </button>
                    <button
                      class="btn btn--sm"
                      disabled={holding.shares <= 0}
                      onClick={() => game.sellStock(stock.id, holding.shares)}
                    >
                      Sell all
                    </button>
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
