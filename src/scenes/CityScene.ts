import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, RARITY_COLORS } from '../config';
import { dexEntry } from '../game/data/pokedex';
import { claimableCount } from '../game/data/quests';
import { abbreviate, clock, rate } from '../game/format';
import { expPerHour, goldPerHour } from '../game/idle';
import { stageInfo, stageLeaderDexId } from '../game/stages';
import { trainerExpToNext } from '../game/stats';
import { activeTeam } from '../game/state';
import { store } from '../game/store';
import {
  openBag,
  openBox,
  openFormation,
  openQuests,
  openShop,
  openSummon,
  openTrials,
} from '../ui/modals';
import { TX } from '../ui/textures';
import { TEXT, colorText } from '../ui/theme';
import { Bar, Button, Label, label, panel } from '../ui/widgets';
import { ATLAS } from './PreloadScene';
import type { UiScene } from './UiScene';

/** Decorative icons; the reference art uses Pokemon for its shortcut buttons. */
const ICON = {
  task: '63',
  daily: '39',
  events: '25',
  friends: '35',
  trainer: '133',
  privilege: '137',
  recharge: '151',
  pack: '143',
  unify: '150',
  invite: '12',
  champion: '146',
  waiting: '131',
  revenge: '68',
  chat: '52',
  guild: '113',
  formation: '6',
} as const;

/** How often the idle ticker advances the visible counters. */
const TICK_MS = 250;

/** Side rail geometry; the centre column is whatever these leave free. */
const RAIL_TOP = 372;
const RAIL_STEP = 104;

/** Vertical anchors for the lower half, kept together so nothing overlaps. */
const ACTION_ROW_Y = 995;
const SHORTCUT_ROW_Y = 1096;
const NAV_ROW_Y = 1232;

export class CityScene extends Phaser.Scene {
  private bpValue!: Label;
  private goldValue!: Label;
  private gemValue!: Label;
  private levelValue!: Label;
  private expBar!: Bar;
  private expValue!: Label;

  private stageValue!: Label;
  private regionValue!: Label;
  private goldRate!: Label;
  private expRate!: Label;
  private sessionClock!: Label;

  private leadSprite!: Phaser.GameObjects.Image;
  private foeSprite!: Phaser.GameObjects.Image;
  private taskButton!: Button;
  private dailyButton!: Button;

  private sessionStart = 0;
  private accumulator = 0;
  private lastRenderedStage = -1;

  constructor() {
    super('City');
  }

  create(): void {
    this.sessionStart = this.time.now;

    this.buildBackground();
    this.buildHud();
    this.buildLeftRail();
    this.buildRightRail();
    this.buildStageScene();
    this.buildIdlePanel();
    this.buildBottomBar();

    const unsubscribe = store.events.on('change', () => this.refresh());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);

