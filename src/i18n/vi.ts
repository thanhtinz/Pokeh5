/**
 * Tiếng Việt — ngôn ngữ chính của game.
 *
 * Không dịch câu tiếng Anh. Đọc tình huống rồi viết lại bằng tiếng Việt.
 * Khác nhau ở chỗ: dịch thì giữ cấu trúc câu gốc và thay từ, viết lại thì bỏ
 * hẳn câu gốc đi và hỏi "người Việt ở hoàn cảnh này nói thế nào".
 *
 *  - Nhãn giao diện càng ngắn càng tốt. Tiếng Anh thích danh từ đầy đủ
 *    ("Start", "On shift"), tiếng Việt trong game nói cộc: "Làm", "Đang làm".
 *  - Bỏ đại từ khi câu vẫn rõ. Nhét "bạn" vào mỗi câu là ra giọng sách dịch.
 *  - Không bê cấu trúc so sánh của tiếng Anh. "longer than they had to" mà
 *    dịch thành "lâu hơn phần họ phải giữ" thì đúng nghĩa nhưng không ai nói;
 *    viết lại là "giữ nó thêm mấy tháng, chẳng ai bắt họ làm vậy".
 *  - Chi tiết nào là thói quen Mỹ thì đổi sang thói quen Việt. "First month,
 *    last month, deposit" là cách thuê nhà bên Mỹ; bên mình là "cọc ba tháng,
 *    tiền nhà trả trước". Bố mẹ về già thì lo thuốc men viện phí, không phải
 *    lo viện dưỡng lão có vườn.
 *  - Câu ở mốc cuộc đời giữ nhịp bản gốc: ngắn, hiện tại, không chấm than.
 *
 * Bối cảnh vẫn là thành phố Mỹ, tiền vẫn là đô la, nên tên khu và tên cổ phiếu
 * lấy nghĩa và lấy giọng châm biếm chứ không dời bối cảnh về Việt Nam.
 */
