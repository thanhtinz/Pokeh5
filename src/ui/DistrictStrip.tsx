/**
 * Dải phố của mỗi khu, ghép từ tile.
 *
 * ## Dải phố làm việc mà cái icon không làm nổi
 *
 * Hình từng cơ sở (ở `tiles.ts`) nói *cái này là gì*: một sạp rau, một cái két,
 * một hòn đảo. Dải phố nói *đang ở tầng nào của thang* — và nó nói bằng vật
 * liệu chứ không bằng chữ. Gạch mộc ở Xóm Liều, cửa cuốn kho ở Cảng, mái hiên
 * sọc ở Phố Thị, kính suốt từ Tài Chính trở lên. Cuộn qua sáu khu là thấy cả
 * quãng đường, không cần một dòng chú thích nào.
 *
 * ## Mặt tiền là dữ liệu, không phải hình vẽ tay
 *
 * Mỗi khu khai một `Facade`: tường gì, cửa sổ gì, mái gì, cửa ra vào gì, rộng
 * mấy ô. Cái dải sinh ra từ đó. Đặt tay từng ô cho sáu khu là gần hai trăm con
 * số, và hai trăm con số đặt tay thì có ngày lệch một ô mà không ai tìm ra.
 */
import type { JSX } from 'preact';

import type { District } from '../game/businesses';
import { Pix } from './Pix';

/** Một căn nhà mặt phố. */
interface Facade {
  /** Ô tường, lặp kín thân nhà. */
  wall: number;
  /** Ô cửa sổ, đặt ở tầng trên. */
  window: number;
  /** Ô mái hoặc mái hiên, chạy suốt bề ngang. */
  top: number;
  /** Ô cửa ra vào, đặt ở tầng dưới. */
  /**
   * Ô cửa ra vào.
   *
   * Phải là một ô *nhìn ra cửa*. Lấy một ô tường trơn thì cả dãy thành một bức
   * tường liền và mất hết nhịp mặt tiền — đó là lỗi của vòng đầu. Lấy nhầm một
   * ô thùng gỗ thì tệ hơn nữa: giữa mặt tiền cao ốc kính hiện ra một cái thùng
   * hàng. Cả hai lần đều vì chọn ô từ một bảng soi dựng sai hình học.
   */
  door: number;
  /** Rộng mấy ô. */
  w: number;
}

/**
 * Ô nào là gì, viết theo cột/hàng của tấm sheet.
 *
 * Số thứ tự ô đọc trần trụi (`615`, `793`) thì không kiểm được: vòng trước có
 * một mái nhà hoá ra là **vạch kẻ đường** và một cái cửa hoá ra là **thùng
 * gỗ**, cả hai đều vì đọc số từ một bảng soi dựng sai hình học rồi chép thẳng
 * vào đây. Viết theo cột/hàng thì đối chiếu được với `scripts/contact.mjs`,
 * và bảng soi ấy dùng đúng công thức mà `Pix` dùng để vẽ.
 */
const COLS = 37;
const at = (x: number, y: number) => y * COLS + x;

/*
 * Ô mái phải là ô **lặp liền được theo chiều ngang**.
 *
 * Vòng trước lấy mấy ô mái vòm màu kem, và mỗi cái vòm ấy là một *mẩu* của một
 * mái lớn ba ô — lặp nó suốt bề ngang thì cả dải hoá ra một hàng bướu kem
 * giống hệt nhau, nhìn như bọt biển chứ không như mái nhà. Dải mái hiên sọc
 * thì ngược lại: nó vốn được vẽ để lặp, nên lặp bao nhiêu cũng liền.
 */
const T = {
  /** Gạch đỏ có chỉ trắng: gờ mái nhà cũ. */
  redCornice: at(0, 8),
  /** Gạch xám có chỉ trắng. */
  greyCornice: at(4, 8),
  /** Gờ chắn mái bê tông. */
  parapet: at(20, 5),
  /** Dải mái hiên xanh ngọc. */
  band: at(12, 5),
  /** Mái hiên sọc xanh lá. */
  awnGreen: at(23, 11),
  /** Mái hiên sọc cam. */
  awnOrange: at(27, 11),
};

const W = {
  redBrick: at(0, 6),
  greyBrick: at(4, 6),
  sandBrick: at(8, 6),
  brightGlass: at(12, 6),
  blueGlass: at(16, 6),
};

const N = {
  /** Cửa sổ khung gỗ. */
  timber: at(25, 16),
  /** Ô kính. */
  glass: at(16, 7),
};

const D = {
  /** Cửa khung gỗ. */
  timber: at(25, 15),
  /** Cửa cuốn kho. */
  shutter: at(20, 26),
  /** Cửa kính tầng trệt. */
  glass: at(16, 8),
};

/**
 * Sáu khu, mỗi khu một dãy nhà.
 *
 * Chất liệu đi lên theo đúng thứ tự người chơi leo: gạch mộc ở Xóm Liều, bê
 * tông và cửa cuốn ở Cảng, mái hiên sọc ở Phố Thị, rồi kính suốt từ Tài Chính
 * trở lên. Không cần chú thích nào cho người chơi — đổi vật liệu là đủ.
 */
