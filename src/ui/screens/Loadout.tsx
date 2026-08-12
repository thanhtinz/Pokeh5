import { useState } from 'preact/hooks';
import type { JSX } from 'preact';

import { ELEMENT_INFO } from '../../game/elements';
import { stageAt } from '../../game/realms';
import {
  LOADOUT_SLOTS,
  ROLE_LABEL,
  SKILLS,
  SLOT_LABELS,
  effectLabel,
  isUnlocked,
  skillById,
  tierLabel,
  type Skill,
} from '../../game/skills';
import { store } from '../../game/store';
import { ElChip, Modal } from '../parts/Bits';
import { useStore } from '../store-hook';

/**
 * Thượng trận công pháp — the four immortal-art slots. Arts fire in slot order
 * and cycle, so the ordering is part of the decision, not just the picking.
 */
export function LoadoutScreen(): JSX.Element {
  const state = useStore();
  const [picking, setPicking] = useState<number | null>(null);

  return (
    <div class="screen">
      <div class="screen-body scroll">
        <div class="panel card">
          <div class="card-head">
            <i class="seal">法</i>
            <span class="card-title">Thượng Trận Công Pháp</span>
          </div>
          <span class="faint" style={{ fontSize: '11.5px' }}>
            Tiên thuật thi triển lần lượt theo thứ tự ô, hết lượt thì quay vòng. Ô trống sẽ bị bỏ
            qua.
          </span>
        </div>

        <div class="list">
          {Array.from({ length: LOADOUT_SLOTS }, (_, slot) => {
            const skill = skillById(state.loadout[slot] ?? '');
            return (
              <button class="panel slot-row" key={slot} onClick={() => setPicking(slot)}>
                <div class="slot-mark">
                  {skill ? (
                    <ElChip element={skill.element} />
                  ) : (
                    <span class="faint" style={{ fontSize: '20px' }}>
                      ＋
                    </span>
                  )}
                </div>

                <div class="col grow" style={{ gap: '3px', alignItems: 'flex-start' }}>
                  <span class="slot-caption">{SLOT_LABELS[slot]}</span>
                  {skill ? (
                    <>
                      <span class="slot-name">{skill.name}</span>
                      <div class="slot-meta">
                        <i class="tag">{tierLabel(skill.tier)}</i>
                        <i class="tag role">{ROLE_LABEL[skill.role]}</i>
                      </div>
                    </>
                  ) : (
                    <span class="slot-name faint">Chưa trang bị</span>
                  )}
                </div>

                <span class="faint" style={{ fontSize: '16px' }}>
                  ›
                </span>
              </button>
            );
          })}
        </div>

        <LoadoutSummary />
      </div>

      {picking !== null ? (
        <SkillPicker slot={picking} onClose={() => setPicking(null)} />
      ) : null}
    </div>
  );
}

function SkillPicker({ slot, onClose }: { slot: number; onClose: () => void }): JSX.Element {
  const state = useStore();
  const fielded = new Set(state.loadout.filter((id): id is string => id !== null));

  // Unlocked arts first, then the locked ones as a preview of what is coming.
  const sorted = [...SKILLS].sort((a, b) => {
    const au = isUnlocked(a, state.stage) ? 0 : 1;
    const bu = isUnlocked(b, state.stage) ? 0 : 1;
    return au - bu || a.requires - b.requires || a.tier - b.tier;
  });

  const choose = (skill: Skill | null): void => {
    store.setSlot(slot, skill?.id ?? null);
    onClose();
  };

  return (
    <Modal title={SLOT_LABELS[slot] ?? 'Chọn tiên thuật'} onClose={onClose}>
      <button class="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => choose(null)}>
        Bỏ trống ô này
      </button>

      <div class="list">
        {sorted.map((skill) => {
          const unlocked = isUnlocked(skill, state.stage);
          const effect = effectLabel(skill.effect);
          const equipped = fielded.has(skill.id);

          return (
            <button
              class="panel-slot slot-row"
              key={skill.id}
              disabled={!unlocked}
              style={{ opacity: unlocked ? 1 : 0.55, textAlign: 'left' }}
              onClick={() => unlocked && choose(skill)}
            >
              <div class="slot-mark" style={{ width: '38px', height: '38px' }}>
                <ElChip element={skill.element} />
              </div>

              <div class="col grow" style={{ gap: '3px', alignItems: 'flex-start' }}>
                <div class="row">
                  <span class="slot-name" style={{ fontSize: '13.5px' }}>
                    {skill.name}
                  </span>
                  {equipped ? (
                    <i class="tag role" style={{ fontSize: '9.5px' }}>
                      Đang dùng
                    </i>
                  ) : null}
                </div>
                <span class="faint" style={{ fontSize: '11px' }}>
                  {skill.flavour}
                </span>
                <div class="slot-meta">
                  <i class="tag">{tierLabel(skill.tier)}</i>
                  <i class="tag">{ELEMENT_INFO[skill.element].name}</i>
                  {effect ? <i class="tag role">{effect}</i> : null}
                  {!unlocked ? (
                    <i class="tag locked">Cần {stageAt(skill.requires).label}</i>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/** Element spread and role mix of the arts currently fielded. */
function LoadoutSummary(): JSX.Element {
  const state = useStore();
  const fielded = state.loadout
    .map((id) => (id ? skillById(id) : null))
    .filter((skill): skill is Skill => skill !== null);

  const byElement = new Map<string, number>();
  for (const skill of fielded) {
    byElement.set(skill.element, (byElement.get(skill.element) ?? 0) + 1);
  }

  const roles = new Set(fielded.map((skill) => skill.role));
  const advice =
    fielded.length === 0
      ? 'Chưa trang bị tiên thuật nào — vào trận sẽ không ra đòn.'
      : roles.size === 1
        ? 'Cả bốn ô cùng một vai trò. Thêm hồi phục hoặc hiệu ứng sẽ trụ lâu hơn.'
        : byElement.size === 1
          ? 'Toàn bộ cùng một hệ: sát thương cao khi khắc chế, nhưng bị khắc thì rất yếu.'
          : 'Trận thế cân bằng.';

  return (
    <div class="panel card">
      <div class="card-head">
        <span class="card-title">Trận Thế</span>
      </div>

      <div class="row" style={{ gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s2)' }}>
        {[...byElement.entries()].map(([element, count]) => (
          <div class="row" key={element} style={{ gap: '5px' }}>
            <ElChip element={element as never} />
            <span class="num" style={{ fontSize: '12px' }}>
              ×{count}
            </span>
          </div>
        ))}
      </div>

      <span class="faint" style={{ fontSize: '11.5px' }}>
        {advice}
      </span>
    </div>
  );
}
