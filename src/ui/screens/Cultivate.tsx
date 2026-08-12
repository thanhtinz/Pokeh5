import { useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';

import { chapterAt, secondsUntilReset } from '../../game/content';
import { ELEMENTS, ELEMENT_INFO } from '../../game/elements';
import { clock, num } from '../../game/format';
import { stageAt } from '../../game/realms';
import { store } from '../../game/store';
import { statDelta, type Stats } from '../../game/stats';
import type { Tab } from '../App';
import { Diamond, Meter, Modal, Stat, TrigramRing } from '../parts/Bits';
import { useStore } from '../store-hook';
import { QuickTrainingDialog } from './QuickTraining';
import { SpiritRootDialog } from './SpiritRoot';

/** Shortcut rails. Only the entries with a screen behind them are wired. */
const LEFT_RAIL = [
  { glyph: '友', label: 'Đạo Hữu' },
  { glyph: '坊', label: 'Phường Thị' },
  { glyph: '問', label: 'Vấn Đạo' },
  { glyph: '算', label: 'Thần Toán' },
  { glyph: '活', label: 'Hoạt Động' },
];

const RIGHT_RAIL = [
  { glyph: '昇', label: 'Phi Thăng' },
  { glyph: '行', label: 'Tu Hành' },
  { glyph: '鑑', label: 'Đồ Giám' },
  { glyph: '舖', label: 'Thương Phố' },
  { glyph: '囊', label: 'Túi Đồ' },
];

export function CultivateScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }): JSX.Element {
  const state = useStore();
  const [dialog, setDialog] = useState<null | 'quick' | 'root' | 'breakthrough'>(null);
  const [result, setResult] = useState<{ before: Stats; after: Stats } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const stage = stageAt(state.stage);
  const progress = store.breakthroughProgress();
  const [low, high] = store.rateRange();
  const chapter = chapterAt(state.chapter);

  // Motes are positioned once per mount; re-rolling them every render would
  // restart the animation on every tick of the cultivation counter.
  const motes = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        left: 18 + ((i * 37) % 64),
        delay: (i * 0.9) % 6,
        duration: 5.5 + ((i * 1.3) % 3.5),
      })),
    [],
  );

  const doBreakthrough = (): void => {
    const outcome = store.breakthrough();
    if (outcome) {
      setResult(outcome);
      setDialog('breakthrough');
    }
  };

  const doBreathe = (): void => {
    const gained = store.breathe();
    setNote(gained === null ? 'Hôm nay đã thổ nạp đủ số lần.' : `Thổ nạp: +${num(gained)} tu vi`);
  };

  return (
    <div class="screen">
      <div class="cultivate">
        <div class="mist" />

        <Rail side="left" items={LEFT_RAIL} hidden={state.railsCollapsed} onTap={setNote} />
        <Rail side="right" items={RIGHT_RAIL} hidden={state.railsCollapsed} onTap={setNote} />

        <button
          class="rail-toggle left"
          onClick={() => {
            state.railsCollapsed = !state.railsCollapsed;
            store.flush();
            setNote(null);
          }}
          aria-label="Ẩn/hiện thanh bên"
        >
          {state.railsCollapsed ? '›' : '‹'}
        </button>
        <button
          class="rail-toggle right"
          onClick={() => {
            state.railsCollapsed = !state.railsCollapsed;
            store.flush();
            setNote(null);
          }}
          aria-label="Ẩn/hiện thanh bên"
        >
          {state.railsCollapsed ? '‹' : '›'}
        </button>

        <div class="realm-head">
          <h1 class="realm-title">{stage.realmName}</h1>
          <span class="realm-need num">
            {progress.ready ? (
              <b class="gold-text">Đã đủ tu vi — có thể phá cảnh</b>
            ) : (
              <>
                Đột phá cần {num(progress.have)} / {num(progress.need)}
              </>
            )}
          </span>
          <span class="cycle-tag">
            <span class="brush">六道輪迴</span> ×{state.cycles}
          </span>
        </div>

        <div class="altar">
          <TrigramRing className="altar-ring" />
          <TrigramRing className="altar-ring inner" />

          {motes.map((mote, index) => (
            <i
              key={index}
              class="mote"
              style={{
                left: `${mote.left}%`,
                animationDelay: `${mote.delay}s`,
                animationDuration: `${mote.duration}s`,
              }}
            />
          ))}

          {progress.ready ? (
            <button class="breakthrough" onClick={doBreakthrough}>
              <span>
                突
                <br />
                破
              </span>
            </button>
          ) : (
            <span class="altar-seal">{stage.realm.han.slice(-1)}</span>
          )}
        </div>

        <div class="progress-block panel-dark">
          <div class="progress-line">
            <span>Tiến độ phá cảnh</span>
            <b class="num gold-text">
              {num(progress.have)} / {num(progress.need)}
            </b>
          </div>
          <Meter value={progress.need > 0 ? progress.have / progress.need : 1} tone="gold" />
          <div class="progress-line">
            <span>Tổng tu vi {num(state.totalCultivation)}</span>
            <b class="num jade-text">
              {num(low)}–{num(high)}/giây
            </b>
          </div>
        </div>

        <div class="pill-row">
          <div class="pill-btn">
            <button class="btn btn-jade btn-sm" style={{ width: '100%' }} onClick={() => setDialog('root')}>
              Phục Dược
            </button>
            <small>Còn {store.pillsLeft()} lần</small>
          </div>
          <div class="pill-btn">
            <button class="btn btn-sm" style={{ width: '100%' }} onClick={doBreathe}>
              Thổ Nạp
            </button>
            <small>Còn {store.breathingLeft()} lần</small>
          </div>
        </div>

        <div class="feature-row">
          <Feature glyph="器" label="Pháp Khí" onTap={setNote} />
          <Feature glyph="術" label="Tiên Thuật" onClick={() => onNavigate('roam')} />
          <Feature glyph="根" label="Linh Căn" onClick={() => setDialog('root')} />
          <Feature glyph="法" label="Ngự Pháp" onTap={setNote} />
          <Feature glyph="寵" label="Linh Sủng" onTap={setNote} />
          <Feature glyph="劍" label="Phi Kiếm" onTap={setNote} />
        </div>
      </div>

      <div class="trial-strip">
        <div class="who">
          <span>煉</span>
        </div>
        <div class="col grow">
          <span style={{ fontSize: '12px' }}>Lịch luyện: {chapter.name}</span>
          <span class="faint" style={{ fontSize: '10.5px' }}>
            Thu hoạch {num(store.stoneRate())} linh thạch/giây
          </span>
        </div>
        <button class="btn btn-primary btn-sm" onClick={() => setDialog('quick')}>
          Tốc Luyện
          {store.quickTrainingLeft() > 0 ? <i class="badge">{store.quickTrainingLeft()}</i> : null}
        </button>
      </div>

      {dialog === 'quick' ? <QuickTrainingDialog onClose={() => setDialog(null)} /> : null}
      {dialog === 'root' ? <SpiritRootDialog onClose={() => setDialog(null)} /> : null}
      {dialog === 'breakthrough' && result ? (
        <BreakthroughDialog result={result} onClose={() => setDialog(null)} />
      ) : null}
      {note ? <Toast text={note} onDone={() => setNote(null)} /> : null}
    </div>
  );
}

