import { useState } from 'preact/hooks';
import type { JSX } from 'preact';

import { QUICK_TRAINING_HOURS, secondsUntilReset } from '../../game/content';
import { clock, num } from '../../game/format';
import { store, type OfflineReport } from '../../game/store';
import { Modal, Stat } from '../parts/Bits';
import { useStore } from '../store-hook';

/**
 * Tốc luyện — claims a block of banked income without waiting for it, against
 * a daily allowance. The reference frames this as praying to an ancestor for
 * two hours of the current stage's yield.
 */
export function QuickTrainingDialog({ onClose }: { onClose: () => void }): JSX.Element {
  useStore();
  const [claimed, setClaimed] = useState<OfflineReport | null>(null);
  const left = store.quickTrainingLeft();

  const claim = (): void => {
    const report = store.claimQuickTraining();
    if (report) setClaimed(report);
  };

  return (
    <Modal
      title="Tốc Luyện"
      onClose={onClose}
      footer={
        <button
          class={`btn ${left > 0 ? 'btn-primary' : ''}`}
          style={{ width: '100%' }}
          disabled={left <= 0}
          onClick={claim}
        >
          {left > 0 ? 'Miễn phí lần này' : 'Đã hết lượt hôm nay'}
        </button>
      }
    >
      <div class="center col" style={{ gap: '6px', padding: 'var(--s3) 0' }}>
        <span class="brush" style={{ fontSize: '44px', color: 'var(--jade-lit)' }}>
          煉
        </span>
        <span class="faint" style={{ fontSize: '12px', textAlign: 'center' }}>
          Khấn nguyện tổ sư, thu về {QUICK_TRAINING_HOURS} giờ thu hoạch
          <br />
          của ải lịch luyện hiện tại.
        </span>
      </div>

      <div class="panel-slot" style={{ padding: 'var(--s3)' }}>
        <Stat name="Thời gian làm mới" value={clock(secondsUntilReset())} />
        <Stat name="Số lần còn lại hôm nay" value={String(left)} tone="gold-text" />
      </div>

      {claimed ? (
        <div class="panel-slot" style={{ padding: 'var(--s3)' }}>
          <Stat name="Tu vi nhận được" value={`+${num(claimed.cultivation)}`} tone="jade-text" />
          <Stat name="Linh thạch nhận được" value={`+${num(claimed.linhThach)}`} tone="gold-text" />
        </div>
      ) : null}
    </Modal>
  );
}
