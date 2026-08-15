/**
 * Việc đáng làm nhất ngay lúc này.
 *
 * ## Vì sao cần
 *
 * Trò này có sáu tab, ba mươi sáu cơ sở, năm bậc nâng cấp cho mỗi cơ sở, quản
 * lý, cắm rễ, cổ phiếu, đặc quyền, nhiệm vụ ngày, điểm danh, mười hai mốc cuộc
 * đời, đối thủ và một bảng xếp hạng theo tuần. Mỗi thứ đều đúng chỗ của nó.
 * Nhưng người chơi mở app sau một ngày vắng thì đối diện cả cái đống ấy cùng
 * lúc, và không có gì trên màn hình trả lời câu hỏi duy nhất họ đang có: **giờ
 * bấm cái gì?**
 *
 * Tài liệu về thể loại này gọi đây là phần "dạy người chơi tối ưu". Không có
 * nó thì người chơi mới bỏ ở ngày đầu vì không biết đi đâu, còn người chơi cũ
 * quay lại thì bấm loanh quanh rồi tắt.
 *
 * ## Xếp hạng theo cái gì
 *
 * Không phải theo "cái nào nhiều tiền nhất" — mà theo **thứ tự một người biết
 * chơi sẽ làm**:
 *
 *  1. *Nhặt thứ đã thuộc về mình.* Mốc cuộc đời đã tới, điểm danh, nhiệm vụ
 *     xong — ba thứ này **miễn phí**. Bảo người chơi đi mua gì đó trong khi
 *     một cái thưởng vĩnh viễn đang nằm chờ là lời khuyên tệ.
 *  2. *Làm lại, nhưng chỉ khi đáng.* Làm lại xoá sạch cơ ngơi, nên nó chỉ chen
 *     lên đầu khi uy tín nhận được là một bước nhảy thật — mốc ở đây là **cộng
 *     thêm ít nhất một nửa** số uy tín đang có. Dưới mức đó thì mua tiếp vẫn
 *     hơn, và người chơi không bị giục làm lại quá sớm.
 *  3. *Thuê quản lý.* Đây là bước đổi chất chứ không phải đổi lượng: một cơ sở
 *     có quản lý là một cơ sở tự chạy lúc tắt máy. Một quản lý thường đáng giá
 *     hơn mười lượt mua thêm.
 *  4. *Mở cơ sở mới*, rồi *nâng cấp*, rồi — nếu không mua nổi gì — *đi cày*.
 *
 * ## Vì sao nó nằm ở `src/game/`
 *
 * Vì nó là một luật chơi, không phải một thứ trang trí. Lớp vẽ chỉ nhận về một
 * `Advice` và dịch nó ra chữ; toàn bộ phần "đáng làm nhất" chạy được trong Node
 * và kiểm được bằng test — mà nó *cần* được kiểm, vì một lời khuyên sai không
 * làm gì đỏ cả, nó chỉ lặng lẽ dắt người chơi đi sai đường.
 */
import { BUSINESSES, unitCost } from './businesses';
import { newlyReached } from './life';
import { hasManager, ownedOf, upgradeOf, type PlayerState } from './state';
import { nextUpgrade } from './upgrades';

export type AdviceTab = 'grind' | 'empire' | 'market' | 'life' | 'board' | 'more';

export interface Advice {
  /** Loại việc — cũng là hậu tố khoá i18n `advice.<kind>`. */
  kind:
    | 'milestone'
    | 'daily'
    | 'quest'
    | 'fair'
    | 'prestige'
    | 'manager'
    | 'business'
    | 'upgrade'
    | 'grind';
  /** Bấm vào lời khuyên thì mở tab nào. */
  tab: AdviceTab;
  /** Cơ sở liên quan, nếu có. Lớp vẽ dùng để lấy tên và hình. */
  businessId?: string;
}

/**
 * Làm lại phải lời tới mức nào mới đáng chen lên trước việc mua bán.
 *
 * Một nửa số uy tín đang có. Thấp hơn thì mỗi lần dư chút uy tín là màn hình
 * lại giục xoá sạch cơ ngơi đi làm lại — mà làm lại sớm quá thì người chơi mất
 * nhiều hơn được, và một cái thanh gợi ý nói sai vài lần là một cái thanh
 * người chơi thôi không đọc nữa.
 */
export const PRESTIGE_WORTH_IT = 0.5;

