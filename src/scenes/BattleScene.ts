import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH, TYPE_COLORS } from '../config';
import { effectivenessLabel, toCombatant, type BattleEvent, type BattleResult, type Combatant } from '../game/battle';
import { dexEntry } from '../game/data/pokedex';
import { abbreviate } from '../game/format';
import { buildStageTeam, stageInfo } from '../game/stages';
import { activeTeam } from '../game/state';
import { store } from '../game/store';
import { TX } from '../ui/textures';
import { TEXT, colorText } from '../ui/theme';
import { Bar, Button, label, panel } from '../ui/widgets';
import { ATLAS } from './PreloadScene';

interface Fighter {
  sprite: Phaser.GameObjects.Image;
  bar: Bar;
  root: Phaser.GameObjects.Container;
  maxHp: number;
}

/**
 * Both sides field up to six, so they are laid out as a 2x3 grid rather than a
 * single line: the front column sits nearer the centre, and each row gets
 * enough height for a sprite, a health bar and a name without overlapping.
 */
const FRONT_X = { ally: 258, foe: GAME_WIDTH - 258 };
const COLUMN_GAP = 160;
const ROW_GAP = 148;
const ARENA_CENTRE_Y = 630;
const STEP_MS = 320;

/**
 * Replays a fight that `store.fight()` already decided. Nothing here can change
 * the outcome — the scene is only a viewer over the event log, so a player
 * skipping the animation can never desync their save from what they watched.
 */
export class BattleScene extends Phaser.Scene {
  private allies: Fighter[] = [];
  private foes: Fighter[] = [];
  private result!: BattleResult;
  private cursor = 0;
  private banner!: ReturnType<typeof label>;
  private speedButton!: Button;
  private speedFactor = 1;
  private finished = false;

  constructor() {
    super('Battle');
  }

  create(): void {
    this.allies = [];
    this.foes = [];
    this.cursor = 0;
    this.finished = false;
    this.speedFactor = 1;

    // Snapshot both rosters before fighting: a win advances `state.stage`, and
    // what is drawn has to be the stage that was actually fought.
    const info = stageInfo(store.state.stage);
    const allyUnits = activeTeam(store.state).map((mon) => toCombatant(mon));
    const foeUnits = buildStageTeam(info.stage);

    this.result = store.fight();

    this.buildBackdrop(info.region, info.stage, info.isBoss);
    this.allies = allyUnits.map((unit, index) =>
      this.buildFighter(unit, index, allyUnits.length, 'ally'),
    );
    this.foes = foeUnits.map((unit, index) => this.buildFighter(unit, index, foeUnits.length, 'foe'));
    this.buildControls();

    this.time.delayedCall(300, () => this.playNext());
  }

