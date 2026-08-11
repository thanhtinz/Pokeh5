import Phaser from 'phaser';

import { COLORS, RARITY_COLORS, RARITY_NAMES, TEAM_SIZE, TYPE_COLORS, TYPE_NAMES_VI } from '../config';
import { DAILY_QUESTS, isQuestClaimed, isQuestComplete, questProgress } from '../game/data/quests';
import { ITEMS, itemDef } from '../game/data/items';
import { dexEntry } from '../game/data/pokedex';
import { abbreviate } from '../game/format';
import { BANNERS, type SummonOutcome } from '../game/gacha';
import { battlePower, combatStats, expToNext } from '../game/stats';
import { activeTeam, findMon, itemCount, type OwnedMon } from '../game/state';
import { store } from '../game/store';
import type { UiScene } from '../scenes/UiScene';
import { ATLAS } from '../scenes/PreloadScene';
import { ScrollView } from './scroll';
import { TX } from './textures';
import { TEXT, colorText } from './theme';
import { Bar, Button, chip, label, panel, stars } from './widgets';

const DIALOG_W = 660;
const DIALOG_H = 940;

/** Compact roster card: portrait, name, level, stars and battle power. */
function monCard(
  scene: Phaser.Scene,
  mon: OwnedMon,
  width: number,
  height: number,
  onPress?: () => void,
): Phaser.GameObjects.Container {
  const entry = dexEntry(mon.dexId);
  const rarity = RARITY_COLORS[entry.rarity] ?? COLORS.textDim;

  const plate = panel(scene, 0, 0, width, height, TX.panelSlot);
  plate.setTint(rarity);

  const portrait = scene.add
    .image(-width / 2 + 56, 0, ATLAS.portraits, String(entry.id))
    .setDisplaySize(84, 84);

  const name = label(scene, -width / 2 + 112, -30, entry.name, TEXT.body).setOrigin(0, 0.5);
  const lv = label(
    scene,
    -width / 2 + 112,
    2,
    `Lv.${mon.level}`,
    colorText(TEXT.small, COLORS.textDim),
  ).setOrigin(0, 0.5);

  const power = label(
    scene,
    width / 2 - 20,
    -28,
    abbreviate(battlePower(mon)),
    colorText(TEXT.stat, COLORS.textGold),
  ).setOrigin(1, 0.5);
  const powerTag = label(
    scene,
    width / 2 - 20,
    0,
    'BP',
    colorText(TEXT.tiny, COLORS.textDim),
  ).setOrigin(1, 0.5);

  const children: Phaser.GameObjects.GameObject[] = [
    plate,
    portrait,
    name,
    lv,
    power,
    powerTag,
    stars(scene, -width / 2 + 112 + 28, 30, mon.star, 15),
  ];

  entry.types.forEach((type, index) => {
    children.push(
      chip(
        scene,
        width / 2 - 74 - index * 84,
        32,
        TYPE_NAMES_VI[type] ?? type,
        TYPE_COLORS[type] ?? COLORS.stroke,
        78,
        28,
      ),
    );
  });

  const card = scene.add.container(0, 0, children);
  card.setSize(width, height);

  if (onPress) {
    card.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    card.on('pointerup', onPress);
  }
  return card;
}

