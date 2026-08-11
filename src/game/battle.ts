import type { ArtifactLevels } from './artifacts';
import { dexEntry, typeMultiplier } from './data/pokedex';
import { elementMultiplier, elementOf, restrainedBy, type ElementId } from './elements';
import { Rng } from './rng';
import { combatStats } from './stats';
import type { OwnedMon } from './state';

export type Side = 'ally' | 'foe';

export interface Combatant {
  uid: string;
  dexId: number;
  name: string;
  level: number;
  types: string[];
  element: ElementId;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  /** Higher-tier stages hand the enemy a flat damage/bulk bonus. */
  scale: number;
}

export type BattleEvent =
  | {
      type: 'attack';
      side: Side;
      attacker: number;
      target: number;
      damage: number;
      effectiveness: number;
      crit: boolean;
      moveType: string;
      /** True when the attacker's element restrains the defender's. */
      restrained: boolean;
      targetHp: number;
    }
  | { type: 'faint'; side: Side; index: number }
  | { type: 'round'; round: number }
  | { type: 'end'; winner: Side; roundsTaken: number };

export interface BattleResult {
  winner: Side;
  events: BattleEvent[];
  rounds: number;
  /** Fraction of the ally team still standing, used to grade the clear. */
  allySurvivors: number;
  foeSurvivors: number;
}

const MOVE_POWER = 80;
const MAX_ROUNDS = 60;
const CRIT_CHANCE = 0.0625;

export function toCombatant(mon: OwnedMon, scale = 1, artifacts: ArtifactLevels = {}): Combatant {
  const entry = dexEntry(mon.dexId);
  const stats = combatStats(mon, artifacts);
  const maxHp = Math.max(1, Math.floor(stats.hp * scale));

  return {
    uid: mon.uid,
    dexId: mon.dexId,
    name: entry.name,
    level: mon.level,
    types: entry.types,
    element: elementOf(mon.dexId),
    maxHp,
    hp: maxHp,
    atk: stats.atk,
    def: stats.def,
    spa: stats.spa,
    spd: stats.spd,
    spe: stats.spe,
    scale,
  };
}

/**
 * A Pokemon attacks with whichever of its own types hurts the target most, and
 * uses its stronger offensive stat. That keeps the type chart meaningful
 * without asking an idle player to manage a move list.
 */
function chooseMoveType(attacker: Combatant, defender: Combatant): string {
  let best = attacker.types[0] ?? 'normal';
  let bestMultiplier = -1;

  for (const type of attacker.types) {
    const multiplier = typeMultiplier(type, defender.types);
    if (multiplier > bestMultiplier) {
      bestMultiplier = multiplier;
      best = type;
    }
  }
  return best;
}

function damageOf(
  attacker: Combatant,
  defender: Combatant,
  moveType: string,
  signMultiplier: number,
  rng: Rng,
): { damage: number; effectiveness: number; crit: boolean; restrained: boolean } {
  const physical = attacker.atk >= attacker.spa;
  const offence = physical ? attacker.atk : attacker.spa;
  const defence = Math.max(1, physical ? defender.def : defender.spd);

  const effectiveness = typeMultiplier(moveType, defender.types);
  const stab = attacker.types.includes(moveType) ? 1.5 : 1;
  const crit = rng.chance(CRIT_CHANCE);
  const spread = rng.float(0.85, 1);

  // Element restraint is a mild multiplier on its own; the Signs boards are
  // what turn it into a reason to build a team around one element.
  const restrained = restrainedBy(attacker.element) === defender.element;
  const element = elementMultiplier(attacker.element, defender.element) * (restrained ? signMultiplier : 1);

  const raw =
    (((2 * attacker.level) / 5 + 2) * MOVE_POWER * (offence / defence)) / 50 + 2;
  const damage = Math.floor(
    raw * stab * effectiveness * element * (crit ? 1.5 : 1) * spread * attacker.scale,
  );

  return { damage: Math.max(1, damage), effectiveness, crit, restrained };
}

function firstAlive(team: readonly Combatant[]): number {
  return team.findIndex((mon) => mon.hp > 0);
}

