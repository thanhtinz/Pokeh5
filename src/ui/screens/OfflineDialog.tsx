import type { JSX } from 'preact';

import { duration, num } from '../../game/format';
import { store, OFFLINE_CAP_HOURS } from '../../game/store';
import { Modal, Stat } from '../parts/Bits';

/**
 * "While you were away". Capping at half a day keeps the game worth opening
 * daily without punishing a night's sleep.
 */
export function OfflineDialog({ onClose }: { onClose: () => void }): JSX.Element | null {
  const report = store.pendingOffline;
  if (!report) return null;

  const claim = (): void => {
    store.claimOffline();
    onClose();
  };

  return (
    <Modal
      title="Bế Quan Thu Hoạch"
      onClose={claim}
      footer={
        <button class="btn btn-primary" style={{ width: '100%' }} onClick={claim}>
          Thu nhận
        </button>
      }
    >
      <div class="center col" style={{ gap: '6px', padding: 'var(--s2) 0' }}>
        <span class="brush" style={{ fontSize: '40px', color: 'var(--jade-lit)' }}>
          修
        </span>
        <span class="faint" style={{ fontSize: '12px' }}>
          Đạo hữu đã bế quan {duration(report.seconds)}
        </span>
        {report.capped ? (
          <span class="cinnabar-text" style={{ fontSize: '11px' }}>
            Đã đạt giới hạn tích lũy {OFFLINE_CAP_HOURS} giờ
          </span>
        ) : null}
      </div>

      <div class="panel-slot" style={{ padding: 'var(--s3)' }}>
        <Stat name="Tu vi" value={`+${num(report.cultivation)}`} tone="jade-text" />
        <Stat name="Linh thạch" value={`+${num(report.linhThach)}`} tone="gold-text" />
      </div>
    </Modal>
  );
}
