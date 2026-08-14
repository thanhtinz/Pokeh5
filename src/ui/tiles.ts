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
