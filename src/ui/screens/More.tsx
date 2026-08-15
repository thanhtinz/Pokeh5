import { useState } from 'preact/hooks';

import { sound } from '../../audio/sound';
import { ACHIEVEMENTS, nextInLadder } from '../../game/achievements';
import { CYCLE, REWARD_SECONDS } from '../../game/daily';
import { ledgerOf, type LedgerLine } from '../../game/ledger';
import { clock, count, money, rate } from '../../game/money';
import { PERKS, describePerk, perkCost } from '../../game/perks';
import { QUEST_BONUS_REPUTATION } from '../../game/quests';
import { perkLevel, type PlayerState } from '../../game/state';
import type { Derived, Store } from '../../game/store';
import { t } from '../../i18n';
import { Art } from '../Art';
import { Icon } from '../Icon';
import { Transfer } from '../Transfer';

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

  const left = derived.quests.quests.filter((quest) => !quest.claimed).length;

  return (
    <>
      {/* Trên cùng vì nó là thứ duy nhất ở màn này có giờ đóng cửa. Mọi mục
          khác mở lúc nào cũng còn đó; phiên chợ thì không. */}
      <Fair game={game} derived={derived} />

      {/* ---------------------------------------------------- việc hôm nay -- */}
      <section class="panel panel--inset">
        <div class="prestige__head">
          <span class="section__title" style={{ margin: 0 }}>
            {t('quest.title')}
          </span>
          <span class="prestige__bonus num">
            {left > 0 ? t('quest.left', { count: left }) : t('quest.allDone')}
          </span>
        </div>

        {derived.quests.quests.map(({ def, done, complete, claimed }) => (
          <div key={def.id} class={`row${complete && !claimed ? ' row--lit' : ''}`}>
            <span class="row__icon">
              <Art name={QUEST_ART[def.metric] ?? 'coin'} />
            </span>
            <span class="row__body">
              <span class="row__name">{t(`goal.${def.metric}`, { target: count(def.target) })}</span>
              <span class="row__meta">
                {t('ach.progress', { current: count(done), target: count(def.target) })}
              </span>
            </span>
            <span class="row__side">
              {claimed ? (
                <span class="row__meta">{t('quest.claimed')}</span>
              ) : (
                <button
                  class={`btn btn--sm${complete ? ' btn--primary' : ''}`}
                  disabled={!complete}
                  onClick={() => game.claimQuest(def.id)}
                >
                  {t('quest.claim')}
                </button>
              )}
            </span>
            <span class="row__bar bar">
              <span class="bar__fill" style={{ width: `${(done / def.target) * 100}%` }} />
            </span>
          </div>
        ))}

        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {t('quest.bonus', { amount: QUEST_BONUS_REPUTATION })}
        </span>
      </section>

      {/* ------------------------------------------------------- điểm danh -- */}
      <section class="panel panel--inset daily">
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
      <section class="panel panel--inset prestige">
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

      <Books state={state} derived={derived} />

      {/* Ngay trên công tắc tiếng: cả hai đều là "chuyện của cái máy này" chứ
          không phải chuyện trong game, nên chúng đứng cùng nhau ở cuối màn. */}
      <Transfer game={game} ownerId={state.ownerId} />

      <Settings />
    </>
  );
}

/**
 * Phiên chợ.
 *
 * Hai hình dạng, không phải một hình dạng có nút mờ đi: **đang mở** thì đây là
 * một cái thang bốn nấc kèm đồng hồ đếm ngược, **đang nghỉ** thì nó chỉ còn một
 * dòng nói phiên sau là món gì và còn bao lâu. Vẽ cái thang xám xịt trong lúc
 * chợ nghỉ thì người chơi phải đọc cả khối mới hiểu là chưa làm gì được — mà
 * câu trả lời cho lúc đó chỉ dài một dòng.
 */
function Fair({ game, derived }: { game: Store; derived: Derived }) {
  const { window: phien, points, reached, claimed, claimable, next } = derived.fair;
  const def = phien.def;
  const tiers = def.tiers;

  if (!phien.open) {
    return (
      <section class="panel panel--inset">
        <div class="prestige__head">
          <span class="section__title" style={{ margin: 0 }}>
            {t('fair.title')}
          </span>
          <span class="prestige__bonus num">{t('fair.closed', { time: clock(phien.seconds) })}</span>
        </div>
        <span class="row__meta" style={{ whiteSpace: 'normal' }}>
          {t('fair.shut')} · {t('fair.next', { name: t(`fair.${phien.nextDef.id}`) })}
        </span>
      </section>
    );
  }

  // Hết thang thì thanh đầy và mốc là nấc cuối — chia cho `next.points` khi
  // `next` là null là một `NaN` chảy thẳng vào thuộc tính `width`.
  const target = next?.points ?? tiers[tiers.length - 1]!.points;

  return (
    <section class="panel panel--inset">
      <div class="prestige__head">
        <span class="section__title" style={{ margin: 0 }}>
          {t('fair.title')}
        </span>
        <span class="prestige__bonus num">{t('fair.open', { time: clock(phien.seconds) })}</span>
      </div>

      <div class={`row${claimable ? ' row--lit' : ''}`}>
        <span class="row__icon">
          <Art name={FAIR_ART[def.id] ?? 'coin'} />
        </span>
        <span class="row__body">
          <span class="row__name">{t(`fair.${def.id}`)}</span>
          <span class="row__meta">{t(`fair.buff.${def.id}`)}</span>
        </span>
        <span class="row__side">
          <button
            class={`btn btn--sm${claimable ? ' btn--primary' : ''}`}
            disabled={!claimable}
            onClick={() => game.claimFair()}
          >
            {claimed >= tiers.length ? t('fair.maxed') : t('fair.claim')}
          </button>
        </span>
        <span class="row__bar bar">
          <span class="bar__fill" style={{ width: `${Math.min(100, (points / target) * 100)}%` }} />
        </span>
      </div>

      <span class="row__meta">
        {t(`fair.goal.${def.id}`)} {t('ach.progress', { current: count(points), target: count(target) })}{' '}
        · {t('fair.tier', { index: Math.min(reached + 1, tiers.length), total: tiers.length })}
      </span>

      <span class="row__meta" style={{ whiteSpace: 'normal' }}>
        {t('fair.note')}
      </span>
    </section>
  );
}

