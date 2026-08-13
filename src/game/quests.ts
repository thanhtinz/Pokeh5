/**
 * Việc trong ngày.
 *
 * Điểm danh cho người chơi lý do *mở* game hôm nay; ba việc này cho lý do **ở
 * lại thêm mười phút**. Khác nhau ở chỗ điểm danh xong là xong, còn việc thì
 * phải chơi mới xong được.
 *
 * Ba việc, đổi lúc nửa đêm, rút từ một túi cố định bằng chính số thứ tự của
 * ngày — nên máy nào mở cũng ra đúng bộ đó, tắt app mở lại không đổi đề, và
 * không cần lưu bộ nhiệm vụ vào save. Save chỉ giữ **mốc số đếm lúc sang ngày**;
 * tiến độ là hiệu của số đếm bây giờ với mốc đó.
 *
 * Cách này có một cái lợi không hiển nhiên: mọi số đếm đều cộng dồn và sống qua
 * làm lại, nên bán sạch đế chế giữa ngày cũng không xoá mất việc đang làm dở.
 */
import { Rng } from './rng';
import type { Metrics } from './achievements';

/** Số việc mỗi ngày. Ba là vừa: đủ để chọn, chưa thành danh sách phải cuộn. */
export const QUESTS_PER_DAY = 3;

/** Xong cả ba trong một ngày thì được thêm chừng này uy tín. */
export const QUEST_BONUS_REPUTATION = 1;

export type QuestMetric = 'taps' | 'cards' | 'jobs' | 'trades' | 'units' | 'upgrades';

export interface QuestDef {
  id: string;
  metric: QuestMetric;
  target: number;
  /** Thưởng bằng chừng này giây thu nhập. */
  seconds: number;
}

/**
 * Túi đề. Mỗi số đếm có hai mức — một mức làm được trong lúc đi ngang qua, một
 * mức phải ngồi lại làm — để bộ ba hôm nay có lúc nhẹ có lúc nặng.
 */
export const QUEST_POOL: readonly QuestDef[] = [
  { id: 'tapA', metric: 'taps', target: 60, seconds: 240 },
  { id: 'tapB', metric: 'taps', target: 250, seconds: 720 },
  { id: 'cardA', metric: 'cards', target: 2, seconds: 300 },
  { id: 'cardB', metric: 'cards', target: 5, seconds: 780 },
  { id: 'jobA', metric: 'jobs', target: 3, seconds: 300 },
  { id: 'jobB', metric: 'jobs', target: 8, seconds: 840 },
  { id: 'tradeA', metric: 'trades', target: 4, seconds: 270 },
  { id: 'tradeB', metric: 'trades', target: 12, seconds: 720 },
  { id: 'unitA', metric: 'units', target: 40, seconds: 300 },
  { id: 'unitB', metric: 'units', target: 200, seconds: 900 },
  { id: 'upA', metric: 'upgrades', target: 2, seconds: 360 },
  { id: 'upB', metric: 'upgrades', target: 5, seconds: 960 },
];

const BY_ID = new Map(QUEST_POOL.map((quest) => [quest.id, quest]));

export function questById(id: string): QuestDef | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Bộ việc của ngày thứ `day`, rút trong phạm vi những gì người chơi **với tới
 * được**.
 *
 * Hai luật:
 *
 *  - Mỗi số đếm nhiều nhất một đề, để hôm nay không ra "chạm 60 lần" nằm cạnh
 *    "chạm 250 lần" — làm xong cái nặng là cái nhẹ tự xong, tức là mất một phần
 *    ba nhiệm vụ.
 *  - Chỉ rút trong `available`. Ván mới đang âm một tỷ thì chưa có đồng tiền
 *    mặt nào để đặt lệnh, chưa cơ sở nào đủ 25 suất để nâng cấp; giao mấy đề đó
 *    vào ngày đầu là ba việc thì hai việc không có cách nào làm.
 */
export function questsFor(day: number, available: readonly QuestMetric[]): QuestDef[] {
  const rng = new Rng(day * 2654435761 + 1);
  const metrics = available.filter((metric) =>
    QUEST_POOL.some((quest) => quest.metric === metric),
  );

  // Fisher–Yates, để thứ tự cũng do hạt quyết định chứ không do thứ tự khai báo.
  for (let i = metrics.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [metrics[i], metrics[j]] = [metrics[j]!, metrics[i]!];
  }

  return metrics
    .slice(0, QUESTS_PER_DAY)
    .map((metric) => rng.pick(QUEST_POOL.filter((quest) => quest.metric === metric)));
}

/** Số đếm luôn với tới được, kể cả ở ván mới lúc còn âm một tỷ. */
export const ALWAYS_AVAILABLE: readonly QuestMetric[] = ['taps', 'cards', 'jobs', 'units'];

export interface QuestProgress {
  def: QuestDef;
  /** Đã làm được bao nhiêu **trong hôm nay**. */
  done: number;
  /** Đủ số chưa. */
  complete: boolean;
  /** Đã bấm nhận chưa. */
  claimed: boolean;
}

export interface QuestState {
  quests: QuestProgress[];
  /** Có ít nhất một việc xong mà chưa nhận. */
  claimable: boolean;
  /** Nhận nốt việc cuối là được thưởng uy tín. */
  bonusPending: boolean;
}

/**
 * Trạng thái các việc đã rút cho hôm nay.
 *
 * `base` là ảnh chụp số đếm lúc sang ngày. Nếu nó thiếu một khoá — save cũ,
 * hoặc số đếm mới thêm sau này — thì coi như bằng số đếm hiện tại, tức là hôm
 * nay bắt đầu từ không, chứ không phải bỗng dưng xong sẵn.
 */
export function questState(
  ids: readonly string[],
  base: Record<string, number>,
  claimed: readonly string[],
  metrics: Metrics,
): QuestState {
  const quests = ids.flatMap((id) => {
    const def = questById(id);
    if (!def) return [];

    const from = base[def.metric] ?? metrics[def.metric];
    const done = Math.max(0, metrics[def.metric] - from);
    return [
      {
        def,
        done: Math.min(done, def.target),
        complete: done >= def.target,
        claimed: claimed.includes(def.id),
      },
    ];
  });

  const claimable = quests.some((quest) => quest.complete && !quest.claimed);
  const left = quests.filter((quest) => !quest.claimed).length;

  return {
    quests,
    claimable,
    // Việc cuối cùng chưa nhận, và nó đang xong: bấm phát nữa là ăn cả cụm.
    bonusPending: quests.length > 0 && left === 1 && quests.every((quest) => quest.complete),
  };
}

/** Ảnh chụp số đếm để mở một ngày mới. */
export function snapshot(metrics: Metrics): Record<string, number> {
  return {
    taps: metrics.taps,
    cards: metrics.cards,
    jobs: metrics.jobs,
    trades: metrics.trades,
    units: metrics.units,
    upgrades: metrics.upgrades,
  };
}

/** Tiền của một việc, tính theo thu nhập hiện tại như mọi thứ khác trong game. */
export function questReward(def: QuestDef, incomePerSecond: number, tapValue: number): number {
  const baseline = Math.max(incomePerSecond, tapValue * 0.6);
  return Math.max(15_000, baseline * def.seconds);
}
