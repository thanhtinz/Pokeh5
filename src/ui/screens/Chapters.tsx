import { useState } from 'preact/hooks';
import type { JSX } from 'preact';

import type { BattleResult, Duelist } from '../../game/battle';
import { chapterAt, MAX_CHAPTER } from '../../game/content';
import { num } from '../../game/format';
import { stageAt } from '../../game/realms';
import { store } from '../../game/store';
import { Meter } from '../parts/Bits';
import { DuelView } from './Duel';
import { useStore } from '../store-hook';

interface Fight {
  result: BattleResult;
  opponent: Duelist;
  reward: number;
}

/**
 * Lịch luyện — the story ladder. Clearing a chapter raises the passive spirit
 * stone rate, so story progress is what funds everything else.
 */
export function ChaptersScreen(): JSX.Element {
  const state = useStore();
  const [fight, setFight] = useState<Fight | null>(null);

  const current = chapterAt(state.chapter);
  const next = chapterAt(state.chapter + 1);

  return (
    <div class="screen">
      <div class="screen-body scroll">
        <div class="panel card">
          <div class="card-head">
            <i class="seal">道</i>
            <span class="card-title">Lịch Luyện</span>
          </div>
          <div class="col" style={{ gap: '6px' }}>
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px' }}>{current.name}</span>
              <span class="faint num" style={{ fontSize: '11px' }}>
                {state.chapter} / {MAX_CHAPTER}
              </span>
            </div>
            <Meter value={state.chapter / MAX_CHAPTER} tone="gold" height={7} />
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <span class="stat-name">Thu hoạch hiện tại</span>
              <b class="num jade-text">{num(store.stoneRate())} linh thạch/giây</b>
            </div>
          </div>
        </div>

        <div class="panel card">
          <div class="card-head">
            <span class="card-title">Ải kế tiếp</span>
          </div>
          <div class="col" style={{ gap: '6px' }}>
            <span style={{ fontSize: '13.5px' }}>{next.name}</span>
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <span class="stat-name">Cảnh giới đối thủ</span>
              <b style={{ fontSize: '12px' }}>{stageAt(next.opponentStage).label}</b>
            </div>
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <span class="stat-name">Thu hoạch sau khi vượt</span>
              <b class="num gold-text">{num(next.income)}/giây</b>
            </div>
          </div>

          <button
            class="btn btn-danger"
            style={{ width: '100%', marginTop: 'var(--s3)' }}
            onClick={() => setFight(store.fightChapter())}
          >
            Khiêu Chiến
          </button>
        </div>

        <div class="panel card">
          <div class="card-head">
            <span class="card-title">Ghi chép</span>
          </div>
          <span class="faint" style={{ fontSize: '11.5px' }}>
            Thua trận không mất gì — chỉ cần tu vi cao hơn hoặc đổi công pháp cho khắc hệ đối thủ
            rồi khiêu chiến lại.
          </span>
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
    </div>
  );
}
