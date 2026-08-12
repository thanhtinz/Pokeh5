import { elementMultiplier, type ElementId } from './elements';
import { Rng } from './rng';
import { skillById, type Skill } from './skills';
import type { Stats } from './stats';

/**
 * Đấu pháp — a thirty-round duel, resolved in full before anything is drawn.
 *
 * The scene only replays the returned log, so a player who skips the animation
 * cannot end up with a different outcome from the one they watched. The same
 * seed always produces the same duel.
 */

export const MAX_ROUNDS = 30;

export type Side = 'self' | 'foe';

export interface Duelist {
  name: string;
  realmLabel: string;
  stats: Stats;
  /** Skill ids in slot order; empty slots are skipped. */
  loadout: (string | null)[];
}

interface Combatant extends Duelist {
  hp: number;
  maxHp: number;
  shield: number;
  /** Multiplicative buff on outgoing damage, from empower and weaken. */
  attackMod: number;
  effects: ActiveEffect[];
  /** Which loadout slot fires next. */
  cursor: number;
}

interface ActiveEffect {
  kind: 'poison' | 'bleed' | 'shield' | 'empower' | 'weaken';
  turnsLeft: number;
  /** Damage per tick, or the modifier amount. */
  value: number;
  element: ElementId;
}

export type BattleEvent =
  | { type: 'round'; round: number }
  | {
      type: 'cast';
      side: Side;
      skill: string;
      element: ElementId;
      damage: number;
      heal: number;
      /** 1.5 when the phase overcomes, 0.7 when overcome. */
      multiplier: number;
      crit: boolean;
      note: string | null;
      selfHp: number;
      foeHp: number;
    }
  | {
      type: 'tick';
      side: Side;
      kind: 'poison' | 'bleed';
      damage: number;
      element: ElementId;
      selfHp: number;
      foeHp: number;
    }
  | { type: 'end'; winner: Side; rounds: number };

export interface BattleResult {
  winner: Side;
  events: BattleEvent[];
  rounds: number;
  selfHpLeft: number;
  foeHpLeft: number;
}

const CRIT_CHANCE = 0.12;
const CRIT_MULTIPLIER = 1.8;

function toCombatant(duelist: Duelist): Combatant {
  const maxHp = Math.max(1, duelist.stats.thePhach);
  return {
    ...duelist,
    hp: maxHp,
    maxHp,
    shield: 0,
    attackMod: 1,
    effects: [],
    cursor: 0,
  };
}

/** The next art in the rotation, skipping empty slots. */
function nextSkill(actor: Combatant): Skill | null {
  for (let i = 0; i < actor.loadout.length; i += 1) {
    const index = (actor.cursor + i) % actor.loadout.length;
    const id = actor.loadout[index];
    const skill = id ? skillById(id) : null;
    if (skill) {
      actor.cursor = (index + 1) % actor.loadout.length;
      return skill;
    }
  }
  return null;
}

/**
 * Defence is a diminishing reduction rather than flat subtraction, so stacking
 * Căn Cốt keeps helping without ever making a duelist immune.
 */
function mitigate(raw: number, canCot: number): number {
  const reduction = canCot / (canCot + 2400);
  return Math.max(1, Math.floor(raw * (1 - reduction * 0.72)));
}

function applyDamage(target: Combatant, amount: number): number {
  let remaining = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }
  target.hp = Math.max(0, target.hp - remaining);
  return amount;
}

export function simulate(self: Duelist, foe: Duelist, seed: number): BattleResult {
  const rng = new Rng(seed);
  const sides: Record<Side, Combatant> = { self: toCombatant(self), foe: toCombatant(foe) };
  const events: BattleEvent[] = [];

  const snapshot = () => ({ selfHp: sides.self.hp, foeHp: sides.foe.hp });

  let winner: Side | null = null;
  let round = 0;

  while (round < MAX_ROUNDS && winner === null) {
    round += 1;
    events.push({ type: 'round', round });

    for (const side of ['self', 'foe'] as const) {
      const actor = sides[side];
      const target = sides[side === 'self' ? 'foe' : 'self'];
      if (actor.hp <= 0) continue;

      // Lingering effects resolve before the actor moves, so a poison can
      // finish an opponent who would otherwise have got one more cast off.
      for (const effect of actor.effects) {
        if (effect.kind !== 'poison' && effect.kind !== 'bleed') continue;
        applyDamage(actor, effect.value);
        events.push({
          type: 'tick',
          side,
          kind: effect.kind,
          damage: effect.value,
          element: effect.element,
          ...snapshot(),
        });
      }
      if (actor.hp <= 0) {
        winner = side === 'self' ? 'foe' : 'self';
        break;
      }

      const skill = nextSkill(actor);
      if (skill) {
        const outcome = cast(actor, target, skill, rng);
        events.push({ type: 'cast', side, ...outcome, ...snapshot() });
      }

      if (target.hp <= 0) {
        winner = side;
        break;
      }
    }

    for (const side of ['self', 'foe'] as const) tickEffects(sides[side]);
  }

  if (winner === null) {
    // A stall-out is decided on remaining health fraction, which favours
    // whoever was actually winning the exchange.
    const fraction = (c: Combatant) => c.hp / c.maxHp;
    winner = fraction(sides.self) >= fraction(sides.foe) ? 'self' : 'foe';
  }

  events.push({ type: 'end', winner, rounds: round });

  return {
    winner,
    events,
    rounds: round,
    selfHpLeft: sides.self.hp,
    foeHpLeft: sides.foe.hp,
  };
}

