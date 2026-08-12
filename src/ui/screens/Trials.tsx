import { useState } from 'preact/hooks';
import type { JSX } from 'preact';

import type { BattleResult, Duelist } from '../../game/battle';
import { TOWERS, isTowerOpen, towerDaysLabel, type TowerId } from '../../game/content';
import { num } from '../../game/format';
import { store } from '../../game/store';
import { DuelView } from './Duel';
import { useStore } from '../store-hook';

interface Fight {
  result: BattleResult;
  opponent: Duelist;
  reward: number;
}

/**
 * Ngũ hành thí luyện — five phase towers plus a chaos tower.
 *
 * The weekday gating is what stops a player from grinding one tower forever:
 * each phase opens on three days, so a week's rotation touches every phase and
 * rewards a build that is not entirely one-note.
 */
export function TrialsScreen(): JSX.Element {
  const state = useStore();
  const [fight, setFight] = useState<Fight | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const challenge = (id: TowerId): void => {
    const outcome = store.fightTower(id);
    if (!outcome) {
      setNote('Tháp này hôm nay chưa mở.');
      window.setTimeout(() => setNote(null), 1800);
      return;
    }
    setFight(outcome);
  };

  return (
    <div class="screen">
      <div class="screen-body scroll">
        <div class="panel card">
          <div class="card-head">
            <i class="seal">煉</i>
            <span class="card-title">Ngũ Hành Thí Luyện</span>
          </div>
          <span class="faint" style={{ fontSize: '11.5px' }}>
            Mỗi tháp mở ba ngày trong tuần. Vượt tầng nhận linh thạch và tiên ngọc; càng lên cao đối
            thủ càng mạnh.
          </span>
        </div>

        <div class="tower-grid">
          {TOWERS.map((tower) => {
            const open = isTowerOpen(tower);
            const floor = state.towers[tower.id];

            return (
              <button
                class={`panel tower${open ? '' : ' shut'}`}
                key={tower.id}
                onClick={() => challenge(tower.id)}
              >
                <div class={`tower-han ${tower.css}`}>
                  <span>{tower.han}</span>
                </div>
                <div class="col grow" style={{ gap: '2px', alignItems: 'flex-start' }}>
                  <span class="slot-name" style={{ fontSize: '13px' }}>
                    {tower.name}
                  </span>
                  <span class="faint" style={{ fontSize: '10.5px' }}>
                    Tầng {floor}
                  </span>
                  <span
                    class={open ? 'jade-text' : 'cinnabar-text'}
                    style={{ fontSize: '10px' }}
                  >
                    {open ? 'Đang mở' : towerDaysLabel(tower)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div class="panel card">
          <div class="card-head">
            <span class="card-title">Tổng quan</span>
          </div>
          <div class="row" style={{ justifyContent: 'space-between' }}>
            <span class="stat-name">Tổng tầng đã vượt</span>
            <b class="num gold-text">
              {num(TOWERS.reduce((sum, tower) => sum + state.towers[tower.id], 0))}
            </b>
          </div>
          <div class="row" style={{ justifyContent: 'space-between' }}>
            <span class="stat-name">Lực chiến hiện tại</span>
            <b class="num">{num(store.power())}</b>
          </div>
        </div>
      </div>

      {fight ? (
        <DuelView
          result={fight.result}
          self={store.selfDuelist()}
          foe={fight.opponent}
          reward={fight.reward}
          onClose={() => setFight(null)}
        />
      ) : null}

      {note ? (
        <div
          class="panel-dark"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '24px',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            fontSize: '12.5px',
            zIndex: 30,
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
}
