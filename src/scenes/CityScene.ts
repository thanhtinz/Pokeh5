import Phaser from 'phaser';

import { COLORS, GAME_WIDTH, HUD_HEIGHT, RARITY_COLORS } from '../config';
import { dexEntry } from '../game/data/pokedex';
import { claimableCount } from '../game/data/quests';
import { abbreviate, clock, rate } from '../game/format';
import { expPerHour, goldPerHour } from '../game/idle';
import { NODES_PER_BOARD } from '../game/signs';
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
import { openSigns } from '../ui/systems';
import { TX } from '../ui/textures';
import { TEXT, colorText } from '../ui/theme';
import { COLUMNS, ROWS, drawTown } from '../ui/townmap';
import { Bar, Button, Label, label, panel } from '../ui/widgets';
import { ATLAS } from './PreloadScene';
import type { UiScene } from './UiScene';

/** How often the idle ticker advances the visible counters. */
const TICK_MS = 250;

/** The action strip and navigation live below the map. */
const STRIP_Y = 1048;
const NAV_Y = 1205;

interface BuildingDef {
  key: string;
  name: string;
  x: number;
  y: number;
  /** Dex id whose sprite stands in for the building. */
  icon: string;
  color: number;
  onPress: (scene: CityScene) => void;
  /** Badge count, recomputed on every refresh. */
  badge?: () => number;
}

/**
 * The town's landmarks. Positions are hand-placed against the routes drawn in
 * `townmap.ts`, so each node sits on a path junction rather than floating.
 */
