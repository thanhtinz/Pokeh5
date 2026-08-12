# Pokeh5

Hạ tầng để chạy bản private server Pokemon H5 từ
[release `Source`](https://github.com/thanhtinz/Pokeh5/releases/tag/Source):
web portal đã vá lỗi bảo mật, stack Docker để dựng bằng một lệnh, và wrapper
Capacitor để đóng gói client thành app Android.

**Đọc [docs/INVENTORY.md](docs/INVENTORY.md) trước.** Game server và client
trong release **không có source** — chỉ có binary .NET đã biên dịch và JS đã
minify. Điều đó quyết định phần nào sửa được, phần nào không.

## Repo này có gì

```
portal/     Web portal viết lại (login, giftcode, GM, nạp thẻ) — PHP 8, PDO
deploy/     docker-compose: MySQL 5.7 + PHP-FPM + nginx
app/        Capacitor wrapper đóng gói client Egret thành app native
docs/       Hướng dẫn dựng, kiểm kê release, báo cáo bảo mật
```

Client Egret (189 MB), service .NET (2.6 GB) và các file dump database **không**
được commit — chúng thuộc release, không phải của dự án này.

## Bắt đầu

```bash
cp deploy/.env.example deploy/.env          # sửa mật khẩu, trỏ CLIENT_DIR
cp pokemon.sql   deploy/mysql/init/01-pokemon.sql
cp x_keygift.sql deploy/mysql/init/02-x_keygift.sql
cp portal/sql/portal.sql deploy/mysql/init/03-portal.sql
docker compose -f deploy/docker-compose.yml up -d
```

Chi tiết từng bước, kể cả cấu hình 10 service .NET trên Windows:
[docs/SETUP.md](docs/SETUP.md).

## Portal đã sửa gì

Portal gốc có lỗ khai thác được **mà không cần tài khoản**. Đầy đủ ở
[docs/SECURITY.md](docs/SECURITY.md); tóm tắt:

| Lỗi | Mức độ | Trạng thái |
| --- | --- | --- |
| GM panel bỏ qua xác thực nếu POST kèm `act` | nghiêm trọng | ✅ đã vá |
| SQL injection ở toàn bộ query | nghiêm trọng | ✅ đã vá (PDO prepared) |
| Mật khẩu root MySQL nằm trong source theo dõi bởi git | nghiêm trọng | ✅ chuyển sang config/env |
| Nhận quà bị đua, nhận được nhiều lần | cao | ✅ unique key + transaction |
| Không có CSRF ở bất kỳ đâu | cao | ✅ token mọi request đổi trạng thái |
| Endpoint tra cứu vật phẩm không cần đăng nhập | trung bình | ✅ đã vá |
| Lộ câu SQL ra console khi đăng nhập sai | trung bình | ✅ chỉ ghi log server |
| Phân biệt "sai tài khoản" và "sai mật khẩu" | thấp | ✅ gộp thông báo + rate limit |
| phpMyAdmin nằm trong web root | cao | ✅ không mang sang, nginx chặn |

Một thứ **không** sửa được: `t_account.password` là `CHAR(32)` MD5 và service
.NET đọc/ghi đúng cột đó. Đổi sang bcrypt sẽ khoá toàn bộ người chơi khỏi game.
Tài khoản GM nằm ở bảng riêng nên dùng bcrypt.

## Kiểm thử

```bash
mysql pokemon < portal/tests/fixtures.sql
BASE=http://localhost:8080 portal/tests/smoke.sh   # 16 kiểm tra
cd app && npm run verify                           # client boot + đúng server
```

`smoke.sh` chạy HTTP thật với cookie thật. Nó bắn đúng payload từng khai thác
được GM panel và yêu cầu trả 403, gửi `' OR '1'='1` vào ô tài khoản và yêu cầu
không đăng nhập được, rồi bắn 10 request nhận quà đồng thời và yêu cầu đúng
một cái thắng.

`app/npm run verify` nạp client đã vá trong Chromium headless và kiểm tra engine
Egret load được, canvas được tạo, `Auth.$serverUrl` trỏ đúng server cấu hình.

## Giới hạn đã biết

- **Không build được APK trong môi trường không có Android SDK.** Project
  Capacitor đã sẵn sàng và lớp web đã verify; bước `gradlew assembleRelease`
  cần máy có Android SDK.
- **Service .NET chưa được chạy thử ở đây** — chúng là binary Windows, môi
  trường phát triển này là Linux không có Mono. Phần cấu hình đã tài liệu hoá
  nhưng chưa kiểm chứng chạy thật.
- **Không sửa được lỗi server/client** khi chưa decompile.

## Bản quyền

Pokemon là tài sản của Nintendo, Creatures Inc. và GAME FREAK Inc. Đây là gói
private server của một game thương mại Trung Quốc, được phát tán lại. Repo này
chỉ chứa code hạ tầng do dự án viết; toàn bộ asset và binary của game đều không
được commit. Tự vận hành để học tập là một chuyện, phát hành hay kiếm tiền từ
nó lại là chuyện khác.
