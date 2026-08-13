import { describe, expect, it } from 'vitest';

import { clock, count, duration, money, signedPercent } from '../src/game/money';

describe('money', () => {
  // Tiền là đồng, và người Việt rút gọn bằng k / tr / tỷ chứ không phải K/M/B.
  it('rút gọn theo cách người ta viết hằng ngày', () => {
    expect(money(45_000)).toBe('45k');
    expect(money(3_000_000)).toBe('3tr');
    expect(money(1_000_000_000)).toBe('1tỷ');
    expect(money(4_500_000_000_000)).toBe('4,5ngt');
  });

  it('giữ dấu trừ ngoài cùng', () => {
    expect(money(-1_000_000_000)).toBe('-1tỷ');
    expect(money(-999_999_000)).toBe('-1000tr');
  });

  it('chỉ ghi đơn vị khi còn đếm từng đồng', () => {
    expect(money(0)).toBe('0đ');
    expect(money(450)).toBe('450đ');
    expect(money(4.5)).toBe('4,5đ');
    expect(money(4_500)).toBe('4,5k');
  });

  it('dùng dấu phẩy làm dấu thập phân', () => {
    expect(money(1_234_000_000)).toBe('1,234tỷ');
    expect(signedPercent(0.024)).toBe('+2,40%');
    expect(signedPercent(-0.008)).toBe('-0,80%');
  });

  it('đi hết thang tiếng Việt rồi mới sang hai chữ cái', () => {
    expect(money(1e15)).toBe('1trt');
    expect(money(1e18)).toBe('1tt');
    expect(money(1e21)).toBe('1aa');
  });

  it('không in ra NaN khi gặp vô cực', () => {
    expect(money(Infinity)).toBe('∞đ');
    expect(money(-Infinity)).toBe('-∞đ');
  });

  it('số đếm thuần thì không có đơn vị tiền', () => {
    expect(count(1_500)).toBe('1,5k');
    expect(count(320)).toBe('320');
  });
});

describe('đồng hồ', () => {
  it('dưới một phút đọc như bấm giờ, trên một phút đọc như đồng hồ', () => {
    expect(clock(12)).toBe('12s');
    expect(clock(64)).toBe('1:04');
    expect(clock(7530)).toBe('2:05:30');
  });

  // Đây là câu chữ, nên nó theo ngôn ngữ chứ không theo bộ định dạng số.
  it('viết bằng chữ cho hộp thoại lúc đi vắng', () => {
    expect(duration(11_520)).toBe('3 tiếng 12 phút');
    expect(duration(90)).toBe('1 phút');
    expect(duration(12)).toBe('12 giây');
  });
});
