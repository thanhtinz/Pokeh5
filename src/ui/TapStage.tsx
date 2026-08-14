import { useEffect, useRef } from 'preact/hooks';

import { HEAT_CAP, heatMultiplier } from '../game/combo';
import { count, money } from '../game/money';
import { Particles, fade } from '../engine/particles';
import { onFrame } from '../engine/loop';
import type { Derived, Store } from '../game/store';
import { t } from '../i18n';
import { Scrapper } from './art/Scrapper';

interface Props {
  game: Store;
  derived: Derived;
}

/** Con số bay lên. Hồ cố định, y như hạt. */
interface Float {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  span: number;
  text: string;
  big: boolean;
}

const FLOATS = 14;
const CHIPS_PER_TAP = 9;

/**
 * Chỗ chạm.
 *
 * Đây là màn hình mà người chơi nhìn nhiều nhất, và cho tới bản này nó là một
 * cái nút sinh ra mấy cái `<span>` bằng `setTimeout`. Không có vòng lặp, không
 * có vật lý, không có gì phản ứng lại — bấm vào một hộp chữ nhật rồi chữ hiện
 * ra. Đó là một trang web.
 *
 * ## Vẽ hiệu ứng bằng canvas, giữ nguyên phần art bằng CSS
 *
 * Cả dự án này vẽ mọi thứ bằng CSS, và chỗ này không phá luật đó: **cục quặng
 * vẫn là `OreArt`**, vẫn ăn theo bảng màu chung, vẫn là DOM. Canvas nằm *sau*
 * nó và chỉ lo mấy thứ mà DOM làm không nổi — trăm mảnh vụn bay cùng lúc, mỗi
 * mảnh một vận tốc, sáu mươi lần một giây. Làm chuyện đó bằng `<span>` là tạo
 * và xoá hàng nghìn node mỗi giây, và trình duyệt sẽ trả lời bằng cách khựng.
 *
 * Ranh giới: **canvas cho cái sống một giây, CSS cho cái luôn ở đó.**
 *
 * ## Ba thứ làm cú chạm có sức nặng
 *
 *  - **Nén và bật lại.** Cục quặng bị đè xuống rồi nảy về theo lò xo, không
 *    phải theo transition. Lò xo thì bấm nhanh hai lần liên tiếp sẽ cộng dồn;
 *    transition thì lần sau huỷ lần trước, và cảm giác là "đơ".
 *  - **Mảnh vụn có trọng lực.** Bay ra theo hướng ngón tay chạm, rơi xuống,
 *    nảy một cái. Mắt biết ngay chỗ nào vừa bị đập.
 *  - **Rung màn hình theo nhiệt.** Nhẹ thôi, và chỉ khi đang nóng — nếu lúc nào
 *    cũng rung thì nó không còn nói lên điều gì.
 */
