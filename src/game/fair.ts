/**
 * Phiên chợ — thứ chỉ có mặt trong một khoảng thời gian rồi đóng.
 *
 * ## Vì sao game này cần một thứ có giờ đóng cửa
 *
 * Mọi thứ khác trong trò đều **luôn ở đó**. Cơ sở, nâng cấp, đặc quyền, thành
 * tựu: mở app lúc nào cũng mua được, nên mở app lúc nào cũng như nhau, nên
 * chẳng có lúc nào là *lúc phải mở*. Điểm danh và việc hôm nay đã bù được một
 * phần — nhưng chúng lặp lại y hệt mỗi ngày, và cái gì lặp y hệt thì sau tuần
 * thứ hai nó thành thủ tục.
 *
 * Tài liệu về thể loại nói cùng một chuyện: cái giữ người chơi quay lại không
 * phải là nhiều nội dung hơn mà là **nội dung có hạn dùng** — một khoảng mở ra,
 * đổi món mỗi lần, đóng lại, và ai không có mặt thì mất lượt đó. Phiên chợ là
 * cái đó.
 *
 * ## Phiên tính từ đồng hồ, không lưu vào ván
 *
 * Không có máy chủ nào phát lịch sự kiện — bản trên GitHub Pages chạy một mình,
 * không nối đi đâu cả. Nên phiên **suy ra từ đồng hồ**: chia trục thời gian
 * thành từng chu kỳ 48 tiếng, mỗi chu kỳ mở 24 tiếng đầu, món của chu kỳ thứ
 * `n` rút bằng chính `n`. Máy nào cũng ra cùng một lịch, tắt app mở lại không
 * đổi món, và ván lưu chỉ giữ đúng ba con số: đang tính điểm cho chu kỳ nào,
 * mốc số đếm lúc phiên mở, và đã nhận tới nấc mấy.
 *
 * Cách này mượn nguyên của `quests.ts`, và mượn có lý do: cùng một bài toán
 * "nội dung đổi theo thời gian mà không có máy chủ" thì cùng một lời giải.
 *
 * ## Vì sao không phải là ba việc nữa
 *
 * Việc hôm nay đã là ba mục tiêu độc lập rồi. Thêm ba mục tiêu độc lập nữa,
 * đặt tên khác, là làm dày màn hình chứ không phải thêm trò. Phiên chợ khác ở
 * hai chỗ, và cả hai đều cố ý:
 *
 *  - **Một đường điểm bốn nấc**, không phải bốn việc rời. Nấc sau tiếp nối nấc
 *    trước, nên nó là một cái thang leo dở dang chứ không phải một danh sách
 *    tích ô.
 *  - **Trong lúc phiên mở thì một thứ trong game tốt hẳn lên.** Đây mới là lý
 *    do có mặt: không có nó thì phiên chỉ là nhiệm vụ có hẹn giờ, còn có nó thì
 *    hai mươi phút chơi trong phiên đáng hơn hai mươi phút chơi ngoài phiên.
 */
import type { QuestMetric } from './quests';

/** Một chu kỳ dài bao lâu, và mở bao lâu trong đó. */
export const PERIOD_HOURS = 48;
export const OPEN_HOURS = 24;

const HOUR = 3_600_000;
const PERIOD = PERIOD_HOURS * HOUR;
const OPEN = OPEN_HOURS * HOUR;

/**
 * Cái gì tốt lên trong lúc phiên mở.
 *
 * Bốn ô này **không phải bốn hệ số mới**: mỗi ô cắm vào đúng một chỗ đã có sẵn
 * trong `derive` — nhân công của một lần chạm, nhịp thẻ cơ hội, hệ số chung, và
 * tiền một ca làm thuê. Thêm một đường nhân riêng cho sự kiện là mời hai con số
 * lệch nhau: một con hiện trên màn hình, một con thật sự trả tiền.
 */
export interface FairEffects {
  tap: number;
  cardRate: number;
  global: number;
  jobPay: number;
}

export const NO_EFFECTS: FairEffects = { tap: 1, cardRate: 1, global: 1, jobPay: 1 };

export interface FairTier {
  /** Đủ bao nhiêu điểm thì mở nấc này. */
  points: number;
  /** Thưởng bằng chừng này giây thu nhập — như mọi thứ khác trong game. */
  seconds: number;
}

export interface FairDef {
  /** Cũng là hậu tố khoá i18n `fair.<id>`. */
  id: string;
  /** Số đếm nào ra điểm. */
  metric: QuestMetric;
  /** Ô nào trong `FairEffects` được nhân, và nhân bao nhiêu. */
  effect: keyof FairEffects;
  multiplier: number;
  tiers: readonly FairTier[];
}

/**
 * Bốn món, xoay vòng theo số thứ tự chu kỳ.
 *
 * Mỗi món **thưởng đúng cái nó bắt làm**: phiên tính điểm bằng số lần chạm thì
 * cũng chính là phiên mà một lần chạm ra gấp đôi công. Không thì người chơi
 * phải chọn giữa việc chạy theo điểm và việc hưởng buff, mà bắt chọn giữa hai
 * nửa của cùng một sự kiện là một thiết kế tự cãi nhau.
 *
 * Mốc điểm nặng hơn việc hôm nay khá nhiều, vì phiên mở suốt hai mươi tư tiếng
 * chứ không phải một buổi — nấc cuối là cái để người chơi quay lại lần thứ hai
 * trong ngày, không phải cái nhặt trong lúc đi ngang.
 */