  private buildBackdrop(region: string, stage: number, isBoss: boolean): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x2a1d3d, 0x2a1d3d, 0x0b101c, 0x141c33, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TX.vignette)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setAlpha(0.9);

    panel(this, GAME_WIDTH / 2, 78, GAME_WIDTH - 60, 116, TX.panel);
    this.add
      .text(GAME_WIDTH / 2, 56, `Ải ${stage}${isBoss ? '  ★ BOSS' : ''}`, {
        ...TEXT.heading,
        color: isBoss ? '#ffd44d' : '#eaf0ff',
      })
      .setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 96, region, TEXT.smallDim).setOrigin(0.5);

    this.banner = label(this, GAME_WIDTH / 2, 380, '', { ...TEXT.title, color: '#ffd44d' })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(3000);
  }

  private buildFighter(
    unit: Combatant,
    index: number,
    total: number,
    side: 'ally' | 'foe',
  ): Fighter {
    const entry = dexEntry(unit.dexId);
    const isAlly = side === 'ally';

    const column = index % 2;
    const row = Math.floor(index / 2);
    const rows = Math.ceil(total / 2);

    // The back column steps away from the centre line, and the block is centred
    // on the arena so a party of two sits where a party of six would.
    const x = FRONT_X[side] + (isAlly ? -1 : 1) * column * COLUMN_GAP;
    const y = ARENA_CENTRE_Y - ((rows - 1) * ROW_GAP) / 2 + row * ROW_GAP;

    const root = this.add.container(x, y);
    // Lower fighters overlap the ones behind them, never the other way round.
    root.setDepth(1000 + y);

    const shadow = this.add.image(0, 42, TX.ground).setDisplaySize(132, 42);
    const sprite = this.add
      .image(0, 0, ATLAS.mons, String(unit.dexId))
      .setDisplaySize(116, 116)
      .setFlipX(!isAlly);

    const bar = new Bar(this, 0, 62, { width: 124, height: 16, color: COLORS.hpFull });
    const name = this.add
      .text(0, 84, `${entry.name} Lv.${unit.level}`, colorText(TEXT.tiny, isAlly ? COLORS.accent : COLORS.danger))
      .setOrigin(0.5);

    root.add([shadow, sprite, bar, name]);

    return { sprite, bar, root, maxHp: unit.maxHp };
  }

  private buildControls(): void {
    this.speedButton = new Button(this, GAME_WIDTH - 110, GAME_HEIGHT - 88, {
      width: 180,
      height: 72,
      texture: TX.btnDark,
      label: 'x1',
      onPress: () => this.toggleSpeed(),
    });

    new Button(this, 130, GAME_HEIGHT - 88, {
      width: 200,
      height: 72,
      texture: TX.btnRed,
      label: 'Bỏ qua',
      onPress: () => this.finish(),
    });
  }

  private toggleSpeed(): void {
    this.speedFactor = this.speedFactor === 1 ? 3 : 1;
    this.speedButton.setLabel(`x${this.speedFactor}`);
  }

  /** Walks the event log one entry at a time, animating each. */
  private playNext(): void {
    if (this.finished) return;

    if (this.cursor >= this.result.events.length) {
      this.finish();
      return;
    }

    const event = this.result.events[this.cursor]!;
    this.cursor += 1;
    const delay = this.applyEvent(event) / this.speedFactor;

    this.time.delayedCall(Math.max(16, delay), () => this.playNext());
  }

  private applyEvent(event: BattleEvent): number {
    switch (event.type) {
      case 'round':
        return 0;

      case 'attack': {
        const attacker = event.side === 'ally' ? this.allies[event.attacker] : this.foes[event.attacker];
        const target = event.side === 'ally' ? this.foes[event.target] : this.allies[event.target];
        if (!attacker || !target) return 0;

        this.lunge(attacker, event.side === 'ally' ? 1 : -1);
        this.flash(target, TYPE_COLORS[event.moveType] ?? 0xffffff);
        this.damageNumber(target, event.damage, event.crit, event.effectiveness);

        const note = effectivenessLabel(event.effectiveness);
        if (note) this.showBanner(note, 420);

        // Health comes from the log rather than being recomputed, so the bars
        // can never drift from the fight that was scored.
        target.bar.setHealth(event.targetHp / target.maxHp);

        return STEP_MS;
      }

      case 'faint': {
        const team = event.side === 'ally' ? this.allies : this.foes;
        const fighter = team[event.index];
        if (!fighter) return 0;

        this.tweens.add({
          targets: fighter.root,
          alpha: 0,
          y: fighter.root.y + 26,
          duration: 260 / this.speedFactor,
          ease: 'Quad.easeIn',
        });
        return 200;
      }

      case 'end':
        this.showBanner(event.winner === 'ally' ? 'CHIẾN THẮNG!' : 'THẤT BẠI', 1200);
        return 1400;
    }
  }

  private lunge(fighter: Fighter, direction: number): void {
    this.tweens.add({
      targets: fighter.root,
      x: fighter.root.x + 34 * direction,
      duration: 110 / this.speedFactor,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private flash(fighter: Fighter, color: number): void {
    fighter.sprite.setTint(color);
    this.tweens.add({
      targets: fighter.sprite,
      alpha: 0.35,
      duration: 90 / this.speedFactor,
      yoyo: true,
      onComplete: () => {
        fighter.sprite.clearTint();
        fighter.sprite.setAlpha(1);
      },
    });
  }

  private damageNumber(fighter: Fighter, amount: number, crit: boolean, effectiveness: number): void {
    const color = crit ? COLORS.warn : effectiveness >= 2 ? COLORS.danger : 0xffffff;
    const text = this.add
      .text(fighter.root.x, fighter.root.y - 40, `-${abbreviate(amount)}`, {
        ...TEXT.body,
        fontSize: crit ? '32px' : '24px',
        color: `#${color.toString(16).padStart(6, '0')}`,
      })
      .setOrigin(0.5)
      .setDepth(2500);

    this.tweens.add({
      targets: text,
      y: text.y - 54,
      alpha: 0,
      duration: 620 / this.speedFactor,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private showBanner(text: string, hold: number): void {
    this.banner.set(text);
    this.banner.setAlpha(1).setScale(0.7);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: hold / this.speedFactor,
      duration: 200,
    });
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;

    const won = this.result.winner === 'ally';
    store.events.emit('toast', {
      text: won ? 'Vượt ải thành công!' : 'Chưa đủ mạnh, thử lại nhé',
      tone: won ? 'good' : 'bad',
    });

    this.scene.stop();
    this.scene.resume('City');
  }
}
