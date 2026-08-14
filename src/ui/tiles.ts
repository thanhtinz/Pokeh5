/**
 * Hình của từng cơ sở và từng việc làm, ghép từ hai bộ tile CC0 của Kenney.
 *
 * ## Đơn vị là khối, không phải ô
 *
 * Mấy bộ này vẽ đồ vật **trải qua nhiều ô**: ô tô hai nhân hai, sạp hàng hai
 * nhân hai, cây một nhân hai, dãy cửa cuốn kho hai nhân hai. Lấy một ô thì cầm
 * được *mảnh* — một khúc ống nước, một tấm nệm ghế nhìn từ trên xuống, nửa cái
 * xe. Nên mỗi cơ sở ở đây là một **cảnh**: một hoặc vài `Block` xếp chồng.
 *
 * Ghép lớp còn dựng được thứ không bộ nào có sẵn: nước + cát ra sà lan, nước +
 * cát + cây ra hòn đảo, đất + ba cái cây ra vườn nho.
 *
 * ## Vì sao mọi toạ độ ở đây phải soi trước khi viết
 *
 * Vòng trước tôi lấy `c(31, 24, 2, 2)` cho cái xe nâng, tin rằng cái xe bắt
 * đầu ở cột 31. Nó bắt đầu ở cột **32** — cột 31 là mảnh viền bên trái của
 * một cái xe khác. Khung hai nhân hai rơi vắt qua hai chiếc xe, và cái nhận
 * được là một góc xe cộng một mảnh trống. Lệch đúng **một cột**, và ở cỡ mười
 * sáu pixel thì không ai nhìn ra — phải phóng lên gấp ba mới lộ.
 *
 * Nên quy trình bắt buộc, không được bỏ:
 *
 *   node scripts/contact.mjs city out.png <cộtTừ> <cộtĐến> <hàngTừ> <hàngĐến>
 *
 * Bảng đó cắt từng ô kèm số, dùng đúng công thức `Pix` dùng để vẽ. Đọc toạ độ
 * từ đó, đừng đoán từ một ảnh chụp thu nhỏ.
 *
 * ## Chỗ vẫn phải là toà nhà
 *
 * Một quỹ đầu tư hay hãng xếp hạng tín nhiệm không phải một món đồ. Với chúng
 * thì hình đúng nhất vẫn là **cái nhà chúng ngồi trong đó** — một toà nhà ba
 * nhân ba có mái riêng, thân riêng, tầng trệt riêng. Mười hai toà nhà, mười
 * hai tổ hợp khác nhau; giống nhau thì lại thành cái lỗi cũ.
 *
 * ## Chỗ vẫn phải nói dối một chút
 *
 * Không bộ CC0 nào có tàu thuỷ, máy bay hay vệ tinh. Ba chỗ đó lấy thứ gần
 * nhất và ghi rõ ở ngay dòng của nó, chứ không giả vờ là đã có.
 */
import type { Block, Scene } from './Pix';

/** Một khối trong bộ Roguelike Modern City. */
function c(x: number, y: number, w: number, h: number, at?: readonly [number, number]): Block {
  return at ? { sheet: 'city', x, y, w, h, at } : { sheet: 'city', x, y, w, h };
}

/** Một khối trong bộ RPG Urban. */
function u(x: number, y: number, w: number, h: number, at?: readonly [number, number]): Block {
  return at ? { sheet: 'urban', x, y, w, h, at } : { sheet: 'urban', x, y, w, h };
}

/** Một cảnh chỉ có đúng một khối, đặt sát góc. */
function one(block: Block): Scene {
  return { w: block.w, h: block.h, layers: [block] };
}

/**
 * Lát **một ô** ra kín một vùng.
 *
 * Cần cái này vì mặt nước và mặt đất trong bộ City không đồng nhất: ô kế bên
 * đã là mép cỏ, ô dưới đã là hòn đá. Lấy nguyên một khối ba nhân hai thì giữa
 * bãi đất hiện ra một vệt xanh chạy ngang — nhìn như hai tấm ảnh dán cạnh
 * nhau. Lát từ đúng một ô sạch thì cả vùng liền một màu.
 */
