/**
 * Tiếng Việt — ngôn ngữ chính của game.
 *
 * Viết như người Việt nói, không phải dịch từng chữ từ tiếng Anh. Cụ thể:
 *
 *  - Chọn từ thuần Việt khi có, thay vì từ Hán Việt cho sang. "Sạch nợ" chứ
 *    không phải "Thanh toán hết nợ". "Tổng tài sản" chứ không phải "Tài sản
 *    ròng" — đây là màn hình game, không phải báo cáo tài chính.
 *  - Bỏ đại từ khi câu vẫn rõ. Tiếng Việt kể chuyện thường không cần "bạn" ở
 *    mỗi câu, nhét vào là ra giọng sách dịch ngay.
 *  - Không bê nguyên thành ngữ tiếng Anh. "Your back will remember this one"
 *    thành "Xong ca này lưng nhớ đời", không phải "Lưng bạn sẽ nhớ ca này".
 *  - Câu ở mốc cuộc đời giữ nhịp bản gốc: ngắn, thì hiện tại, không chấm than.
 *
 * Bối cảnh vẫn là một thành phố Mỹ và tiền là đô la, nên tên khu và tên cổ
 * phiếu dịch lấy nghĩa và lấy giọng châm biếm, không Việt hoá bối cảnh.
 */
