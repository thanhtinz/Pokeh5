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
import { BUSINESSES } from './game/businesses';
import { JOBS } from './game/jobs';
import { Sprite } from './ui/Sprite';
import { YARD_SCENES, yardScene } from './ui/yards';
import { YARDS } from './game/yard';
import { t } from './i18n';
import { applyTheme } from './ui/theme';

import './styles/base.css';
import './styles/app.css';

const params = new URLSearchParams(location.search);

/** Đọc `?wealth=` để soi cả hai đầu của thang màu chủ đề. */
const wealth = Number(params.get('wealth') ?? 1);

/** `?unit=` đổi cỡ hình, để soi được cả ở cỡ thật lẫn phóng to. */
const unit = Number(params.get('unit') ?? 64);
applyTheme(wealth > 0.5 ? 1e18 : -1e9, document.documentElement);

const box = { width: `${unit}px`, height: `${unit}px`, flex: `0 0 ${unit}px` };

function Sheet() {
  return (
    <div class="sheet-page">
      {/* Icon kèm tên: cái nào không ra hình thì đọc tên xong nhìn hình là
          biết ngay đã ghép nhầm chỗ nào trong `scripts/icon-map.json`. */}
      <h1>Hình cơ sở và việc làm</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(4, ${unit + 150}px)`,
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        {BUSINESSES.map((def) => (
          <span
            key={def.id}
            style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12px' }}
          >
            <Sprite id={def.id} class="sheet-sprite" />
            <b>{t(`biz.${def.id}`)}</b>
          </span>
        ))}
        {JOBS.map((job) => (
          <span
            key={job.id}
            style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12px' }}
          >
            <Sprite id={job.id} class="sheet-sprite" />
            <b style={{ color: '#8fd' }}>{t(`job.${job.id}`)}</b>
          </span>
        ))}
      </div>

      {/* Sáu tấm hình của màn Cày, bày cạnh nhau. Bày cạnh nhau mới kiểm được
          thứ duy nhất chúng phải làm: khác nhau đủ để nhìn phát biết vừa đổi
          khu, mà không tấm nào lặp lại hình của tấm bên cạnh. */}
      <h1>Sáu tấm hình màn Cày</h1>
      <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
        {YARD_SCENES.map((_, tier) => (
          <span key={tier} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {yardScene(tier).map((id) => (
              <Sprite key={id} id={id} class="sheet-sprite" />
            ))}
            <b style={{ fontSize: '12px' }}>{t(`district.${YARDS[tier]!}`)}</b>
          </span>
        ))}
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

      <style>{`.sheet-sprite { width: ${box.width}; height: ${box.height}; flex: ${box.flex} }`}</style>
    </div>
  );
}

const root = document.getElementById('app');
if (root) render(<Sheet />, root);
