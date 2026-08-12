import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';

import type { BattleEvent, BattleResult, Duelist } from '../../game/battle';
import { ELEMENT_INFO } from '../../game/elements';
import { num } from '../../game/format';
import { Meter, Modal } from '../parts/Bits';

/**
 * Replays a duel that has already been decided.
 *
 * `store.fightChapter()` and `store.fightTower()` resolve the whole fight and
 * return its event log; this screen only walks that log. Skipping the
 * animation therefore cannot change the outcome that was already banked.
 */
export function DuelView({
  result,
  self,
  foe,
  reward,
  onClose,
}: {
  result: BattleResult;
  self: Duelist;
  foe: Duelist;
  reward: number;
  onClose: () => void;
}): JSX.Element {
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);

  const done = cursor >= result.events.length;

  useEffect(() => {
    if (done) return;
    const event = result.events[cursor];
    // Round markers are instant; anything with an effect gets a beat.
    const delay = event?.type === 'round' ? 90 : 340;
    const timer = window.setTimeout(() => setCursor((n) => n + 1), delay / speed);
    return () => window.clearTimeout(timer);
  }, [cursor, speed, done, result.events]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [cursor]);

  const shown = result.events.slice(0, cursor);
  const hp = currentHp(shown, self, foe);

  return (
    <Modal
      title="Đấu Pháp"
      onClose={onClose}
      footer={
        <div class="col" style={{ gap: 'var(--s2)' }}>
          <div class="speed-row">
            {[1, 2, 4].map((value) => (
              <button
                key={value}
                class={`btn btn-sm ${speed === value ? 'btn-jade' : 'btn-ghost'}`}
                onClick={() => setSpeed(value)}
              >
                ×{value}
              </button>
            ))}
            {!done ? (
              <button class="btn btn-sm btn-ghost" onClick={() => setCursor(result.events.length)}>
                Bỏ qua
              </button>
            ) : null}
          </div>
          <button class="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
            {done ? 'Kết thúc' : 'Đóng'}
          </button>
        </div>
      }
    >
      <div class="panel-slot fighters">
        <div class="fighter">
          <span class="fighter-name">{self.name}</span>
          <span class="fighter-realm">{self.realmLabel}</span>
          <Meter value={hp.self / Math.max(1, self.stats.thePhach)} tone="blood" height={8} />
          <span class="num faint" style={{ fontSize: '10.5px' }}>
            {num(hp.self)}
          </span>
        </div>

        <span class="versus brush">鬥</span>

        <div class="fighter foe">
          <span class="fighter-name">{foe.name}</span>
          <span class="fighter-realm">{foe.realmLabel}</span>
          <Meter value={hp.foe / Math.max(1, foe.stats.thePhach)} tone="blood" height={8} />
          <span class="num faint" style={{ fontSize: '10.5px' }}>
            {num(hp.foe)}
          </span>
        </div>
      </div>

      <div class="panel-slot log scroll" ref={logRef} style={{ maxHeight: '240px' }}>
        {shown.map((event, index) => (
          <LogLine key={index} event={event} selfName={self.name} foeName={foe.name} />
        ))}
      </div>

      {done ? (
        <div class="panel-slot" style={{ padding: 'var(--s3)', textAlign: 'center' }}>
          <b
            class="title"
            style={{
              fontSize: '18px',
              color: result.winner === 'self' ? 'var(--gold-lit)' : 'var(--cinnabar-lit)',
            }}
          >
            {result.winner === 'self' ? 'Thắng' : 'Bại'}
          </b>
          <div class="faint" style={{ fontSize: '11.5px', marginTop: '4px' }}>
            {result.rounds} hiệp
            {result.winner === 'self' && reward > 0 ? ` · +${num(reward)} linh thạch` : ''}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function LogLine({
  event,
  selfName,
  foeName,
}: {
  event: BattleEvent;
  selfName: string;
  foeName: string;
}): JSX.Element | null {
  if (event.type === 'round') {
    return <div class="log-round">Hiệp {event.round}</div>;
  }

  if (event.type === 'tick') {
    const who = event.side === 'self' ? selfName : foeName;
    const label = event.kind === 'poison' ? 'trúng độc' : 'bị thiêu đốt';
    return (
      <div class="log-line">
        <span class="who" style={{ color: 'var(--el-moc)' }}>
          {who}
        </span>
        <span class="dim">
          {label}, mất <b class="cinnabar-text num">{num(event.damage)}</b> khí huyết
        </span>
      </div>
    );
  }

  if (event.type === 'cast') {
    const who = event.side === 'self' ? selfName : foeName;
    const colour = event.side === 'self' ? 'var(--jade-lit)' : 'var(--cinnabar-lit)';
    const info = ELEMENT_INFO[event.element];

    return (
      <div class="log-line">
        <span class="who" style={{ color: colour }}>
          {who}
        </span>
        <span class="dim">
          thi triển <b style={{ color: 'var(--text)' }}>{event.skill}</b>
          {event.damage > 0 ? (
            <>
              , gây <b class="num" style={{ color: 'var(--cinnabar-lit)' }}>{num(event.damage)}</b>
            </>
          ) : null}
          {event.heal > 0 ? (
            <>
              , hồi <b class="num jade-text">{num(event.heal)}</b>
            </>
          ) : null}
          {event.crit ? <i class="tag" style={{ marginLeft: '5px' }}>Chí mạng</i> : null}
          {event.note ? (
            <i
              class="tag"
              style={{ marginLeft: '5px', color: info.css ? undefined : undefined }}
            >
              {event.note}
            </i>
          ) : null}
        </span>
      </div>
    );
  }

  return null;
}

/** Health at a point in the log, read from the events rather than recomputed. */
function currentHp(
  events: BattleEvent[],
  self: Duelist,
  foe: Duelist,
): { self: number; foe: number } {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]!;
    if (event.type === 'cast' || event.type === 'tick') {
      return { self: event.selfHp, foe: event.foeHp };
    }
  }
  return { self: self.stats.thePhach, foe: foe.stats.thePhach };
}
