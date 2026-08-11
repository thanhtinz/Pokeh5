import Phaser from 'phaser';

import { FONT_FAMILY } from '../ui/theme';
import { buildUiTextures } from '../ui/textures';

/**
 * Nothing is loaded here yet — this scene only prepares what the loading screen
 * itself needs to look right: the procedural chrome and the webfont.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.setPath('assets/');
  }

  async create(): Promise<void> {
    buildUiTextures(this);
    await loadFont();
    this.scene.start('Preload');
  }
}

/**
 * Phaser measures text the moment a label is created, so a font that arrives
 * late leaves every label mis-sized. Waiting here costs a few frames on a cold
 * start and avoids the layout ever being wrong.
 */
async function loadFont(): Promise<void> {
  if (!('fonts' in document)) return;

  try {
    const face = new FontFace('Baloo 2', 'url(assets/fonts/Baloo2.ttf)', {
      weight: '400 800',
      display: 'block',
    });
    document.fonts.add(await face.load());
    await document.fonts.load(`700 24px ${FONT_FAMILY}`);
  } catch {
    // The system stack in FONT_FAMILY is a perfectly usable fallback.
  }
}
