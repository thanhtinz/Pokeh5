/**
 * Hình của từng cơ sở và từng việc làm, ghép từ hai bộ tile CC0 của Kenney.
 *
 * ## Vòng trước sai ở đâu
 *
 * Vòng trước mỗi cơ sở lấy **một ô**, và mười lăm cơ sở không tìm được ô nào
 * hợp thì rơi xuống một mảnh tường hai nhân hai giống hệt nhau theo khu — sáu
 * dòng liền của Uptown là *cùng một tấm ảnh*. Còn những cơ sở có ô riêng thì
 * ô ấy thường là mảnh của một vật lớn hơn: "Rửa xe máy" ra một khúc ống nước,
 * "Hát rong quán nhậu" ra một tấm nệm ghế nhìn từ trên xuống.
 *
 * Nguyên nhân chung là một hiểu nhầm về bộ tile: **mấy bộ này vẽ đồ vật trải
 * qua nhiều ô**. Cái ô tô chiếm hai nhân hai, sạp hàng hai nhân hai, cây một
 * nhân hai, dãy cửa cuốn kho ba nhân hai. Cắt ra từng ô thì cầm được mảnh, mà
 * mảnh ở cỡ ba mươi hai pixel chỉ còn là vệt màu.
 *
 * Nên đơn vị ở đây là **khối** (`Block` trong `Pix.tsx`), và mỗi cơ sở là một
 * **cảnh** — một hoặc vài khối xếp chồng. Nhờ vậy nước + cát ra sà lan, nước +
 * cát + cây ra hòn đảo, đất + hai cái cây ra vườn nho: những thứ không bộ nào
 * có sẵn nhưng ghép hai lớp là ra.
 *
 * ## Chỗ vẫn phải là toà nhà
 *
 * Một quỹ đầu tư hay hãng xếp hạng tín nhiệm không phải một món đồ. Với chúng
 * thì hình đúng nhất vẫn là **cái nhà chúng ngồi trong đó** — nhưng lần này là
 * một toà nhà ba nhân ba thật, có mái riêng, kính riêng, tầng trệt riêng, chứ
 * không phải một mảng tường lặp lại. Sáu toà nhà khác nhau thì nhìn ra sáu chỗ
 * khác nhau; sáu mảng tường giống nhau thì không.
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
 * Ba tầng của một toà nhà: mái, thân kính, tầng trệt.
 *
 * Ba nhân ba là cỡ nhỏ nhất mà một toà nhà còn ra toà nhà — hai nhân hai thì
 * không đủ chỗ cho cả mái lẫn cửa, và cái nhận được là một mảng tường.
 */
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

/* Vật liệu dùng lại giữa các toà nhà. Đặt tên vì một dãy `c(16, 6, 3, 1)` trần
   trụi thì không ai đọc ra "kính xanh", kể cả tôi sau một tuần. */
const TOP = {
  /** Mái vòm màu kem — nhìn ra tháp giải nhiệt và nhà xây tay. */
  dome: c(16, 4, 3, 1),
  /** Dải mái hiên xanh ngọc: mặt tiền buôn bán. */
  band: c(12, 5, 3, 1),
  /** Mái hiên sọc xanh lá. */
  green: c(23, 11, 3, 1),
  /** Mái hiên sọc cam. */
  orange: c(27, 11, 3, 1),
  /** Mái bằng có gờ chắn xám: nhà làm việc. */
  flat: c(20, 5, 3, 1),
  /** Gạch xám có chỉ trắng: gờ mái của toà nhà cũ. */
  cornice: c(4, 8, 3, 1),
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
  /** Dãy cửa ra vào khung gỗ. */
  doors: c(25, 15, 3, 1),
  /** Mặt kính tầng trệt. */
  glass: c(16, 7, 3, 1),
  /** Gạch xám, không cửa: bệ toà nhà. */
  stone: c(4, 5, 3, 1),
};

