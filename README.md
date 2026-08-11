# Pokeh5

Game nhập vai Pokémon kiểu **idle / treo máy**, viết bằng **TypeScript + Phaser 3**, build bằng **Vite**, đóng gói thành app Android/iOS bằng **Capacitor**.

Toàn bộ asset Pokémon được **tải từ nguồn công khai trên mạng** lúc build (xem [ASSETS.md](ASSETS.md)) — repo không chứa file ảnh nào.

---

## Bắt đầu nhanh

```bash
npm install
npm run assets     # bắt buộc chạy 1 lần: tải sprite + font, đóng gói atlas
npm run dev        # http://localhost:5173
```

`npm run assets` ghi ra `public/assets/` (bị git-ignore) và `src/game/data/*.json`. Không chạy bước này thì màn hình loading sẽ báo thiếu asset.

## Các lệnh

| Lệnh | Việc nó làm |
| --- | --- |
| `npm run assets` | Tải sprite/font từ mirror công khai, cắt viền trong suốt, đóng gói thành texture atlas |
| `npm run dev` | Dev server có hot reload |
| `npm run build` | Typecheck rồi build production vào `dist/` |
| `npm run preview` | Xem thử bản build |
| `npm run typecheck` | Chỉ chạy `tsc --noEmit` |
| `npm run shot` | Smoke test: chạy game trong Chromium headless, chụp ảnh vào `screenshots/` |
| `npm run cap:android` | Build rồi mở project Android Studio |

## Đóng gói thành app Android

```bash
npm install -D @capacitor/android
npx cap add android
npm run cap:android      # build + sync + mở Android Studio
```

`capacitor.config.ts` đã đặt sẵn `appId`, màu nền tránh flash trắng lúc mở app, và tắt `webContentsDebuggingEnabled` cho bản release.

---

## Tối ưu cho mobile

Đây là các quyết định kỹ thuật nhắm thẳng vào việc chạy trên điện thoại:

**Kích thước tải về**

- 151 sprite chiến đấu được cắt sạch viền trong suốt rồi shelf-pack vào **một** atlas 2048×512 (~165 KB) — 1 texture, 1 request thay vì 151.
- Atlas artwork được resize còn 128px và lượng tử hoá bảng màu: **4065 KB → 629 KB**, đồng thời giảm từ 2048×2048 xuống 2048×1024, tức VRAM cũng giảm một nửa.
- Chrome giao diện (panel, nút, sao, vignette) được **vẽ bằng canvas lúc khởi động** thay vì ship PNG: không tốn byte tải về và luôn nét ở mọi độ phân giải.
- Phaser nằm ở chunk riêng nên bản vá gameplay không làm hỏng cache WebView.
- Tổng `dist/`: ~3.1 MB, trong đó JS gzip ~350 KB.

**Lúc chạy**

- Atlas power-of-two để driver Android cũ vẫn mipmap được.
- FPS chặn ở 60 (`powerPreference: 'low-power'`) — màn 120 Hz không đốt pin ở màn hình menu.
- Bộ đếm HUD dùng `Label`, chỉ ghi lại canvas khi **giá trị thật sự đổi**; vẽ lại text là thứ đắt nhất trong một game nhiều menu.
- Thanh máu scale rectangle chứ không vẽ lại mỗi frame.
- Tích luỹ idle cộng dồn theo phần lẻ giữa các frame, nên máy 30 fps và 60 fps kiếm được **đúng bằng nhau** mỗi giây.
- `Phaser.Scale.FIT` letterbox thay vì crop, cộng `viewport-fit=cover` và tắt mọi cử chỉ mặc định của WebView.

**Lưu game**

- Ghi `localStorage` đồng bộ (flush kịp lúc `pagehide` — hook duy nhất đáng tin trên mobile), đồng thời mirror bất đồng bộ sang **Capacitor Preferences** trên máy thật, vì `localStorage` có thể bị Android xoá khi máy hết dung lượng. Lúc load lấy bản mới hơn.
- Mọi trường trong file save đều được **kẹp lại về khoảng hợp lệ** khi đọc; file hỏng thì tạo save mới chứ không crash lúc boot.