function cast(
  actor: Combatant,
  target: Combatant,
  skill: Skill,
  rng: Rng,
): {
  skill: string;
  element: ElementId;
  damage: number;
  heal: number;
  multiplier: number;
  crit: boolean;
  note: string | null;
} {
  const power = actor.stats.damage[skill.element];
  const multiplier = elementMultiplier(skill.element, dominantElement(target));
  let damage = 0;
  let heal = 0;
  let crit = false;
  let note: string | null = null;

  if (skill.ratio > 0 && skill.role !== 'heal') {
    crit = rng.chance(CRIT_CHANCE);
    const spread = rng.float(0.92, 1.08);
    const raw =
      power * skill.ratio * multiplier * actor.attackMod * spread * (crit ? CRIT_MULTIPLIER : 1);
    damage = applyDamage(target, mitigate(raw, target.stats.canCot));
  }

  if (skill.role === 'heal') {
    heal = Math.floor(power * skill.ratio * 1.6);
    actor.hp = Math.min(actor.maxHp, actor.hp + heal);
  }

  switch (skill.effect.kind) {
    case 'poison':
    case 'bleed': {
      const perTick = Math.max(1, Math.floor(power * skill.effect.ratio * multiplier));
      target.effects.push({
        kind: skill.effect.kind,
        turnsLeft: skill.effect.turns,
        value: perTick,
        element: skill.element,
      });
      note = skill.effect.kind === 'poison' ? 'Trúng độc' : 'Thiêu đốt';
      break;
    }
    case 'shield': {
      const amount = Math.floor(actor.maxHp * skill.effect.ratio);
      actor.shield += amount;
      actor.effects.push({
        kind: 'shield',
        turnsLeft: skill.effect.turns,
        value: amount,
        element: skill.element,
      });
      note = 'Hộ thể';
      break;
    }
    case 'empower': {
      actor.attackMod += skill.effect.amount;
      actor.effects.push({
        kind: 'empower',
        turnsLeft: skill.effect.turns,
        value: skill.effect.amount,
        element: skill.element,
      });
      note = 'Tăng công';
      break;
    }
    case 'weaken': {
      target.attackMod = Math.max(0.3, target.attackMod - skill.effect.amount);
      target.effects.push({
        kind: 'weaken',
        turnsLeft: skill.effect.turns,
        value: skill.effect.amount,
        element: skill.element,
      });
      note = 'Giảm công';
      break;
    }
    default:
      break;
  }

  if (note === null && multiplier > 1) note = 'Tương khắc';
  else if (note === null && multiplier < 1) note = 'Bị khắc';

  return { skill: skill.name, element: skill.element, damage, heal, multiplier, crit, note };
}

/** Counts down effects and unwinds the modifiers they applied. */
function tickEffects(combatant: Combatant): void {
  combatant.effects = combatant.effects.filter((effect) => {
    effect.turnsLeft -= 1;
    if (effect.turnsLeft > 0) return true;

    if (effect.kind === 'empower') combatant.attackMod -= effect.value;
    if (effect.kind === 'weaken') combatant.attackMod += effect.value;
    if (effect.kind === 'shield') combatant.shield = Math.max(0, combatant.shield - effect.value);
    return false;
  });
}

/**
 * A duelist's dominant phase, used as the defending element. Taken from the
 * loadout when there is one, so an opponent's arts telegraph their weakness.
 */
function dominantElement(combatant: Combatant): ElementId {
  const counts = new Map<ElementId, number>();
  for (const id of combatant.loadout) {
    const skill = id ? skillById(id) : null;
    if (!skill) continue;
    counts.set(skill.element, (counts.get(skill.element) ?? 0) + 1);
  }

  let best: ElementId = 'tho';
  let bestCount = -1;
  for (const [element, count] of counts) {
    if (count > bestCount) {
      best = element;
      bestCount = count;
    }
  }
  return best;
}
