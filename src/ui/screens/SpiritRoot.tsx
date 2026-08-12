import type { JSX } from 'preact';

import { ELEMENTS, ELEMENT_INFO } from '../../game/elements';
import { num } from '../../game/format';
import { store } from '../../game/store';
import { ElChip, Meter, Modal } from '../parts/Bits';
import { useStore } from '../store-hook';

/**
 * Linh căn — per-phase affinity. Pills raise one phase at a time, and because
 * affinity feeds both damage and cultivation rate, the choice of which phase
 * to feed is the build decision the whole game hangs off.
 */
export function SpiritRootDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const state = useStore();
  const cost = store.pillCost();
  const left = store.pillsLeft();

  return (
    <Modal title="Linh Căn" onClose={onClose}>
      <span class="faint" style={{ fontSize: '12px' }}>
        Phục dược nâng linh căn một hệ. Linh căn vừa tăng sát thương hệ đó, vừa tăng hiệu suất tu
        luyện chung.
      </span>

      <div class="list">
        {ELEMENTS.map((element) => {
          const value = state.spiritRoot[element];
          const affordable = left > 0 && state.linhThach >= cost && value < 100;

          return (
            <div class="panel-slot slot-row" key={element}>
              <ElChip element={element} />
              <div class="col grow" style={{ gap: '4px' }}>
                <div class="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px' }}>{ELEMENT_INFO[element].name}</span>
                  <b class="num" style={{ fontSize: '12px' }}>
                    {value} / 100
                  </b>
                </div>
                <Meter value={value / 100} height={6} />
              </div>
              <button
                class={`btn btn-sm ${affordable ? 'btn-jade' : ''}`}
                disabled={!affordable}
                onClick={() => store.takePill(element)}
              >
                {value >= 100 ? 'Viên mãn' : 'Phục dược'}
              </button>
            </div>
          );
        })}
      </div>

      <div class="panel-slot" style={{ padding: 'var(--s3)' }}>
        <div class="row" style={{ justifyContent: 'space-between' }}>
          <span class="stat-name">Chi phí mỗi lần</span>
          <b class={`num ${state.linhThach >= cost ? 'gold-text' : 'cinnabar-text'}`}>
            {num(cost)} linh thạch
          </b>
        </div>
        <div class="row" style={{ justifyContent: 'space-between' }}>
          <span class="stat-name">Số lần còn lại hôm nay</span>
          <b class="num">{left}</b>
        </div>
      </div>
    </Modal>
  );
}