---

## Kiến trúc

```
src/
  config.ts              hằng số layout, bảng màu, tên hệ tiếng Việt
  main.ts                khởi tạo Phaser, hook flush lúc app bị ẩn
  game/                  toàn bộ luật chơi — không phụ thuộc Phaser
    data/                pokedex.json + typechart.json (sinh ra), item, nhiệm vụ
    battle.ts            mô phỏng đánh tự động, trả về event log
    stages.ts            sinh đội địch từ số ải (tất định)
    stats.ts             công thức chỉ số, lực chiến (BP), EXP
    idle.ts              vàng/EXP mỗi giờ, tính thưởng offline
    gacha.ts             banner triệu hồi, pity, nâng sao khi trùng
    save.ts / storage.ts persistence + kiểm tra tính hợp lệ
    store.ts             singleton giữ save, mọi mutation đi qua đây
  ui/                    widget dùng chung (Button, Bar, ScrollView, modal)
  scenes/                Boot → Preload → City ⇄ Battle, cộng UiScene overlay
```

Hai nguyên tắc chính:

1. **`src/game/` không import Phaser.** Luật chơi thuần TypeScript nên test/chỉnh số được mà không cần render.
2. **Trận đấu được giải quyết trước, hoạt hoạ sau.** `store.fight()` chạy toàn bộ trận rồi trả về event log; `BattleScene` chỉ phát lại log đó. Người chơi bấm "Bỏ qua" giữa chừng cũng không thể lệch kết quả đã ghi vào save.

## Nội dung game hiện có

Đang chạy được:

- Hub thành phố với HUD (BP, vàng, kim cương, EXP, cấp), rail nút hai bên, thanh điều hướng dưới
- Treo máy tích vàng/EXP theo thời gian thực + **thưởng offline** (chặn 12 giờ)
- Đánh ải: đội 6 Pokémon, đội địch sinh tất định theo số ải, boss mỗi 10 ải
- Chiến đấu tự động có hoạt hoạ (lao vào, nháy màu theo hệ, số sát thương, chí mạng, khắc chế hệ) + nút x1/x3 và "Bỏ qua"
- "Đánh Nhanh": giải quyết trận không cần xem
- Đội hình 6 ô, đổi/bỏ trống từng ô
- Hộp Pokémon cuộn được, trang chi tiết đầy đủ chỉ số
- Triệu hồi 2 banner (vé / kim cương), có pity, trùng thì **lên sao** thay vì bỏ phí
- Nhiệm vụ hằng ngày có tiến độ + nhận thưởng, tự reset theo ngày
- Túi đồ, cửa hàng cơ bản, bảng thử thách
- 151 Pokémon Kanto với chỉ số gốc thật và bảng khắc chế 17 hệ đầy đủ

Nút hiện **chưa** có chức năng (bấm vào hiện thông báo "sẽ mở trong bản sau"): VIP, Nạp thẻ, Hòm thư, Sự kiện, Bạn bè, Huấn luyện, Đặc quyền, Gói ưu đãi, Thống nhất, Mời bạn, Đấu Trường, Chờ trận, Phục thù, Trò chuyện, Bang hội. Chúng có mặt để giữ đúng bố cục màn hình gốc.

## Kiểm thử

`npm run shot` chạy bản build trong Chromium headless ở đúng khung điện thoại (412×915, DPR 2), bấm qua từng màn, chụp ảnh vào `screenshots/`, và **fail** nếu có lỗi console, request hỏng, canvas không dựng được, hoặc save không được ghi.

## Giấy phép

Code trong repo này do dự án viết. Asset Pokémon **không** thuộc repo — xem [ASSETS.md](ASSETS.md) về nguồn, giấy phép và giới hạn sử dụng.
