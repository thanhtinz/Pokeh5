import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { store } from './game/store';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { CityScene } from './scenes/CityScene';
import { PreloadScene } from './scenes/PreloadScene';
import { UiScene } from './scenes/UiScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b101c',
  // Portrait phones vary wildly in aspect; FIT letterboxes rather than
  // cropping, so nothing in the HUD can ever end up off-screen.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  render: {
    antialias: true,
    roundPixels: true,
    powerPreference: 'low-power',
    // The game never reads pixels back, so the browser can skip preserving them.
    preserveDrawingBuffer: false,
  },
  // Capping at 60 keeps 120 Hz panels from burning battery on a menu screen.
  fps: { target: 60, min: 30, forceSetTimeOut: false },
  dom: { createContainer: false },
  input: { activePointers: 2 },
  autoFocus: true,
  scene: [BootScene, PreloadScene, CityScene, BattleScene, UiScene],
});

/**
 * Mobile browsers and WebViews only reliably fire `pagehide` when the app is
 * being backgrounded or killed, so that is where the save has to be flushed.
 */
const flush = () => store.flush();
window.addEventListener('pagehide', flush);
window.addEventListener('blur', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});

// Exposed in development so the smoke test can assert on real scene state
// instead of eyeballing screenshots. Stripped from production builds.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

export default game;
