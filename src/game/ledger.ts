/**
 * Sổ sách — hai cột số, và cái ranh giới giữa chúng mới là nội dung.
 *
 * ## Vì sao phải là hai cột chứ không phải một danh sách
 *
 * Game này có hai loại số hoàn toàn khác nhau, và tới giờ chúng nằm lẫn vào
 * nhau khắp nơi. `peakNetWorth` về mốc đầu mỗi lần làm lại; `bestNetWorth` thì
 * không bao giờ. Số suất đang giữ mất sạch khi bán đế chế; số suất từng mở thì
 * cộng dồn mãi. Người chơi ở lượt thứ tư nhìn "144ngt" mà không có gì nói cho
 * họ biết đó là *của lượt này* hay *của cả đời* — và đó là hai câu chuyện khác
 * nhau: một cái đo lần leo đang dở, một cái đo cả quãng đã đi.
 *
 * Tài liệu về thể loại chia đúng theo lằn ranh ấy: số của lượt và số cả đời là
 * hai nhóm, không phải một danh sách dài. Nên chỗ này trả về hai mảng, và lớp
 * vẽ dựng hai cột.
 *
 * ## Vì sao nó là một module luật chứ không phải mấy dòng JSX
 *
 * Vì "cái nào thuộc cột nào" **là** một luật, và là luật dễ sai lặng lẽ nhất
 * trong cả game: xếp nhầm `bestNetWorth` sang cột lượt thì con số ấy không bao
 * giờ tụt sau khi làm lại, và không có gì đỏ — chỉ có một người chơi tưởng
 * mình không mất gì. Ở đây thì test đứng canh được.
 *
 * Module này **không đọc chữ và không định dạng số**. Nó trả về id với con số
 * cùng một cái nhãn kiểu; dịch ra chữ là việc của `i18n`, đổi ra "144,2ngt" là
 * việc của `money.ts`.
 */
import { BUSINESSES } from './businesses';
import { ownedOf, upgradeOf, type PlayerState } from './state';

/** Con số này đọc kiểu gì. Lớp vẽ chọn hàm định dạng theo đây. */
export type LedgerKind = 'money' | 'rate' | 'count' | 'days';

export interface LedgerLine {
  /** Cũng là hậu tố khoá i18n `ledger.<id>`. */
  id: string;
  kind: LedgerKind;
  value: number;
}

export interface Ledger {
  /** Số của lượt đang chơi — mọi dòng ở đây đều về mốc đầu khi làm lại. */
  run: LedgerLine[];
  /** Số cả đời — không dòng nào ở đây tụt xuống, bao giờ. */
  life: LedgerLine[];
}

/** Những gì sổ sách cần biết ngoài bản lưu. */
export interface LedgerInput {
  income: number;
  pendingReputation: number;
  /** Bây giờ là lúc nào, để tính số ngày đã chơi. */
  now: number;
}

const DAY = 86_400_000;

export function ledgerOf(state: PlayerState, input: LedgerInput): Ledger {
  let units = 0;
  let upgrades = 0;
  for (const def of BUSINESSES) {
    units += ownedOf(state, def.id);
    upgrades += upgradeOf(state, def.id);
  }

  return {
    run: [
      // Không có dòng "đang có" ở đây, dù nó là con số hiển nhiên nhất. Mua đồ
      // chỉ chuyển tiền thành tài sản nên tổng không đổi, tức là tài sản hiện
      // tại gần như luôn *bằng* đỉnh của lượt — hai dòng chép lại nhau, và một
      // bảng có hai dòng chép nhau là một bảng người ta thôi không đọc kỹ nữa.
      { id: 'peak', kind: 'money', value: state.peakNetWorth },
      { id: 'income', kind: 'rate', value: input.income },
      { id: 'units', kind: 'count', value: units },
      { id: 'managers', kind: 'count', value: state.managers.length },
      { id: 'upgrades', kind: 'count', value: upgrades },
      { id: 'pending', kind: 'count', value: input.pendingReputation },
    ],
    life: [
      { id: 'best', kind: 'money', value: state.bestNetWorth },
      // Ngày *đã trôi qua*, không phải ngày đã chơi: game không đếm giờ ngồi
      // trước màn hình, và nói "chơi 12 ngày" cho một người mở app hai lần là
      // một con số bịa. "Mở sổ 12 ngày trước" thì đúng, và cũng đủ để so.
      { id: 'days', kind: 'days', value: Math.max(0, (input.now - state.createdAt) / DAY) },
      { id: 'runs', kind: 'count', value: state.runs },
      { id: 'reputation', kind: 'count', value: state.reputationTotal },
      { id: 'achievements', kind: 'count', value: state.achievements.length },
      { id: 'taps', kind: 'count', value: state.stats.taps },
      { id: 'jobs', kind: 'count', value: state.stats.jobs },
      { id: 'cards', kind: 'count', value: state.stats.cards },
      { id: 'trades', kind: 'count', value: state.stats.trades },
      { id: 'boughtUnits', kind: 'count', value: state.stats.units },
    ],
  };
}
