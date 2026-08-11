# Nguồn asset

Repo này **không chứa** file asset nào. `npm run assets` tải chúng từ các mirror công khai và ghi vào `public/assets/` (đã git-ignore).

## Những gì được tải

| Thứ | Nguồn | Giấy phép |
| --- | --- | --- |
| Sprite chiến đấu 151 Pokémon | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) — `sprites/pokemon/{id}.png` | Repo phát hành theo CC0 cho phần đóng góp; bản thân hình ảnh vẫn thuộc bản quyền Nintendo/Game Freak |
| Artwork chân dung | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) — `other/official-artwork/{id}.png` | như trên |
| Icon vật phẩm | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) — `sprites/items/` | như trên |
| Chỉ số gốc, hệ, chuỗi tiến hoá | [veekun/pokedex](https://github.com/veekun/pokedex) — `pokedex/data/csv/` | MIT (phần dữ liệu tổng hợp) |
| Bảng khắc chế hệ | veekun `type_efficacy.csv` | MIT |
| Font Baloo 2 | [google/fonts](https://github.com/google/fonts/tree/main/ofl/baloo2) | SIL Open Font License 1.1 |

## Xử lý sau khi tải

Script không dùng file gốc trực tiếp:

1. **Cắt viền trong suốt** — quét alpha để tìm bounding box thật, vì sprite gốc là canvas cố định với rất nhiều khoảng trống.
2. **Resize** — artwork gốc 475px được thu về 128px, đúng bằng kích thước lớn nhất mà điện thoại thực sự vẽ ra.
3. **Shelf-pack** — gom vào atlas kích thước power-of-two, xuất kèm JSON theo định dạng Phaser JSONArray (có `spriteSourceSize` để bù phần đã cắt).
4. **Lượng tử hoá bảng màu** — chỉ áp cho atlas artwork, nơi ảnh mang tính photographic (4065 KB → 629 KB).

Kết quả có tính tất định: cùng đầu vào luôn cho ra cùng atlas, và mọi lượt tải đều được cache ở `.cache/downloads/` nên chạy lại gần như tức thì.

## Bản quyền — đọc trước khi phát hành

**Pokémon, tên Pokémon và toàn bộ hình ảnh nhân vật là tài sản của Nintendo, Creatures Inc. và GAME FREAK Inc.**

Giấy phép CC0/MIT ở bảng trên chỉ áp dụng cho *công sức tổng hợp dữ liệu* của các repo đó, **không** cấp cho bạn quyền với hình ảnh Pokémon. Dự án này chỉ phù hợp để học tập và làm mẫu kỹ thuật.

Nếu muốn phát hành thương mại (Play Store, App Store, hay bất kỳ hình thức kiếm tiền nào), bạn phải thay toàn bộ sprite và tên bằng nội dung tự tạo hoặc có giấy phép hợp lệ. Phần code không phụ thuộc vào Pokémon: chỉ cần thay `src/game/data/pokedex.json` và bộ atlas tương ứng là toàn bộ luật chơi vẫn chạy nguyên vẹn.
