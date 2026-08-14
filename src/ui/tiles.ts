/**
 * Việc nào lấy ô nào trong bộ tile của Kenney.
 *
 * Bảng này chỉ có phần công việc, và đó là một lựa chọn có ý thức chứ không
 * phải làm dở dang. Bộ RPG Urban là đồ đạc đường phố: thùng rác, sạp hàng,
 * biển hiệu, ống nước, xe cộ. Năm cái việc tay chân trong game đều nằm gọn
 * trong đó, nên chúng hợp.
 *
 * Ba mươi sáu cơ sở kinh doanh thì không. Chúng chạy từ nhặt ve chai tới vệ
 * tinh viễn thông, và **không bộ CC0 nào phủ nổi dải đó** — tôi đã soi cả bộ
 * Roguelike Modern City (gạch tường để ghép nhà) lẫn Game Icons (icon giao
 * diện: mũi tên, nút bấm). Ghép bừa một cái sạp rau cho "Vệ tinh viễn thông"
 * là nói dối người chơi, còn trộn nửa Kenney nửa hình cũ trong cùng một danh
 * sách thì trông hỏng hơn cả để nguyên. Nên phần đó giữ nguyên cho tới khi có
 * nguồn hình xứng với nó.
 */

/** Việc làm thuê → số thứ tự ô trong `src/assets/kenney/rpg-urban/tiles.png`. */
export const JOB_TILE: Record<string, number> = {
  // Bảng dán đầy tờ rơi rách.
  flyers: 309,
  // Cái máy có cửa tròn — gần nhất với chậu bát trong bộ này.
  dishes: 333,
  // Sọt hàng ở chợ đầu mối.
  moving: 277,
  // Cột đèn đường: thứ duy nhất trong bộ nói lên "ca đêm".
  night: 162,
  // Cụm ống và van, tức là công nghiệp.
  rig: 411,
};

/**
 * Cơ sở kinh doanh → hình.
 *
 * Hai loại, và ranh giới giữa chúng là một quyết định chứ không phải sự lười:
 *
 *  - **Một món đồ**, khi có món tả đúng được: cái lon cho nhặt ve chai, sạp rau
 *    cho xe hàng rong, két sắt cho ngân hàng, khung tranh cho phòng tranh.
 *  - **Một căn nhà nhỏ**, khi không có. Một quỹ đầu tư hay hãng xếp hạng tín
 *    nhiệm không phải là một món đồ; ở cỡ bốn mươi pixel thì thứ tả chúng đúng
 *    nhất là cái nhà chúng ngồi trong đó, và cái nhà ấy lấy đúng vật liệu của
 *    khu — nên nhìn là biết đang ở tầng nào của thang.
 *
 * Ghép bừa một món đồ cho những cơ sở loại hai thì tệ hơn hẳn: một cái sạp rau
 * gán cho "Vệ tinh viễn thông" là nói dối người chơi.
 */
export type BusinessArt = { tile: number } | { house: true };

export const BUSINESS_ART: Record<string, BusinessArt> = {
  // Xóm Nước Đen: toàn thứ cầm nắm được.
  cans: { tile: 251 },
  cart: { tile: 304 },
  wash: { tile: 164 },
  busk: { tile: 328 },
  scrap: { tile: 254 },
  flip: { tile: 250 },

  // Cảng: xe, hàng, cửa cuốn. Tàu bè thì bộ này không có, nên về nhà.
  forklift: { tile: 422 },
  crate: { tile: 277 },
  fish: { house: true },
  tug: { house: true },
  customs: { tile: 168 },
  yard: { tile: 386 },

  // Phố Thị: mặt tiền buôn bán.
  food: { tile: 426 },
  laundry: { tile: 333 },
  gym: { house: true },
  cafe: { tile: 282 },
  cinema: { tile: 309 },
  hotel: { tile: 255 },

  // Tài Chính: giấy tờ và két.
  fund: { tile: 363 },
  bank: { tile: 334 },
  insure: { tile: 390 },
  broker: { tile: 306 },
  ratings: { tile: 335 },
  exchange: { house: true },

  // Uptown: tranh, đấu giá, và mấy thứ không vẽ nổi bằng một ô.
  gallery: { tile: 362 },
  auction: { tile: 389 },
  yacht: { house: true },
  jet: { house: true },
  vineyard: { house: true },
  island: { house: true },

  // Heights: tới đây thì tất cả đều là toà nhà, và đó đúng là sự thật.
  tower: { house: true },
  media: { house: true },
  space: { house: true },
  fusion: { house: true },
  bank2: { tile: 334 },
  empire: { house: true },
};
