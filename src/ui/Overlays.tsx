import { CARD_LIFETIME } from '../game/jobs';
import { describeBonus, type LifeMilestone } from '../game/life';
import { count, duration, money } from '../game/money';
import type { PendingCard } from '../game/state';
import type { OfflineReport, Store } from '../game/store';
import { t } from '../i18n';
import { Art } from './Art';
import { Sunburst } from './Scene';

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
            <Art name={card.icon} />
          </span>
          <span class="sheet__head-text">
            <span class="sheet__title">{t(`card.${card.key}`)}</span>
            <span class="sheet__sub">{t('card.header', { seconds: Math.ceil(left) })}</span>
          </span>
        </div>

        <p class="sheet__body">{t(`card.${card.key}.flavour`)}</p>
        <strong class="sheet__prize num">{prize(card)}</strong>

        <div class="sheet__actions">
          <button class="btn btn--ghost" onClick={() => game.dismissCard()}>
            {t('card.pass')}
          </button>
          <button class="btn btn--primary" onClick={() => game.takeCard()}>
            {t('card.take')}
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
      return t('card.boost', { multiplier: card.value, seconds: Math.round(card.seconds) });
    case 'ore':
      return t('card.oreGift', { amount: count(card.value) });
    case 'gamble':
      return t('card.gamble', { amount: money(card.value * 2) });
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
      <div class="sheet sheet--art" onClick={(event) => event.stopPropagation()}>
        {/* The one screen in the game that is allowed to be only a picture. */}
        <div class="sheet__art">
          <Sunburst />
          <span class="sheet__art-icon">
            <Art name={milestone.icon} />
          </span>
        </div>

        <span class="sheet__title">{t(`life.${milestone.id}`)}</span>
        <p class="sheet__body sheet__body--art">{t(`life.${milestone.id}.line`)}</p>
        <span class="sheet__won">{describeBonus(milestone.bonus)}</span>

        <div class="sheet__actions">
          <button class="btn btn--primary" onClick={onClose}>
            {t('milestone.keepGoing')}
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
            <Art name="moon" />
          </span>
          <span class="sheet__head-text">
            <span class="sheet__title">{t('offline.title')}</span>
            <span class="sheet__sub">{t('offline.away', { duration: duration(report.seconds) })}</span>
          </span>
        </div>

        <strong class="sheet__prize num">{money(report.earned)}</strong>
        <p class="sheet__body">
          {t(report.jobsFinished > 0 ? 'offline.bodyJob' : 'offline.body')}
        </p>

        <div class="sheet__actions">
          <button class="btn btn--primary" onClick={onClose}>
            {t('offline.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
