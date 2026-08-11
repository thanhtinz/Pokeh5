import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { store } from '../game/store';
import { Bar, label } from '../ui/widgets';
import { TEXT, colorText } from '../ui/theme';

export const ATLAS = {
  mons: 'mons',
  portraits: 'portraits',
  items: 'items',
} as const;

/** Loads the three atlases and warms the save in parallel with the download. */
export class PreloadScene extends Phaser.Scene {
  private bar!: Bar;
  private caption!: ReturnType<typeof label>;
  private savePromise!: Promise<void>;

  constructor() {
    super('Preload');
  }

  preload(): void {
    this.buildScreen();

    this.load.setPath('assets/atlas');
    this.load.atlas(ATLAS.mons, 'mons.png', 'mons.json');
    this.load.atlas(ATLAS.portraits, 'portraits.png', 'portraits.json');
    this.load.atlas(ATLAS.items, 'items.png', 'items.json');

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.bar.setRatio(value, `${Math.round(value * 100)}%`);
    });

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      // Missing atlases mean `npm run assets` was never run; say so plainly
      // rather than dying on the first missing frame.
      this.caption.setStyle(colorText(TEXT.small, COLORS.danger));
      this.caption.set(`Thiếu asset: ${file.key}. Chạy "npm run assets".`);
    });

    // The save read is async on native, so it overlaps the atlas download.
    this.savePromise = store.init();
  }

  async create(): Promise<void> {
    this.caption.set('Đang chuẩn bị dữ liệu…');
    await this.savePromise;

    this.scene.start('City');
    this.scene.launch('Ui');
  }

  private buildScreen(): void {
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep);
    this.add
      .text(cx, GAME_HEIGHT * 0.36, 'POKEH5', {
        ...TEXT.title,
        fontSize: '72px',
        color: '#ffd44d',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT * 0.36 + 62, 'IDLE POKÉMON RPG', {
        ...TEXT.small,
        color: '#7f95c9',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.bar = new Bar(this, cx, GAME_HEIGHT * 0.62, {
      width: 440,
      height: 34,
      color: COLORS.accent,
      showText: true,
    });

    this.caption = label(this, cx, GAME_HEIGHT * 0.62 + 44, 'Đang tải…', TEXT.smallDim).setOrigin(0.5);

    // A hint that the splash in index.html can be dismissed now.
    document.getElementById('splash')?.classList.add('hidden');
  }
}
