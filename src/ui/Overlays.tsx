import { CARD_LIFETIME } from '../game/jobs';
import { describeBonus, type LifeMilestone } from '../game/life';
import { count, duration, money } from '../game/money';
import type { PendingCard } from '../game/state';
import type { OfflineReport, Store } from '../game/store';
import { Icon } from './Icon';

/**
 * An offer with a clock on it. The bar is the point — a card the player watches
 * expire is a better teacher than any tutorial about acting quickly.
 */
export function CardSheet({ game, card, now }: { game: Store; card: PendingCard; now: number }) {
  const left = Math.max(0, (card.expiresAt - now) / 1000);
  const fraction = left / CARD_LIFETIME;

  return (
    <div class="scrim" onClick={() => game.dismissCard()}>
      <div class="sheet" onClick={(event) => event.stopPropagation()}>
        <div class="sheet__head">
          <span class="sheet__icon">
            <Icon name={card.icon} />
          </span>
          <span class="sheet__head-text">
            <span class="sheet__title">{card.title}</span>
            <span class="sheet__sub">Opportunity · {Math.ceil(left)}s left</span>
          </span>
        </div>

        <p class="sheet__body">{card.flavour}</p>
        <strong class="sheet__prize num">{prize(card)}</strong>

        <div class="sheet__actions">
          <button class="btn btn--ghost" onClick={() => game.dismissCard()}>
            Walk away
          </button>
          <button class="btn btn--primary" onClick={() => game.takeCard()}>
            Take it
          </button>
        </div>

        <div class="bar sheet__timer">
          <div class="bar__fill" style={{ width: `${fraction * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function prize(card: PendingCard): string {
  switch (card.kind) {
    case 'multiplier':
      return `×${card.value} for ${Math.round(card.seconds)}s`;
    case 'ore':
      return `${count(card.value)} taps of ore`;
    case 'gamble':
      return `${money(card.value * 2)} or nothing`;
    default:
      return money(card.value);
  }
}

/** The beat the whole game is built around: something comes back. */
export function MilestoneSheet({
  milestone,
  onClose,
}: {
  milestone: LifeMilestone;
  onClose: () => void;
}) {
  return (
    <div class="scrim scrim--centre" onClick={onClose}>
      <div class="sheet" onClick={(event) => event.stopPropagation()}>
        <div class="sheet__head">
          <span class="sheet__icon">
            <Icon name={milestone.icon} />
          </span>
          <span class="sheet__head-text">
            <span class="sheet__title">{milestone.title}</span>
            <span class="sheet__sub">{describeBonus(milestone.bonus)}</span>
          </span>
        </div>

        <p class="sheet__body">{milestone.line}</p>

        <div class="sheet__actions">
          <button class="btn btn--primary" onClick={onClose}>
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfflineSheet({ report, onClose }: { report: OfflineReport; onClose: () => void }) {
  return (
    <div class="scrim scrim--centre" onClick={onClose}>
      <div class="sheet" onClick={(event) => event.stopPropagation()}>
        <div class="sheet__head">
          <span class="sheet__icon">
            <Icon name="moon" />
          </span>
          <span class="sheet__head-text">
            <span class="sheet__title">While you were gone</span>
            <span class="sheet__sub">{duration(report.seconds)} away</span>
          </span>
        </div>

        <strong class="sheet__prize num">{money(report.earned)}</strong>
        <p class="sheet__body">
          The businesses kept running at a reduced rate
          {report.jobsFinished > 0 ? ', and your shift finished' : ''}.
        </p>

        <div class="sheet__actions">
          <button class="btn btn--primary" onClick={onClose}>
            Back to work
          </button>
        </div>
      </div>
    </div>
  );
}
