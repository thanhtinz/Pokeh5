import Phaser from 'phaser';

import { COLORS, RARITY_COLORS } from '../config';
import { checkAscend, shardsOf, TALENTS } from '../game/ascension';
import {
  ARTIFACTS,
  MAX_ARTIFACT_LEVEL,
  enhanceCost,
  loadoutLevel,
  type ArtifactDef,
} from '../game/artifacts';
import { dexEntry } from '../game/data/pokedex';
import {
  ELEMENTS,
  ELEMENT_COLORS,
  ELEMENT_NAMES,
  elementOf,
  restrainedBy,
  type ElementId,
} from '../game/elements';
import { abbreviate } from '../game/format';
import {
  BONUS_PER_NODE,
  NODES_PER_BOARD,
  boardEdges,
  boardNodes,
  nodeCost,
} from '../game/signs';
import { combatStats, MAX_STAR, starMultiplier, type CombatStats } from '../game/stats';
import { findMon, type OwnedMon } from '../game/state';
import { store } from '../game/store';
import { ATLAS } from '../scenes/PreloadScene';
import type { UiScene } from '../scenes/UiScene';
import { TX } from './textures';
import { TEXT, colorText } from './theme';
import { Button, label, panel, stars } from './widgets';

const DIALOG_W = 660;

// ---------------------------------------------------------------------- signs

const BOARD_W = 520;
const BOARD_H = 460;

/**
 * The Signs screen: one constellation per element, whose lit stars raise that
 * element's damage against the element it restrains.
 */
