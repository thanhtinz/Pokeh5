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
import { BUSINESSES, DISTRICTS } from './game/businesses';
import { JOBS } from './game/jobs';
import { BUSINESS_ART, JOB_ART } from './ui/tiles';
import { PixScene } from './ui/Pix';
import { DistrictStrip } from './ui/DistrictStrip';
import { YARD_SCENES, yardScene } from './ui/yards';
import { YARDS } from './game/yard';
import { t } from './i18n';
import { applyTheme } from './ui/theme';

import './styles/base.css';
import './styles/app.css';

const params = new URLSearchParams(location.search);

/** Đọc `?wealth=` để soi cả hai đầu của thang màu chủ đề. */
const wealth = Number(params.get('wealth') ?? 1);

/**
 * `?unit=` phóng to cảnh tile.
 *
 * Ở cỡ thật mười sáu pixel thì một cái cảnh cụt mất một ô trông y hệt một cái
 * cảnh đúng — mắt không phân biệt nổi ở cỡ đó. Phóng lên bốn tám thì cái cụt
 * tự lộ ra. Nên bảng soi phải xem được ở cả hai cỡ, không chỉ cỡ thật.
 */
const unit = Number(params.get('unit') ?? 16);
const cell = `${unit * 3 + 4}px`;
applyTheme(wealth > 0.5 ? 1e18 : -1e9, document.documentElement);

function Sheet() {
  return (
    <div class="sheet-page">
      {/* Sáu dải phố bày cạnh nhau: chúng phải khác nhau đủ để nhìn phát biết
          đang ở khu nào, và đó là thứ chỉ thấy được khi xếp chồng lên nhau. */}
      {/* Icon đúng cỡ nó sống trong danh sách, kèm tên: cái nào không ra hình
          thì đọc tên xong nhìn hình là biết ngay. */}
      <h1>Hình cơ sở và việc làm</h1>
      <div
        class="iconsheet"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(6, ${unit * 3 + 130}px)`,
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        {BUSINESSES.map((def) => (
          <span
            key={def.id}
            style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px' }}
          >
            <span style={{ width: cell, height: cell, display: 'grid', placeItems: 'center' }}>
              {BUSINESS_ART[def.id] && <PixScene scene={BUSINESS_ART[def.id]!} unit={unit} />}
            </span>
            <b>{t(`biz.${def.id}`)}</b>
          </span>
        ))}
        {JOBS.map((job) => (
          <span
            key={job.id}
            style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px' }}
          >
            <span style={{ width: cell, height: cell, display: 'grid', placeItems: 'center' }}>
              {JOB_ART[job.id] && <PixScene scene={JOB_ART[job.id]!} unit={unit} />}
            </span>
            <b style={{ color: '#8fd' }}>{t(`job.${job.id}`)}</b>
          </span>
        ))}
      </div>

      {/* Sáu cái sân của màn Cày, bày cạnh nhau. Bày cạnh nhau mới kiểm được
          thứ duy nhất chúng phải làm: khác nhau đủ để nhìn phát biết vừa đổi,
          mà vẫn cùng một bố cục để so được với nhau. */}
      <h1>Sáu cái sân</h1>
      <div class="yardsheet" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 264px)', gap: '12px', marginBottom: '20px' }}>
        {YARD_SCENES.map((_, tier) => (
          <span key={tier} style={{ display: 'grid', gap: '4px', fontSize: '11px' }}>
            <PixScene scene={yardScene(tier)} unit={32} />
            <b>{t(`district.${YARDS[tier]!}`)}</b>
          </span>
        ))}
      </div>

      <h1>Dải phố sáu khu</h1>
      <div style={{ display: 'grid', gap: '10px', width: '360px' }}>
        {DISTRICTS.map((district) => (
          <div key={district} style={{ position: 'relative', height: '42px' }}>
            <DistrictStrip district={district} />
          </div>
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
    </div>
  );
}

const root = document.getElementById('app');
if (root) render(<Sheet />, root);