/** Daily quest list with claim buttons. */
export function openQuests(scene: UiScene): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame('Nhiệm vụ hằng ngày', DIALOG_W, 540, close);

    DAILY_QUESTS.forEach((quest, index) => {
      const y = -150 + index * 130;
      const progress = questProgress(store.state, quest);
      const done = isQuestComplete(store.state, quest);
      const claimed = isQuestClaimed(store.state, quest);

      body.add(panel(ui, 0, y, DIALOG_W - 70, 116, TX.panelSlot));
      body.add(ui.add.text(-DIALOG_W / 2 + 60, y - 30, quest.name, TEXT.body).setOrigin(0, 0.5));

      const reward = [
        quest.reward.gold ? `${abbreviate(quest.reward.gold)} vàng` : null,
        quest.reward.diamonds ? `${quest.reward.diamonds} KC` : null,
        quest.reward.tickets ? `${quest.reward.tickets} vé` : null,
      ]
        .filter(Boolean)
        .join('  •  ');
      body.add(
        ui.add.text(-DIALOG_W / 2 + 60, y + 30, reward, colorText(TEXT.tiny, COLORS.textGold)).setOrigin(0, 0.5),
      );

      const bar = new Bar(ui, -DIALOG_W / 2 + 200, y + 2, {
        width: 250,
        height: 24,
        color: done ? COLORS.success : COLORS.accent,
        showText: true,
      });
      bar.setRatio(progress / quest.target, `${progress}/${quest.target}`);
      body.add(bar);

      const button = new Button(ui, DIALOG_W / 2 - 110, y, {
        width: 140,
        height: 66,
        texture: claimed ? TX.btnDark : done ? TX.btnGreen : TX.btnDark,
        label: claimed ? 'Đã nhận' : 'Nhận',
        labelStyle: TEXT.buttonSmall,
        onPress: () => {
          if (store.claimQuest(quest)) {
            close();
            openQuests(ui);
          }
        },
      });
      button.setEnabled(done && !claimed);
      body.add(button);
    });

    return [container];
  });
}

/** The full box, sorted strongest first. */
export function openBox(scene: UiScene): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame(
      `Pokémon (${store.state.box.length})`,
      DIALOG_W,
      DIALOG_H,
      close,
    );

    const list = new ScrollView(ui, {
      x: 0,
      y: 30,
      width: DIALOG_W - 50,
      height: DIALOG_H - 130,
    });
    body.add(list);

    const roster = [...store.state.box].sort((a, b) => battlePower(b) - battlePower(a));
    const cardH = 118;
    roster.forEach((mon, index) => {
      const card = monCard(ui, mon, DIALOG_W - 90, cardH - 10, () => {
        // A drag that ends over a card must not read as a tap on it.
        if (list.isScrolling) return;
        close();
        openMonDetail(ui, mon.uid);
      });
      card.y = -list.innerHeight / 2 + cardH / 2 + index * cardH;
      list.content.add(card);
    });
    list.setContentHeight(roster.length * cardH);

    return [container];
  });
}