/**
 * Runs a whole fight up front and returns the event log. The Battle scene only
 * replays it, so what the player watches always matches what was scored — and
 * the same seed always produces the same fight.
 */
export interface SimulateOptions {
  /** Artifact loadout lookup for the player's Pokemon. */
  artifactsOf?: (uid: string) => ArtifactLevels;
  /** Per-element Signs multiplier, applied only to the player's attacks. */
  signMultipliers?: Record<ElementId, number>;
}

export function simulate(
  allies: readonly OwnedMon[],
  foes: readonly Combatant[],
  seed: number,
  options: SimulateOptions = {},
): BattleResult {
  const rng = new Rng(seed);
  const artifactsOf = options.artifactsOf ?? (() => ({}));
  const allyTeam = allies.map((mon) => toCombatant(mon, 1, artifactsOf(mon.uid)));
  const foeTeam = foes.map((foe) => ({ ...foe }));
  const events: BattleEvent[] = [];

  if (allyTeam.length === 0) {
    events.push({ type: 'end', winner: 'foe', roundsTaken: 0 });
    return { winner: 'foe', events, rounds: 0, allySurvivors: 0, foeSurvivors: foeTeam.length };
  }

  let round = 0;
  let winner: Side | null = null;

  while (round < MAX_ROUNDS && winner === null) {
    round += 1;
    events.push({ type: 'round', round });

    // Everyone alive acts once per round, fastest first; ties break toward the
    // player so a mirror match is not a coin flip against them.
    const order = [
      ...allyTeam.map((mon, index) => ({ side: 'ally' as const, mon, index })),
      ...foeTeam.map((mon, index) => ({ side: 'foe' as const, mon, index })),
    ]
      .filter((actor) => actor.mon.hp > 0)
      .sort((a, b) => b.mon.spe - a.mon.spe || (a.side === 'ally' ? -1 : 1));

    for (const actor of order) {
      if (actor.mon.hp <= 0) continue;

      const defenders = actor.side === 'ally' ? foeTeam : allyTeam;
      const targetIndex = firstAlive(defenders);
      if (targetIndex < 0) break;

      const target = defenders[targetIndex]!;
      const moveType = chooseMoveType(actor.mon, target);
      // Signs are the player's investment, so they never help the enemy.
      const signMultiplier =
        actor.side === 'ally' ? (options.signMultipliers?.[actor.mon.element] ?? 1) : 1;
      const { damage, effectiveness, crit, restrained } = damageOf(
        actor.mon,
        target,
        moveType,
        signMultiplier,
        rng,
      );

      target.hp = Math.max(0, target.hp - damage);
      events.push({
        type: 'attack',
        side: actor.side,
        attacker: actor.index,
        target: targetIndex,
        damage,
        effectiveness,
        crit,
        moveType,
        restrained,
        targetHp: target.hp,
      });

      if (target.hp === 0) {
        events.push({
          type: 'faint',
          side: actor.side === 'ally' ? 'foe' : 'ally',
          index: targetIndex,
        });
      }

      if (firstAlive(defenders) < 0) {
        winner = actor.side;
        break;
      }
    }
  }

  if (winner === null) {
    // A stall-out is decided on remaining health, which favours the team that
    // was actually winning the exchange.
    const health = (team: readonly Combatant[]) =>
      team.reduce((sum, mon) => sum + mon.hp / mon.maxHp, 0) / team.length;
    winner = health(allyTeam) >= health(foeTeam) ? 'ally' : 'foe';
  }

  events.push({ type: 'end', winner, roundsTaken: round });

  return {
    winner,
    events,
    rounds: round,
    allySurvivors: allyTeam.filter((mon) => mon.hp > 0).length,
    foeSurvivors: foeTeam.filter((mon) => mon.hp > 0).length,
  };
}

export function effectivenessLabel(multiplier: number): string | null {
  if (multiplier === 0) return 'Vô hiệu';
  if (multiplier >= 2) return 'Rất hiệu quả!';
  if (multiplier < 1) return 'Không hiệu quả…';
  return null;
}
