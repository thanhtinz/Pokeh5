# Vấn Đạo Tu Tiên

Game tu tiên **nhàn rỗi (idle)**, viết bằng **TypeScript + Preact**, build bằng
**Vite**, đóng gói app Android/iOS bằng **Capacitor**.

Toàn bộ giao diện vẽ bằng CSS và SVG — không có file ảnh nào. Chỉ có ba font
được tải và cắt gọn lúc build (xem [ASSETS.md](ASSETS.md)).

---

## Bắt đầu

```bash
npm install
npm run fonts     # bắt buộc chạy 1 lần: tải + subset font (7.6 MB → 129 KB)
npm run dev       # http://localhost:5173
```

| Lệnh | Việc nó làm |
| --- | --- |
| `npm run fonts` | Tải font từ Google Fonts, cắt còn đúng glyph game dùng |
| `npm run dev` | Dev server có hot reload |
| `npm run build` | Typecheck rồi build production |
| `npm run shot` | Smoke test: chạy game trong Chromium headless, chụp 8 màn |
| `npm run cap:android` | Build + sync + mở Android Studio |

---

## Vòng lặp chơi

```
tích tu vi (theo giây)  ──▶  đủ ngưỡng  ──▶  ĐỘT PHÁ  ──▶  mọi chỉ số tăng
       ▲                                                          │
       │                                                          ▼
   linh căn ◀── phục dược ◀── linh thạch ◀── vượt chương / tháp ◀──┘
```

- **Cảnh giới**: 9 cảnh × 9 tầng = 81 bậc, từ Luyện Khí tới Độ Kiếp. Hết bậc thì
  **nhập Lục Đạo Luân Hồi**: về lại Luyện Khí, nhưng mọi chỉ số nhân 1.85 mỗi vòng.
- **Ngũ hành**: Kim → Mộc → Thổ → Thủy → Hỏa → Kim. Khắc chế ×1.5, bị khắc ×0.7.
- **Linh căn**: phục dược nâng linh căn một hệ. Linh căn vừa tăng sát thương hệ
  đó, vừa tăng hiệu suất tu luyện chung — nên chọn hệ nào để nuôi là quyết định
  xây dựng chính.
- **Thượng trận công pháp**: 4 ô tiên thuật, thi triển lần lượt rồi quay vòng.
  Thứ tự ô cũng là một phần quyết định, không chỉ chọn cái mạnh nhất.
- **Đấu pháp**: 30 hiệp, có độc/thiêu đốt theo lượt, hộ thể, tăng/giảm công,
  chí mạng. Tốc độ ×1/×2/×4 hoặc bỏ qua.
- **Ngũ hành thí luyện**: 5 tháp theo hệ, mỗi tháp mở 3 ngày/tuần, cộng 1 tháp
  Hỗn Độn mở mỗi ngày. Việc gating theo thứ khiến một tuần phải chạm nhiều hệ.
- **Lịch luyện**: 120 chương, chương càng cao thu hoạch linh thạch càng nhiều.
- **Tốc luyện**: nhận trước 2 giờ thu hoạch, 5 lần/ngày.
- **Bế quan**: tính thu hoạch khi thoát game, chặn ở 12 giờ.

---

## Kiến trúc

```
src/
  game/            luật chơi thuần TypeScript, không import Preact
    realms.ts      thang cảnh giới, chi phí đột phá, luân hồi
    elements.ts    ngũ hành, tương sinh / tương khắc
    stats.ts       công thức chỉ số, lực chiến
    skills.ts      danh mục 20 tiên thuật
    battle.ts      mô phỏng đấu pháp 30 hiệp, trả về event log
    content.ts     chương truyện, tháp, tốc luyện (sinh từ chỉ số, không lưu)
    store.ts       singleton giữ save, mọi mutation đi qua đây
    save.ts        persistence + kiểm tra tính hợp lệ
  styles/          tokens → base → ink (ngôn ngữ thị giác) → layout
  ui/              màn hình và component Preact
```

Hai nguyên tắc:

1. **`src/game/` không biết gì về UI.** Luật chơi test và chỉnh số được mà không
   cần render.
2. **Trận đấu giải quyết trước, hoạt hoạ sau.** `store.fightTower()` chạy hết
   trận rồi trả event log; màn đấu pháp chỉ phát lại. Bấm "Bỏ qua" giữa chừng
   không thể làm lệch kết quả đã ghi vào save.

---

## Tối ưu cho mobile

- **Không có file ảnh.** Panel, khung thoi, vòng bát quái, vân giấy, dãy núi —
  tất cả vẽ bằng CSS/SVG. Đổi màu cả game chỉ cần sửa `tokens.css`.
- **Font cắt gọn: 7.6 MB → 129 KB.** Riêng chữ Hán thư pháp chỉ tốn 12.5 KB vì
  chỉ giữ đúng ~40 ký tự thực sự hiển thị.
- **Bundle: 264 KB** tổng cộng (JS gzip 24 KB, CSS gzip 5 KB, font 144 KB).
- Vòng lặp game chạy **1 lần/giây**, không phải mỗi frame — màn hình chỉ hiện
  số theo giây nên nhanh hơn chỉ tốn pin.
- Tích luỹ cộng dồn phần lẻ giữa các tick, nên máy bị throttle timer vẫn nhận
  đúng bằng máy chạy đủ nhịp.
- Save ghi `localStorage` đồng bộ lúc `pagehide` (hook duy nhất đáng tin trên
  mobile) và mirror sang Capacitor Preferences trên máy thật, vì Android có thể
  xoá web storage khi hết dung lượng.
- Mọi trường trong save đều **kẹp về khoảng hợp lệ** khi đọc; file hỏng thì tạo
  save mới chứ không crash lúc boot.

---

## Kiểm thử

```bash
npm run shot
```

Chạy game trong Chromium headless ở khung điện thoại (412×892, DPR 2), đi qua 8
màn và chụp ảnh vào `screenshots/`.

Fail khi: có lỗi console, request hỏng, app không mount, màn boot không tắt,
**font không load được** (kiểm bằng `document.fonts.check`, vì font hỏng sẽ âm
thầm fallback chứ không báo lỗi), hoặc save không được ghi.

---

## Chưa có

Các nút sau chỉ là giao diện, bấm vào báo "sẽ mở ở bản sau": Đạo Hữu, Phường
Thị, Vấn Đạo, Thần Toán, Hoạt Động, Phi Thăng, Tu Hành, Đồ Giám, Thương Phố,
Túi Đồ, Pháp Khí, Ngự Pháp, Linh Sủng, Phi Kiếm. Chúng có mặt để giữ đúng bố
cục màn tu luyện.

Chưa build APK trong repo này — cần máy có Android SDK:

```bash
npx cap add android
npm run cap:android
```