export const vi: Record<string, string> = {
  // ------------------------------------------------------------------ chung --
  'ui.boot': 'Đang đếm thiệt hại',
  'ui.balance': 'Số dư',
  'ui.netWorth': 'Tổng tài sản',
  'ui.automated': 'Tự động',
  'ui.credit': 'Hạn mức',
  'ui.nothingLeft': 'Hết thứ để chuộc rồi',

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
  'grind.refinery': 'Nâng cấp xưởng',
  'grind.refineryDetail': 'Cấp {level} · {value}/quặng',
  'grind.oreSpark': '+{amount} quặng',
  'grind.work': 'Đi làm',
  'grind.onShift': 'Đang làm',
  'grind.pickShift': 'Chọn việc',
  'grind.locked': 'Mở ở mốc {amount}',
  'grind.start': 'Làm',

  // ----------------------------------------------------------- màn Cơ ngơi --
  'empire.max': 'TỐI ĐA',
  'empire.automated': 'Đã thuê',
  'empire.manager': 'Quản lý {cost}',
  'empire.milestone': '×2 ở {count}',
  'empire.run': 'Chạy {name}',
  'empire.cycle': '{payout} / {seconds}',
  'empire.owned': '×{count} · {payout} / {seconds}',

  // ------------------------------------------------------- màn Chứng khoán --
  'market.cash': 'Tiền mặt',
  'market.portfolio': 'Danh mục',
  'market.profit': 'Lãi lỗ',
  'market.bot': 'Quản lý giao dịch',
  'market.botDetail': 'Giá xuống thì gom, lên 25% thì chốt',
  'market.on': 'Bật',
  'market.off': 'Tắt',
  'market.title': 'Sàn',
  'market.open': 'Đang mở',
  'market.cashOnly': 'Hết tiền mặt',
  'market.holding': '{shares} cổ · {value}',
  'market.average': 'Giá vốn {price}',
  'market.buyMax': 'Mua hết',
  'market.buyPart': 'Mua {percent}%',
  'market.sellHalf': 'Bán một nửa',
  'market.sellAll': 'Bán sạch',

  // ------------------------------------------------------- màn Cuộc đời ----
  'life.peak': 'Đỉnh',
  'life.reclaimed': 'Đã chuộc',
  'life.climbing': 'Đã cày',
  'life.locked': 'Mốc {amount}',
  'life.claim': 'Chuộc lại',
  'life.offlineNote':
    'Tắt game vẫn ăn tiền, tối đa {hours} tiếng. Bản lưu nằm trong máy, mất máy là mất.',
  'life.language': 'Ngôn ngữ',
  'life.reset': 'Chơi lại từ đầu',
  'life.resetConfirm': 'Xoá sạch, quay lại vạch âm một triệu?',

  // ------------------------------------------------------------ hộp thoại --
  'card.header': 'Cơ hội · {seconds}s',
  'card.pass': 'Bỏ qua',
  'card.take': 'Lấy',
  'card.boost': '×{multiplier} trong {seconds}s',
  'card.oreGift': 'Thêm {amount} lượt quặng',
  'card.gamble': 'Ăn {amount} hoặc mất trắng',

  'milestone.keepGoing': 'Đi tiếp',

  'offline.title': 'Lúc bạn đi vắng',
  'offline.away': 'Vắng {duration}',
  'offline.body': 'Cửa hàng vẫn chạy, có điều ì ạch hơn.',
  'offline.bodyJob': 'Cửa hàng vẫn chạy, ì ạch hơn tí. Ca làm cũng xong rồi.',
  'offline.back': 'Làm tiếp',

  // -------------------------------------------------------------- thông báo --
  'notice.automated': 'Đã thuê quản lý cho {name}',
  'notice.sold': 'Quản lý vừa bán {ticker}',
  'notice.gambleWin': 'Ăn rồi',
  'notice.gambleLose': 'Trượt rồi',
  'notice.boost': '{title}: ×{multiplier} trong {seconds}s',
  'notice.ore': '{title}: quặng đầy ắp xưởng',

  // ----------------------------------------------------------- phần thưởng --
  'bonus.tap': 'Mỗi chạm ×{multiplier}',
  'bonus.income': 'Thu nhập ×{multiplier}',
  'bonus.jobSpeed': 'Làm nhanh hơn {percent}%',
  'bonus.cardRate': 'Cơ hội nhiều hơn {percent}%',
  'bonus.offlineHours': 'Offline thêm {hours} tiếng',

  // ------------------------------------------------------------- thời gian --
  'time.hoursMinutes': '{hours} tiếng {minutes} phút',
  'time.hours': '{hours} tiếng',
  'time.minutes': '{minutes} phút',
  'time.seconds': '{seconds} giây',

  // ------------------------------------------------------------------ khu --
  'district.skidrow': 'Xóm Nước Đen',
  'district.docks': 'Bến Bãi',
  'district.midtown': 'Phố Chợ',
  'district.financial': 'Phố Ngân Hàng',
  'district.uptown': 'Khu Biệt Thự',
  'district.heights': 'Tầng Mây',

  // ------------------------------------------------------------- cơ sở ----
  'biz.cans': 'Nhặt ve chai',
  'biz.cart': 'Đẩy xe hàng rong',
  'biz.wash': 'Rửa xe máy',
  'biz.busk': 'Hát rong quán nhậu',
  'biz.scrap': 'Thu mua sắt vụn',
  'biz.flip': 'Buôn đồ cũ chợ trời',
  'biz.forklift': 'Chạy xe nâng thuê',
  'biz.crate': 'Bốc vác chợ đầu mối',
  'biz.fish': 'Tàu cá xa bờ',
  'biz.tug': 'Sà lan chở cát',
  'biz.customs': 'Dịch vụ thông quan',
  'biz.yard': 'Bãi container',
  'biz.food': 'Xe bánh mì',
  'biz.laundry': 'Tiệm giặt ủi',
  'biz.gym': 'Phòng gym bình dân',
  'biz.cafe': 'Chuỗi cà phê vỉa hè',
  'biz.cinema': 'Cụm rạp chiếu phim',
  'biz.hotel': 'Khách sạn mini',
  'biz.fund': 'Quỹ đầu tư',
  'biz.bank': 'Ngân hàng cổ phần',
  'biz.insure': 'Công ty bảo hiểm',
  'biz.broker': 'Công ty chứng khoán',
  'biz.ratings': 'Hãng xếp hạng tín nhiệm',
  'biz.exchange': 'Sàn vàng',
  'biz.gallery': 'Phòng tranh',
  'biz.auction': 'Nhà đấu giá',
  'biz.yacht': 'Du thuyền Hạ Long',
  'biz.jet': 'Cho thuê chuyên cơ',
  'biz.vineyard': 'Vườn nho Ninh Thuận',
  'biz.island': 'Đảo Phú Quốc',
  'biz.tower': 'Dự án cao ốc',
  'biz.media': 'Tập đoàn truyền thông',
  'biz.space': 'Vệ tinh viễn thông',
  'biz.fusion': 'Nhà máy điện hạt nhân',
  'biz.bank2': 'Ghế Thống đốc',
  'biz.empire': 'Đế chế',

  // ------------------------------------------------------------ công việc --
  'job.flyers': 'Phát tờ rơi',
  'job.flyers.desc': 'Hai tiếng đứng ngã tư, nắng đổ lửa.',
  'job.dishes': 'Rửa bát quán ăn',
  'job.dishes.desc': 'Hết ca đưa tiền mặt, không hỏi gì.',
  'job.moving': 'Bốc vác chuyển nhà',
  'job.moving.desc': 'Xong ca này lưng nhớ đời.',
  'job.night': 'Trực bảo vệ đêm',
  'job.night.desc': 'Mười hai tiếng, chẳng có gì xảy ra.',
  'job.rig': 'Ra giàn khoan Vũng Tàu',
  'job.rig.desc': 'Ba tuần ngoài khơi. Bù lại tiền tươi.',

  // ------------------------------------------------------------- thẻ cơ hội --
  'card.wallet': 'Nhặt được ví',
  'card.wallet.flavour': 'Chẳng ai quay lại tìm đâu.',
  'card.debt': 'Đòi được nợ cũ',
  'card.debt.flavour': 'Thằng bạn từ hồi mọi thứ chưa đổ.',
  'card.scrap': 'Trúng mẻ đồng nát',
  'card.scrap.flavour': 'Giá đồng nhích đúng lúc.',
  'card.streak': 'Đang đỏ',
  'card.streak.flavour': 'Sờ vào đâu cũng ra tiền gấp đôi.',
  'card.investor': 'Có người để mắt',
  'card.investor.flavour': 'Cuối cùng cũng có người gọi lại.',
  'card.seam': 'Trúng vỉa quặng',
  'card.seam.flavour': 'Xưởng luyện sắp bận rồi.',
  'card.sure': 'Kèo thơm',
  'card.sure.flavour': 'Ăn gấp đôi hoặc mất trắng. Tuỳ.',

  // ------------------------------------------------------- mốc cuộc đời ----
  'life.phone': 'Có lại số điện thoại',
  'life.phone.line': 'Số cũ chạy lại rồi. Chưa ai gọi.',
  'life.dog': 'Con chó về nhà',
  'life.dog.line': 'Bên cứu hộ giữ nó thêm mấy tháng, chẳng ai bắt họ làm vậy.',
  'life.car': 'Chuộc lại cái xe máy',
  'life.car.line': 'Mười một tháng gửi bãi. Trả một cục, tiền mặt.',
  'life.room': 'Một phòng trọ có cửa',
  'life.room.line': 'Cọc ba tháng, tiền nhà trả trước. Chìa khoá của riêng mình.',
  'life.mother': 'Mẹ gọi điện',
  'life.mother.line': 'Mẹ hỏi dạo này làm ăn sao. Lần này nói thật.',
  'life.zero': 'Sạch nợ',
  'life.zero.line': 'Số không. Đánh đổi cả đời để về số không.',
  'life.friends': 'Bạn bè gọi lại',
  'life.friends.line': 'Hai đứa. Đúng hai đứa còn đáng.',
  'life.kids': 'Cuối tuần với các con',
  'life.kids.line': 'Thứ Bảy cách tuần. Chưa lần nào tới muộn.',
  'life.house': 'Chuộc lại căn nhà',
  'life.house.line': 'Chủ mới hét giá. Trả đúng số đó, không mặc cả.',
  'life.partner': 'Cô ấy dọn về',
  'life.partner.line': 'Từ từ thôi. Mỗi lần một thùng đồ. Nhưng là về thật.',
  'life.parents': 'Lo được cho bố mẹ',
  'life.parents.line': 'Thuốc men, viện phí, người chăm. Bố mẹ khỏi phải nghĩ.',
  'life.boss': 'Từ trắng tay thành ông chủ',
  'life.boss.line': 'Người quen hồi đó nhìn chắc không ra.',

  // ------------------------------------------------------------ cổ phiếu ---
  'stock.grnd': 'Xe Ôm Công Nghệ',
  'stock.bzzt': 'Bia Hơi Bạt Ngàn',
  'stock.cldy': 'Phần Mềm Mây Mù',
  'stock.mnch': 'Phở Ăn Liền Măm Măm',
  'stock.drll': 'Dầu Khí Khoan Tới',
  'stock.bnkr': 'Tiết Kiệm Con Heo',
  'stock.hype': 'Truyền Thông Giật Tít',
  'stock.rustc': 'Thép Gỉ Sét',
  'stock.zoom2': 'Dược Phẩm Xác Sống',
  'stock.gigl': 'Tìm Kiếm Khúc Khích',
  'stock.moon': 'Khai Khoáng Mặt Trăng',
  'stock.slug': 'Đường Sắt Ốc Sên',

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
