/**
 * Cắm rễ — thâm niên ở từng khu.
 *
 * Vấn đề kinh điển của game nhàn rỗi: mở được khu thứ ba thì hai khu đầu thành
 * số chết. Chúng nó vẫn nằm đó, vẫn mua được với giá lẻ, nhưng chẳng ai mua nữa
 * vì thu nhập của cả khu không bằng một chu kỳ của cơ ngơi mới nhất.
 *
 * Cách chữa duy nhất có tác dụng là **để công sức bỏ vào khu cũ trả bằng thứ
 * không phụ thuộc khu đó**. Nên mỗi bậc cắm rễ cộng thẳng vào thu nhập *toàn
 * cục*: gom đủ hai nghìn suất ở Xóm Nước Đen thì cái được không phải là tiền
 * nhặt ve chai, mà là mấy phần trăm của cả đế chế.
 *
 * Vì suất ở khu cũ rẻ đến mức nực cười so với thu nhập lúc đó, đây là cái đuôi
 * lúc nào cũng còn: hết việc để làm thì luôn còn một khu để về lấp cho đầy.
 */
import { BUSINESSES, DISTRICTS, type District } from './businesses';

/** Tổng suất trong một khu cần có để lên từng bậc. */
export const ROOT_TIERS = [50, 150, 350, 700, 1_200, 2_000] as const;

/** Mỗi bậc cắm rễ cộng bao nhiêu vào thu nhập toàn cục. */
export const ROOT_BONUS = 0.06;

const IDS_BY_DISTRICT = new Map<District, readonly string[]>(
  DISTRICTS.map((district) => [
    district,
    BUSINESSES.filter((def) => def.district === district).map((def) => def.id),
  ]),
);

/** Tổng suất đang có trong một khu. */
export function districtUnits(owned: Record<string, number>, district: District): number {
  let total = 0;
  for (const id of IDS_BY_DISTRICT.get(district) ?? []) total += Math.max(0, owned[id] ?? 0);
  return total;
}

/** Số bậc đã đạt với `units` suất trong khu. */
export function rootTier(units: number): number {
  let tier = 0;
  for (const threshold of ROOT_TIERS) {
    if (units >= threshold) tier += 1;
  }
  return tier;
}

/** Mốc kế tiếp của khu, hoặc null nếu đã kín bậc. */
export function nextRoot(units: number): number | null {
  return ROOT_TIERS.find((threshold) => threshold > units) ?? null;
}

export interface RootState {
  district: District;
  units: number;
  tier: number;
  /** Mốc đang leo tới, null nếu đã kín. */
  next: number | null;
  /** Phần đã đi được của bậc đang leo, từ 0 đến 1. */
  progress: number;
}

export function rootsOf(owned: Record<string, number>): RootState[] {
  return DISTRICTS.map((district) => {
    const units = districtUnits(owned, district);
    const tier = rootTier(units);
    const next = nextRoot(units);
    const floor = tier === 0 ? 0 : ROOT_TIERS[tier - 1]!;

    return {
      district,
      units,
      tier,
      next,
      progress: next === null ? 1 : Math.min(1, (units - floor) / (next - floor)),
    };
  });
}

/** Tổng số bậc đã cắm được trên cả sáu khu. */
export function totalRootTiers(owned: Record<string, number>): number {
  let total = 0;
  for (const district of DISTRICTS) total += rootTier(districtUnits(owned, district));
  return total;
}

/**
 * Cộng chứ không nhân.
 *
 * Ba mươi sáu bậc mà mỗi bậc nhân lên thì cuối game nó nuốt mọi hệ số khác và
 * không ai đọc nổi con số nữa. Cộng thì "mười bốn bậc, +84%" là một câu người
 * chơi tự nhẩm được, và trần ×3,16 nằm gọn cạnh uy tín với thành tựu.
 */
export function rootMultiplier(owned: Record<string, number>): number {
  return 1 + ROOT_BONUS * totalRootTiers(owned);
}