/**
 * Sổ sách: hai cột, và cái ranh giới giữa chúng là nội dung.
 *
 * Cột trái về mốc đầu mỗi lần làm lại, cột phải thì không bao giờ tụt. Người
 * chơi ở lượt thứ tư nhìn một con số mà không biết nó thuộc loại nào thì con số
 * ấy không nói được gì; đặt cạnh nhau thì mỗi bên tự giải thích bên kia.
 *
 * Việc chia dòng nào về cột nào nằm ở `game/ledger.ts` — đó là một luật, và là
 * luật sai lặng lẽ nếu xếp nhầm. Chỗ này chỉ dịch id ra chữ và số ra định dạng.
 */
function Books({ state, derived }: { state: PlayerState; derived: Derived }) {
  const books = ledgerOf(state, {
    income: derived.income,
    pendingReputation: derived.pendingReputation,
    // Không lấy `now` từ trên xuống: thứ duy nhất cần nó là số ngày đã mở sổ,
    // và một con số đo bằng ngày thì không quan tâm màn hình vẽ lại lúc nào.
    now: Date.now(),
  });

  return (
    <section class="panel panel--inset">
      <div class="prestige__head">
        <span class="section__title" style={{ margin: 0 }}>
          {t('ledger.title')}
        </span>
      </div>

      <div class="books">
        <Column title={t('ledger.run')} lines={books.run} />
        <Column title={t('ledger.life')} lines={books.life} />
      </div>

      <span class="row__meta" style={{ whiteSpace: 'normal' }}>
        {t('ledger.note')}
      </span>
    </section>
  );
}

function Column({ title, lines }: { title: string; lines: LedgerLine[] }) {
  return (
    <div class="books__col">
      <span class="books__head">{title}</span>
      {lines.map((line) => (
        <span key={line.id} class="stat">
          <span class="stat__label">{t(`ledger.${line.id}`)}</span>
          <span class="stat__value num">{figure(line)}</span>
        </span>
      ))}
    </div>
  );
}

/** Một dòng sổ đọc ra chữ. Kiểu nằm trong dữ liệu, nên chỗ này không phải đoán. */
function figure(line: LedgerLine): string {
  switch (line.kind) {
    case 'money':
      return money(line.value);
    case 'rate':
      return rate(line.value);
    case 'days':
      return t('ledger.dayCount', { days: count(Math.floor(line.value)) });
    default:
      return count(line.value);
  }
}

/**
 * Cái công tắc duy nhất của game.
 *
 * Nằm cuối màn Thêm chứ không nằm trên đầu: người chơi đi tìm nút tắt tiếng
 * đúng một lần trong đời, còn ba thứ ở trên thì mở ra là để xem.
 *
 * `useState` ở đây không giữ trạng thái — trạng thái nằm trong `sound`, vì
 * tiếng còn kêu cả ở những màn không có cái nút này. Nó chỉ để bắt Preact vẽ
 * lại sau khi bấm.
 */
function Settings() {
  const [, redraw] = useState(0);
  const on = !sound.muted;

  return (
    <section class="panel panel--inset">
      <div class="prestige__head">
        <span class="section__title" style={{ margin: 0 }}>
          {t('sound.title')}
        </span>
        <button
          class={`btn btn--sm ${on ? 'btn--primary' : ''}`}
          onClick={() => {
            sound.toggle();
            redraw((n) => n + 1);
            // Bật lên thì kêu một tiếng ngay: đó là câu trả lời cho "bật rồi
            // thì nghe thế nào", và nó cũng là cú chạm mở khoá âm thanh của
            // trình duyệt.
            if (!sound.muted) sound.play('buy');
          }}
        >
          {on ? t('sound.on') : t('sound.off')}
        </button>
      </div>

      <span class="row__meta" style={{ whiteSpace: 'normal' }}>
        {t('sound.note')}
      </span>
    </section>
  );
}

/** Phiên chợ mượn asset của thứ nó bắt làm, y như việc trong ngày. */
const FAIR_ART: Record<string, string> = {
  // Cố ý **không** trùng hình với hàng việc hôm nay ngay bên dưới, dù hai bên
  // cùng đếm một số đếm: hai hàng giống hệt nhau xếp chồng lên nhau thì mắt đọc
  // ra một danh sách, không đọc ra hai mục khác nhau.
  dawn: 'cart',
  hiring: 'briefcase',
  lucky: 'dice',
  opening: 'flower',
};

/** Việc trong ngày cũng mượn asset của thứ nó bắt người chơi đi làm. */
const QUEST_ART: Record<string, string> = {
  taps: 'ore',
  cards: 'coins',
  jobs: 'flyer',
  trades: 'chart',
  units: 'boxes',
  upgrades: 'gear',
};

/** Đặc quyền mượn asset của thứ nó tác động, khỏi phải vẽ thêm sáu cái. */
const PERK_ART: Record<string, string> = {
  offline: 'moon',
  tap: 'ore',
  speed: 'gear',
  card: 'coins',
  credit: 'vault',
  seed: 'wallet',
};
