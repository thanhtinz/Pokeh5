/**
 * Chép ván ra chuỗi và dán lại.
 *
 * Đây là đường **duy nhất** một người chơi bản Pages mang được ván sang máy
 * khác, nên nó phải chịu được thứ mà mọi ô dán đều nhận: chuỗi rỗng, chuỗi của
 * chỗ khác, chuỗi bị cắt mất đuôi, và chuỗi bị sửa tay cho nhiều tiền lên.
 */
import { describe, expect, it } from 'vitest';

import { BUSINESSES } from '../src/game/businesses';
import { createNewSave } from '../src/game/state';
import { decodeSave, encodeSave, isTransferError } from '../src/game/transfer';

function played() {
  const state = createNewSave(7);
  state.cash = 1.234e15;
  state.peakNetWorth = 5.6e15;
  state.businesses[BUSINESSES[0]!.id] = 137;
  state.managers.push(BUSINESSES[0]!.id);
  state.reputationTotal = 42;
  state.stats.taps = 9001;
  return state;
}

describe('mang ván đi', () => {
  it('chép ra rồi dán lại thì ra đúng ván cũ', () => {
    const before = played();
    const after = decodeSave(encodeSave(before));

    expect(isTransferError(after)).toBe(false);
    if (isTransferError(after)) return;

    expect(after.cash).toBe(before.cash);
    expect(after.peakNetWorth).toBe(before.peakNetWorth);
    expect(after.businesses[BUSINESSES[0]!.id]).toBe(137);
    expect(after.managers).toContain(BUSINESSES[0]!.id);
    expect(after.reputationTotal).toBe(42);
    expect(after.stats.taps).toBe(9001);
  });

  it('chuỗi có tiền tố nhận ra được bằng mắt', () => {
    expect(encodeSave(played()).startsWith('BTB1.')).toBe(true);
  });

  /*
   * Ba kiểu dán nhầm, ba câu trả lời khác nhau. Gộp cả ba thành "ván hỏng" thì
   * người dán nhầm nửa cái link tưởng ván *của mình* vừa hỏng.
   */
  it('rỗng thì nói là rỗng', () => {
    expect(decodeSave('')).toBe('transfer.empty');
    expect(decodeSave('   \n  ')).toBe('transfer.empty');
  });

  it('chuỗi của chỗ khác thì nói là của chỗ khác, không phải hỏng', () => {
    expect(decodeSave('https://example.com/gi-do')).toBe('transfer.foreign');
    expect(decodeSave('eyJhIjoxfQ==')).toBe('transfer.foreign');
    expect(decodeSave('BTB2.eyJhIjoxfQ==')).toBe('transfer.foreign');
  });

  it('đúng tiền tố mà ruột hỏng thì mới là hỏng', () => {
    expect(decodeSave('BTB1.@@@không phải base64@@@')).toBe('transfer.broken');
    expect(decodeSave(`BTB1.${btoa('{ unclosed')}`)).toBe('transfer.broken');
    expect(decodeSave(`BTB1.${btoa('{"version":999}')}`)).toBe('transfer.broken');
  });

  it('cắt mất đuôi thì hỏng chứ không ra một ván nửa vời', () => {
    const full = encodeSave(played());
    const cut = full.slice(0, Math.floor(full.length * 0.6));
    const out = decodeSave(cut);
    expect(isTransferError(out)).toBe(true);
  });

  /*
   * Chuỗi này nằm trong tay người chơi, nên nó **là** đầu vào của người dùng —
   * sửa một con số rồi dán lại là chuyện ai cũng thử. Mọi thứ `sanitise` chặn
   * cho bản lưu trong máy thì cũng phải chặn ở đây; đường vào khác nhau không
   * có nghĩa là luật khác nhau.
   */
  it('sửa tay cho nhiều tiền lên thì vẫn phải đi qua `sanitise`', () => {
    const state = played();
    const raw = JSON.parse(JSON.stringify(state));
    raw.cash = 'rất nhiều tiền';
    raw.businesses[BUSINESSES[0]!.id] = -5;

    const bytes = new TextEncoder().encode(JSON.stringify(raw));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const out = decodeSave(`BTB1.${btoa(binary)}`);

    expect(isTransferError(out)).toBe(false);
    if (isTransferError(out)) return;

    expect(Number.isFinite(out.cash)).toBe(true);
    expect(out.businesses[BUSINESSES[0]!.id] ?? 0).toBeGreaterThanOrEqual(0);
  });

  /*
   * `btoa` ném ngay ở ký tự đầu tiên ngoài Latin-1, nên một chữ có dấu lọt vào
   * ván là cả nút "chép ván" chết — không phải chép ra chuỗi sai, mà là ném
   * một exception vào giữa mặt người chơi. Hôm nay ván chưa có trường chữ nào,
   * nhưng ngày nào đó thêm một cái tên hay một dòng ghi chú thì cái bẫy ấy nổ,
   * và nó nổ ở chỗ không ai nghĩ tới. Nên chỗ mã hoá đi qua `TextEncoder`, và
   * đây là bài kiểm giữ nó ở đó.
   */
  it('chữ có dấu không làm vỡ khâu chép ra', () => {
    const withText = { ...played(), ghiChu: 'Xóm Nước Đen · vốn 1 tỷ' } as never;

    expect(() => encodeSave(withText)).not.toThrow();

    const back = decodeSave(encodeSave(withText));
    expect(isTransferError(back)).toBe(false);
    if (isTransferError(back)) return;
    // `sanitise` bỏ trường lạ đi — đúng như nó phải làm — nhưng phần còn lại
    // vẫn nguyên, tức là chuỗi đã đi qua trọn vẹn.
    expect(back.stats.taps).toBe(9001);
  });
});
