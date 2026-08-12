import { useState } from 'preact/hooks';
import type { JSX } from 'preact';

import { num } from '../game/format';
import { stageAt } from '../game/realms';
import { store } from '../game/store';
import { useStore } from './store-hook';

import { CultivateScreen } from './screens/Cultivate';
import { LoadoutScreen } from './screens/Loadout';
import { TrialsScreen } from './screens/Trials';
import { ChaptersScreen } from './screens/Chapters';
import { SectScreen } from './screens/Sect';
import { OfflineDialog } from './screens/OfflineDialog';

export type Tab = 'sect' | 'roam' | 'cultivate' | 'trials' | 'story';

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: 'sect', label: 'Tông Môn', glyph: '門' },
  { id: 'roam', label: 'Công Pháp', glyph: '法' },
  { id: 'cultivate', label: 'Tu Luyện', glyph: '修' },
  { id: 'trials', label: 'Lịch Luyện', glyph: '煉' },
  { id: 'story', label: 'Cốt Truyện', glyph: '道' },
];

export function App(): JSX.Element {
  const state = useStore();
  const [tab, setTab] = useState<Tab>('cultivate');
  const [offlineShown, setOfflineShown] = useState(false);

  const stage = stageAt(state.stage);
  const showOffline = store.pendingOffline !== null && !offlineShown;

  return (
    <div class="frame grain">
      <header class="header">
        <div class="header-top">
          <div class="avatar">
            <span>{stage.realm.han.slice(0, 1)}</span>
          </div>
          <div class="col">
            <span class="header-name">{state.name}</span>
            <span class="header-realm">{stage.label}</span>
          </div>

          <div class="purse">
            <span class="coin stone">
              <i />
              <b class="num">{num(state.linhThach)}</b>
            </span>
            <span class="coin jade">
              <i />
              <b class="num">{num(state.tienNgoc)}</b>
            </span>
            <span class="coin book">
              <i />
              <b class="num">{num(state.biKip)}</b>
            </span>
          </div>
        </div>

        <div class="header-power">
          <span class="faint">Lực chiến</span>
          <b class="num">{num(store.power())}</b>
          {state.cycles > 0 ? (
            <span class="jade-text" style={{ marginLeft: 'auto', fontSize: '11px' }}>
              Luân hồi ×{state.cycles}
            </span>
          ) : null}
        </div>
      </header>

      <div class="stage">
        {tab === 'cultivate' ? <CultivateScreen onNavigate={setTab} /> : null}
        {tab === 'roam' ? <LoadoutScreen /> : null}
        {tab === 'trials' ? <TrialsScreen /> : null}
        {tab === 'story' ? <ChaptersScreen /> : null}
        {tab === 'sect' ? <SectScreen /> : null}
      </div>

      <nav class="nav">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            class={`nav-item${tab === entry.id ? ' on' : ''}`}
            onClick={() => setTab(entry.id)}
          >
            <span class="glyph">{entry.glyph}</span>
            <span>{entry.label}</span>
          </button>
        ))}
      </nav>

      {showOffline ? <OfflineDialog onClose={() => setOfflineShown(true)} /> : null}
    </div>
  );
}
