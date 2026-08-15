/**
 * Chép ván ra, dán ván vào.
 *
 * ## Vì sao nó nằm ở đây chứ không nằm trong phần tài khoản
 *
 * Bản có máy chủ thì ván nằm trên mây và chỗ này chỉ là tiện. Bản chơi một
 * mình thì đây là **đường duy nhất** mang ván sang máy khác — xoá dữ liệu
 * duyệt web là mất sạch. Nên nó là một mục riêng ở màn Thêm, không nấp trong
 * phần tài khoản: bản một mình còn không có phần tài khoản nào cả.
 *
 * ## Ba câu trả lời cho ba kiểu dán sai
 *
 * Rỗng, của-chỗ-khác, và hỏng-thật là ba chuyện khác nhau. Gộp cả ba thành một
 * câu "ván hỏng" thì người dán nhầm nửa cái link tưởng ván *của mình* vừa hỏng
 * — và đó là câu tệ nhất có thể nói với người đang cố cứu ván của họ.
 *
 * ## Dán đè là không hoàn tác được
 *
 * Nên phải hỏi lại một lần. Cái nút đổi thành "Chắc chưa?" chứ không mở thêm
 * một hộp thoại: hộp thoại thì phải dựng, phải đóng, phải bắt phím Esc, mà thứ
 * cần nói chỉ là một câu.
 */
import { useState } from 'preact/hooks';

import type { Store } from '../game/store';
import { t } from '../i18n';

export function Transfer({ game, ownerId }: { game: Store; ownerId: number | null }) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function copy() {
    const text = game.exportSave();
    setCode(text);
    setCopied(false);

    // Clipboard API hỏng ở khá nhiều chỗ — http thường, WebView cũ, người dùng
    // từ chối quyền. Nên chuỗi luôn được bày ra để chép tay; cái nút chỉ là
    // đường tắt, không phải đường duy nhất.
    void navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  function load() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setConfirming(false);
    const failed = game.importSave(pasted, ownerId);
    setProblem(failed ? t(failed) : null);
    if (!failed) setPasted('');
  }

  return (
    <section class="panel panel--inset">
      <span class="section__title" style={{ margin: 0 }}>
        {t('transfer.title')}
      </span>
      <span class="row__meta" style={{ whiteSpace: 'normal' }}>
        {t('transfer.note')}
      </span>

      <div class="transfer">
        <button class="btn btn--sm btn--wide" onClick={copy}>
          {copied ? t('transfer.copied') : t('transfer.copy')}
        </button>

        {code !== '' && (
          <textarea class="transfer__code" readOnly rows={3} value={code} onFocus={selectAll} />
        )}

        <textarea
          class="transfer__code"
          rows={3}
          placeholder={t('transfer.paste')}
          value={pasted}
          onInput={(event) => {
            setPasted((event.target as HTMLTextAreaElement).value);
            setProblem(null);
            setConfirming(false);
          }}
        />

        <button
          class={`btn btn--sm btn--wide${confirming ? ' btn--primary' : ''}`}
          disabled={pasted.trim() === ''}
          onClick={load}
        >
          {confirming ? t('transfer.sure') : t('transfer.load')}
        </button>

        {problem !== null && <span class="auth__error">{problem}</span>}
      </div>
    </section>
  );
}

/** Chạm vào ô mã là chọn hết — không ai muốn quét tay một chuỗi dài thế. */
function selectAll(event: Event) {
  (event.target as HTMLTextAreaElement).select();
}