const BUILDINGS: BuildingDef[] = [
  {
    key: 'quests',
    name: 'Nhiệm Vụ',
    x: COLUMNS[0],
    y: ROWS[0],
    icon: '63',
    color: 0x4fc3f7,
    onPress: (scene) => openQuests(scene.ui()),
    badge: () => claimableCount(store.state),
  },
  {
    key: 'ranking',
    name: 'Xếp Hạng',
    x: COLUMNS[1],
    y: ROWS[0],
    icon: '146',
    color: 0xffd44d,
    onPress: (scene) => scene.notReady('Bảng xếp hạng'),
  },
  {
    key: 'safari',
    name: 'Safari',
    x: COLUMNS[2],
    y: ROWS[0],
    icon: '128',
    color: 0x4ade80,
    onPress: (scene) => scene.notReady('Safari'),
  },
  {
    key: 'guild',
    name: 'Bang Hội',
    x: COLUMNS[0],
    y: ROWS[1],
    icon: '113',
    color: 0xef4444,
    onPress: (scene) => scene.notReady('Bang hội'),
  },
  {
    key: 'tourney',
    name: 'Giải Đấu',
    x: COLUMNS[1],
    y: ROWS[1],
    icon: '25',
    color: 0xfbbf24,
    onPress: (scene) => scene.notReady('Giải đấu'),
  },
  {
    key: 'signs',
    name: 'Chòm Sao',
    x: COLUMNS[2],
    y: ROWS[1],
    icon: '151',
    color: 0xc084fc,
    onPress: (scene) => openSigns(scene.ui()),
    // Nudges the player toward the boards while any star is still unlit.
    badge: () => (store.signTotal() < NODES_PER_BOARD ? 1 : 0),
  },
  {
    key: 'maze',
    name: 'Mê Cung',
    x: COLUMNS[2],
    y: ROWS[2],
    icon: '94',
    color: 0xa855f7,
    onPress: (scene) => scene.notReady('Mê cung'),
  },
  {
    key: 'instances',
    name: 'Phó Bản',
    x: COLUMNS[0],
    y: ROWS[2],
    icon: '68',
    color: 0x60a5fa,
    onPress: (scene) => openTrials(scene.ui()),
  },
  {
    key: 'center',
    name: 'Trung Tâm',
    x: COLUMNS[0],
    y: ROWS[3],
    icon: '36',
    color: 0xf472b6,
    onPress: (scene) => openBox(scene.ui()),
  },
  {
    key: 'champion',
    name: 'Đường Vô Địch',
    x: COLUMNS[2],
    y: ROWS[3],
    icon: '150',
    color: 0xffd44d,
    onPress: (scene) => scene.notReady('Đường vô địch'),
  },
  {
    key: 'gym',
    name: 'Thử Thách Gym',
    x: COLUMNS[1],
    y: ROWS[3],
    icon: '6',
    color: 0xff8a5c,
    onPress: (scene) => scene.notReady('Thử thách Gym'),
  },
];

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
  private badges = new Map<string, Button>();

  private sessionStart = 0;
  private accumulator = 0;
  private lastRenderedStage = -1;

  constructor() {
    super('City');
  }

  create(): void {
    this.sessionStart = this.time.now;
    this.badges.clear();
    this.lastRenderedStage = -1;

    drawTown(this);
    this.buildBuildings();
    this.buildHud();
    this.buildActionStrip();
    this.buildNav();

    const unsubscribe = store.events.on('change', () => this.refresh());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
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

  ui(): UiScene {
    return this.scene.get('Ui') as UiScene;
  }

  notReady(name: string): void {
    store.events.emit('toast', { text: `${name} sẽ mở trong bản sau`, tone: 'info' });
  }

  // ----------------------------------------------------------------- map nodes

  private buildBuildings(): void {
    for (const def of BUILDINGS) {
      const button = new Button(this, def.x, def.y, {
        width: 104,
        height: 92,
        texture: TX.btnDark,
        onPress: () => def.onPress(this),
      });
      button.setDepth(def.y);

      // A tinted plate behind the icon is what makes each landmark distinct
      // without needing eleven pieces of bespoke art.
      const plate = this.add.image(0, -4, TX.glow).setDisplaySize(96, 96).setTint(def.color).setAlpha(0.5);
      button.addAt(plate, 1);
      button.add(this.add.image(0, -6, ATLAS.mons, def.icon).setDisplaySize(66, 66));

      const caption = panel(this, def.x, def.y + 62, Math.max(96, def.name.length * 13 + 22), 34, TX.pill);
      caption.setTint(def.color).setDepth(def.y);
      this.add
        .text(def.x, def.y + 61, def.name, TEXT.badge)
        .setOrigin(0.5)
        .setDepth(def.y + 1);

      if (def.badge) this.badges.set(def.key, button);
    }
  }

  // ----------------------------------------------------------------------- hud

  private buildHud(): void {
    panel(this, GAME_WIDTH / 2, HUD_HEIGHT / 2 - 8, GAME_WIDTH + 40, HUD_HEIGHT, TX.panel).setDepth(900);

    const hud = this.add.container(0, 0).setDepth(901);

    // Avatar: the lead Pokemon stands in for a trainer portrait.
    hud.add(this.add.circle(62, 52, 40, COLORS.bgSlot).setStrokeStyle(4, COLORS.textGold));
    this.leadSprite = this.add.image(62, 52, ATLAS.portraits, '1').setDisplaySize(70, 70);
    hud.add(this.leadSprite);

    hud.add(this.add.circle(62, 88, 18, COLORS.bgDeep).setStrokeStyle(3, COLORS.accent));
    this.levelValue = label(this, 62, 88, '1', TEXT.badge).setOrigin(0.5);
    hud.add(this.levelValue);

    hud.add(this.add.text(122, 30, 'BP', colorText(TEXT.small, COLORS.textGold)).setOrigin(0, 0.5));
    this.bpValue = label(this, 164, 30, '0', {
      ...TEXT.title,
      fontSize: '34px',
      color: '#ffd44d',
    }).setOrigin(0, 0.5);
    hud.add(this.bpValue);

    hud.add(this.buildResource(452, 30, 'gold'));
    hud.add(this.buildResource(620, 30, 'gem'));

    this.expBar = new Bar(this, 400, 74, { width: 540, height: 26, color: COLORS.expBar });
    hud.add(this.expBar);
    hud.add(this.add.text(122, 74, 'EXP', colorText(TEXT.tiny, COLORS.textDim)).setOrigin(0, 0.5));
    this.expValue = label(this, 400, 74, '', TEXT.badge).setOrigin(0.5);
    hud.add(this.expValue);

    const shortcuts: [string, string, () => void][] = [
      ['VIP', TX.btnGold, () => this.notReady('VIP')],
      ['Nạp', TX.btnPurple, () => this.notReady('Nạp thẻ')],
      ['Thư', TX.btnBlue, () => this.notReady('Hòm thư')],
    ];
    shortcuts.forEach(([text, texture, onPress], index) => {
      hud.add(
        new Button(this, 190 + index * 178, 136, {
          width: 164,
          height: 58,
          texture,
          label: text,
          labelStyle: TEXT.buttonSmall,
          onPress,
        }),
      );
    });
  }

  private buildResource(x: number, y: number, kind: 'gold' | 'gem'): Phaser.GameObjects.Container {
    const plate = panel(this, 0, 0, 156, 44, TX.pill);
    plate.setTint(kind === 'gold' ? 0xffd77a : 0x7fd8ff);

    const coin = this.add
      .circle(-58, 0, 15, kind === 'gold' ? COLORS.textGold : COLORS.accent)
      .setStrokeStyle(2, 0x0b1020);

    const value = label(this, 62, 0, '0', TEXT.small).setOrigin(1, 0.5);
    if (kind === 'gold') this.goldValue = value;
    else this.gemValue = value;

    return this.add.container(x, y, [plate, coin, value]);
  }

  // -------------------------------------------------------------- action strip

  private buildActionStrip(): void {
    const strip = this.add.container(0, 0).setDepth(880);
    strip.add(panel(this, GAME_WIDTH / 2, STRIP_Y, GAME_WIDTH + 40, 168, TX.panel));

    // Current stage, with the boss it is named after.
    this.foeSprite = this.add.image(58, STRIP_Y - 36, ATLAS.mons, '1').setDisplaySize(84, 84);
    strip.add(this.foeSprite);

    this.stageValue = label(this, 108, STRIP_Y - 52, '', {
      ...TEXT.body,
      color: '#ffd44d',
    }).setOrigin(0, 0.5);
    this.regionValue = label(this, 108, STRIP_Y - 20, '', TEXT.tiny).setOrigin(0, 0.5);
    strip.add(this.stageValue);
    strip.add(this.regionValue);

    strip.add(
      this.add.text(560, STRIP_Y - 52, 'Vàng', colorText(TEXT.tiny, COLORS.textGold)).setOrigin(0, 0.5),
    );
    strip.add(
      this.add.text(560, STRIP_Y - 20, 'EXP', colorText(TEXT.tiny, COLORS.success)).setOrigin(0, 0.5),
    );
    this.goldRate = label(this, 690, STRIP_Y - 52, '', TEXT.small).setOrigin(1, 0.5);
    this.expRate = label(this, 690, STRIP_Y - 20, '', TEXT.small).setOrigin(1, 0.5);
    strip.add(this.goldRate);
    strip.add(this.expRate);

    this.sessionClock = label(this, 460, STRIP_Y - 36, '00:00', TEXT.tiny).setOrigin(0.5);
    strip.add(this.sessionClock);

    // Stage stepper, so a wall can be farmed instead of repeatedly failed.
    strip.add(
      new Button(this, 52, STRIP_Y + 46, {
        width: 64,
        height: 62,
        texture: TX.btnDark,
        label: '◀',
        labelStyle: TEXT.buttonSmall,
        onPress: () => store.stepStage(-1),
      }),
    );
    strip.add(
      new Button(this, 124, STRIP_Y + 46, {
        width: 64,
        height: 62,
        texture: TX.btnDark,
        label: '▶',
        labelStyle: TEXT.buttonSmall,
        onPress: () => store.stepStage(1),
      }),
    );
    strip.add(
      new Button(this, 288, STRIP_Y + 46, {
        width: 210,
        height: 66,
        texture: TX.btnDark,
        label: 'Đánh Nhanh',
        labelStyle: TEXT.buttonSmall,
        onPress: () => this.quickBattle(),
      }),
    );
    strip.add(
      new Button(this, 546, STRIP_Y + 46, {
        width: 268,
        height: 74,
        texture: TX.btnRed,
        label: 'Chiến Đấu',
        onPress: () => this.startBattle(),
      }),
    );
  }

  private buildNav(): void {
    const nav = this.add.container(0, 0).setDepth(890);
    nav.add(panel(this, GAME_WIDTH / 2, NAV_Y + 40, GAME_WIDTH + 40, 150, TX.panelAlt));

    const entries: [string, string, string, string, () => void][] = [
      ['Cửa hàng', 'nugget', ATLAS.items, TX.btnBlue, () => openShop(this.ui())],
      ['Túi đồ', 'poke-ball', ATLAS.items, TX.btnGreen, () => openBag(this.ui())],
      ['Pokémon', '133', ATLAS.mons, TX.btnGold, () => openBox(this.ui())],
      ['Đội hình', '9', ATLAS.mons, TX.btnPurple, () => openFormation(this.ui())],
      ['Triệu hồi', 'master-ball', ATLAS.items, TX.btnRed, () => openSummon(this.ui())],
    ];

    entries.forEach(([caption, icon, atlas, texture, onPress], index) => {
      const x = 88 + index * 136;
      const button = new Button(this, x, NAV_Y, {
        width: 104,
        height: 88,
        texture,
        onPress,
      });
      button.add(this.add.image(0, -4, atlas, icon).setDisplaySize(58, 58));
      nav.add(button);
      nav.add(
        this.add
          .text(x, NAV_Y + 56, caption, colorText(TEXT.tiny, COLORS.text))
          .setOrigin(0.5)
          .setStroke('#08101f', 4),
      );
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
    this.goldRate.set(rate(goldPerHour(state)));
    this.expRate.set(rate(expPerHour(state)));

    for (const def of BUILDINGS) {
      const button = this.badges.get(def.key);
      if (button && def.badge) button.setBadge(def.badge());
    }

    const lead = activeTeam(state)[0];
    if (lead) {
      this.leadSprite.setTexture(ATLAS.portraits, String(dexEntry(lead.dexId).id));
      this.leadSprite.setDisplaySize(70, 70);
    }

    // The boss art only changes when the stage does.
    if (this.lastRenderedStage !== info.stage) {
      this.lastRenderedStage = info.stage;
      this.foeSprite.setTexture(ATLAS.mons, String(stageLeaderDexId(info.stage)));
      this.foeSprite.setDisplaySize(84, 84);
      this.foeSprite.setTint(info.isBoss ? RARITY_COLORS[5]! : 0xffffff);
    }
  }
}
