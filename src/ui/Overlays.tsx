import { CARD_LIFETIME } from '../game/jobs';
import { describeBonus, type LifeMilestone } from '../game/life';
import { count, duration, money } from '../game/money';
import { STARTING_BALANCE, type PendingCard } from '../game/state';
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

/**
 * Tấm mở màn, hiện đúng một lần trong đời một tài khoản.
 *
 * Cả game có một luật lạ, và người chơi gặp nó ngay ở giây thứ nhất: đang âm
 * một tỷ mà vẫn mua được cái xe hàng rong. Không phải lỗi — mua bằng **hạn
 * mức**, và hạn mức nới ra theo chỗ đã leo được. Nhưng trên màn hình nó chỉ là
 * chữ "HẠN MỨC" với một con số, và không ai đoán ra từ đó.
 *
 * Nên nói một lần, bằng ba câu, rồi biến. Không có bước hai, không có mũi tên
 * chỉ vào từng nút: phần còn lại của game tự dạy được, chỉ mỗi chỗ này là
 * không.
 */
export function IntroSheet({ onClose }: { onClose: () => void }) {
  return (
    <div class="scrim scrim--centre">
      <div class="sheet" onClick={(event) => event.stopPropagation()}>
        <div class="sheet__head">
          <span class="sheet__icon">
            <Art name="receipt" />
          </span>
          <span class="sheet__head-text">
            <span class="sheet__title">{t('intro.title')}</span>
            <span class="sheet__sub">{money(STARTING_BALANCE)}</span>
          </span>
        </div>

        <p class="sheet__body">{t('intro.debt')}</p>
        <p class="sheet__body">{t('intro.credit')}</p>

        <div class="sheet__actions">
          <button class="btn btn--primary" onClick={onClose}>
            {t('intro.start')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfflineSheet({ report, onClose }: { report: OfflineReport; onClose: () => void }) {
  return (
    <div class="scrim scrim--centre" onClick={onClose}>
      {/* `sheet--offline` không đổi gì về hình. Nó tồn tại để chỉ đúng cái bảng
          này: `.sheet` trần cũng khớp thẻ cơ hội và bảng mốc cuộc đời, nên ảnh
          chụp nhắm vào `.sheet` có hôm bắt trúng cái khác — và một bức ảnh sai
          đối tượng thì tệ hơn không có ảnh, vì nó vẫn xanh. */}
      <div class="sheet sheet--offline" onClick={(event) => event.stopPropagation()}>
        <div class="sheet__head">
          <span class="sheet__icon">
            <Art name="moon" />
          </span>
          <span class="sheet__head-text">
            <span class="sheet__title">{t('offline.title')}</span>
            {/* Thời gian **thật**, không phải thời gian được tính tiền. Trước
                đây hai cái là một, nên vắng hai mươi tiếng với trần tám tiếng
                thì dòng này ghi "Vắng 8 tiếng" — sai mặt thời gian, mà lại còn
                giấu luôn cái trần đi. */}
            <span class="sheet__sub">
              {t('offline.away', { duration: duration(report.awaySeconds) })}
            </span>
          </span>
        </div>

        <strong class="sheet__prize num">{money(report.earned)}</strong>
        <p class="sheet__body">
          {t(report.jobsFinished > 0 ? 'offline.bodyJob' : 'offline.body')}
        </p>

        {/* Chỉ nói khi thật sự bị cắt. Nói cả lúc chưa chạm trần thì nó thành
            một dòng chữ luôn luôn ở đó, và một dòng chữ luôn luôn ở đó thì
            không ai đọc — đúng lúc cần nó nói cũng không ai đọc. */}
        {report.awaySeconds > report.seconds + 60 && (
          <p class="sheet__note">
            {t('offline.capped', {
              paid: duration(report.seconds),
              hours: report.capHours,
            })}
          </p>
        )}

        <div class="sheet__actions">
          <button class="btn btn--primary" onClick={onClose}>
            {t('offline.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