function fill(block: Block, w: number, h: number, at: readonly [number, number] = [0, 0]): Block[] {
  const out: Block[] = [];
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      out.push({ ...block, w: 1, h: 1, at: [at[0] + dx, at[1] + dy] });
    }
  }
  return out;
}

/** Ba tầng của một toà nhà: mái, thân, tầng trệt. */
function building(top: Block, body: Block, base: Block): Scene {
  return {
    w: 3,
    h: 3,
    layers: [
      { ...top, at: [0, 0] },
      { ...body, at: [0, 1] },
      { ...base, at: [0, 2] },
    ],
  };
}

/*
 * Vật liệu dùng lại giữa các toà nhà.
 *
 * Mái phải là dải **lặp liền được theo chiều ngang**. Mấy ô mái vòm màu kem
 * trông rất giống mái nhà khi soi một ô, nhưng chúng là *mẩu* của một mái lớn
 * ba ô: lặp ra thì thành một hàng bướu, không thành mái. Sáu dải dưới đây đều
 * là gờ tường hoặc mái hiên, tức là thứ vốn được vẽ để lặp.
 */
const TOP = {
  /** Dải mái hiên xanh ngọc. */
  band: c(12, 5, 3, 1),
  /** Mái hiên sọc xanh lá. */
  green: c(23, 11, 3, 1),
  /** Mái hiên sọc cam. */
  orange: c(27, 11, 3, 1),
  /** Gờ mái gạch xám, có chỉ trắng. */
  grey: c(4, 8, 3, 1),
  /** Gờ mái gạch đỏ. */
  red: c(0, 8, 3, 1),
  /** Gờ mái gạch kem. */
  sand: c(8, 8, 3, 1),
};

const BODY = {
  /** Kính xanh liền tấm: cao ốc văn phòng. */
  glass: c(16, 6, 3, 1),
  /** Kính trắng: nhà mới, sáng. */
  bright: c(12, 6, 3, 1),
  /** Cửa sổ khung gỗ: nhà cũ. */
  timber: c(25, 16, 3, 1),
  /** Tường gạch kem. */
  brick: c(8, 6, 3, 1),
};

const BASE = {
  /** Dãy cửa ra vào. */
  doors: c(25, 15, 3, 1),
  /** Mặt kính tầng trệt. */
  glass: c(16, 7, 3, 1),
  /** Gạch xám, không cửa: bệ toà nhà. */
  stone: c(4, 5, 3, 1),
};

/** Ô nước sạch, và ô đất sạch — dùng làm nền, lát bằng `fill`. */
const WATER = c(26, 4, 1, 1);
const SOIL = c(4, 24, 1, 1);
const SAND = c(6, 24, 1, 1);

/** Ván sàn, ba ô liền. Dùng làm boong và làm cầu cảng. */
const DECK = c(21, 14, 3, 1);

/** Một cái cây trọn vẹn trong đúng một ô. */
const TREES = c(31, 12, 3, 1);

/**
 * Cơ sở kinh doanh → cảnh.
 *
 * Thứ tự đúng bằng thứ tự trong `businesses.ts`, để đọc dọc xuống là thấy cả
 * cái thang: đồ nhặt được ở trên cùng, toà nhà kính ở dưới cùng.
 */
