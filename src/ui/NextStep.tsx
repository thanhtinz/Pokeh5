/**
 * Thanh "nên làm": một dòng, một việc, bấm vào là tới đúng chỗ.
 *
 * ## Vì sao chỉ một dòng
 *
 * Nó ngồi ngay dưới phần đầu, tức là nằm trên **mọi** màn hình, suốt cả ván.
 * Thứ gì ở đó cả ván thì phải rẻ: hai dòng là chiếm mất một hàng cơ sở, mà
 * người chơi mở app ra không phải để đọc lời khuyên — họ đọc nó đúng ba giây
 * đầu rồi thôi. Một dòng đủ nói "bấm cái gì", và bấm vào chính nó là xong.
 *
 * ## Vì sao là nút chứ không phải chữ
 *
 * Lời khuyên mà bắt người chơi tự đi tìm chỗ làm thì mới đi được nửa đường —
 * họ vẫn phải nhớ "thuê quản lý nằm ở tab nào". Bấm vào là nhảy thẳng sang
 * đúng tab, nên khoảng cách từ *biết phải làm gì* tới *đã làm xong* là một cú
 * chạm.
 *
 * Phần chọn việc nằm ở `game/advice.ts` và chạy được không cần trình duyệt.
 * Chỗ này chỉ dịch kết quả ra chữ.
 */
import { businessById } from '../game/businesses';
import { money } from '../game/money';
import { t } from '../i18n';
import type { Advice } from '../game/advice';
import { Sprite } from './Sprite';

interface Props {
  advice: Advice;
  /** Còn thiếu bao nhiêu tiền; chỉ có nghĩa với lời khuyên "đi cày". */
  shortfall: number;
  onGo: () => void;
}

export function NextStep({ advice, shortfall, onGo }: Props) {
  const name = advice.businessId ? t(`biz.${advice.businessId}`) : '';

  // "Đi cày" có hai cách nói: còn đích cụ thể thì nói ra con số, hết đích rồi
  // thì nói suông. Không có nhánh này thì người mua hết cả bảng nhận được câu
  // "cày thêm 0 nữa là mở được undefined".
  const key =
    advice.kind === 'grind' && !advice.businessId ? 'advice.grindDone' : `advice.${advice.kind}`;

  return (
    <button class="nextstep" onClick={onGo}>
      {/* Chỉ có hình khi lời khuyên trỏ vào một cơ sở cụ thể. Mấy việc như
          điểm danh hay làm lại không có hình riêng, và mượn tạm hình của một
          cơ sở nào đó thì tệ hơn để trống — người chơi đọc cái hình trước cả
          dòng chữ, nên một cái hình sai là một câu trả lời sai. */}
      {advice.businessId && (
        <span class="nextstep__icon">
          <Sprite id={advice.businessId} />
        </span>
      )}
      <span class="nextstep__text">
        <span class="nextstep__label">{t('advice.label')}</span>
        <span class="nextstep__line">{t(key, { name, amount: money(shortfall) })}</span>
      </span>
      <span class="nextstep__go" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

/** Tên cơ sở nếu id có thật — dùng cho aria-label ở lớp ngoài. */
export function adviceName(advice: Advice): string {
  return advice.businessId && businessById(advice.businessId)
    ? t(`biz.${advice.businessId}`)
    : t('advice.label');
}