export const FAIRS: readonly FairDef[] = [
  {
    id: 'dawn',
    metric: 'taps',
    effect: 'tap',
    multiplier: 2,
    tiers: [
      { points: 150, seconds: 300 },
      { points: 400, seconds: 660 },
      { points: 900, seconds: 1_320 },
      { points: 2_000, seconds: 3_000 },
    ],
  },
  {
    id: 'hiring',
    metric: 'jobs',
    effect: 'jobPay',
    multiplier: 2,
    tiers: [
      { points: 4, seconds: 300 },
      { points: 10, seconds: 660 },
      { points: 20, seconds: 1_320 },
      { points: 35, seconds: 3_000 },
    ],
  },
  {
    id: 'lucky',
    metric: 'cards',
    effect: 'cardRate',
    multiplier: 2,
    tiers: [
      { points: 3, seconds: 300 },
      { points: 7, seconds: 660 },
      { points: 14, seconds: 1_320 },
      { points: 25, seconds: 3_000 },
    ],
  },
  {
    id: 'opening',
    metric: 'units',
    effect: 'global',
    multiplier: 1.5,
    tiers: [
      { points: 80, seconds: 300 },
      { points: 300, seconds: 660 },
      { points: 900, seconds: 1_320 },
      { points: 2_500, seconds: 3_000 },
    ],
  },
];

/**
 * Nhận hết bốn nấc thì được thêm một cữ buff.
 *
 * Tiền thì phiên nào cũng trả; cái này là thứ *chỉ* nấc cuối có, để leo hết
 * thang khác với leo được ba phần tư. Ngắn và mạnh, đúng kiểu một thẻ cơ hội —
 * nó nối vào đúng ô `state.boost` sẵn có chứ không đẻ ra một loại buff thứ hai.
 */
export const FINAL_BOOST = { multiplier: 2, seconds: 600 };

/** Món của chu kỳ thứ `index`. */
export function fairDef(index: number): FairDef {
  // Số chu kỳ là một con số rất lớn (mili giây kể từ 1970 chia 48 tiếng), nên
  // phải chống số âm cho những mốc thời gian trước 1970 mà test có thể dựng ra.
  const at = ((index % FAIRS.length) + FAIRS.length) % FAIRS.length;
  return FAIRS[at]!;
}

export interface FairWindow {
  /** Số thứ tự chu kỳ. Ván lưu so với con số này để biết đã mở sổ chưa. */
  index: number;
  def: FairDef;
  open: boolean;
  /**
   * Giây còn lại — tới lúc đóng nếu đang mở, tới lúc phiên sau mở nếu đang
   * đóng. Một con số, hai nghĩa, vì màn hình chỉ có chỗ cho một cái đồng hồ và
   * người chơi luôn hỏi cùng một câu: "còn bao lâu nữa".
   */
  seconds: number;
  /** Món của chu kỳ sau, để lúc đóng còn nói được là sắp tới có gì. */
  nextDef: FairDef;
}

export function fairAt(now: number): FairWindow {
  const index = Math.floor(now / PERIOD);
  const startsAt = index * PERIOD;
  const endsAt = startsAt + OPEN;
  const open = now < endsAt;

  return {
    index,
    def: fairDef(index),
    open,
    seconds: Math.max(0, ((open ? endsAt : startsAt + PERIOD) - now) / 1000),
    nextDef: fairDef(index + 1),
  };
}

export interface FairState {
  window: FairWindow;
  /** Điểm kiếm được trong phiên này. */
  points: number;
  /** Số nấc đã đủ điểm. */
  reached: number;
  /** Số nấc đã bấm nhận. */
  claimed: number;
  /** Có nấc đã đủ điểm mà chưa nhận. */
  claimable: boolean;
  /** Nấc đang leo, hoặc `null` khi đã hết thang. */
  next: FairTier | null;
  effects: FairEffects;
}

/**
 * Trạng thái phiên lúc `now`.
 *
 * `savedIndex` là chu kỳ mà `savedBase` được chụp cho. Lệch nhau — phiên chưa
 * mở sổ, hoặc đang là quãng đóng cửa — thì điểm bằng không chứ không phải là
 * hiệu của một con số với một mốc của phiên trước; không có luật đó thì hai
 * ngày không mở app xong vào là bốn nấc xong sẵn.
 */
export function fairState(
  now: number,
  savedIndex: number,
  savedBase: number,
  savedClaimed: number,
  metrics: Record<QuestMetric, number>,
): FairState {
  const window = fairAt(now);
  const counting = window.open && savedIndex === window.index;
  const points = counting ? Math.max(0, metrics[window.def.metric] - savedBase) : 0;

  const tiers = window.def.tiers;
  let reached = 0;
  while (reached < tiers.length && points >= tiers[reached]!.points) reached += 1;

  const claimed = Math.min(Math.max(0, savedClaimed), tiers.length);

  return {
    window,
    points,
    reached,
    claimed,
    claimable: counting && reached > claimed,
    next: tiers[reached] ?? null,
    effects: window.open ? effectsOf(window.def) : NO_EFFECTS,
  };
}

/** Buff của một món, dựng từ đúng một ô trong `FairEffects`. */
export function effectsOf(def: FairDef): FairEffects {
  return { ...NO_EFFECTS, [def.effect]: def.multiplier };
}

/** Tiền của một nấc, tính theo thu nhập hiện tại như mọi phần thưởng khác. */
export function fairReward(tier: FairTier, incomePerSecond: number, tapValue: number): number {
  const baseline = Math.max(incomePerSecond, tapValue * 0.6);
  return Math.max(25_000, baseline * tier.seconds);
}
