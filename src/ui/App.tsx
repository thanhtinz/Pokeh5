import { useEffect, useRef, useState } from 'preact/hooks';

import { sound } from '../audio/sound';
import { BUSINESSES } from '../game/businesses';
import type { LifeMilestone } from '../game/life';
import { money } from '../game/money';
import { t } from '../i18n';
import { hasManager, ownedOf } from '../game/state';
import { Icon } from './Icon';
import { CityScene } from './Scene';
import { derive } from '../game/store';
import { Hud } from './Hud';
import { NextStep } from './NextStep';
import { adviceShortfall, nextStep } from '../game/advice';
import { CardSheet, IntroSheet, MilestoneSheet, OfflineSheet } from './Overlays';
import { Board } from './screens/Board';
import { Gate } from './screens/Gate';
import { Empire } from './screens/Empire';
import { Grind } from './screens/Grind';
import { Life } from './screens/Life';
import { Market } from './screens/Market';
import { More } from './screens/More';
import { useAccount } from './useAccount';
import { useGame } from './useStore';

type Tab = 'grind' | 'empire' | 'market' | 'life' | 'board' | 'more';

const TABS: readonly { id: Tab; icon: string }[] = [
  { id: 'grind', icon: 'ore' },
  { id: 'empire', icon: 'skyline' },
  { id: 'market', icon: 'chart' },
  { id: 'life', icon: 'heart' },
  { id: 'board', icon: 'board' },
  { id: 'more', icon: 'star' },
];

interface Toast {
  id: number;
  text: string;
}

export function App() {
  const game = useGame();
  const account = useAccount();
  const [tab, setTab] = useState<Tab>('grind');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [celebrated, setCelebrated] = useState<LifeMilestone | null>(null);
  const toastId = useRef(0);

  // Runs after every render, which is also every flush; the queue is normally
  // empty and draining it is a length check.
  useEffect(() => {
    // Tiếng đi trước phần chữ, vì tiếng phải kịp cú bấm vừa rồi còn cái toast
    // thì đằng nào cũng nằm đó hai giây rưỡi.
    for (const cue of game.drainCues()) sound.play(cue);

    const notices = game.drainNotices();
    if (notices.length === 0) return;

    const fresh: Toast[] = [];
    for (const notice of notices) {
      sound.play(notice.kind === 'cash' ? 'cash' : notice.kind === 'info' ? 'info' : 'milestone');

      if (notice.kind === 'milestone') {
        setCelebrated(notice.milestone);
        continue;
      }
      const text =
        notice.kind === 'cash' ? `${notice.label} · ${money(notice.amount)}` : notice.label;
      fresh.push({ id: toastId.current++, text });
    }

    if (fresh.length === 0) return;
    setToasts((current) => [...current, ...fresh].slice(-3));

    const ids = new Set(fresh.map((toast) => toast.id));
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => !ids.has(toast.id))),
      2600,
    );
  });

  // Ba trạng thái trước khi có game, theo đúng thứ tự chúng xảy ra: chưa hỏi
  // xong máy chủ, chưa đăng nhập, và đã đăng nhập mà ván còn đang nạp.
  if (!account.checked) {
    return <div class="boot">{t('ui.boot')}</div>;
  }

  if (!account.signedIn) {
    return <Gate account={account} />;
  }

  if (!game.ready) {
    return <div class="boot">{t('ui.loading')}</div>;
  }

  const now = Date.now();
  const state = game.state;
  const derived = derive(state, now);

  const pips: Record<Tab, boolean> = {
    grind: state.job === null,
    empire: BUSINESSES.some(
      (def) =>
        ownedOf(state, def.id) > 0 &&
        !hasManager(state, def.id) &&
        (state.cycles[def.id] ?? 0) === 0,
    ),
    market: false,
    // Chưa có tài khoản thì chấm một lần cho biết là có chỗ đó, chứ không chấm
    // mãi: một cái chấm đỏ không tắt được là một cái chấm người ta học cách lờ đi.
    board: false,
    life: game.pendingMilestones().length > 0 || derived.pendingReputation > 0,
    // Điểm danh và việc trong ngày là hai thứ đáng chấm nhất trên thanh tab:
    // cả hai đều chỉ có hôm nay.
    more: derived.daily.available || derived.quests.claimable,
  };

  const advice = nextStep(state, {
    netWorth: derived.netWorth,
    spendable: derived.spendable,
    pendingReputation: derived.pendingReputation,
    reputationTotal: state.reputationTotal,
    dailyAvailable: derived.daily.available,
    questClaimable: derived.quests.claimable,
  });

  return (
    <div class="shell">
      {/* Behind everything, and drawn by the same value the palette runs on. */}
      <CityScene />

      <Hud state={state} derived={derived} now={now} />

      {/* Nằm giữa phần đầu và phần thân, tức là trên mọi màn. Đây là chỗ duy
          nhất trả lời được câu "giờ bấm cái gì" cho một người vừa mở app sau
          một ngày vắng — sáu tab kia màn nào cũng chỉ nói về phần của mình. */}
      <NextStep
        advice={advice}
        shortfall={adviceShortfall(advice, state, derived.spendable)}
        onGo={() => setTab(advice.tab)}
      />

      <main class="screen scroll">
        {tab === 'grind' && <Grind game={game} state={state} derived={derived} now={now} />}
        {tab === 'empire' && <Empire game={game} state={state} derived={derived} />}
        {tab === 'market' && <Market game={game} state={state} />}
        {tab === 'life' && <Life game={game} state={state} derived={derived} now={now} />}
        {tab === 'board' && <Board account={account} />}
        {tab === 'more' && <More game={game} state={state} derived={derived} />}
      </main>

      <nav class="tabs">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            class="tab"
            aria-current={tab === entry.id ? 'page' : undefined}
            onClick={() => setTab(entry.id)}
          >
            <Icon class="tab__icon" name={entry.icon} />
            <span>{t(`tab.${entry.id}`)}</span>
            {pips[entry.id] && tab !== entry.id && <span class="tab__pip" />}
          </button>
        ))}
      </nav>

      {toasts.length > 0 && (
        <div class="toasts">
          {toasts.map((toast) => (
            <span key={toast.id} class="toast">
              {toast.text}
            </span>
          ))}
        </div>
      )}

      {/* Trước mọi tấm khác: đây là câu đầu tiên người chơi đọc, và một ván
          mới thì chưa có báo cáo offline hay mốc nào để tranh chỗ. */}
      {!state.introSeen && <IntroSheet onClose={() => game.dismissIntro()} />}

      {state.introSeen && game.offline && (
        <OfflineSheet report={game.offline} onClose={() => game.dismissOffline()} />
      )}

      {celebrated && (
        <MilestoneSheet milestone={celebrated} onClose={() => setCelebrated(null)} />
      )}

      {state.introSeen && !game.offline && !celebrated && state.card && (
        <CardSheet game={game} card={state.card} now={now} />
      )}
    </div>
  );
}