export const BUSINESS_ART: Record<string, Scene> = {
  /* Xóm Liều — toàn thứ cầm nắm được. */
  // Bốn cái thùng rác.
  cans: one(u(8, 9, 2, 2)),
  // Sạp hàng rong với rổ rau quả.
  cart: one(u(6, 10, 2, 2)),
  // Cái xe và cái vòi nước bên cạnh.
  wash: { w: 3, h: 2, layers: [u(15, 16, 2, 2, [0, 0]), c(8, 16, 1, 2, [2, 0])] },
  // Quầy mái sọc đỏ trắng và cái ghế băng, bàn kê phía dưới: quán nhậu vỉa hè.
  busk: one(u(6, 8, 2, 2)),
  // Đống phế liệu trên, lốp và thùng phuy dưới.
  scrap: { w: 3, h: 2, layers: [c(12, 13, 3, 1, [0, 0]), c(12, 14, 3, 1, [0, 1])] },
  // Tủ, bàn, kệ cũ: hàng đồ cũ.
  flip: one(u(3, 10, 2, 2)),

  /* Cảng — xe, hàng, nước. */
  /*
   * Xe nhìn ngang rộng **ba ô**, không phải hai.
   *
   * Chỗ này sai hai vòng liền theo hai hướng ngược nhau: vòng đầu lấy cột
   * 31–32 nên mất cái đuôi, vòng sau "sửa" thành 32–33 nên mất cái đầu. Cả hai
   * lần đều nhìn ra một chiếc xe, chỉ là một chiếc xe thiếu một phần — và ở cỡ
   * ba mươi hai pixel thì thiếu đầu hay thiếu đuôi đều vẫn "trông như xe".
   *
   * Cách duy nhất thấy được là **vẽ nguyên cả vùng ra một khối lớn** rồi đếm
   * ranh giới, chứ không soi từng ô rồi đoán ô nào ghép với ô nào:
   *
   *   node scripts/rects.mjs out.png 'city:30,16,7,12' 40
   */
  forklift: one(c(31, 24, 3, 2)),
  crate: one(c(13, 15, 2, 2)),
  // Không bộ nào có tàu. Gần nhất là **thùng hàng trên sàn ván giữa mặt nước**,
  // tức là mẻ cá vừa cập bến — đọc kèm cái tên thì ra, đọc trơ thì không.
  fish: {
    w: 3,
    h: 2,
    layers: [...fill(WATER, 3, 2), { ...DECK, at: [0, 1] }, c(13, 15, 2, 1, [0, 0])],
  },
  // Cũng vậy: đống cát giữa mặt nước là cái sà lan.
  tug: { w: 3, h: 2, layers: [...fill(WATER, 3, 2), ...fill(SAND, 3, 1, [0, 1])] },
  // Cabin kiểm hoá và hàng rào chắn.
  customs: { w: 2, h: 2, layers: [u(8, 11, 2, 1, [0, 0]), c(24, 5, 2, 1, [0, 1])] },
  yard: one(c(26, 26, 2, 2)),

  /* Phố Thị — mặt tiền buôn bán. */
  // Bàn kê trên, sọt hàng dưới. Cột 32 là **sạp xám** — chỗ đó lấy nhầm một
  // lần rồi, và ở cỡ mười sáu pixel thì xám hay cam nhìn cũng như nhau.
  food: one(u(4, 10, 2, 2)),
  // Bốn cái máy giặt xếp thành tường. Máy nằm ở cột 9–10, không phải cột 8:
  // cột 8 là cái ghế băng xanh, và một hàng máy giặt bắt đầu bằng ghế băng thì
  // không ai đọc ra là tiệm giặt.
  laundry: { w: 2, h: 2, layers: [u(9, 12, 2, 1, [0, 0]), u(9, 12, 2, 1, [0, 1])] },
  gym: building(TOP.green, BODY.timber, BASE.doors),
  cafe: one(c(34, 14, 2, 2)),
  cinema: building(TOP.orange, BODY.bright, BASE.doors),
  hotel: building(TOP.red, BODY.bright, BASE.doors),

  /* Tài Chính — két, máy, và nhà làm việc. */
  fund: building(TOP.grey, BODY.timber, BASE.stone),
  // Hai cái két đứng cạnh hai cây ATM.
  bank: {
    w: 2,
    h: 2,
    layers: [
      u(10, 12, 1, 1, [0, 0]),
      u(10, 12, 1, 1, [0, 1]),
      u(8, 11, 1, 1, [1, 0]),
      u(9, 11, 1, 1, [1, 1]),
    ],
  },
  insure: building(TOP.band, BODY.bright, BASE.glass),
  broker: building(TOP.grey, BODY.glass, BASE.glass),
  ratings: building(TOP.green, BODY.brick, BASE.doors),
  exchange: building(TOP.sand, BODY.bright, BASE.stone),

  /* Uptown — tranh, đấu giá, nước và đất. */
  // Sáu bức tranh treo kín tường.
  gallery: { w: 3, h: 2, layers: [u(11, 13, 3, 1, [0, 0]), u(11, 13, 3, 1, [0, 1])] },
  // Tranh đặt trên giá, cửa phòng phía dưới: gian đấu giá.
  auction: one(u(12, 14, 3, 2)),
  // Không có tàu, nên là **sàn ván có ô che trên mặt nước**: cái boong. Cái ô
  // che cao **hai ô** — mái ở trên, chân và quầy ở dưới; lấy mỗi ô mái thì
  // được một cái nấm bay lơ lửng.
  yacht: {
    w: 3,
    h: 2,
    layers: [...fill(WATER, 3, 2), { ...DECK, at: [0, 1] }, c(34, 14, 1, 2, [1, 0])],
  },
  // Không có máy bay, nên là **nhà chứa máy bay**: gờ mái trên dãy cửa cuốn.
  jet: { w: 2, h: 3, layers: [c(4, 8, 2, 1, [0, 0]), c(20, 26, 2, 2, [0, 1])] },
  // Ba hàng cây trên nền đất.
  vineyard: { w: 3, h: 2, layers: [...fill(SOIL, 3, 2), { ...TREES, at: [0, 0] }] },
  // Cát và một cái cây giữa nước: hòn đảo.
  island: {
    w: 3,
    h: 2,
    layers: [...fill(WATER, 3, 2), ...fill(SAND, 1, 1, [1, 1]), c(31, 12, 1, 1, [1, 0])],
  },

  /* Heights — tới đây thì đúng là toàn toà nhà, và đó là sự thật. */
  tower: building(TOP.sand, BODY.glass, BASE.doors),
  media: building(TOP.band, BODY.timber, BASE.glass),
  /*
   * Không có vệ tinh, và cũng **không có ăng-ten**.
   *
   * Chỗ này từng là ba cái cột dựng thành hàng, định làm trạm mặt đất. Nhưng
   * cái gọi là cột ấy là một cột chắn đường, một cột đèn chữ T và một **khúc
   * ống nước** — đọc ra ba dụng cụ chứ không ra ăng-ten. Lấy một thứ khác gán
   * cho thứ mình cần là đúng cái lỗi cả file này viết ra để tránh. Nên nó là
   * **nhà điều hành**, và nói thật như thế.
   */
  space: building(TOP.band, BODY.glass, BASE.stone),
  /*
   * Nhà xưởng mái vòm.
   *
   * Chỗ này từng lấy `c(16, 4, 3, 1)` làm hai cái tháp giải nhiệt. Cái mái vòm
   * ấy rộng đúng **hai ô**; lấy ba thì ô thứ ba là mảnh của một mái khác, và
   * mép phải hoá ra rách như giấy xé. Nay lấy đúng hai ô, và nó là cái nhà chứ
   * không giả vờ là tháp giải nhiệt.
   */
  fusion: {
    w: 2,
    h: 3,
    layers: [c(16, 4, 2, 1, [0, 0]), c(8, 6, 2, 1, [0, 1]), c(4, 5, 2, 1, [0, 2])],
  },
  bank2: building(TOP.red, BODY.brick, BASE.doors),
  empire: building(TOP.orange, BODY.glass, BASE.glass),
};

/**
 * Việc làm thuê → cảnh.
 *
 * Năm việc tay chân, và bộ RPG Urban vốn là đồ đạc đường phố nên phủ đủ.
 */
export const JOB_ART: Record<string, Scene> = {
  // Ba cái biển báo dựng ven đường — thứ gần nhất với chỗ dán tờ rơi.
  flyers: one(u(4, 6, 3, 2)),
  // Tủ mát và mấy thùng hàng: cái bếp sau quán.
  dishes: one(c(12, 15, 2, 2)),
  // Xe bán tải chở đồ.
  moving: one(c(31, 20, 3, 2)),
  // Cột đèn đường và cái bốt: ca trực đêm.
  night: { w: 2, h: 2, layers: [u(3, 6, 1, 2, [0, 0]), u(7, 6, 1, 2, [1, 0])] },
  // Cụm ống và van chạy suốt bề ngang, tức là công nghiệp. Ba ô chứ không hai:
  // ống vốn vẽ để nối tiếp nhau, cắt hai ô thì hai đầu ống lơ lửng giữa không.
  rig: one(c(8, 14, 3, 2)),
};
