import { useEffect, useRef, useState } from 'preact/hooks';

import { BUSINESSES } from '../game/businesses';
import type { LifeMilestone } from '../game/life';
import { money } from '../game/money';
import { t } from '../i18n';
import { hasManager, ownedOf } from '../game/state';
import { Icon } from './Icon';
import { CityScene } from './Scene';
import { derive } from '../game/store';
import { Hud } from './Hud';
import { CardSheet, MilestoneSheet, OfflineSheet } from './Overlays';
import { Empire } from './screens/Empire';
import { Grind } from './screens/Grind';
import { Life } from './screens/Life';
import { Market } from './screens/Market';
import { More } from './screens/More';
import { useGame } from './useStore';

type Tab = 'grind' | 'empire' | 'market' | 'life' | 'more';

const TABS: readonly { id: Tab; icon: string }[] = [
  { id: 'grind', icon: 'ore' },
  { id: 'empire', icon: 'skyline' },
  { id: 'market', icon: 'chart' },
  { id: 'life', icon: 'heart' },
  { id: 'more', icon: 'star' },
];

interface Toast {
  id: number;
  text: string;
}

export function App() {
  const game = useGame();
  const [tab, setTab] = useState<Tab>('grind');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [celebrated, setCelebrated] = useState<LifeMilestone | null>(null);
  const toastId = useRef(0);

  // Runs after every render, which is also every flush; the queue is normally
  // empty and draining it is a length check.
  useEffect(() => {
    const notices = game.drainNotices();
    if (notices.length === 0) return;

    const fresh: Toast[] = [];
    for (const notice of notices) {
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

  if (!game.ready) {
    return <div class="boot">{t('ui.boot')}</div>;
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
    life: game.pendingMilestones().length > 0 || derived.pendingReputation > 0,
    // Điểm danh là thứ đáng chấm nhất trên thanh tab: nó chỉ có hôm nay.
    more: derived.daily.available,
  };

  return (
    <div class="shell">
      {/* Behind everything, and drawn by the same value the palette runs on. */}
      <CityScene />

      <Hud state={state} derived={derived} now={now} />

      <main class="screen scroll">
        {tab === 'grind' && <Grind game={game} state={state} derived={derived} now={now} />}
        {tab === 'empire' && <Empire game={game} state={state} derived={derived} />}
        {tab === 'market' && <Market game={game} state={state} />}
        {tab === 'life' && <Life game={game} state={state} derived={derived} now={now} />}
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

      {game.offline && (
        <OfflineSheet report={game.offline} onClose={() => game.dismissOffline()} />
      )}

      {celebrated && (
        <MilestoneSheet milestone={celebrated} onClose={() => setCelebrated(null)} />
      )}

      {!game.offline && !celebrated && state.card && (
        <CardSheet game={game} card={state.card} now={now} />
      )}
    </div>
  );
}