export function openSigns(scene: UiScene, initial: ElementId = 'water'): void {
  scene.openModal((ui, close) => {
    const { container, body } = ui.dialogFrame('Chòm Sao', DIALOG_W, 980, close);
    let active = initial;

    // Rebuilt in place on every tab switch and purchase; a board is cheap to
    // redraw and this keeps the state in exactly one place.
    const boardHost = ui.add.container(0, 0);
    body.add(boardHost);

    const tabs: Button[] = [];
    ELEMENTS.forEach((element, index) => {
      const tab = new Button(ui, -260 + index * 130, -404, {
        width: 118,
        height: 76,
        texture: TX.btnDark,
        label: ELEMENT_NAMES[element],
        labelStyle: TEXT.buttonSmall,
        onPress: () => {
          active = element;
          paint();
        },
      });
      tabs.push(tab);
      body.add(tab);
    });

    const paint = (): void => {
      boardHost.removeAll(true);

      const level = store.state.signs[active] ?? 0;
      const color = ELEMENT_COLORS[active];
      const nodes = boardNodes(active);
      const complete = level >= NODES_PER_BOARD;

      tabs.forEach((tab, index) => {
        const element = ELEMENTS[index]!;
        tab.setTexturePlate(element === active ? TX.btnBlue : TX.btnDark);
        tab.setAlpha(element === active ? 1 : 0.7);
      });

      const frame = panel(ui, 0, -132, BOARD_W, BOARD_H, TX.panelSlot);
      frame.setTint(color);
      boardHost.add(frame);

      const toLocal = (index: number): { x: number; y: number } => {
        const node = nodes[index]!;
        return {
          x: (node.x - 0.5) * (BOARD_W - 90),
          y: -132 + (node.y - 0.5) * (BOARD_H - 90),
        };
      };

      // Edges first so the stars sit on top of them.
      const lines = ui.add.graphics();
      for (const [from, to] of boardEdges(active)) {
        const a = toLocal(from);
        const b = toLocal(to);
        const lit = from < level && to < level;
        lines.lineStyle(lit ? 3 : 2, lit ? color : 0x33477a, lit ? 0.85 : 0.35);
        lines.lineBetween(a.x, a.y, b.x, b.y);
      }
      boardHost.add(lines);

      nodes.forEach((_, index) => {
        const at = toLocal(index);
        const lit = index < level;
        const isNext = index === level;

        if (lit) {
          boardHost.add(
            ui.add.image(at.x, at.y, TX.glow).setDisplaySize(70, 70).setTint(color).setAlpha(0.55),
          );
        }
        const star = ui.add
          .image(at.x, at.y, TX.star)
          .setDisplaySize(lit ? 34 : 24, lit ? 34 : 24)
          .setTint(lit ? COLORS.textGold : 0x2f3f6b);
        boardHost.add(star);

        // The next star to buy pulses, so the target is never ambiguous.
        if (isNext && !complete) {
          ui.tweens.add({
            targets: star,
            scale: star.scale * 1.35,
            duration: 620,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      });

      boardHost.add(panel(ui, 0, 190, DIALOG_W - 70, 240, TX.panelAlt));
      boardHost.add(ui.add.text(0, 108, 'Cấp hiện tại', TEXT.smallDim).setOrigin(0.5));
      boardHost.add(
        ui.add
          .text(0, 146, `${level} / ${NODES_PER_BOARD}`, colorText(TEXT.heading, color))
          .setOrigin(0.5),
      );

      const target = restrainedBy(active);
      boardHost.add(
        ui.add
          .text(
            0,
            190,
            `Khắc chế ${ELEMENT_NAMES[target]} +${Math.round(level * BONUS_PER_NODE * 100)}%`,
            colorText(TEXT.heading, COLORS.textGold),
          )
          .setOrigin(0.5),
      );
      boardHost.add(
        ui.add
          .text(
            0,
            232,
            `Sát thương Pokémon hệ ${ELEMENT_NAMES[active]} gây lên hệ ${ELEMENT_NAMES[target]} tăng mạnh.`,
            { ...TEXT.tiny, align: 'center', wordWrap: { width: DIALOG_W - 140 } },
          )
          .setOrigin(0.5),
      );

      const cost = nodeCost(level);
      boardHost.add(
        new Button(ui, 0, 340, {
          width: 320,
          height: 84,
          texture: complete ? TX.btnDark : TX.btnGold,
          label: complete ? 'Hoàn thành' : `Thắp sao  ${abbreviate(cost)}`,
          onPress: () => {
            if (store.upgradeSign(active)) paint();
          },
        }).setEnabled(!complete),
      );
    };

    paint();
    return [container];
  });
}

// ------------------------------------------------------------------ ascension

/** One "Stat: value" line, optionally with the gain it would become. */
function statColumn(
  scene: UiScene,
  x: number,
  y: number,
  title: string,
  stats: CombatStats,
  delta: CombatStats | null,
): Phaser.GameObjects.Container {
  const width = 290;
  const rows: [string, keyof CombatStats][] = [
    ['HP', 'hp'],
    ['ATK', 'atk'],
    ['DEF', 'def'],
  ];

  const children: Phaser.GameObjects.GameObject[] = [
    panel(scene, 0, 0, width, 190, TX.panelSlot),
    scene.add.text(0, -70, title, colorText(TEXT.small, COLORS.accent)).setOrigin(0.5),
  ];

  rows.forEach(([name, key], index) => {
    const rowY = -22 + index * 42;
    const value = delta ? `+ ${abbreviate(delta[key])}` : abbreviate(stats[key]);
    children.push(
      scene.add
        .text(-width / 2 + 26, rowY, `${name}:`, colorText(TEXT.small, COLORS.textDim))
        .setOrigin(0, 0.5),
      scene.add
        .text(width / 2 - 26, rowY, value, colorText(TEXT.small, delta ? COLORS.success : COLORS.text))
        .setOrigin(1, 0.5),
    );
  });

  return scene.add.container(x, y, children);
}

/**
 * The ascension screen: shards buy stars, and the two columns spell out exactly
 * what the next one is worth before any gold is spent.
 */
export function openAscend(scene: UiScene, uid: string): void {
  scene.openModal((ui, close) => {
    const mon = findMon(store.state, uid);
    if (!mon) return [];

    const entry = dexEntry(mon.dexId);
    const element = elementOf(mon.dexId);
    const { container, body } = ui.dialogFrame(entry.name, DIALOG_W, 960, close);

    const host = ui.add.container(0, 0);
    body.add(host);

    const paint = (): void => {
      host.removeAll(true);

      const current = findMon(store.state, uid);
      if (!current) return;

      const check = checkAscend(store.state, current);
      const artifacts = store.artifacts(uid);
      const now = combatStats(current, artifacts);

      // Preview is computed from a copy, so nothing is mutated to draw it.
      const preview: OwnedMon = { ...current, star: Math.min(MAX_STAR, current.star + 1) };
      const next = combatStats(preview, artifacts);
      const delta: CombatStats = {
        hp: next.hp - now.hp,
        atk: next.atk - now.atk,
        def: next.def - now.def,
        spa: next.spa - now.spa,
        spd: next.spd - now.spd,
        spe: next.spe - now.spe,
      };

      host.add(ui.add.image(0, -300, ATLAS.portraits, String(entry.id)).setDisplaySize(210, 210));
      host.add(
        ui.add
          .image(0, -300, TX.glow)
          .setDisplaySize(320, 320)
          .setTint(ELEMENT_COLORS[element])
          .setAlpha(0.3)
          .setDepth(-1),
      );

      const chipPlate = panel(ui, 150, -212, 108, 42, TX.pill);
      chipPlate.setTint(ELEMENT_COLORS[element]);
      host.add(chipPlate);
      host.add(ui.add.text(150, -212, ELEMENT_NAMES[element], TEXT.badge).setOrigin(0.5));

      host.add(stars(ui, 0, -168, Math.max(1, current.star), 32));
      host.add(
        ui.add
          .text(0, -122, `BP ${abbreviate(store.monPower(current))}`, colorText(TEXT.heading, COLORS.textGold))
          .setOrigin(0.5),
      );

      host.add(statColumn(ui, -156, 0, entry.name, now, null));
      host.add(
        statColumn(
          ui,
          156,
          0,
          check.atMaxStar ? `${entry.name} MAX` : `${entry.name} +1`,
          now,
          check.atMaxStar ? null : delta,
        ),
      );

      const talent = check.unlocks;
      host.add(
        ui.add
          .text(
            0,
            126,
            talent ? `Mở talent: ${talent.name}  ATK +${abbreviate(talent.atk)}` : nextTalentHint(current.star),
            colorText(TEXT.small, talent ? COLORS.purple : COLORS.textDim),
          )
          .setOrigin(0.5),
      );

      // Shard counter, styled after the material slot on the reference screen.
      host.add(panel(ui, 0, 210, 150, 150, TX.panelSlot));
      host.add(ui.add.image(0, 192, ATLAS.portraits, String(entry.id)).setDisplaySize(96, 96));
      host.add(
        ui.add
          .text(
            0,
            258,
            `${shardsOf(store.state, current.dexId)}/${check.shardsNeeded}`,
            colorText(TEXT.small, check.shardsHeld >= check.shardsNeeded ? COLORS.success : COLORS.danger),
          )
          .setOrigin(0.5),
      );
      host.add(ui.add.text(0, 300, 'Mảnh hồn', TEXT.tiny).setOrigin(0.5));

      host.add(
        ui.add
          .text(
            0,
            336,
            check.atMaxStar ? '' : `Chi phí ${abbreviate(check.goldNeeded)} vàng`,
            colorText(TEXT.tiny, store.state.gold >= check.goldNeeded ? COLORS.textGold : COLORS.danger),
          )
          .setOrigin(0.5),
      );

      host.add(
        new Button(ui, 0, 400, {
          width: 300,
          height: 84,
          texture: check.canAscend ? TX.btnRed : TX.btnDark,
          label: check.atMaxStar ? 'Tối đa' : 'Nâng sao',
          onPress: () => {
            if (store.ascendMon(uid)) paint();
          },
        }).setEnabled(check.canAscend),
      );
    };

    paint();
    return [container];
  });
}

function nextTalentHint(star: number): string {
  const upcoming = TALENTS.find((talent) => talent.star > star);
  return upcoming ? `Talent tiếp theo ở ${upcoming.star} sao: ${upcoming.name}` : 'Đã mở toàn bộ talent';
}

// ------------------------------------------------------------------ artifacts

/** One artifact slot tile: icon, name, level and its enhance button. */
function artifactTile(
  scene: UiScene,
  x: number,
  y: number,
  def: ArtifactDef,
  level: number,
  onEnhance: () => void,
): Phaser.GameObjects.Container {
  const width = 290;
  const equipped = level > 0;

  const plate = panel(scene, 0, 0, width, 146, TX.panelSlot);
  plate.setTint(equipped ? def.color : 0x64748b);

  const cost = level < MAX_ARTIFACT_LEVEL ? enhanceCost(level) : 0;

  const children: Phaser.GameObjects.GameObject[] = [
    plate,
    scene.add
      .image(-width / 2 + 50, -14, ATLAS.items, def.icon)
      .setDisplaySize(58, 58)
      .setAlpha(equipped ? 1 : 0.45),
    scene.add.text(-width / 2 + 88, -34, def.name, TEXT.small).setOrigin(0, 0.5),
    scene.add
      .text(
        -width / 2 + 88,
        -2,
        equipped ? `Lv.${level}` : 'Chưa trang bị',
        colorText(TEXT.tiny, equipped ? COLORS.textGold : COLORS.textDim),
      )
      .setOrigin(0, 0.5),
    new Button(scene, 0, 44, {
      width: width - 40,
      height: 54,
      texture: level >= MAX_ARTIFACT_LEVEL ? TX.btnDark : TX.btnGreen,
      label: level >= MAX_ARTIFACT_LEVEL ? 'Tối đa' : `Cường hoá  ${abbreviate(cost)}`,
      labelStyle: TEXT.badge,
      onPress: onEnhance,
    }).setEnabled(level < MAX_ARTIFACT_LEVEL),
  ];

  return scene.add.container(x, y, children);
}

/**
 * The artifact screen: four fixed slots per Pokemon, each levelled with gold.
 * Slots are roles rather than loot, so the decision is where to spend, not
 * which trinket goes where.
 */
export function openArtifacts(scene: UiScene, uid: string): void {
  scene.openModal((ui, close) => {
    const mon = findMon(store.state, uid);
    if (!mon) return [];

    const entry = dexEntry(mon.dexId);
    const element = elementOf(mon.dexId);
    const { container, body } = ui.dialogFrame('Thần Khí', DIALOG_W, 980, close);

    const host = ui.add.container(0, 0);
    body.add(host);

    const paint = (): void => {
      host.removeAll(true);

      const current = findMon(store.state, uid);
      if (!current) return;
      const levels = store.artifacts(uid);

      host.add(
        ui.add
          .image(0, -300, TX.glow)
          .setDisplaySize(360, 360)
          .setTint(ELEMENT_COLORS[element])
          .setAlpha(0.32),
      );
      host.add(ui.add.image(0, -300, ATLAS.portraits, String(entry.id)).setDisplaySize(220, 220));

      const chipPlate = panel(ui, 0, -186, 116, 42, TX.pill);
      chipPlate.setTint(ELEMENT_COLORS[element]);
      host.add(chipPlate);
      host.add(ui.add.text(0, -186, ELEMENT_NAMES[element], TEXT.badge).setOrigin(0.5));

      host.add(stars(ui, 0, -144, Math.max(1, current.star), 28, RARITY_COLORS[entry.rarity]));
      host.add(
        ui.add
          .text(
            0,
            -104,
            `Tổng cấp thần khí ${loadoutLevel(levels)}`,
            colorText(TEXT.small, COLORS.textGold),
          )
          .setOrigin(0.5),
      );

      ARTIFACTS.forEach((def, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        host.add(
          artifactTile(
            ui,
            column === 0 ? -156 : 156,
            -6 + row * 164,
            def,
            levels[def.id] ?? 0,
            () => {
              if (store.enhanceArtifact(uid, def.id)) paint();
            },
          ),
        );
      });

      host.add(
        new Button(ui, -156, 292, {
          width: 290,
          height: 78,
          texture: TX.btnGold,
          label: 'Cường hoá tất cả',
          labelStyle: TEXT.buttonSmall,
          onPress: () => {
            if (store.enhanceAllArtifacts(uid) > 0) paint();
          },
        }),
      );
      host.add(
        new Button(ui, 156, 292, {
          width: 290,
          height: 78,
          texture: TX.btnPurple,
          label: 'Trang bị tất cả',
          labelStyle: TEXT.buttonSmall,
          onPress: () => {
            if (store.equipAllArtifacts(uid) > 0) paint();
          },
        }),
      );

      host.add(
        ui.add
          .text(
            0,
            362,
            `Hệ số sao hiện tại x${starMultiplier(current.star).toFixed(2)}`,
            colorText(TEXT.tiny, COLORS.textDim),
          )
          .setOrigin(0.5),
      );
    };

    paint();
    return [container];
  });
}

/** Shared label helper so the hub can show the same element chip. */
export function elementChip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  element: ElementId,
): Phaser.GameObjects.Container {
  const plate = panel(scene, 0, 0, 104, 38, TX.pill);
  plate.setTint(ELEMENT_COLORS[element]);
  const caption = label(scene, 0, 0, ELEMENT_NAMES[element], TEXT.badge).setOrigin(0.5);
  return scene.add.container(x, y, [plate, caption]);
}