/** Những gì lời khuyên cần biết. Lấy hẹp lại để test khỏi phải dựng cả `Derived`. */
export interface AdviceInput {
  netWorth: number;
  spendable: number;
  pendingReputation: number;
  reputationTotal: number;
  dailyAvailable: boolean;
  questClaimable: boolean;
  /** Phiên chợ có nấc đã đủ điểm mà chưa bấm nhận. */
  fairClaimable: boolean;
}

export function nextStep(state: PlayerState, input: AdviceInput): Advice {
  // 1. Thứ đã thuộc về mình.
  if (newlyReached(input.netWorth, state.claimed).length > 0) {
    return { kind: 'milestone', tab: 'life' };
  }
  if (input.dailyAvailable) return { kind: 'daily', tab: 'more' };
  if (input.questClaimable) return { kind: 'quest', tab: 'more' };
  // Nấc phiên chợ đứng cạnh hai cái trên vì cùng một lý do — đã kiếm được rồi,
  // chỉ còn thiếu một cú bấm — nhưng đứng *sau* chúng vì nó là thứ duy nhất có
  // giờ đóng cửa: nếu chỉ kịp làm một việc thì người chơi nên biết ba việc này
  // đều đang chờ, và cái thứ ba là cái sẽ mất nếu để qua đêm.
  if (input.fairClaimable) return { kind: 'fair', tab: 'more' };

  // 2. Làm lại, nhưng chỉ khi là bước nhảy thật.
  const worthReset =
    input.pendingReputation > 0 &&
    input.pendingReputation >= Math.max(1, input.reputationTotal * PRESTIGE_WORTH_IT);
  if (worthReset) return { kind: 'prestige', tab: 'life' };

  // 3. Quản lý: cơ sở đang có mà chưa ai trông, rẻ nhất trước — rẻ nhất là cái
  //    mua được sớm nhất, và một quản lý mua được hôm nay hơn một quản lý
  //    hoàn hảo mua được tuần sau.
  let manager: { id: string; cost: number } | null = null;
  for (const def of BUSINESSES) {
    if (ownedOf(state, def.id) <= 0 || hasManager(state, def.id)) continue;
    if (def.managerCost > input.spendable) continue;
    if (!manager || def.managerCost < manager.cost) manager = { id: def.id, cost: def.managerCost };
  }
  if (manager) return { kind: 'manager', tab: 'empire', businessId: manager.id };

  // 4. Cơ sở mới: cái đắt nhất mua nổi. Đắt nhất trong bảng này cũng là cái trả
  //    nhiều nhất, vì cả hai đều đi lên theo cùng một thứ tự.
  let opening: string | null = null;
  for (const def of BUSINESSES) {
    if (ownedOf(state, def.id) > 0) continue;
    if (def.baseCost <= input.spendable) opening = def.id;
  }
  if (opening) return { kind: 'business', tab: 'empire', businessId: opening };

  // 5. Nâng cấp: bậc nào đã mở khoá và mua nổi, rẻ nhất trước.
  let upgrade: { id: string; cost: number } | null = null;
  for (const def of BUSINESSES) {
    const owned = ownedOf(state, def.id);
    if (owned <= 0) continue;
    const next = nextUpgrade(def, owned, upgradeOf(state, def.id));
    if (!next || !next.unlocked || next.cost > input.spendable) continue;
    if (!upgrade || next.cost < upgrade.cost) upgrade = { id: def.id, cost: next.cost };
  }
  if (upgrade) return { kind: 'upgrade', tab: 'empire', businessId: upgrade.id };

  // 6. Không mua nổi gì thì đi kiếm tiền. Kèm cơ sở rẻ nhất chưa có, để cái
  //    đích hiện ra thành một con số cụ thể chứ không phải "cày đi rồi tính".
  const target = BUSINESSES.find((def) => ownedOf(state, def.id) <= 0);
  const grind: Advice = { kind: 'grind', tab: 'grind' };
  if (target) grind.businessId = target.id;
  return grind;
}

/** Còn thiếu bao nhiêu tiền cho việc được khuyên, hoặc 0 nếu mua được rồi. */
export function adviceShortfall(advice: Advice, state: PlayerState, spendable: number): number {
  if (advice.kind !== 'grind' || !advice.businessId) return 0;
  const def = BUSINESSES.find((entry) => entry.id === advice.businessId);
  if (!def) return 0;
  return Math.max(0, unitCost(def, ownedOf(state, def.id)) - spendable);
}
