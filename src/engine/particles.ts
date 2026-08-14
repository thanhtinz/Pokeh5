/**
 * Hạt: mảnh quặng văng ra, đồng xu bay lên, con số nảy khỏi chỗ vừa chạm.
 *
 * ## Vì sao là một cái hồ, không phải một mảng cứ thế đẩy vào
 *
 * Bấm nhanh là mười lần một giây, mỗi lần mười mảnh. Cấp phát mới liên tục thì
 * bộ dọn rác của trình duyệt phải làm việc giữa lúc chơi, và cái đó hiện ra
 * đúng như nó là: khựng một nhịp, đều đặn, mãi mãi. Nên số hạt cố định từ đầu,
 * hạt "chết" chỉ là hạt có `life <= 0`, và sinh hạt mới là ghi đè lên chỗ cũ.
 * Không cấp phát gì sau lần dựng đầu tiên.
 *
 * Hết chỗ thì **ghi đè lên hạt già nhất**, chứ không bỏ qua lần sinh mới. Bỏ
 * qua thì đúng lúc bấm nhanh nhất — lúc cần thấy nhiều nhất — màn hình lại
 * đứng im.
 *
 * ## Vì sao file này không biết canvas là gì
 *
 * Nó chỉ giữ số. Vẽ là việc của chỗ khác, và nhờ vậy phần chuyển động kiểm
 * được bằng bài test chạy trong node, y như phần luật chơi.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Còn sống bao nhiêu giây. */
  life: number;
  /** Sống được tổng cộng bao nhiêu giây, để tính độ mờ. */
  span: number;
  size: number;
  spin: number;
  angle: number;
  /** Lệch màu so với màu chủ đạo, tính bằng độ. */
  hue: number;
  kind: 'chip' | 'coin' | 'spark';
}

export interface Spawn {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  spin?: number;
  hue?: number;
  kind?: Particle['kind'];
}

/** Trọng lực, pixel trên giây bình phương. */
export const GRAVITY = 1400;

/** Cản không khí: còn lại bao nhiêu phần vận tốc sau mỗi giây. */
const DRAG = 0.12;

export class Particles {
  readonly items: Particle[];
  private next = 0;

  constructor(capacity = 160) {
    this.items = Array.from({ length: capacity }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      span: 1,
      size: 0,
      spin: 0,
      angle: 0,
      hue: 0,
      kind: 'chip' as const,
    }));
  }

  get live(): number {
    let n = 0;
    for (const item of this.items) if (item.life > 0) n += 1;
    return n;
  }

  spawn(spec: Spawn): Particle {
    const slot = this.free();
    slot.x = spec.x;
    slot.y = spec.y;
    slot.vx = spec.vx;
    slot.vy = spec.vy;
    slot.life = spec.life;
    slot.span = spec.life;
    slot.size = spec.size;
    slot.spin = spec.spin ?? 0;
    slot.angle = 0;
    slot.hue = spec.hue ?? 0;
    slot.kind = spec.kind ?? 'chip';
    return slot;
  }

  /**
   * Ô trống tiếp theo, hoặc ô của hạt sắp chết nhất.
   *
   * Quét vòng từ chỗ lần trước dừng lại, nên bình thường là O(1); chỉ khi hồ
   * đầy mới phải đi hết một vòng, và lúc đó nó chọn ra hạt còn ít thời gian
   * sống nhất — cái mà mắt sẽ mất ít nhất khi bị cướp chỗ.
   */
  private free(): Particle {
    const size = this.items.length;
    let oldest = this.items[0]!;

    for (let i = 0; i < size; i += 1) {
      const slot = this.items[(this.next + i) % size]!;
      if (slot.life <= 0) {
        this.next = (this.next + i + 1) % size;
        return slot;
      }
      if (slot.life < oldest.life) oldest = slot;
    }

    return oldest;
  }

  /** Đẩy mọi hạt đi `dt` giây. `floor` là mặt đất, `undefined` là rơi mãi. */
  step(dt: number, floor?: number): void {
    const drag = Math.pow(DRAG, dt);

    for (const item of this.items) {
      if (item.life <= 0) continue;

      item.life -= dt;
      item.vy += GRAVITY * dt;
      item.vx *= drag;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.angle += item.spin * dt;

      // Nảy một cái rồi nằm im dần. Mảnh quặng rơi xuống mà biến mất giữa
      // không trung thì trông như lỗi vẽ, còn nảy một cái thì trông như đá.
      if (floor !== undefined && item.y > floor && item.vy > 0) {
        item.y = floor;
        item.vy *= -0.42;
        item.vx *= 0.7;
        item.spin *= 0.5;
      }
    }
  }

  clear(): void {
    for (const item of this.items) item.life = 0;
  }
}

/** Độ mờ theo tuổi: hiện ngay, tắt dần ở một phần ba cuối đời. */
export function fade(item: Particle): number {
  const left = Math.max(0, item.life) / item.span;
  return left > 0.33 ? 1 : left / 0.33;
}
