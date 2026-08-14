import { describe, expect, it } from 'vitest';

import {
  COOL_PER_SECOND,
  HEAT_CAP,
  HEAT_MAX_MULTIPLIER,
  cooled,
  heatMultiplier,
  heatSecondsLeft,
  heated,
} from '../src/game/combo';
import { GRAVITY, Particles, fade } from '../src/engine/particles';

describe('nhiệt', () => {
  it('mỗi lần chạm lên một điểm, và có trần', () => {
    let heat = 0;
    for (let i = 0; i < 200; i += 1) heat = heated(heat, 0);
    expect(heat).toBe(HEAT_CAP);
    expect(heatMultiplier(heat)).toBeCloseTo(HEAT_MAX_MULTIPLIER, 6);
  });

  it('nguội theo giờ thật, không theo số lần chạm', () => {
    // Đây là cái chặn "bấm ba mươi cái rồi đi pha cà phê, quay lại vẫn nóng".
    const hot = 10;
    expect(cooled(hot, 1)).toBe(hot - COOL_PER_SECOND);
    expect(cooled(hot, 100)).toBe(0);
  });

  it('chạm lại sau khi nghỉ thì bắt đầu gần như từ đầu', () => {
    let heat = HEAT_CAP;
    heat = heated(heat, 60);
    expect(heat).toBe(1);
  });

  it('không có nhiệt thì không có thưởng, và không bao giờ phạt', () => {
    expect(heatMultiplier(0)).toBe(1);
    // Số rác từ đâu đó lọt vào không được phép làm sản lượng nhỏ đi.
    for (const bad of [Number.NaN, -5, Number.POSITIVE_INFINITY]) {
      expect(heatMultiplier(bad)).toBeGreaterThanOrEqual(1);
      expect(heatMultiplier(bad)).toBeLessThanOrEqual(HEAT_MAX_MULTIPLIER);
    }
  });

  it('thời gian còn lại đúng bằng lúc nhiệt về không', () => {
    const left = heatSecondsLeft(HEAT_CAP);
    expect(cooled(HEAT_CAP, left)).toBe(0);
    expect(cooled(HEAT_CAP, left - 0.01)).toBeGreaterThan(0);
  });
});

describe('hồ hạt', () => {
  it('không bao giờ cấp phát thêm, và không bao giờ bỏ qua lần sinh mới', () => {
    const pool = new Particles(8);
    for (let i = 0; i < 50; i += 1) {
      pool.spawn({ x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 3 });
    }
    expect(pool.items.length).toBe(8);
    expect(pool.live).toBe(8);
  });

  it('dùng lại ô của hạt đã chết trước khi cướp ô của hạt còn sống', () => {
    const pool = new Particles(4);
    for (let i = 0; i < 4; i += 1) {
      pool.spawn({ x: i, y: 0, vx: 0, vy: 0, life: i === 2 ? 0.01 : 10, size: 1 });
    }

    pool.step(0.02);
    expect(pool.live).toBe(3);

    pool.spawn({ x: 99, y: 0, vx: 0, vy: 0, life: 10, size: 1 });
    expect(pool.live).toBe(4);
    // Ba hạt sống lâu kia phải còn nguyên chỗ.
    expect(pool.items.filter((item) => item.life > 5).length).toBe(4);
  });

  it('rơi theo trọng lực, và cản gió chỉ ăn vào phương ngang', () => {
    const pool = new Particles(2);
    const item = pool.spawn({ x: 0, y: 0, vx: 100, vy: 0, life: 5, size: 2 });

    pool.step(0.1);
    expect(item.vy).toBeCloseTo(GRAVITY * 0.1, 6);
    expect(item.y).toBeGreaterThan(0);
    expect(item.vx).toBeLessThan(100);
    expect(item.vx).toBeGreaterThan(0);
  });

  it('nảy lên khi chạm đất, và mỗi lần nảy thấp hơn lần trước', () => {
    const pool = new Particles(2);
    const item = pool.spawn({ x: 0, y: 0, vx: 0, vy: 500, life: 9, size: 2 });

    pool.step(0.1, 10);
    expect(item.y).toBe(10);
    expect(item.vy).toBeLessThan(0);
    expect(Math.abs(item.vy)).toBeLessThan(500 + GRAVITY * 0.1);
  });

  it('bước dài cỡ nào cũng không đẩy hạt xuyên qua mặt đất', () => {
    // Chuyển tab rồi quay lại là một bước rất dài. Vòng lặp đã chặn trần, nhưng
    // hồ hạt không được phép tin vào điều đó.
    const pool = new Particles(2);
    const item = pool.spawn({ x: 0, y: 0, vx: 0, vy: 4000, life: 9, size: 2 });

    pool.step(1, 10);
    expect(item.y).toBeLessThanOrEqual(10);
  });

  it('hiện ngay rồi mờ dần ở cuối đời', () => {
    const pool = new Particles(1);
    const item = pool.spawn({ x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 2 });

    expect(fade(item)).toBe(1);
    pool.step(0.8);
    expect(fade(item)).toBeLessThan(1);
    expect(fade(item)).toBeGreaterThan(0);
    pool.step(0.3);
    expect(fade(item)).toBe(0);
  });

  it('dọn sạch được', () => {
    const pool = new Particles(4);
    for (let i = 0; i < 4; i += 1) pool.spawn({ x: 0, y: 0, vx: 0, vy: 0, life: 5, size: 1 });
    pool.clear();
    expect(pool.live).toBe(0);
  });
});
