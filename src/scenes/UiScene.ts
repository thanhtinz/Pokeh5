import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { abbreviate, duration } from '../game/format';
import { store } from '../game/store';
import { TX } from '../ui/textures';
import { TEXT, colorText } from '../ui/theme';
import { Button, label, panel, scrim } from '../ui/widgets';

/**
 * A permanently-running overlay that owns everything drawn above the game:
 * toasts, modal dialogs and the offline reward popup. Keeping it in one scene
 * means modals never fight the hub scene for input, and a modal survives the
 * scene underneath it being swapped.
 */
export class UiScene extends Phaser.Scene {
  private toastQueue: Phaser.GameObjects.Container[] = [];
  private modalStack: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'Ui', active: false });
  }

  create(): void {
    store.events.on('toast', ({ text, tone }) => this.toast(text, tone));

    if (store.pendingOffline) this.showOfflineReward();
  }

  /** How many dialogs are stacked; the smoke test asserts against this. */
  get modalCount(): number {
    return this.modalStack.length;
  }

  /** Transient message that stacks upward and expires on its own. */
  toast(text: string, tone: 'info' | 'good' | 'bad' = 'info'): void {
    const color =
      tone === 'good' ? COLORS.success : tone === 'bad' ? COLORS.danger : COLORS.accent;

    const caption = this.add.text(0, 0, text, colorText(TEXT.small, 0xffffff)).setOrigin(0.5);
    const plate = panel(this, 0, 0, Math.max(220, caption.width + 56), 58, TX.panel);
    plate.setTint(color);

    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.34, [plate, caption]);
    container.setAlpha(0);
    container.setDepth(2000);

    // Older toasts slide up so the newest is always at the same place.
    for (const existing of this.toastQueue) {
      this.tweens.add({ targets: existing, y: existing.y - 66, duration: 180, ease: 'Quad.easeOut' });
    }
    this.toastQueue.push(container);

    this.tweens.add({
      targets: container,
      alpha: 1,
      y: container.y - 14,
      duration: 180,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        y: container.y - 24,
        duration: 220,
        onComplete: () => {
          this.toastQueue = this.toastQueue.filter((item) => item !== container);
          container.destroy();
        },
      });
    });
  }

  /**
   * Opens a modal built by `build`. The builder gets a close callback so its
   * own buttons can dismiss it without reaching back into this scene.
   */
  openModal(build: (scene: UiScene, close: () => void) => Phaser.GameObjects.GameObject[]): void {
    const shade = scrim(this);
    const host = this.add.container(0, 0);
    host.setDepth(1000 + this.modalStack.length * 10);
    host.add(shade);

    const close = () => this.closeModal(host);
    shade.on('pointerdown', close);

    for (const child of build(this, close)) host.add(child);

    this.modalStack.push(host);
    if (this.modalStack.length === 1) this.setSceneInput(false);

    host.setAlpha(0);
    this.tweens.add({ targets: host, alpha: 1, duration: 140 });
  }

  private closeModal(host: Phaser.GameObjects.Container): void {
    this.modalStack = this.modalStack.filter((item) => item !== host);
    this.tweens.add({
      targets: host,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        host.destroy(true);
        // Re-enabled only once the dialog is really gone, so the pointer event
        // that dismissed it cannot also reach whatever was behind it.
        if (this.modalStack.length === 0) this.setSceneInput(true);
      },
    });
  }

  /**
   * Phaser delivers pointer events to every active scene, not just the topmost
   * one, so a modal's scrim does not stop the hub underneath from reacting.
   * Gating input on those scenes is what actually makes a dialog modal.
   */
  private setSceneInput(enabled: boolean): void {
    for (const key of ['City', 'Battle']) {
      const scene = this.scene.get(key);
      if (scene?.input) scene.input.enabled = enabled;
    }
  }

  /** Standard framed dialog: title bar, body area, close button. */
  dialogFrame(
    title: string,
    width: number,
    height: number,
    close: () => void,
  ): { container: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container } {
    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    container.add(panel(this, 0, 0, width, height, TX.panel));
    container.add(panel(this, 0, -height / 2 + 6, width - 40, 66, TX.panelAlt));
    container.add(this.add.text(0, -height / 2 + 4, title, TEXT.heading).setOrigin(0.5));

    container.add(
      new Button(this, width / 2 - 26, -height / 2 + 6, {
        width: 54,
        height: 54,
        texture: TX.btnRed,
        label: '✕',
        onPress: close,
      }),
    );

    const body = this.add.container(0, 26);
    container.add(body);

    return { container, body };
  }

  /** "While you were away" summary; the only modal that opens on its own. */
  private showOfflineReward(): void {
    const report = store.pendingOffline;
    if (!report) return;

    this.openModal((scene, close) => {
      const width = 560;
      const height = 460;
      const { container, body } = scene.dialogFrame('Phần thưởng ngoại tuyến', width, height, close);

      body.add(
        scene.add
          .text(0, -104, `Bạn đã rời đi ${duration(report.seconds)}`, TEXT.bodyDim)
          .setOrigin(0.5),
      );
      if (report.wasCapped) {
        body.add(
          scene.add
            .text(0, -72, 'Đã đạt giới hạn tích luỹ 12 giờ', colorText(TEXT.tiny, COLORS.warn))
            .setOrigin(0.5),
        );
      }

      body.add(scene.rewardRow(-14, 'Vàng', abbreviate(report.gold), COLORS.textGold));
      body.add(scene.rewardRow(56, 'EXP', abbreviate(report.exp), COLORS.expBar));

      body.add(
        new Button(scene, 0, 150, {
          width: 300,
          height: 76,
          texture: TX.btnGreen,
          label: 'Nhận thưởng',
          onPress: () => {
            store.claimOffline();
            close();
          },
        }),
      );

      return [container];
    });
  }

  /** One labelled reward line inside the offline dialog. */
  rewardRow(y: number, name: string, value: string, color: number): Phaser.GameObjects.Container {
    const plate = panel(this, 0, 0, 420, 60, TX.panelSlot);
    const caption = label(this, -180, 0, name, TEXT.body).setOrigin(0, 0.5);
    const amount = label(this, 180, 0, value, colorText(TEXT.stat, color)).setOrigin(1, 0.5);
    return this.add.container(0, y, [plate, caption, amount]);
  }
}