export const vi: Record<string, string> = {
  // ------------------------------------------------------------------ chung --
  'ui.boot': 'Đang đếm thiệt hại',
  'ui.balance': 'Số dư',
  'ui.netWorth': 'Tổng tài sản',
  'ui.automated': 'Tự động',
  'ui.credit': 'Hạn mức',
  'ui.nothingLeft': 'Chẳng còn gì để lấy lại nữa',

  'tab.grind': 'Cày',
  'tab.empire': 'Cơ ngơi',
  'tab.market': 'Chứng khoán',
  'tab.life': 'Cuộc đời',

  // -------------------------------------------------------------- màn Cày --
  'grind.perTap': 'mỗi chạm',
  'grind.mine': 'Đào quặng',
  'grind.ore': 'Quặng',
  'grind.refining': 'Luyện {rate} quặng/s',
  'grind.each': '{value}/quặng',
  'grind.pickaxe': 'Nâng cấp cuốc',
  'grind.pickaxeDetail': 'Cấp {level} · {ore} quặng/chạm',
  'grind.refinery': 'Nâng cấp xưởng luyện',
  'grind.refineryDetail': 'Cấp {level} · {value}/quặng',
  'grind.oreSpark': '+{amount} quặng',
  'grind.work': 'Đi làm',
  'grind.onShift': 'Đang trong ca',
  'grind.pickShift': 'Chọn ca làm',
  'grind.locked': 'Mở khi tài sản lên {amount}',
  'grind.start': 'Nhận ca',

  // ----------------------------------------------------------- màn Cơ ngơi --
  'empire.max': 'TỐI ĐA',
  'empire.automated': 'Có quản lý',
  'empire.manager': 'Thuê quản lý {cost}',
  'empire.milestone': '×2 ở {count}',
  'empire.run': 'Chạy {name}',
  'empire.cycle': '{payout} / {seconds}',
  'empire.owned': '×{count} · {payout} / {seconds}',

  // ------------------------------------------------------- màn Chứng khoán --
  'market.cash': 'Tiền mặt',
  'market.portfolio': 'Danh mục',
  'market.profit': 'Lãi lỗ',
  'market.bot': 'Quản lý giao dịch',
  'market.botDetail': 'Thấy giá giảm thì mua, lên 25% thì chốt',
  'market.on': 'Bật',
  'market.off': 'Tắt',
  'market.title': 'Sàn',
  'market.open': 'Đang mở',
  'market.cashOnly': 'Phải có tiền mặt',
  'market.holding': 'Giữ {shares} cổ · {value}',
  'market.average': 'Giá vốn {price}',
  'market.buyMax': 'Mua hết',
  'market.buyPart': 'Mua {percent}%',
  'market.sellHalf': 'Bán một nửa',
  'market.sellAll': 'Bán sạch',

  // ------------------------------------------------------- màn Cuộc đời ----
  'life.peak': 'Cao nhất',
  'life.reclaimed': 'Đã lấy lại',
  'life.climbing': 'Đã cày',
  'life.locked': 'Khi tài sản lên {amount}',
  'life.claim': 'Lấy lại',
  'life.offlineNote':
    'Không chơi thì vẫn ăn tiền, tối đa {hours} giờ. Bản lưu nằm trong máy này, không ở đâu khác.',
  'life.language': 'Ngôn ngữ',
  'life.reset': 'Chơi lại từ đầu',
  'life.resetConfirm': 'Xoá sạch bản lưu, quay về âm một triệu?',

  // ------------------------------------------------------------ hộp thoại --
  'card.header': 'Cơ hội · còn {seconds}s',
  'card.pass': 'Bỏ qua',
  'card.take': 'Lấy',
  'card.boost': '×{multiplier} trong {seconds}s',
  'card.oreGift': 'Quặng bằng {amount} lần chạm',
  'card.gamble': '{amount} hoặc mất trắng',

  'milestone.keepGoing': 'Đi tiếp',

  'offline.title': 'Lúc bạn đi vắng',
  'offline.away': 'Vắng {duration}',
  'offline.body': 'Mấy chỗ làm ăn vẫn chạy, có điều chậm hơn.',
  'offline.bodyJob': 'Mấy chỗ làm ăn vẫn chạy, chậm hơn một chút. Ca làm cũng xong rồi.',
  'offline.back': 'Vào làm tiếp',

  // -------------------------------------------------------------- thông báo --
  'notice.automated': 'Thuê xong quản lý cho {name}',
  'notice.sold': 'Quản lý vừa bán {ticker}',
  'notice.gambleWin': 'Ăn rồi',
  'notice.gambleLose': 'Trượt rồi',
  'notice.boost': '{title}: ×{multiplier} trong {seconds}s',
  'notice.ore': '{title}: quặng đầy ắp xưởng',

  // ----------------------------------------------------------- phần thưởng --
  'bonus.tap': 'Mỗi chạm ×{multiplier}',
  'bonus.income': 'Mọi khoản thu ×{multiplier}',
  'bonus.jobSpeed': 'Làm việc nhanh hơn {percent}%',
  'bonus.cardRate': 'Cơ hội tới dày hơn {percent}%',
  'bonus.offlineHours': 'Ăn tiền offline thêm {hours} giờ',

  // ------------------------------------------------------------- thời gian --
  'time.hoursMinutes': '{hours} tiếng {minutes} phút',
  'time.hours': '{hours} tiếng',
  'time.minutes': '{minutes} phút',
  'time.seconds': '{seconds} giây',

  // ------------------------------------------------------------------ khu --
  'district.skidrow': 'Khu Ổ Chuột',
  'district.docks': 'Bến Cảng',
  'district.midtown': 'Phố Trung Tâm',
  'district.financial': 'Phố Tài Chính',
  'district.uptown': 'Khu Nhà Giàu',
  'district.heights': 'Tầng Mây',

  // ------------------------------------------------------------- cơ sở ----
  'biz.cans': 'Nhặt lon',
  'biz.cart': 'Đẩy xe gom ve chai',
  'biz.wash': 'Lau kính xe',
  'biz.busk': 'Hát rong ở ga tàu',
  'biz.scrap': 'Gom sắt vụn',
  'biz.flip': 'Lướt hàng cầm đồ',
  'biz.forklift': 'Nhận thầu xe nâng',
  'biz.crate': 'Bốc vác thùng hàng',
  'biz.fish': 'Tàu đánh cá',
  'biz.tug': 'Dịch vụ tàu kéo',
  'biz.customs': 'Môi giới hải quan',
  'biz.yard': 'Bãi container',
  'biz.food': 'Chuỗi xe bán đồ ăn',
  'biz.laundry': 'Chuỗi tiệm giặt là',
  'biz.gym': 'Chuỗi phòng gym bình dân',
  'biz.cafe': 'Chuỗi cà phê',
  'biz.cinema': 'Cụm rạp phim',
  'biz.hotel': 'Khách sạn boutique',
  'biz.fund': 'Quỹ đầu cơ',
  'biz.bank': 'Ngân hàng khu vực',
  'biz.insure': 'Công ty bảo hiểm',
  'biz.broker': 'Công ty chứng khoán',
  'biz.ratings': 'Hãng xếp hạng tín nhiệm',
  'biz.exchange': 'Sàn giao dịch riêng',
  'biz.gallery': 'Phòng tranh',
  'biz.auction': 'Nhà đấu giá',
  'biz.yacht': 'Môi giới du thuyền',
  'biz.jet': 'Cho thuê chuyên cơ',
  'biz.vineyard': 'Trang trại nho',
  'biz.island': 'Đảo riêng',
  'biz.tower': 'Dự án cao ốc',
  'biz.media': 'Tập đoàn truyền thông',
  'biz.space': 'Vận tải vũ trụ',
  'biz.fusion': 'Nhà máy nhiệt hạch',
  'biz.bank2': 'Ghế Thống đốc',
  'biz.empire': 'Đế chế',

  // ------------------------------------------------------------ công việc --
  'job.flyers': 'Phát tờ rơi',
  'job.flyers.desc': 'Hai tiếng đứng đầu đường, trời thì lạnh.',
  'job.dishes': 'Rửa bát thuê',
  'job.dishes.desc': 'Hết ca đưa tiền mặt, không hỏi han gì.',
  'job.moving': 'Bốc vác chuyển nhà',
  'job.moving.desc': 'Xong ca này lưng nhớ đời.',
  'job.night': 'Trực bảo vệ đêm',
  'job.night.desc': 'Mười hai tiếng chẳng có gì xảy ra.',
  'job.rig': 'Ra giàn khoan',
  'job.rig.desc': 'Ba tuần ngoài khơi. Bù lại tiền thật.',

  // ------------------------------------------------------------- thẻ cơ hội --
  'card.wallet': 'Nhặt được ví',
  'card.wallet.flavour': 'Chẳng ai quay lại tìm nữa.',
  'card.debt': 'Đòi được nợ cũ',
  'card.debt.flavour': 'Một thằng bạn từ hồi mọi thứ chưa đổ.',
  'card.scrap': 'Trúng mẻ phế liệu',
  'card.scrap.flavour': 'Giá đồng vừa nhích đúng lúc.',
  'card.streak': 'Đang lên tay',
  'card.streak.flavour': 'Sờ vào gì cũng ra tiền gấp đôi.',
  'card.investor': 'Có người để mắt',
  'card.investor.flavour': 'Cuối cùng cũng có người gọi lại.',
  'card.seam': 'Trúng vỉa quặng',
  'card.seam.flavour': 'Xưởng luyện sắp bận rồi.',
  'card.sure': 'Kèo thơm',
  'card.sure.flavour': 'Ăn gấp đôi, hoặc mất trắng. Tuỳ bạn.',

  // ------------------------------------------------------- mốc cuộc đời ----
  'life.phone': 'Có lại số điện thoại',
  'life.phone.line': 'Số cũ dùng lại được. Vẫn chưa ai gọi tới.',
  'life.dog': 'Con chó về nhà',
  'life.dog.line': 'Trại cứu hộ giữ nó lâu hơn phần họ phải giữ.',
  'life.car': 'Lấy xe khỏi bãi giữ',
  'life.car.line': 'Mười một tháng tiền bãi, trả một cục bằng tiền mặt.',
  'life.room': 'Một căn phòng có cửa',
  'life.room.line': 'Tiền tháng đầu, tháng cuối, tiền cọc. Một cái chìa khoá của riêng mình.',
  'life.mother': 'Mẹ gọi điện',
  'life.mother.line': 'Mẹ hỏi dạo này làm ăn sao. Lần này nói thật.',
  'life.zero': 'Sạch nợ',
  'life.zero.line': 'Số không. Đánh đổi tất cả, cuối cùng chỉ để về số không.',
  'life.friends': 'Bạn bè gọi lại',
  'life.friends.line': 'Hai đứa. Đúng hai đứa đáng giữ.',
  'life.kids': 'Cuối tuần với các con',
  'life.kids.line': 'Thứ Bảy cách tuần. Chưa lần nào tới muộn.',
  'life.house': 'Chuộc lại căn nhà',
  'life.house.line': 'Chủ mới ra giá. Trả đúng con số đó, không mặc cả.',
  'life.partner': 'Cô ấy dọn về',
  'life.partner.line': 'Từ từ thôi. Mỗi lần một thùng đồ. Vẫn là về.',
  'life.parents': 'Lo được cho bố mẹ',
  'life.parents.line': 'Chỗ tử tế. Chỗ có vườn.',
  'life.boss': 'Từ trắng tay thành ông chủ',
  'life.boss.line': 'Người quen hồi đó chẳng ai nhận ra nổi.',

  // ------------------------------------------------------------ cổ phiếu ---
  'stock.grnd': 'Vận tải Cày Cuốc',
  'stock.bzzt': 'Nước tăng lực Bzzt',
  'stock.cldy': 'Phần mềm Mây Mù',
  'stock.mnch': 'Thực phẩm Măm Măm',
  'stock.drll': 'Dầu khí Khoan Tới',
  'stock.bnkr': 'Tiết kiệm Hầm Trú',
  'stock.hype': 'Truyền thông Thổi Phồng',
  'stock.rustc': 'Thép Gỉ Sét',
  'stock.zoom2': 'Dược phẩm Xác Sống',
  'stock.gigl': 'Tìm kiếm Khúc Khích',
  'stock.moon': 'Khai khoáng Lên Trăng',
  'stock.slug': 'Đường sắt Ốc Sên',

  'sector.transport': 'Vận tải',
  'sector.consumer': 'Tiêu dùng',
  'sector.tech': 'Công nghệ',
  'sector.energy': 'Năng lượng',
  'sector.finance': 'Tài chính',
  'sector.media': 'Truyền thông',
  'sector.industrial': 'Công nghiệp',
  'sector.health': 'Y tế',
  'sector.speculative': 'Đầu cơ',
};
