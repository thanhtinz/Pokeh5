import Phaser from 'phaser';

export interface ScrollViewOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Extra room past the last item so it can be dragged clear of the edge. */
  padding?: number;
}

/**
 * Vertical drag list with momentum and rubber-band edges. Phaser has no
 * scrolling primitive, and on a phone this is the interaction the whole roster
 * lives behind, so it is worth doing properly: a geometry mask clips the
 * content, and a small drag threshold keeps taps on the cards from being
 * swallowed by the scroller.
 */
export class ScrollView extends Phaser.GameObjects.Container {
  readonly content: Phaser.GameObjects.Container;

  private readonly viewWidth: number;
  private readonly viewHeight: number;
  private readonly padding: number;

  private contentHeight = 0;
  private velocity = 0;
  private dragging = false;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private lastPointerY = 0;
  private moved = false;

  private static readonly DRAG_THRESHOLD = 8;
  private static readonly FRICTION = 0.93;
  private static readonly RUBBER = 0.4;

  constructor(scene: Phaser.Scene, options: ScrollViewOptions) {
    super(scene, options.x, options.y);
    this.viewWidth = options.width;
    this.viewHeight = options.height;
    this.padding = options.padding ?? 16;

    this.content = scene.add.container(0, 0);
    this.add(this.content);

    const shape = scene.make.graphics({});
    shape.fillStyle(0xffffff);
    shape.fillRect(
      options.x - options.width / 2,
      options.y - options.height / 2,
      options.width,
      options.height,
    );
    this.content.setMask(shape.createGeometryMask());

    this.setSize(options.width, options.height);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-options.width / 2, -options.height / 2, options.width, options.height),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on('pointerdown', this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.step, this);

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
      scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.step, this);
      shape.destroy();
    });

    scene.add.existing(this);
  }

  /** Call after adding or removing children so the scroll limit is right. */
  setContentHeight(height: number): this {
    this.contentHeight = Math.max(0, height);
    this.content.y = Phaser.Math.Clamp(this.content.y, this.minOffset(), 0);
    return this;
  }

  private minOffset(): number {
    return Math.min(0, this.viewHeight - this.contentHeight - this.padding);
  }

  /** True while the pointer has travelled far enough to count as a scroll. */
  get isScrolling(): boolean {
    return this.moved;
  }

  get innerWidth(): number {
    return this.viewWidth;
  }

  get innerHeight(): number {
    return this.viewHeight;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    this.dragging = true;
    this.moved = false;
    this.velocity = 0;
    this.dragStartY = pointer.y;
    this.lastPointerY = pointer.y;
    this.dragStartOffset = this.content.y;
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging) return;

    const travel = pointer.y - this.dragStartY;
    if (!this.moved && Math.abs(travel) > ScrollView.DRAG_THRESHOLD) this.moved = true;
    if (!this.moved) return;

    let next = this.dragStartOffset + travel;
    const min = this.minOffset();

    // Past either end the list still follows the finger, but reluctantly.
    if (next > 0) next *= ScrollView.RUBBER;
    else if (next < min) next = min + (next - min) * ScrollView.RUBBER;

    this.velocity = pointer.y - this.lastPointerY;
    this.lastPointerY = pointer.y;
    this.content.y = next;
  }

  private onUp(): void {
    this.dragging = false;
  }

  private step(): void {
    if (this.dragging) return;

    const min = this.minOffset();

    if (this.content.y > 0) {
      this.content.y += (0 - this.content.y) * 0.22;
      if (Math.abs(this.content.y) < 0.4) this.content.y = 0;
      return;
    }
    if (this.content.y < min) {
      this.content.y += (min - this.content.y) * 0.22;
      if (Math.abs(this.content.y - min) < 0.4) this.content.y = min;
      return;
    }

    if (Math.abs(this.velocity) < 0.12) {
      this.velocity = 0;
      return;
    }
    this.content.y += this.velocity;
    this.velocity *= ScrollView.FRICTION;
  }
}