function Rail({
  side,
  items,
  hidden,
  onTap,
}: {
  side: 'left' | 'right';
  items: { glyph: string; label: string }[];
  hidden: boolean;
  onTap: (message: string) => void;
}): JSX.Element {
  return (
    <div class={`rail ${side}${hidden ? ' hidden' : ''}`}>
      {items.map((item) => (
        <div class="rail-item" key={item.label}>
          <Diamond size={38} onClick={() => onTap(`${item.label} sẽ mở ở bản sau`)}>
            <span class="brush" style={{ fontSize: '17px' }}>
              {item.glyph}
            </span>
          </Diamond>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function Feature({
  glyph,
  label,
  onClick,
  onTap,
}: {
  glyph: string;
  label: string;
  onClick?: () => void;
  onTap?: (message: string) => void;
}): JSX.Element {
  return (
    <div class="feature">
      <Diamond onClick={onClick ?? (() => onTap?.(`${label} sẽ mở ở bản sau`))}>
        <span class="brush">{glyph}</span>
      </Diamond>
      <small>{label}</small>
    </div>
  );
}

/** The stat comparison shown after crossing a rank. */
function BreakthroughDialog({
  result,
  onClose,
}: {
  result: { before: Stats; after: Stats };
  onClose: () => void;
}): JSX.Element {
  const state = useStore();
  const gain = statDelta(result.before, result.after);
  const stage = stageAt(state.stage);

  const rows: [string, number, number][] = [
    ['Chân Khí', result.before.chanKhi, result.after.chanKhi],
    ['Căn Cốt', result.before.canCot, result.after.canCot],
    ['Thể Phách', result.before.thePhach, result.after.thePhach],
    ...ELEMENTS.map(
      (element) =>
        [
          `Sát thương ${ELEMENT_INFO[element].name}`,
          result.before.damage[element],
          result.after.damage[element],
        ] as [string, number, number],
    ),
  ];

  return (
    <Modal
      title="Đột Phá Thành Công"
      onClose={onClose}
      footer={
        <button class="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
          Xác nhận
        </button>
      }
    >
      <div class="center col" style={{ gap: '4px' }}>
        <span class="brush" style={{ fontSize: '30px', color: 'var(--gold-lit)' }}>
          {stage.realm.han}
        </span>
        <b class="title" style={{ fontSize: '17px' }}>
          {stage.label}
        </b>
      </div>

      <div class="panel-slot" style={{ padding: 'var(--s3)' }}>
        {rows.map(([name, before, after]) => (
          <div class="stat-cols" key={name} style={{ padding: '3px 0' }}>
            <span class="stat-name">{name}</span>
            <span class="arrow">›</span>
            <div class="row" style={{ justifyContent: 'flex-end', gap: '6px' }}>
              <span class="num faint">{num(before)}</span>
              <span class="num" style={{ color: 'var(--jade-lit)' }}>
                {num(after)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Stat name="Chân Khí tăng thêm" value={`+${num(gain.chanKhi)}`} tone="jade-text" />
    </Modal>
  );
}

/** Transient message. Simple enough that a component beats a global system. */
function Toast({ text, onDone }: { text: string; onDone: () => void }): JSX.Element {
  setTimeout(onDone, 1800);
  return (
    <div
      class="panel-dark"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '96px',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        fontSize: '12.5px',
        zIndex: 30,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
}

export { clock, secondsUntilReset };