/** Stat sheet for one Pokemon, with the option to field it. */
export function openMonDetail(scene: UiScene, uid: string): void {
  scene.openModal((ui, close) => {
    const mon = findMon(store.state, uid);
    if (!mon) return [];

    const entry = dexEntry(mon.dexId);
    const stats = combatStats(mon);
    const { container, body } = ui.dialogFrame(entry.name, DIALOG_W, 780, close);

    body.add(ui.add.image(0, -230, ATLAS.portraits, String(entry.id)).setDisplaySize(190, 190));
    body.add(stars(ui, 0, -120, mon.star, 26));

    entry.types.forEach((type, index) => {
      const offset = (index - (entry.types.length - 1) / 2) * 130;
      body.add(
        chip(ui, offset, -76, TYPE_NAMES_VI[type] ?? type, TYPE_COLORS[type] ?? COLORS.stroke, 120, 36),
      );
    });

    body.add(
      ui.add
        .text(
          0,
          -34,
          `${RARITY_NAMES[entry.rarity]}  •  Lv.${mon.level}`,
          colorText(TEXT.body, RARITY_COLORS[entry.rarity] ?? COLORS.text),
        )
        .setOrigin(0.5),
    );

    const expBar = new Bar(ui, 0, 6, { width: 420, height: 26, color: COLORS.expBar, showText: true });
    const need = expToNext(mon.level);
    expBar.setRatio(
      Number.isFinite(need) ? mon.exp / need : 1,
      Number.isFinite(need) ? `${abbreviate(mon.exp)} / ${abbreviate(need)}` : 'MAX',
    );
    body.add(expBar);

    const rows: [string, number][] = [
      ['HP', stats.hp],
      ['Công', stats.atk],
      ['Thủ', stats.def],
      ['Đặc Công', stats.spa],
      ['Đặc Thủ', stats.spd],
      ['Tốc', stats.spe],
    ];
    rows.forEach(([name, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = column === 0 ? -150 : 150;
      const y = 68 + row * 56;

      body.add(panel(ui, x, y, 270, 48, TX.panelSlot));
      body.add(ui.add.text(x - 118, y, name, colorText(TEXT.small, COLORS.textDim)).setOrigin(0, 0.5));
      body.add(ui.add.text(x + 118, y, String(value), TEXT.small).setOrigin(1, 0.5));
    });

    body.add(
      ui.add
        .text(0, 262, `Lực chiến ${abbreviate(battlePower(mon))}`, colorText(TEXT.heading, COLORS.textGold))
        .setOrigin(0.5),
    );

    const fielded = store.state.team.includes(uid);
    body.add(
      new Button(ui, 0, 322, {
        width: 320,
        height: 76,
        texture: fielded ? TX.btnDark : TX.btnGreen,
        label: fielded ? 'Đang ra trận' : 'Đưa vào đội',
        onPress: () => {
          if (fielded) return;
          const empty = store.state.team.indexOf(null);
          store.setTeamSlot(empty >= 0 ? empty : TEAM_SIZE - 1, uid);
          store.events.emit('toast', { text: `${entry.name} đã vào đội`, tone: 'good' });
          close();
        },
      }),
    );

    return [container];
  });
}

/** Six-slot formation grid; tapping a slot opens a picker. */
export function openFormation(scene: UiScene): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame('Đội hình', DIALOG_W, 760, close);

    body.add(
      ui.add
        .text(0, -290, `Tổng lực chiến ${abbreviate(store.power())}`, colorText(TEXT.heading, COLORS.textGold))
        .setOrigin(0.5),
    );

    for (let slot = 0; slot < TEAM_SIZE; slot += 1) {
      const column = slot % 2;
      const row = Math.floor(slot / 2);
      const x = column === 0 ? -150 : 150;
      const y = -180 + row * 160;

      const uid = store.state.team[slot] ?? null;
      const mon = findMon(store.state, uid);
      const plate = panel(ui, x, y, 280, 142, TX.panelSlot);
      body.add(plate);

      if (mon) {
        const entry = dexEntry(mon.dexId);
        plate.setTint(RARITY_COLORS[entry.rarity] ?? COLORS.textDim);
        body.add(ui.add.image(x - 82, y, ATLAS.portraits, String(entry.id)).setDisplaySize(96, 96));
        body.add(ui.add.text(x + 16, y - 34, entry.name, TEXT.small).setOrigin(0.5));
        body.add(
          ui.add.text(x + 16, y - 2, `Lv.${mon.level}`, colorText(TEXT.small, COLORS.textDim)).setOrigin(0.5),
        );
        body.add(stars(ui, x + 16, y + 28, mon.star, 14));
      } else {
        body.add(ui.add.text(x, y, '+', { ...TEXT.title, fontSize: '56px' }).setOrigin(0.5));
        body.add(ui.add.text(x, y + 42, 'Trống', TEXT.tiny).setOrigin(0.5));
      }

      plate.setInteractive({ useHandCursor: true });
      plate.on('pointerup', () => {
        close();
        openSlotPicker(ui, slot);
      });
    }

    body.add(
      ui.add
        .text(0, 292, 'Chạm vào ô để đổi Pokémon', colorText(TEXT.tiny, COLORS.textDim))
        .setOrigin(0.5),
    );

    return [container];
  });
}

/** Picker listing everything not already fielded, plus a clear option. */
function openSlotPicker(scene: UiScene, slot: number): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame(`Chọn cho ô ${slot + 1}`, DIALOG_W, DIALOG_H, close);

    const back = () => {
      close();
      openFormation(ui);
    };

    body.add(
      new Button(ui, 0, -DIALOG_H / 2 + 118, {
        width: DIALOG_W - 90,
        height: 62,
        texture: TX.btnDark,
        label: 'Bỏ trống ô này',
        labelStyle: TEXT.buttonSmall,
        onPress: () => {
          store.setTeamSlot(slot, null);
          back();
        },
      }),
    );

    const list = new ScrollView(ui, {
      x: 0,
      y: 74,
      width: DIALOG_W - 50,
      height: DIALOG_H - 220,
    });
    body.add(list);

    const current = store.state.team[slot] ?? null;
    const roster = [...store.state.box]
      .filter((mon) => mon.uid === current || !store.state.team.includes(mon.uid))
      .sort((a, b) => battlePower(b) - battlePower(a));

    const cardH = 118;
    roster.forEach((mon, index) => {
      const card = monCard(ui, mon, DIALOG_W - 90, cardH - 10, () => {
        if (list.isScrolling) return;
        store.setTeamSlot(slot, mon.uid);
        back();
      });
      card.y = -list.innerHeight / 2 + cardH / 2 + index * cardH;
      list.content.add(card);
    });
    list.setContentHeight(roster.length * cardH);

    return [container];
  });
}

