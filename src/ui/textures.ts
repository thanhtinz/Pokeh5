import type Phaser from 'phaser';

/**
 * All the UI chrome is drawn once into canvas textures at boot instead of being
 * shipped as PNGs. It costs a few milliseconds, keeps the download tiny, and
 * every panel stays crisp at whatever size the phone scales the canvas to.
 */

export const TX = {
  panel: 'ui-panel',
  panelAlt: 'ui-panel-alt',
  panelSlot: 'ui-panel-slot',
  btnBlue: 'ui-btn-blue',
  btnGreen: 'ui-btn-green',
  btnRed: 'ui-btn-red',
  btnPurple: 'ui-btn-purple',
  btnGold: 'ui-btn-gold',
  btnDark: 'ui-btn-dark',
  pill: 'ui-pill',
  barTrack: 'ui-bar-track',
  glow: 'ui-glow',
  star: 'ui-star',
  vignette: 'ui-vignette',
  ground: 'ui-ground',
} as const;

/** Nine-slice inset shared by every panel and button texture. */
export const SLICE = 20;

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function canvas(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
): CanvasRenderingContext2D | null {
  if (scene.textures.exists(key)) return null;
  const texture = scene.textures.createCanvas(key, width, height);
  return texture?.context ?? null;
}

function commit(scene: Phaser.Scene, key: string): void {
  (scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Rounded plate with a lit top edge, a dark base and a hairline border. */
function makePanel(
  scene: Phaser.Scene,
  key: string,
  top: number,
  bottom: number,
  border: number,
  alpha = 1,
): void {
  const size = SLICE * 2 + 8;
  const ctx = canvas(scene, key, size, size);
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, hex(top));
  gradient.addColorStop(1, hex(bottom));

  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  rounded(ctx, 1.5, 1.5, size - 3, size - 3, 14);
  ctx.fill();

  ctx.globalAlpha = alpha;
  ctx.lineWidth = 3;
  ctx.strokeStyle = hex(border);
  ctx.stroke();

  // A one-pixel inner highlight is what stops a flat fill reading as a hole.
  ctx.globalAlpha = alpha * 0.35;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  rounded(ctx, 4, 4, size - 8, size - 8, 11);
  ctx.stroke();

  commit(scene, key);
}

/** Glossy capsule button: bright top half, saturated base, dark rim. */
function makeButton(scene: Phaser.Scene, key: string, light: number, dark: number, rim: number): void {
  const size = SLICE * 2 + 8;
  const ctx = canvas(scene, key, size, size);
  if (!ctx) return;

  const body = ctx.createLinearGradient(0, 0, 0, size);
  body.addColorStop(0, hex(light));
  body.addColorStop(0.52, hex(dark));
  body.addColorStop(1, hex(dark));

  ctx.fillStyle = body;
  rounded(ctx, 2, 2, size - 4, size - 4, 15);
  ctx.fill();

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = hex(rim);
  ctx.stroke();

  const gloss = ctx.createLinearGradient(0, 4, 0, size * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.42)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  rounded(ctx, 5, 5, size - 10, size * 0.5 - 5, 11);
  ctx.fill();

  commit(scene, key);
}

function makeGlow(scene: Phaser.Scene): void {
  const size = 128;
  const ctx = canvas(scene, TX.glow, size, size);
  if (!ctx) return;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  commit(scene, TX.glow);
}

function makeStar(scene: Phaser.Scene): void {
  const size = 32;
  const ctx = canvas(scene, TX.star, size, size);
  if (!ctx) return;

  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 2;
  const inner = outer * 0.46;

  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.fill();
  commit(scene, TX.star);
}

/** Dark edge falloff that keeps the bright HUD from fighting the scene art. */
function makeVignette(scene: Phaser.Scene): void {
  const size = 256;
  const ctx = canvas(scene, TX.vignette, size, size);
  if (!ctx) return;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.22, size / 2, size / 2, size * 0.55);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  commit(scene, TX.vignette);
}

/** Soft elliptical shadow the battlers stand on. */
function makeGround(scene: Phaser.Scene): void {
  const w = 256;
  const h = 96;
  const ctx = canvas(scene, TX.ground, w, h);
  if (!ctx) return;

  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, w);
  ctx.restore();

  commit(scene, TX.ground);
}

export function buildUiTextures(scene: Phaser.Scene): void {
  makePanel(scene, TX.panel, 0x24325a, 0x121b33, 0x44598f, 0.96);
  makePanel(scene, TX.panelAlt, 0x2f4173, 0x1a2647, 0x5470b0, 0.96);
  makePanel(scene, TX.panelSlot, 0x101a33, 0x0a1024, 0x33477a, 0.94);
  makePanel(scene, TX.pill, 0x2b3a66, 0x18233f, 0x4a5f96, 0.92);
  makePanel(scene, TX.barTrack, 0x080d1a, 0x101a30, 0x33477a, 1);

  makeButton(scene, TX.btnBlue, 0x62d3ff, 0x1f6fb2, 0x0d3f6b);
  makeButton(scene, TX.btnGreen, 0x6ee7a0, 0x139a63, 0x0a5a3a);
  makeButton(scene, TX.btnRed, 0xff8a7a, 0xc42d2d, 0x71160f);
  makeButton(scene, TX.btnPurple, 0xc98bff, 0x7a35c9, 0x431a72);
  makeButton(scene, TX.btnGold, 0xffe27a, 0xd79a12, 0x7d5406);
  makeButton(scene, TX.btnDark, 0x3d4f80, 0x1b2440, 0x0d1428);

  makeGlow(scene);
  makeStar(scene);
  makeVignette(scene);
  makeGround(scene);
}
