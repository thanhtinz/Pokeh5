/**
 * Dải phố của mỗi khu, ghép từ tile.
 *
 * ## Vì sao là dải phố chứ không phải icon cho từng cơ sở
 *
 * Ba mươi sáu cơ sở chạy từ nhặt ve chai tới vệ tinh viễn thông, và không bộ
 * asset miễn phí nào phủ nổi dải đó — chuyện này ghi ở `tiles.ts`. Nhưng thứ
 * mấy bộ này *rất* giàu là **cảnh phố**: tường gạch, cửa kính, mái hiên sọc,
 * thùng rác, cây. Nên dùng chúng cho đúng chỗ mạnh: mỗi khu một dải phố ở đầu
 * mục, còn từng dòng cơ sở giữ nguyên hình cũ.
 *
 * Cách chia này còn tránh được một lỗi khác: trộn hai lối vẽ trong **cùng một
 * danh sách cuộn** thì mắt so sánh ngay hàng trên với hàng dưới và thấy vênh.
 * Dải phố là một thành phần khác hẳn, nằm ở một chỗ khác, nên nó đứng cạnh
 * danh sách mà không tranh chấp.
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
 * Sáu khu, mỗi khu một dãy nhà.
 *
 * Chất liệu đi lên theo đúng thứ tự người chơi leo: gạch mộc và mái tôn ở Xóm
 * Liều, tường thép ở Cảng, mái hiên sọc ở Phố Thị, rồi kính suốt từ Tài Chính
 * trở lên. Không cần chú thích nào cho người chơi — đổi vật liệu là đủ.
 */
const STREETS: Record<District, readonly Facade[]> = {
  // Gạch mộc, ván gỗ, mái tôn: nhà tự cất.
  skidrow: [
    { wall: 185, window: 201, top: 615, door: 571, w: 3 },
    { wall: 0, window: 201, top: 541, door: 608, w: 2 },
    { wall: 185, window: 201, top: 615, door: 571, w: 3 },
    { wall: 0, window: 201, top: 541, door: 608, w: 2 },
    { wall: 185, window: 201, top: 615, door: 571, w: 3 },
    { wall: 0, window: 201, top: 541, door: 608, w: 2 },
    { wall: 185, window: 201, top: 615, door: 571, w: 3 },
    { wall: 0, window: 201, top: 541, door: 608, w: 2 },
  ],
  // Bê tông và sọc cảnh báo: khu công nghiệp.
  docks: [
    { wall: 9, window: 312, top: 645, door: 201, w: 4 },
    { wall: 204, window: 312, top: 682, door: 571, w: 3 },
    { wall: 9, window: 312, top: 645, door: 201, w: 4 },
    { wall: 204, window: 312, top: 682, door: 571, w: 3 },
    { wall: 9, window: 312, top: 645, door: 201, w: 4 },
    { wall: 204, window: 312, top: 682, door: 571, w: 3 },
  ],
  // Mái hiên sọc: mặt phố buôn bán.
  midtown: [
    { wall: 28, window: 312, top: 393, door: 571, w: 3 },
    { wall: 185, window: 349, top: 430, door: 204, w: 3 },
    { wall: 28, window: 312, top: 467, door: 571, w: 4 },
    { wall: 185, window: 349, top: 393, door: 204, w: 3 },
    { wall: 28, window: 312, top: 430, door: 571, w: 3 },
    { wall: 185, window: 349, top: 467, door: 204, w: 3 },
  ],
  // Kính suốt, không mái hiên: nhà làm việc.
  financial: [
    { wall: 19, window: 349, top: 19, door: 201, w: 4 },
    { wall: 9, window: 386, top: 9, door: 201, w: 3 },
    { wall: 19, window: 349, top: 19, door: 201, w: 4 },
    { wall: 9, window: 386, top: 9, door: 201, w: 3 },
    { wall: 19, window: 349, top: 19, door: 201, w: 4 },
  ],
  uptown: [
    { wall: 28, window: 349, top: 467, door: 201, w: 4 },
    { wall: 19, window: 386, top: 19, door: 201, w: 3 },
    { wall: 28, window: 349, top: 504, door: 201, w: 4 },
    { wall: 19, window: 386, top: 19, door: 201, w: 3 },
    { wall: 28, window: 349, top: 467, door: 201, w: 4 },
  ],
  // Mái sẫm, kính cao: cao ốc.
  heights: [
    { wall: 9, window: 386, top: 793, door: 201, w: 5 },
    { wall: 19, window: 423, top: 830, door: 201, w: 4 },
    { wall: 9, window: 386, top: 793, door: 201, w: 5 },
    { wall: 19, window: 423, top: 830, door: 201, w: 4 },
  ],
};

/** Ô của dải, tính bằng pixel gốc. Ba tầng: mái, cửa sổ, cửa ra vào. */
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