/** Both banners with x1 and x10 pulls. */
export function openSummon(scene: UiScene): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame('Triệu hồi', DIALOG_W, 700, close);

    BANNERS.forEach((banner, index) => {
      const y = -170 + index * 290;
      body.add(panel(ui, 0, y, DIALOG_W - 70, 264, TX.panelAlt));
      body.add(ui.add.text(0, y - 96, banner.name, TEXT.heading).setOrigin(0.5));

      const currency = banner.currency === 'diamonds' ? 'kim cương' : 'vé';
      body.add(
        ui.add
          .text(0, y - 56, `${banner.cost} ${currency} / lượt`, colorText(TEXT.small, COLORS.textGold))
          .setOrigin(0.5),
      );
      body.add(
        ui.add
          .text(
            0,
            y - 24,
            `Đảm bảo Sử Thi sau ${banner.pity} lượt`,
            colorText(TEXT.tiny, COLORS.textDim),
          )
          .setOrigin(0.5),
      );

      const pull = (count: number) => {
        const results = store.summonAt(banner.id, count);
        if (results.length > 0) {
          close();
          showSummonResults(ui, results);
        }
      };

      body.add(
        new Button(ui, -130, y + 66, {
          width: 220,
          height: 78,
          texture: TX.btnBlue,
          label: 'Rút x1',
          onPress: () => pull(1),
        }),
      );
      body.add(
        new Button(ui, 130, y + 66, {
          width: 220,
          height: 78,
          texture: TX.btnPurple,
          label: 'Rút x10',
          onPress: () => pull(10),
        }),
      );
    });

    return [container];
  });
}

/** Grid of what a pull produced, marking new catches and star-ups. */
function showSummonResults(scene: UiScene, results: readonly SummonOutcome[]): void {
  scene.openModal((ui, close) => {
    const height = results.length > 5 ? DIALOG_H : 620;
    const { container, body } = ui.dialogFrame('Kết quả triệu hồi', DIALOG_W, height, close);

    const columns = results.length > 1 ? 3 : 1;
    const cellW = 180;
    const cellH = 210;
    const startY = -height / 2 + 190;

    results.forEach((outcome, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = (column - (columns - 1) / 2) * cellW;
      const y = startY + row * cellH;

      const rarity = RARITY_COLORS[outcome.entry.rarity] ?? COLORS.textDim;
      const cell = panel(ui, x, y, cellW - 16, cellH - 16, TX.panelSlot);
      cell.setTint(rarity);
      body.add(cell);

      body.add(ui.add.image(x, y - 34, ATLAS.portraits, String(outcome.entry.id)).setDisplaySize(104, 104));
      body.add(ui.add.text(x, y + 34, outcome.entry.name, TEXT.small).setOrigin(0.5));
      body.add(stars(ui, x, y + 62, outcome.entry.rarity, 14, rarity));

      const tag = outcome.isNew
        ? 'MỚI!'
        : outcome.ascendedTo !== null
          ? `★ ${outcome.ascendedTo}`
          : 'Đổi vàng';
      body.add(
        ui.add
          .text(x, y + 86, tag, colorText(TEXT.tiny, outcome.isNew ? COLORS.success : COLORS.textGold))
          .setOrigin(0.5),
      );
    });

    body.add(
      new Button(ui, 0, height / 2 - 92, {
        width: 300,
        height: 76,
        texture: TX.btnGreen,
        label: 'Đóng',
        onPress: close,
      }),
    );

    return [container];
  });
}

