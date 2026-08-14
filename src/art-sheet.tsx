/**
 * Bảng soi asset — chỉ dùng lúc phát triển, không nằm trong bản dựng.
 *
 * `npm run build` chỉ lấy `index.html` làm đầu vào, nên file này không đi vào
 * bundle. Nó tồn tại vì một lý do rất cụ thể: chụp cả màn game rồi soi mấy cái
 * hình 40px trong đó thì không đủ để thấy một cái sai. Bày cả bộ ra một lưới,
 * mỗi hình một trăm pixel, thì cái sai tự nhảy ra — đó là cách đã bắt được hai
 * asset còn dùng tên cũ và một cái bánh răng bị mất răng.
 *
 * Ba hàng cảnh: nền tối như trong game, nền sáng như trên đĩa mốc cuộc đời, và
 * cỡ thật 40px để biết cái hình còn đọc được ở kích thước nó thật sự sống.
 */
import { render } from 'preact';

import { ART_NAMES, Art } from './ui/Art';
import { Yard } from './ui/art/Yard';
import { applyTheme } from './ui/theme';

import './styles/base.css';
import './styles/app.css';

/** Đọc `?wealth=` để soi cả hai đầu của thang màu chủ đề. */
const wealth = Number(new URLSearchParams(location.search).get('wealth') ?? 1);
applyTheme(wealth > 0.5 ? 1e18 : -1e9, document.documentElement);

function Sheet() {
  return (
    <div class="sheet-page">
      {/* Cảnh lớn để trên cùng: một cái hình cỡ 40px sai chỗ nào thì còn giấu
          được, cỡ 560px thì không. */}
      <h1>Bãi phế liệu — cỡ soi</h1>
      <div style={{ width: '560px', background: 'hsl(24 26% 9%)', borderRadius: '16px' }}>
        <Yard />
      </div>

      <h1>
        {ART_NAMES.length} asset · {wealth > 0.5 ? 'giàu' : 'nợ'}
      </h1>

      <div class="sheet-grid">
        {ART_NAMES.map((name) => (
          <span key={name} class="sheet-cell">
            <Art name={name} class="sheet-big" />
            <b>{name}</b>
          </span>
        ))}
      </div>

      <h1>Trên đĩa sáng</h1>
      <div class="sheet-grid">
        {ART_NAMES.map((name) => (
          <span key={name} class="sheet-cell">
            {/* Đúng hai class mà mốc đã chuộc dùng, chứ không phải một cái đĩa
                tự dựng cho giống — dựng cho giống thì nó test cái tự dựng. */}
            <span class="life__item life__item--won sheet-lit">
              <span class="life__dot">
                <Art name={name} />
              </span>
            </span>
            <b>{name}</b>
          </span>
        ))}
      </div>

      <h1>Cỡ thật, 40px</h1>
      <div class="sheet-row">
        {ART_NAMES.map((name) => (
          <Art key={name} name={name} />
        ))}
      </div>
    </div>
  );
}

const root = document.getElementById('app');
if (root) render(<Sheet />, root);