export function TapStage({ game, derived }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rock = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGRectElement>(null);
  const arm = useRef<SVGGElement | null>(null);
  const label = useRef<HTMLSpanElement>(null);

  // Mọi thứ đổi theo từng khung hình sống ở đây, không sống trong state của
  // Preact: một `setState` mỗi khung hình là sáu mươi lần dựng lại cây DOM mỗi
  // giây để đổi một con số trong `transform`.
  const world = useRef({
    chips: new Particles(190),
    floats: Array.from({ length: FLOATS }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      span: 1,
      text: '',
      big: false,
    })) as Float[],
    nextFloat: 0,
    /** Góc vung búa, 0 là buông tay, 1 là giơ cao nhất. */
    swing: 0,
    swingV: 0,
    squash: 0,
    squashV: 0,
    shake: 0,
    flash: 0,
    /** Khung hình vừa rồi có vẽ gì lên canvas không. */
    dirty: false,
  });

  useEffect(() => {
    const box = host.current;
    const surface = canvas.current;
    if (!box || !surface) return;

    const ctx = surface.getContext('2d');
    if (!ctx) return;

    // Kích thước thật của canvas tính theo mật độ điểm ảnh của máy, không theo
    // pixel CSS — thiếu bước này thì trên điện thoại mọi thứ vẽ ra bị nhoè.
    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = box.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(box);

    // Bảng màu đọc từ chính biến CSS đang chạy, nên hiệu ứng đổi màu theo tiến
    // độ giàu nghèo cùng với cả giao diện, không có bảng màu thứ hai.
    let hue = 40;
    let sat = 60;
    const readTheme = () => {
      const style = getComputedStyle(document.documentElement);
      hue = Number.parseFloat(style.getPropertyValue('--hue')) || hue;
      sat = Number.parseFloat(style.getPropertyValue('--sat')) || sat;
    };
    readTheme();

    let themeAt = 0;

    const stop = onFrame((dt, elapsed) => {
      const w = world.current;

      // Bảng màu đổi chậm, đọc lại mỗi nửa giây là quá đủ; đọc mỗi khung hình
      // là ép trình duyệt tính lại style sáu mươi lần một giây.
      if (elapsed - themeAt > 0.5) {
        themeAt = elapsed;
        readTheme();
      }

      const heat = game.heatNow();
      const hot = heat / HEAT_CAP;

      /*
       * Không có gì động đậy thì không vẽ.
       *
       * Đây là game idle: người chơi để nó mở hàng giờ mà không chạm vào. Một
       * vòng lặp cứ xoá rồi vẽ lại một khung hình trống sáu mươi lần mỗi giây
       * là ăn pin để không hiện ra gì cả. Vẫn phải dọn đúng một lần sau nhịp
       * cuối cùng, không thì mảnh vụn cuối đứng chết trên màn hình.
       */
      const busy =
        heat > 0 ||
        Math.abs(w.swing) > 0.001 ||
        Math.abs(w.swingV) > 0.001 ||
        w.shake > 0 ||
        w.flash > 0 ||
        Math.abs(w.squash) > 0.001 ||
        Math.abs(w.squashV) > 0.001 ||
        w.chips.live > 0 ||
        w.floats.some((float) => float.life > 0);

      if (!busy) {
        if (w.dirty) {
          ctx.clearRect(0, 0, width, height);
          if (arm.current) arm.current.style.transform = '';
          if (rock.current) {
            rock.current.style.transform = '';
            rock.current.style.filter = '';
          }
          if (ring.current) ring.current.style.opacity = '0';
          if (label.current) label.current.style.opacity = '0';
          w.dirty = false;
        }
        return;
      }

      w.dirty = true;

      // ------------------------------------------------------------ vật lý --

      // Lò xo: kéo về 0, có cản. Không dùng transition vì hai cú chạm liền nhau
      // phải cộng dồn được, chứ không phải cú sau huỷ cú trước.
      w.squashV += (-w.squash * 220 - w.squashV * 18) * dt;
      w.squash += w.squashV * dt;

      // Cánh tay: cùng một cái lò xo, nhưng nặng hơn và ít cản hơn, nên nó
      // *vung* — giơ lên nhanh, rơi xuống có đà, quá đà một chút rồi mới về.
      w.swingV += (-w.swing * 150 - w.swingV * 12) * dt;
      w.swing += w.swingV * dt;

      w.shake = Math.max(0, w.shake - dt * 3.2);
      w.flash = Math.max(0, w.flash - dt * 2.4);

      w.chips.step(dt, height - 6);

      for (const float of w.floats) {
        if (float.life <= 0) continue;
        float.life -= dt;
        float.vy += 220 * dt;
        float.x += float.vx * dt;
        float.y += float.vy * dt;
      }

      // -------------------------------------------------------------- vẽ ----

      ctx.clearRect(0, 0, width, height);

      for (const chip of w.chips.items) {
        if (chip.life <= 0) continue;
        const alpha = fade(chip);

        ctx.save();
        ctx.translate(chip.x, chip.y);
        ctx.rotate(chip.angle);
        ctx.globalAlpha = alpha;

        if (chip.kind === 'coin') {
          ctx.fillStyle = `hsl(${hue + chip.hue} ${sat}% 62%)`;
          ctx.beginPath();
          // Xoay quanh trục đứng: bề ngang co lại theo cos, nên đồng xu lật
          // chứ không phải quay tròn như cái đĩa.
          ctx.ellipse(0, 0, chip.size * Math.abs(Math.cos(chip.angle)), chip.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `hsl(${hue + chip.hue} ${sat * 0.8}% ${chip.kind === 'spark' ? 72 : 46}%)`;
          ctx.fillRect(-chip.size / 2, -chip.size / 2, chip.size, chip.size);
        }

        ctx.restore();
      }

      ctx.textAlign = 'center';
      for (const float of w.floats) {
        if (float.life <= 0) continue;
        const left = float.life / float.span;
        ctx.globalAlpha = left > 0.5 ? 1 : left * 2;
        ctx.font = `700 ${float.big ? 18 : 13}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = float.big
          ? `hsl(${hue} ${sat}% 72%)`
          : `hsl(${hue} ${sat * 0.7}% 84%)`;
        ctx.fillText(float.text, float.x, float.y);
      }
      ctx.globalAlpha = 1;

      // ------------------------------------------------------- phần DOM -----

      // Xoay quanh khớp vai, không quanh giữa hình: quay quanh giữa hình thì
      // cả cánh tay trượt đi chỗ khác thay vì vung.
      if (arm.current) {
        arm.current.style.transform = `rotate(${(w.swing * -62).toFixed(2)}deg)`;
      }

      if (rock.current) {
        const jolt = w.shake * 5;
        const x = w.shake > 0 ? (Math.random() - 0.5) * jolt : 0;
        const y = w.shake > 0 ? (Math.random() - 0.5) * jolt : 0;
        rock.current.style.transform =
          `translate(${x.toFixed(2)}px, ${(y + w.squash * 7).toFixed(2)}px) ` +
          `scale(${(1 + w.squash * 0.16).toFixed(3)}, ${(1 - w.squash * 0.2).toFixed(3)})`;
        rock.current.style.filter = w.flash > 0 ? `brightness(${1 + w.flash * 0.5})` : '';
      }

      if (ring.current) {
        ring.current.setAttribute('width', (hot * 100).toFixed(2));
        ring.current.style.opacity = hot > 0.02 ? '1' : '0';
      }

      if (label.current) {
        const multiplier = heatMultiplier(heat);
        label.current.textContent = multiplier > 1.001 ? `×${multiplier.toFixed(1)}` : '';
        label.current.style.opacity = multiplier > 1.001 ? '1' : '0';
      }

    });

    return () => {
      stop();
      observer.disconnect();
    };
  }, [game]);

  function hit(event: PointerEvent) {
    const box = host.current;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const before = game.heatNow();
    const mined = game.tap();
    const after = game.heatNow();

    const w = world.current;
    const hot = after / HEAT_CAP;

    // Nén mạnh dần theo nhiệt: bấm càng nóng thì cú đập càng nặng tay.
    w.squashV -= 9 + hot * 5;
    // Giơ búa lên ngay, rồi để lò xo quật nó xuống. Đánh nhanh thì cú sau bắt
    // được cú trước đang trên đường xuống, và cánh tay cộng dồn thành một nhịp
    // liên tục thay vì giật cục.
    w.swingV += 8 + hot * 3;
    w.shake = Math.min(1, w.shake + 0.1 + hot * 0.35);
    w.flash = Math.min(1, w.flash + 0.35);

    for (let i = 0; i < CHIPS_PER_TAP; i += 1) {
      // Nón hướng lên, mở rộng dần theo nhiệt — nóng thì vụn bắn tung hơn.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (1.5 + hot);
      const speed = 180 + Math.random() * (260 + hot * 260);

      w.chips.spawn({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.6,
        size: 3 + Math.random() * 4,
        spin: (Math.random() - 0.5) * 14,
        hue: (Math.random() - 0.5) * 30,
        kind: Math.random() < 0.18 ? 'spark' : 'chip',
      });
    }

    // Chỉ con số, không kèm chữ "quặng": nhãn dài thì ba lần chạm liên tiếp là
    // ba dòng chữ chồng lên nhau thành một vệt không đọc được — mà bấm liên
    // tiếp mới là trạng thái bình thường của màn này. Tản ngang một chút nữa để
    // hai con số cùng lúc không nằm đúng chồng nhau.
    pushFloat(w, x + (Math.random() - 0.5) * 64, y - 16, `+${count(mined)}`, false);

    // Vừa chạm trần nhiệt: một lần duy nhất cho mỗi chuỗi, nên nó là một sự
    // kiện chứ không phải một trạng thái nhấp nháy liên tục.
    if (before < HEAT_CAP && after >= HEAT_CAP) {
      w.shake = 1;
      pushFloat(w, rect.width / 2, rect.height / 2, t('grind.heatMax'), true);

      for (let i = 0; i < 16; i += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const speed = 260 + Math.random() * 320;
        w.chips.spawn({
          x: rect.width / 2,
          y: rect.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1 + Math.random() * 0.7,
          size: 5 + Math.random() * 4,
          spin: (Math.random() - 0.5) * 18,
          hue: (Math.random() - 0.5) * 20,
          kind: 'coin',
        });
      }
    }
  }

  return (
    <div
      class="stage"
      ref={host}
      onPointerDown={hit}
      role="button"
      tabIndex={0}
      aria-label={t('grind.mine')}
    >
      <canvas class="stage__fx" ref={canvas} aria-hidden="true" />

      {/* Thanh nhiệt chạy dọc đáy khung. Nó rút ngắn đúng theo số giây còn lại
          trước khi nguội hết — đó là toàn bộ nội dung người chơi đọc từ nó. */}
      <svg class="stage__ring" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
        <rect class="stage__ring-track" x="0" y="0" width="100" height="4" />
        <rect class="stage__ring-heat" x="0" y="0" width="0" height="4" ref={ring} />
      </svg>

      <div class="stage__rock" ref={rock}>
        <Scrapper armRef={(el) => (arm.current = el)} />
      </div>

      <span class="stage__value num">{money(derived.tapValue)}</span>
      <span class="stage__hint">{t('grind.perTap')}</span>
      <span class="stage__heat num" ref={label} />
    </div>
  );
}

function pushFloat(
  w: { floats: Float[]; nextFloat: number },
  x: number,
  y: number,
  text: string,
  big: boolean,
): void {
  const slot = w.floats[w.nextFloat % FLOATS]!;
  w.nextFloat += 1;

  slot.x = x;
  slot.y = y;
  // Trôi ngang: hai con số sinh ra gần nhau vẫn tách dần ra thay vì bay song
  // song rồi chồng chữ lên nhau suốt cả quãng đường.
  slot.vx = big ? 0 : (Math.random() - 0.5) * 90;
  slot.vy = big ? -150 : -130;
  slot.life = big ? 1.3 : 0.62;
  slot.span = slot.life;
  slot.text = text;
  slot.big = big;
}
