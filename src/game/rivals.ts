/**
 * Bảng người ta.
 *
 * Cả game cho tới đây chỉ có một con số đi lên, và một con số đi lên thì không
 * có *hình dạng* — 4,2 tỷ hơn 3,1 tỷ bao nhiêu là chuyện phải ngồi tính. Hai
 * mươi bốn cái tên thì có: mình đang đứng sau chị hàng cá và trên chú xe ôm,
 * còn hai bậc nữa là qua mặt ông cà phê cóc.
 *
 * Đây cũng là chỗ duy nhất trong game nói **sạch nợ nghĩa là gì**. Ông cà phê
 * cóc đứng đúng ở mốc không: qua được ông ấy là hết âm, và cái tên đứng cạnh
 * cột mốc đó làm nó thành một buổi chiều đáng nhớ chứ không phải một số 0.
 *
 * Hai quyết định:
 *
 *  - **Xếp hạng đọc đỉnh của lượt đang chơi**, không đọc kỷ lục mọi thời. Làm
 *    lại là leo lại từ chót bảng, và leo lại nhanh gấp mấy lần lượt đầu — đó
 *    chính là chỗ sướng của việc làm lại, bảng này chỉ nói ra thành lời.
 *  - **Tiền vượt mặt thì chỉ trả một lần trong đời**, ghi ở `beaten`. Không thì
 *    làm lại là in tiền.
 */

export interface RivalDef {
  id: string;
  /** Tổng tài sản của người này. */
  at: number;
}

/**
 * Dày ở đoạn đầu, thưa dần về sau.
 *
 * Nửa dưới bảng nằm gọn trong buổi chơi đầu tiên, nên chỗ đó phải đủ tên để
 * cứ vài phút lại vượt được một người. Từ khu Phố Thị trở lên mỗi bậc là một
 * quãng dài, vì lúc đó người chơi đo tiến độ bằng khu chứ không bằng phút.
 */
export const RIVALS: readonly RivalDef[] = [
  { id: 'veso', at: -900_000_000 },
  { id: 'xeom', at: -750_000_000 },
  { id: 'taphoa', at: -500_000_000 },
  { id: 'suaxe', at: -250_000_000 },
  { id: 'hangca', at: -50_000_000 },
  // Đúng vạch không. Qua được người này là hết nợ.
  { id: 'cafe', at: 0 },
  { id: 'bunbo', at: 200_000_000 },
  { id: 'vualon', at: 2e9 },
  { id: 'nhaxe', at: 2e10 },
  { id: 'salan', at: 2e11 },
  { id: 'vuaca', at: 2e12 },
  { id: 'kho', at: 2e13 },
  { id: 'chuoi', at: 2e15 },
  { id: 'ksan', at: 2e17 },
  { id: 'rap', at: 2e19 },
  { id: 'vang', at: 2e21 },
  { id: 'quy', at: 2e24 },
  { id: 'bank', at: 2e27 },
  { id: 'bds', at: 2e30 },
  { id: 'tranh', at: 2e32 },
  { id: 'hangbay', at: 2e34 },
  { id: 'dao', at: 2e37 },
  { id: 'thap', at: 2e40 },
  { id: 'trum', at: 5e41 },
];

const BY_ID = new Map(RIVALS.map((rival) => [rival.id, rival]));

export function rivalById(id: string): RivalDef | null {
  return BY_ID.get(id) ?? null;
}

/** Đã trên đầu bao nhiêu người. */
export function rankOf(netWorth: number): number {
  if (!Number.isFinite(netWorth)) return 0;
  return RIVALS.filter((rival) => netWorth >= rival.at).length;
}

/** Người đứng ngay trên, hoặc null khi đã hết bảng. */
export function nextRival(netWorth: number): RivalDef | null {
  return RIVALS.find((rival) => netWorth < rival.at) ?? null;
}

/** Người vừa vượt mà chưa từng vượt lần nào. */
export function newlyPassed(netWorth: number, beaten: readonly string[]): RivalDef[] {
  return RIVALS.filter((rival) => netWorth >= rival.at && !beaten.includes(rival.id));
}

/**
 * Tiền vượt mặt, tính bằng giây thu nhập như mọi khoản thưởng khác trong game.
 *
 * Lên cao thì trả nhiều giây hơn, vì mỗi bậc trên bảng là một quãng dài hơn
 * bậc trước — trả cố định thì nửa trên bảng chỉ còn là một dòng thông báo.
 */
export function rivalReward(index: number, incomePerSecond: number, tapValue: number): number {
  const seconds = 150 + Math.max(0, index) * 25;
  const baseline = Math.max(incomePerSecond, tapValue * 0.6);
  return Math.max(30_000, baseline * seconds);
}

export interface RivalState {
  /** Đang trên đầu bao nhiêu người, theo đỉnh của lượt này. */
  rank: number;
  /** Người kế tiếp phải vượt, null khi hết bảng. */
  next: RivalDef | null;
  /** Người vừa vượt được, để hiện ngay dưới tên mình. */
  last: RivalDef | null;
  /** Phần đã đi được của quãng đang leo, từ 0 đến 1. */
  progress: number;
}

/**
 * Tiến độ đo bằng **log**, không đo bằng hiệu.
 *
 * Từ 2 nghìn tỷ lên 20 nghìn tỷ là một quãng gấp mười; đo tuyến tính thì thanh
 * đứng im ở số không suốt chín phần mười quãng rồi nhảy vọt ở cuối. Cả game
 * này chạy trên thang nhân, nên thanh cũng phải chạy trên thang nhân.
 */
export function rivalState(peakNetWorth: number): RivalState {
  const rank = rankOf(peakNetWorth);
  const next = nextRival(peakNetWorth);
  const last = rank > 0 ? RIVALS[rank - 1]! : null;

  if (next === null) return { rank, next, last, progress: 1 };

  // Dời cả thang lên trên số không rồi mới lấy log, vì nửa đầu bảng nằm ở phần
  // âm và log của số âm thì không có.
  const shift = 1e9;
  const from = Math.log10(Math.max(1, (last?.at ?? RIVALS[0]!.at - shift) + shift));
  const to = Math.log10(Math.max(1, next.at + shift));
  const here = Math.log10(Math.max(1, peakNetWorth + shift));

  return {
    rank,
    next,
    last,
    progress: to <= from ? 0 : Math.min(1, Math.max(0, (here - from) / (to - from))),
  };
}

/** Id của mọi người mà một mức tài sản đã vượt qua. */
export function passedRivals(netWorth: number): string[] {
  return RIVALS.filter((rival) => netWorth >= rival.at).map((rival) => rival.id);
}
