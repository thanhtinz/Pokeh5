import { useState } from 'preact/hooks';

import {
  BUSINESSES,
  DISTRICTS,
  affordableUnits,
  bulkCost,
  cyclePayout,
  incomePerSecond,
  nextMilestone,
  unitCost,
} from '../../game/businesses';
import { clock, count, money, rate } from '../../game/money';
import { ROOT_TIERS } from '../../game/roots';
import { hasManager, ownedOf, upgradeOf, type PlayerState } from '../../game/state';
import { TIERS, isMaxed, nextUpgrade, upgradeMultiplier } from '../../game/upgrades';
import type { Derived, Store } from '../../game/store';
import { t } from '../../i18n';
import { Art } from '../Art';
import { DistrictArt } from '../Scene';

interface Props {
  game: Store;
  state: PlayerState;
  derived: Derived;
}

type Amount = 1 | 10 | 100 | 'max';

const AMOUNTS: readonly Amount[] = [1, 10, 100, 'max'];

/**
 * How far down the list to show. Everything owned, plus a few rungs above it —
 * enough that there is always something to want, not so much that the list is a
 * wall of numbers the player cannot read yet.
 */
const LOOKAHEAD = 4;

export function Empire({ game, state, derived }: Props) {
  const [amount, setAmount] = useState<Amount>(1);

  let lastOwned = -1;
  BUSINESSES.forEach((def, index) => {
    if (ownedOf(state, def.id) > 0) lastOwned = index;
  });
  const visibleCount = Math.max(LOOKAHEAD, lastOwned + 1 + LOOKAHEAD);

  return (
    <>
      <div class="segments">
        {AMOUNTS.map((option) => (
          <button
            key={String(option)}
            aria-pressed={amount === option}
            onClick={() => setAmount(option)}
          >
            {option === 'max' ? t('empire.max') : `×${option}`}
          </button>
        ))}
      </div>

      {/* Tổng cắm rễ đứng một mình trên đầu danh sách: sáu thanh ở dưới là sáu
          khu riêng lẻ, còn con số này mới là thứ chúng nó cộng lại thành. */}
      <span class="roots__total num">
        {derived.rootTiers > 0
          ? t('root.total', {
              tiers: count(derived.rootTiers),
              multiplier: derived.rootMultiplier.toFixed(2),
            })
          : t('root.note')}
      </span>

      {DISTRICTS.map((district) => {
        const defs = BUSINESSES.filter(
          (def, index) => def.district === district && index < visibleCount,
        );
        if (defs.length === 0) return null;

        const root = derived.roots.find((entry) => entry.district === district)!;
        const districtIncome = defs.reduce(
          (sum, def) =>
            sum +
            (hasManager(state, def.id)
              ? incomePerSecond(def, ownedOf(state, def.id), derived.globalMultiplier, 1)
              : 0),
          0,
        );

        return (
          <section key={district}>
            <div class="district">
              <DistrictArt district={district} />
              <h2 class="section__title district__title">
                <span>{t(`district.${district}`)}</span>
                <span class="num">{rate(districtIncome)}</span>
              </h2>

              {/* Cắm rễ nằm ngay dưới tên khu, vì nó là chỉ số *của khu* —
                  và vì đó là chỗ duy nhất người chơi nhìn thấy lý do quay lại
                  một khu đã bỏ lại phía sau từ lâu. */}
              <div class="roots">
                <span class="roots__head">
                  <span>{t('root.title')}</span>
                  {/* Bậc và số suất đứng chung một dòng: tách ra thì cái thanh
                      phụ này cao bằng một hàng cơ ngơi thật, mà nó không phải
                      thứ để bấm. Số ở đây luôn dưới hai nghìn nên viết thẳng,
                      khỏi rút gọn thành "1,2k" cạnh một số chưa rút gọn. */}
                  <span class="num">
                    {root.tier > 0 && t('root.tier', { tier: root.tier, max: ROOT_TIERS.length })}
                    {root.tier > 0 && root.next !== null && ' · '}
                    {root.next === null
                      ? root.tier > 0 && t('root.full')
                      : t('root.progress', { current: root.units, target: root.next })}
                  </span>
                </span>
                <span class="bar">
                  <span class="bar__fill" style={{ width: `${root.progress * 100}%` }} />
                </span>
              </div>
            </div>

            {defs.map((def) => {
              const owned = ownedOf(state, def.id);
              const managed = hasManager(state, def.id);
              const units =
                amount === 'max' ? affordableUnits(def, owned, derived.spendable) : amount;
              const cost = units > 0 ? bulkCost(def, owned, units) : unitCost(def, owned);
              const affordable = units > 0 && game.canAfford(cost);

              const progress = (state.cycles[def.id] ?? 0) / def.cycleSeconds;
              const target = nextMilestone(owned);

              const level = upgradeOf(state, def.id);
              const upgrade = nextUpgrade(def, owned, level);

              return (
                <div key={def.id} class={`row${affordable ? ' row--lit' : ''}`}>
                  <button
                    class="row__icon"
                    disabled={owned <= 0 || managed || progress > 0}
                    onClick={() => game.runBusiness(def.id)}
                    aria-label={t('empire.run', { name: t(`biz.${def.id}`) })}
                  >
                    <Art name={def.icon} />
                  </button>

                  <span class="row__body">
                    {/* The name gets its own line: an owned count appended to it
                        is the first thing an ellipsis eats. */}
                    <span class="row__name">{t(`biz.${def.id}`)}</span>
                    <span class="row__meta">
                      {owned > 0
                        ? t('empire.owned', {
                            count: count(owned),
                            payout: money(cyclePayout(def, owned, derived.globalMultiplier)),
                            seconds: clock(def.cycleSeconds),
                          }) + (target ? ` · ${t('empire.milestone', { count: target })}` : '')
                        : t('empire.cycle', {
                            payout: money(def.basePayout * derived.globalMultiplier),
                            seconds: clock(def.cycleSeconds),
                          })}
                    </span>
                  </span>

                  <span class="row__side">
                    <button
                      class="btn btn--sm btn--primary"
                      disabled={!affordable}
                      onClick={() => game.buyBusiness(def.id, amount)}
                    >
                      {money(cost)}
                      {units > 1 && ` ·${count(units)}`}
                    </button>

                    {owned > 0 &&
                      (managed ? (
                        <span class="row__meta">{t('empire.automated')}</span>
                      ) : (
                        <button
                          class="btn btn--sm btn--ghost"
                          disabled={!game.canAfford(def.managerCost)}
                          onClick={() => game.hireManager(def.id)}
                        >
                          {t('empire.manager', { cost: money(def.managerCost) })}
                        </button>
                      ))}
                  </span>

                  {/* Nâng cấp chỉ hiện khi đã có cơ sở: trước đó nó là một dòng
                      chữ vô nghĩa giữa danh sách những thứ chưa mua nổi. */}
                  {owned > 0 && (
                    <span class="row__upgrade">
                      {isMaxed(level) ? (
                        <span class="row__meta">
                          {t('empire.upgradeLevel', {
                            level,
                            max: TIERS.length,
                            multiplier: upgradeMultiplier(level),
                          })}
                        </span>
                      ) : (
                        <button
                          class={`btn btn--sm btn--wide${
                            upgrade && upgrade.unlocked && game.canAfford(upgrade.cost)
                              ? ' btn--primary'
                              : ''
                          }`}
                          disabled={!upgrade || !upgrade.unlocked || !game.canAfford(upgrade.cost)}
                          onClick={() => game.buyUpgrade(def.id)}
                        >
                          {upgrade && !upgrade.unlocked
                            ? t('empire.upgradeLocked', { count: upgrade.tier.at })
                            : t('empire.upgrade', { cost: money(upgrade?.cost ?? 0) })}
                        </button>
                      )}
                    </span>
                  )}

                  {owned > 0 && (
                    <span class="row__bar bar">
                      <span class="bar__fill" style={{ width: `${Math.min(1, progress) * 100}%` }} />
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