const STREETS: Record<District, readonly Facade[]> = {
  // Gạch mộc, cửa sổ khung gỗ: nhà tự cất.
  skidrow: [
    { wall: W.redBrick, window: N.timber, top: T.redCornice, door: D.timber, w: 3 },
    { wall: W.greyBrick, window: N.timber, top: T.greyCornice, door: D.timber, w: 2 },
    { wall: W.redBrick, window: N.timber, top: T.redCornice, door: D.timber, w: 4 },
    { wall: W.sandBrick, window: N.timber, top: T.greyCornice, door: D.timber, w: 2 },
    { wall: W.greyBrick, window: N.timber, top: T.greyCornice, door: D.timber, w: 3 },
    { wall: W.redBrick, window: N.timber, top: T.redCornice, door: D.timber, w: 3 },
  ],
  // Bê tông và cửa cuốn: khu kho bãi.
  docks: [
    { wall: W.greyBrick, window: N.timber, top: T.parapet, door: D.shutter, w: 4 },
    { wall: W.sandBrick, window: N.timber, top: T.band, door: D.shutter, w: 3 },
    { wall: W.greyBrick, window: N.timber, top: T.parapet, door: D.shutter, w: 5 },
    { wall: W.sandBrick, window: N.timber, top: T.band, door: D.shutter, w: 3 },
  ],
  // Mái hiên sọc: mặt phố buôn bán.
  midtown: [
    { wall: W.sandBrick, window: N.timber, top: T.awnGreen, door: D.timber, w: 3 },
    { wall: W.redBrick, window: N.glass, top: T.awnOrange, door: D.glass, w: 3 },
    { wall: W.sandBrick, window: N.timber, top: T.awnGreen, door: D.timber, w: 4 },
    { wall: W.greyBrick, window: N.glass, top: T.band, door: D.glass, w: 3 },
    { wall: W.redBrick, window: N.timber, top: T.awnOrange, door: D.timber, w: 3 },
  ],
  // Kính suốt, không mái hiên: nhà làm việc.
  financial: [
    { wall: W.blueGlass, window: N.glass, top: T.parapet, door: D.glass, w: 4 },
    { wall: W.brightGlass, window: N.glass, top: T.band, door: D.glass, w: 3 },
    { wall: W.blueGlass, window: N.glass, top: T.parapet, door: D.glass, w: 5 },
    { wall: W.brightGlass, window: N.glass, top: T.band, door: D.glass, w: 3 },
  ],
  // Gạch kem xen kính trắng: khu nhà giàu, thấp và rộng.
  uptown: [
    { wall: W.brightGlass, window: N.glass, top: T.greyCornice, door: D.glass, w: 4 },
    { wall: W.sandBrick, window: N.timber, top: T.awnGreen, door: D.timber, w: 3 },
    { wall: W.brightGlass, window: N.glass, top: T.greyCornice, door: D.glass, w: 4 },
    { wall: W.sandBrick, window: N.timber, top: T.awnOrange, door: D.timber, w: 3 },
  ],
  // Kính cao suốt cả dải: cao ốc.
  heights: [
    { wall: W.blueGlass, window: N.glass, top: T.greyCornice, door: D.glass, w: 5 },
    { wall: W.brightGlass, window: N.glass, top: T.parapet, door: D.glass, w: 4 },
    { wall: W.blueGlass, window: N.glass, top: T.greyCornice, door: D.glass, w: 6 },
    { wall: W.brightGlass, window: N.glass, top: T.parapet, door: D.glass, w: 4 },
  ],
};

/** Ô của dải, tính bằng pixel gốc. Hai tầng: mái và mặt tiền. */
const TILE = 16;
const ROWS = 2;

export function DistrictStrip({ district }: { district: District }) {
  const street = STREETS[district];
  if (!street) return null;

  const cells: JSX.Element[] = [];
  let x = 0;

  for (const [n, house] of street.entries()) {
    for (let col = 0; col < house.w; col += 1) {
      for (let row = 0; row < ROWS; row += 1) {
        // Tầng trên là mái hoặc mái hiên; tầng dưới là mặt tiền — tường, một ô
        // cửa ra vào ở giữa, cửa sổ ở hai bên.
        const middle = col === Math.floor(house.w / 2);
        const edge = col === 0 || col === house.w - 1;
        const tile = row === 0 ? house.top : middle ? house.door : edge ? house.wall : house.window;

        cells.push(
          <Pix
            key={`${n}-${col}-${row}`}
            sheet="city"
            i={tile}
            size={TILE}
            style={{ position: 'absolute', left: `${(x + col) * TILE}px`, top: `${row * TILE}px` }}
          />,
        );
      }
    }
    x += house.w;
  }

  return (
    <div class="strip" style={{ '--strip-cols': x }}>
      <div class="strip__inner" style={{ width: `${x * TILE}px`, height: `${ROWS * TILE}px` }}>
        {cells}
      </div>
    </div>
  );
}