/** Bag: everything owned, plus the sell action for treasure. */
export function openBag(scene: UiScene): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame('Túi đồ', DIALOG_W, DIALOG_H, close);

    const owned = ITEMS.filter((item) => itemCount(store.state, item.id) > 0);

    if (owned.length === 0) {
      body.add(ui.add.text(0, 0, 'Túi đang trống', TEXT.bodyDim).setOrigin(0.5));
      return [container];
    }

    const list = new ScrollView(ui, {
      x: 0,
      y: 30,
      width: DIALOG_W - 50,
      height: DIALOG_H - 130,
    });
    body.add(list);

    const rowH = 116;
    owned.forEach((item, index) => {
      const count = itemCount(store.state, item.id);
      const y = -list.innerHeight / 2 + rowH / 2 + index * rowH;

      const row = ui.add.container(0, y, [
        panel(ui, 0, 0, DIALOG_W - 90, rowH - 12, TX.panelSlot),
        ui.add.image(-DIALOG_W / 2 + 90, 0, ATLAS.items, item.icon).setDisplaySize(56, 56),
        ui.add.text(-DIALOG_W / 2 + 130, -24, item.name, TEXT.small).setOrigin(0, 0.5),
        ui.add
          .text(-DIALOG_W / 2 + 130, 6, item.description, colorText(TEXT.tiny, COLORS.textDim))
          .setOrigin(0, 0.5),
        ui.add
          .text(DIALOG_W / 2 - 110, 0, `x${count}`, colorText(TEXT.stat, COLORS.text))
          .setOrigin(1, 0.5),
      ]);
      list.content.add(row);
    });
    list.setContentHeight(owned.length * rowH);

    return [container];
  });
}

/** Shop stub: sells the summon currencies for gold. */
export function openShop(scene: UiScene): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame('Cửa hàng', DIALOG_W, 560, close);

    const offers: { id: string; price: number }[] = [
      { id: 'poke-ball', price: 400 },
      { id: 'great-ball', price: 1200 },
      { id: 'rare-candy', price: 1600 },
    ];

    offers.forEach((offer, index) => {
      const def = itemDef(offer.id);
      if (!def) return;
      const y = -130 + index * 120;

      body.add(panel(ui, 0, y, DIALOG_W - 70, 106, TX.panelSlot));
      body.add(ui.add.image(-DIALOG_W / 2 + 90, y, ATLAS.items, def.icon).setDisplaySize(56, 56));
      body.add(ui.add.text(-DIALOG_W / 2 + 130, y - 18, def.name, TEXT.small).setOrigin(0, 0.5));
      body.add(
        ui.add
          .text(-DIALOG_W / 2 + 130, y + 14, `${abbreviate(offer.price)} vàng`, colorText(TEXT.tiny, COLORS.textGold))
          .setOrigin(0, 0.5),
      );

      body.add(
        new Button(ui, DIALOG_W / 2 - 110, y, {
          width: 150,
          height: 66,
          texture: TX.btnGold,
          label: 'Mua',
          labelStyle: TEXT.buttonSmall,
          onPress: () => {
            if (store.state.gold < offer.price) {
              store.events.emit('toast', { text: 'Không đủ vàng', tone: 'bad' });
              return;
            }
            store.state.gold -= offer.price;
            store.state.items[offer.id] = itemCount(store.state, offer.id) + 1;
            store.commit();
            store.events.emit('toast', { text: `Đã mua ${def.name}`, tone: 'good' });
          },
        }),
      );
    });

    return [container];
  });
}

/** Trials: a read-only summary of how far the team has pushed. */
export function openTrials(scene: UiScene): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame('Thử thách', DIALOG_W, 520, close);
    const party = activeTeam(store.state);

    const lines: [string, string][] = [
      ['Ải cao nhất', `#${store.state.bestStage}`],
      ['Ải hiện tại', `#${store.state.stage}`],
      ['Số Pokémon', `${store.state.box.length} / 151`],
      ['Đội hình', `${party.length} / ${TEAM_SIZE}`],
      ['Tổng lực chiến', abbreviate(store.power())],
    ];

    lines.forEach(([name, value], index) => {
      const y = -150 + index * 74;
      body.add(panel(ui, 0, y, DIALOG_W - 70, 64, TX.panelSlot));
      body.add(ui.add.text(-DIALOG_W / 2 + 70, y, name, TEXT.body).setOrigin(0, 0.5));
      body.add(
        ui.add.text(DIALOG_W / 2 - 70, y, value, colorText(TEXT.stat, COLORS.textGold)).setOrigin(1, 0.5),
      );
    });

    return [container];
  });
}