/** Ba ô nước. Nền cho mọi thứ nổi trên mặt nước. */
const WATER = c(26, 4, 3, 2);

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
  // Vòi nước bên cạnh một cái xe: rửa xe.
  wash: { w: 3, h: 2, layers: [c(9, 15, 1, 2, [0, 0]), u(15, 16, 2, 2, [1, 0])] },
  // Quầy mái sọc đỏ trắng — cái quán nhậu vỉa hè.
  busk: one(u(5, 9, 2, 2)),
  // Đống phế liệu trên, lốp và thùng phuy dưới.
  scrap: { w: 3, h: 2, layers: [c(12, 13, 3, 1, [0, 0]), c(12, 14, 3, 1, [0, 1])] },
  // Tủ, bàn, ghế cũ xếp chồng: hàng đồ cũ.
  flip: one(u(3, 10, 2, 2)),

  /* Cảng — xe, hàng, nước. */
  forklift: one(c(31, 24, 2, 2)),
  crate: one(c(13, 16, 2, 2)),
  // Không bộ nào có tàu. Gần nhất là **sàn ván chở thùng hàng trên mặt nước**,
  // tức là mẻ cá vừa cập bến — đọc kèm cái tên thì ra, đọc trơ thì không.
  fish: { w: 3, h: 2, layers: [WATER, c(21, 14, 3, 1, [0, 1]), c(13, 16, 2, 1, [0, 0])] },
  // Cũng vậy: đống cát giữa mặt nước là cái sà lan.
  tug: { w: 3, h: 2, layers: [WATER, c(4, 24, 2, 1, [1, 1])] },
  // Cabin kiểm hoá và hàng rào chắn.
  customs: { w: 2, h: 2, layers: [u(8, 11, 2, 1, [0, 0]), c(24, 5, 2, 1, [0, 1])] },
  yard: one(c(26, 26, 3, 2)),

  /* Phố Thị — mặt tiền buôn bán. */
  food: one(c(33, 14, 2, 2)),
  laundry: one(u(9, 12, 2, 2)),
  gym: building(TOP.green, BODY.timber, BASE.doors),
  cafe: one(c(35, 14, 2, 2)),
  cinema: building(TOP.orange, BODY.glass, BASE.doors),
  hotel: building(TOP.dome, BODY.bright, BASE.doors),

  /* Tài Chính — két, máy, và nhà làm việc. */
  fund: building(TOP.flat, BODY.timber, BASE.stone),
  // Cái két đứng cạnh hai cây ATM.
  bank: {
    w: 2,
    h: 2,
    layers: [u(10, 12, 1, 2, [0, 0]), u(8, 11, 1, 1, [1, 0]), u(9, 11, 1, 1, [1, 1])],
  },
  insure: building(TOP.band, BODY.bright, BASE.glass),
  broker: building(TOP.flat, BODY.glass, BASE.glass),
  ratings: building(TOP.green, BODY.brick, BASE.doors),
  exchange: building(TOP.orange, BODY.bright, BASE.stone),

  /* Uptown — tranh, đấu giá, nước và đất. */
  // Bốn bức tranh treo tường.
  gallery: one(u(11, 13, 2, 2)),
  // Tranh đặt trên bục: sàn đấu giá.
  auction: one(u(12, 14, 2, 2)),
  // Không có tàu, nên là **sàn ván có ô che trên mặt nước**: cái boong.
  yacht: { w: 3, h: 2, layers: [WATER, c(21, 14, 3, 1, [0, 1]), c(34, 14, 1, 1, [1, 0])] },
  // Không có máy bay, nên là **nhà chứa máy bay**: gờ mái trên dãy cửa cuốn.
  jet: { w: 3, h: 3, layers: [c(20, 5, 3, 1, [0, 0]), c(20, 26, 3, 2, [0, 1])] },
  // Hai hàng cây trên nền đất.
  vineyard: {
    w: 3,
    h: 2,
    layers: [c(4, 24, 3, 2), c(31, 10, 1, 2, [0, 0]), c(33, 10, 1, 2, [2, 0])],
  },
  // Cát và một cái cây giữa nước: hòn đảo.
  island: { w: 3, h: 2, layers: [WATER, c(4, 24, 1, 1, [1, 1]), c(31, 10, 1, 2, [1, 0])] },

  /* Heights — tới đây thì đúng là toàn toà nhà, và đó là sự thật. */
  tower: building(TOP.cornice, BODY.glass, BASE.doors),
  // Cột phát sóng trên nóc.
  media: {
    w: 3,
    h: 3,
    layers: [u(1, 6, 1, 1, [1, 0]), c(12, 6, 3, 1, [0, 1]), c(12, 7, 3, 1, [0, 2])],
  },
  // Không có vệ tinh, nên là **trạm mặt đất**: ba cột ăng-ten dựng thành hàng.
  space: {
    w: 3,
    h: 2,
    layers: [u(0, 6, 1, 2, [0, 0]), u(3, 6, 1, 2, [1, 0]), u(0, 6, 1, 2, [2, 0])],
  },
  // Hai tháp giải nhiệt.
  fusion: { w: 3, h: 2, layers: [c(16, 4, 3, 1, [0, 0]), c(4, 5, 3, 1, [0, 1])] },
  // Nhà đá, mái bằng, cửa lớn: ngân hàng trung ương.
  bank2: building(TOP.dome, BODY.brick, BASE.doors),
  // Kính suốt, mái vàng.
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
  // Cụm vòi và bồn rửa.
  dishes: one(c(9, 15, 3, 2)),
  // Xe bán tải chở đồ.
  moving: one(c(31, 20, 2, 2)),
  // Cột đèn đường và cái ghế băng dưới nó: ca trực đêm.
  night: { w: 3, h: 2, layers: [u(3, 6, 1, 2, [0, 0]), u(0, 10, 2, 1, [1, 1])] },
  // Cụm ống và van, tức là công nghiệp.
  rig: one(c(8, 14, 2, 2)),
};