    // Coming back from a battle should show the new stage immediately.
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.refresh());

    this.refresh();
  }

  override update(_time: number, delta: number): void {
    this.accumulator += delta;
    if (this.accumulator < TICK_MS) return;

    store.tick(this.accumulator);
    this.accumulator = 0;
    this.sessionClock.set(clock((this.time.now - this.sessionStart) / 1000));
  }

  private ui(): UiScene {
    return this.scene.get('Ui') as UiScene;
  }

  private notReady(name: string): void {
    store.events.emit('toast', { text: `${name} sẽ mở trong bản sau`, tone: 'info' });
  }

  // ---------------------------------------------------------------- background

  private buildBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x1d2a4d, 0x1d2a4d, 0x0b101c, 0x121a30, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // A faint grid reads as a tiled plaza without needing a background image.
    g.lineStyle(1, 0x2b3c66, 0.12);
    for (let x = 0; x <= GAME_WIDTH; x += 60) {
      g.lineBetween(x, HUD_HEIGHT, x, GAME_HEIGHT - 150);
    }
    for (let y = HUD_HEIGHT; y <= GAME_HEIGHT - 150; y += 60) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TX.vignette)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setAlpha(0.85);
  }

  // ----------------------------------------------------------------------- hud

  private buildHud(): void {
    panel(this, GAME_WIDTH / 2, HUD_HEIGHT / 2 - 8, GAME_WIDTH + 40, HUD_HEIGHT, TX.panel);

    // Avatar: the lead Pokemon stands in for a trainer portrait.
    this.add.circle(62, 52, 40, COLORS.bgSlot).setStrokeStyle(4, COLORS.textGold);
    this.leadSprite = this.add.image(62, 52, ATLAS.portraits, '1').setDisplaySize(70, 70);

    this.add.circle(62, 88, 18, COLORS.bgDeep).setStrokeStyle(3, COLORS.accent);
    this.levelValue = label(this, 62, 88, '1', TEXT.badge).setOrigin(0.5);

    this.add.text(122, 30, 'BP', colorText(TEXT.small, COLORS.textGold)).setOrigin(0, 0.5);
    this.bpValue = label(this, 164, 30, '0', {
      ...TEXT.title,
      fontSize: '34px',
      color: '#ffd44d',
    }).setOrigin(0, 0.5);

    this.buildResource(452, 30, 'gold');
    this.buildResource(620, 30, 'gem');

    this.expBar = new Bar(this, 400, 74, { width: 540, height: 26, color: COLORS.expBar });
    this.add.text(122, 74, 'EXP', colorText(TEXT.tiny, COLORS.textDim)).setOrigin(0, 0.5);
    this.expValue = label(this, 400, 74, '', TEXT.badge).setOrigin(0.5);

    const shortcuts: [string, string, () => void][] = [
      ['VIP', TX.btnGold, () => this.notReady('VIP')],
      ['Nạp', TX.btnPurple, () => this.notReady('Nạp thẻ')],
      ['Thư', TX.btnBlue, () => this.notReady('Hòm thư')],
    ];
    shortcuts.forEach(([text, texture, onPress], index) => {
      new Button(this, 190 + index * 178, 136, {
        width: 164,
        height: 58,
        texture,
        label: text,
        labelStyle: TEXT.buttonSmall,
        onPress,
      });
    });
  }

  private buildResource(x: number, y: number, kind: 'gold' | 'gem'): void {
    const plate = panel(this, x, y, 156, 44, TX.pill);
    plate.setTint(kind === 'gold' ? 0xffd77a : 0x7fd8ff);

    this.add
      .circle(x - 58, y, 15, kind === 'gold' ? COLORS.textGold : COLORS.accent)
      .setStrokeStyle(2, 0x0b1020);

    const value = label(this, x + 62, y, '0', TEXT.small).setOrigin(1, 0.5);
    if (kind === 'gold') this.goldValue = value;
    else this.gemValue = value;
  }

  // --------------------------------------------------------------------- rails

  /**
   * Square icon shortcut with a caption under it, matching the rails of the
   * reference layout.
   */
  private iconButton(
    x: number,
    y: number,
    caption: string,
    icon: string,
    texture: string,
    onPress: () => void,
    atlas: string = ATLAS.mons,
  ): Button {
    const button = new Button(this, x, y, { width: 92, height: 82, texture, onPress });
    button.add(this.add.image(0, -6, atlas, icon).setDisplaySize(56, 56));
    this.add
      .text(x, y + 52, caption, colorText(TEXT.tiny, COLORS.text))
      .setOrigin(0.5)
      .setStroke('#08101f', 4);
    return button;
  }

  private buildLeftRail(): void {
    const row = 246;
    this.taskButton = this.iconButton(74, row, 'Nhiệm vụ', ICON.task, TX.btnBlue, () =>
      openQuests(this.ui()),
    );
    this.dailyButton = this.iconButton(184, row, 'Hằng ngày', ICON.daily, TX.btnPurple, () =>
      openQuests(this.ui()),
    );
    this.iconButton(294, row, 'Sự kiện', ICON.events, TX.btnGold, () => this.notReady('Sự kiện'));
    this.iconButton(404, row, 'Bạn bè', ICON.friends, TX.btnGreen, () => this.notReady('Bạn bè'));

    const rail: [string, string, string, () => void][] = [
      ['Huấn luyện', ICON.trainer, TX.btnBlue, () => this.notReady('Huấn luyện')],
      ['Đặc quyền', ICON.privilege, TX.btnPurple, () => this.notReady('Đặc quyền')],
      ['Nạp lần đầu', ICON.recharge, TX.btnGold, () => this.notReady('Nạp lần đầu')],
      ['Gói ưu đãi', ICON.pack, TX.btnRed, () => this.notReady('Gói ưu đãi')],
      ['Thống nhất', ICON.unify, TX.btnDark, () => this.notReady('Thống nhất')],
      ['Mời bạn', ICON.invite, TX.btnGreen, () => this.notReady('Mời bạn')],
    ];
    rail.forEach(([caption, icon, texture, onPress], index) => {
      this.iconButton(74, RAIL_TOP + index * RAIL_STEP, caption, icon, texture, onPress);
    });
  }

  private buildRightRail(): void {
    const rail: [string, string, string, () => void][] = [
      ['Đấu Trường', ICON.champion, TX.btnGold, () => this.notReady('Đấu Trường')],
      ['Chờ trận', ICON.waiting, TX.btnBlue, () => this.notReady('Chờ trận')],
      ['Phục thù', ICON.revenge, TX.btnRed, () => this.notReady('Phục thù')],
      ['Trò chuyện', ICON.chat, TX.btnPurple, () => this.notReady('Trò chuyện')],
    ];
    rail.forEach(([caption, icon, texture, onPress], index) => {
      this.iconButton(646, RAIL_TOP + index * RAIL_STEP, caption, icon, texture, onPress);
    });
  }

  // ------------------------------------------------------------- centre + idle

  private buildStageScene(): void {
    const groundY = 660;

    this.stageValue = label(this, GAME_WIDTH / 2, 412, '', {
      ...TEXT.heading,
      color: '#ffd44d',
    }).setOrigin(0.5);
    this.regionValue = label(this, GAME_WIDTH / 2, 450, '', colorText(TEXT.small, COLORS.textDim)).setOrigin(0.5);
    this.sessionClock = label(this, GAME_WIDTH / 2, 484, '00:00', colorText(TEXT.tiny, COLORS.textDim)).setOrigin(0.5);

    this.add.image(288, groundY + 32, TX.ground).setDisplaySize(210, 66);
    this.add.image(456, groundY + 32, TX.ground).setDisplaySize(210, 66);

    const ally = this.add.image(288, groundY, ATLAS.mons, '1').setDisplaySize(196, 196);
    const foe = this.add.image(456, groundY, ATLAS.mons, '1').setDisplaySize(196, 196).setFlipX(true);
    this.foeSprite = foe;
    this.allySprite = ally;

    // A slow bob is enough to stop the hub reading as a still image.
    this.tweens.add({
      targets: [ally, foe],
      y: groundY - 10,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private allySprite!: Phaser.GameObjects.Image;

  private buildIdlePanel(): void {
    const x = 574;
    const y = 862;
    panel(this, x, y, 268, 150, TX.panelSlot);

    const rows: [string, number][] = [
      ['Boss', COLORS.danger],
      ['Vàng', COLORS.textGold],
      ['EXP', COLORS.success],
    ];
    rows.forEach(([name, color], index) => {
      this.add
        .text(x - 116, y - 46 + index * 46, name, colorText(TEXT.small, color))
        .setOrigin(0, 0.5);
    });

    this.stageValueRight = label(this, x + 116, y - 46, '', TEXT.small).setOrigin(1, 0.5);
    this.goldRate = label(this, x + 116, y, '', TEXT.small).setOrigin(1, 0.5);
    this.expRate = label(this, x + 116, y + 46, '', TEXT.small).setOrigin(1, 0.5);

    new Button(this, x, ACTION_ROW_Y, {
      width: 240,
      height: 88,
      texture: TX.btnRed,
      label: 'Chiến Đấu',
      onPress: () => this.startBattle(),
    });

    new Button(this, 352, ACTION_ROW_Y, {
      width: 186,
      height: 74,
      texture: TX.btnDark,
      label: 'Đánh Nhanh',
      labelStyle: TEXT.buttonSmall,
      onPress: () => this.quickBattle(),
    });

    // Stage stepper, so a wall can be farmed instead of repeatedly failed.
    new Button(this, 128, ACTION_ROW_Y, {
      width: 70,
      height: 70,
      texture: TX.btnDark,
      label: '◀',
      onPress: () => store.stepStage(-1),
    });
    new Button(this, 210, ACTION_ROW_Y, {
      width: 70,
      height: 70,
      texture: TX.btnDark,
      label: '▶',
      onPress: () => store.stepStage(1),
    });
  }

  private stageValueRight!: Label;

  // -------------------------------------------------------------- bottom bars

  private buildBottomBar(): void {
    const shortcuts: [string, string, string, () => void, string][] = [
      ['Cửa hàng', 'nugget', TX.btnBlue, () => openShop(this.ui()), ATLAS.items],
      ['Túi đồ', 'poke-ball', TX.btnGreen, () => openBag(this.ui()), ATLAS.items],
      ['Bang hội', ICON.guild, TX.btnRed, () => this.notReady('Bang hội'), ATLAS.mons],
      ['Đội hình', ICON.formation, TX.btnPurple, () => openFormation(this.ui()), ATLAS.mons],
      ['Triệu hồi', 'master-ball', TX.btnGold, () => openSummon(this.ui()), ATLAS.items],
    ];
    shortcuts.forEach(([caption, icon, texture, onPress, atlas], index) => {
      this.iconButton(88 + index * 136, SHORTCUT_ROW_Y, caption, icon, texture, onPress, atlas);
    });

    const navY = NAV_ROW_Y;
    panel(this, GAME_WIDTH / 2, navY + 12, GAME_WIDTH + 40, 108, TX.panelAlt);

    const nav: [string, string, () => void][] = [
      ['Thành', TX.btnGreen, () => undefined],
      ['Pokémon', TX.btnDark, () => openBox(this.ui())],
      ['Đội', TX.btnDark, () => openFormation(this.ui())],
      ['Thử thách', TX.btnDark, () => openTrials(this.ui())],
      ['Shop', TX.btnDark, () => openShop(this.ui())],
    ];
    nav.forEach(([caption, texture, onPress], index) => {
      new Button(this, 76 + index * 142, navY, {
        width: 132,
        height: 74,
        texture,
        label: caption,
        labelStyle: TEXT.buttonSmall,
        onPress,
      });
    });
  }

  // -------------------------------------------------------------------- battle

  private startBattle(): void {
    if (activeTeam(store.state).length === 0) {
      store.events.emit('toast', { text: 'Đội hình đang trống', tone: 'bad' });
      return;
    }
    this.scene.pause();
    this.scene.launch('Battle');
  }

  /** Resolves the fight without animating it — the idle player's shortcut. */
  private quickBattle(): void {
    if (activeTeam(store.state).length === 0) {
      store.events.emit('toast', { text: 'Đội hình đang trống', tone: 'bad' });
      return;
    }

    const info = stageInfo(store.state.stage);
    const result = store.fight();
    store.events.emit('toast', {
      text:
        result.winner === 'ally'
          ? `Vượt ải #${info.stage}  +${abbreviate(info.goldReward)} vàng`
          : `Thua ải #${info.stage}`,
      tone: result.winner === 'ally' ? 'good' : 'bad',
    });
  }

  // ------------------------------------------------------------------- refresh

  private refresh(): void {
    const state = store.state;

    this.bpValue.set(abbreviate(store.power()));
    this.goldValue.set(abbreviate(state.gold));
    this.gemValue.set(abbreviate(state.diamonds));
    this.levelValue.set(String(state.level));

    const need = trainerExpToNext(state.level);
    this.expBar.setRatio(state.exp / need);
    this.expValue.set(`${abbreviate(state.exp)} / ${abbreviate(need)}`);

    const info = stageInfo(state.stage);
    this.stageValue.set(`Ải ${info.stage}${info.isBoss ? '  ★ BOSS' : ''}`);
    this.regionValue.set(info.region);
    this.stageValueRight.set(`No. ${info.stage}`);
    this.goldRate.set(rate(goldPerHour(state)));
    this.expRate.set(rate(expPerHour(state)));

    const claimable = claimableCount(state);
    this.taskButton.setBadge(claimable);
    this.dailyButton.setBadge(claimable);

    const lead = activeTeam(state)[0];
    if (lead) {
      const entry = dexEntry(lead.dexId);
      this.leadSprite.setTexture(ATLAS.portraits, String(entry.id));
      this.allySprite.setTexture(ATLAS.mons, String(entry.id));
      this.allySprite.setDisplaySize(176, 176);
    }

    // The enemy art only changes when the stage does; re-tinting every tick
    // would fight the bob tween for no reason.
    if (this.lastRenderedStage !== info.stage) {
      this.lastRenderedStage = info.stage;
      const foeId = stageLeaderDexId(info.stage);
      this.foeSprite.setTexture(ATLAS.mons, String(foeId));
      this.foeSprite.setDisplaySize(176, 176);
      this.foeSprite.setTint(info.isBoss ? RARITY_COLORS[5]! : 0xffffff);
    }
  }
}
