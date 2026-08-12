import type { JSX } from 'preact';

import { ELEMENTS, ELEMENT_INFO } from '../../game/elements';
import { num } from '../../game/format';
import { MAX_STAGE, stageAt } from '../../game/realms';
import { store } from '../../game/store';
import { Meter } from '../parts/Bits';
import { useStore } from '../store-hook';

/**
 * Tông môn — the character sheet, plus reincarnation once the ladder is done.
 * Everything here is read-only except the one irreversible button, which is
 * why it lives on its own screen rather than under the altar.
 */
export function SectScreen(): JSX.Element {
  const state = useStore();
  const stats = store.stats();
  const stage = stageAt(state.stage);
  const canReincarnate = store.canReincarnate();

  return (
    <div class="screen">
      <div class="screen-body scroll">
        <div class="panel card">
          <div class="card-head">
            <i class="seal">{stage.realm.han.slice(-1)}</i>
            <div class="col">
              <span class="card-title">{state.name}</span>
              <span class="faint" style={{ fontSize: '11px' }}>
                {stage.label}
              </span>
            </div>
            <b class="num gold-text" style={{ marginLeft: 'auto' }}>
              {num(store.power())}
            </b>
          </div>

          <div class="col" style={{ gap: '5px' }}>
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <span class="stat-name">Tiến độ đại đạo</span>
              <span class="num faint" style={{ fontSize: '11px' }}>
                {state.stage + 1} / {MAX_STAGE + 1}
              </span>
            </div>
            <Meter value={(state.stage + 1) / (MAX_STAGE + 1)} tone="gold" height={7} />
          </div>
        </div>

        <div class="panel card">
          <div class="card-head">
            <span class="card-title">Thuộc Tính</span>
          </div>
          <Row name="Chân Khí" value={num(stats.chanKhi)} />
          <Row name="Căn Cốt" value={num(stats.canCot)} />
          <Row name="Thể Phách" value={num(stats.thePhach)} />
        </div>

        <div class="panel card">
          <div class="card-head">
            <span class="card-title">Sát Thương Ngũ Hành</span>
          </div>
          {ELEMENTS.map((element) => (
            <div class="row" key={element} style={{ justifyContent: 'space-between', padding: '2px 0' }}>
              <div class="row" style={{ gap: '7px' }}>
                <i class={`el ${ELEMENT_INFO[element].css}`}>{ELEMENT_INFO[element].han}</i>
                <span class="stat-name">{ELEMENT_INFO[element].name}</span>
              </div>
              <div class="row" style={{ gap: '8px' }}>
                <span class="faint" style={{ fontSize: '10.5px' }}>
                  linh căn {state.spiritRoot[element]}
                </span>
                <b class="num">{num(stats.damage[element])}</b>
              </div>
            </div>
          ))}
        </div>

        <div class="panel card">
          <div class="card-head">
            <i class="seal">迴</i>
            <span class="card-title">Lục Đạo Luân Hồi</span>
          </div>
          <span class="faint" style={{ fontSize: '11.5px' }}>
            Khi tu tới đỉnh Độ Kiếp, có thể nhập luân hồi: cảnh giới trở về Luyện Khí, nhưng mọi
            thuộc tính về sau nhân thêm 1.85 lần mỗi vòng.
          </span>

          <div class="row" style={{ justifyContent: 'space-between', marginTop: 'var(--s2)' }}>
            <span class="stat-name">Số vòng đã qua</span>
            <b class="num jade-text">{state.cycles}</b>
          </div>

          <button
            class={`btn ${canReincarnate ? 'btn-danger' : ''}`}
            style={{ width: '100%', marginTop: 'var(--s3)' }}
            disabled={!canReincarnate}
            onClick={() => store.reincarnate()}
          >
            {canReincarnate ? 'Nhập Luân Hồi' : 'Chưa tới đỉnh Độ Kiếp'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ name, value }: { name: string; value: string }): JSX.Element {
  return (
    <div class="row" style={{ justifyContent: 'space-between', padding: '2px 0' }}>
      <span class="stat-name">{name}</span>
      <b class="num">{value}</b>
    </div>
  );
}
