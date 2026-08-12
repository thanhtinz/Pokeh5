# Dựng hệ thống

Hướng dẫn dựng từ release. Đọc [INVENTORY.md](INVENTORY.md) trước — hai trong
bốn thành phần không có source, điều đó quyết định bạn sửa được gì.

Kiến trúc sau khi dựng:

```
   điện thoại / trình duyệt
            │
     ┌──────┴───────┐
     │              │
  portal PHP    client Egret          (repo này lo, chạy Linux/Docker)
     │              │
     └──────┬───────┘
            │
        MySQL 5.7                     (repo này lo)
            │
   10 service .NET Framework 4.5      (Windows, không có source)
```

---

## 1. Giải nén release

```bash
apt-get install -y libarchive-tools
bsdtar -xf XJLserver.rar \
  --exclude '*.pdb' \
  --exclude 'XJLserver/Run/DataStorageService/Server.Protocol.dll' \
  --exclude 'XJLserver/Run/PokemonGameService/Server.Protocol.dll'
unzip www.m.i.zip -d www-original
```

`7z` **không** giải được file này trên Debian/Ubuntu — xem INVENTORY.md.

---

## 2. Database + portal (Docker)

```bash
cp deploy/.env.example deploy/.env
# Sửa deploy/.env: đặt mật khẩu thật, trỏ CLIENT_DIR vào XJLserver/client/Pokemon

cp /path/to/pokemon.sql   deploy/mysql/init/01-pokemon.sql
cp /path/to/x_keygift.sql deploy/mysql/init/02-x_keygift.sql
cp portal/sql/portal.sql  deploy/mysql/init/03-portal.sql
cp deploy/mysql/init/04-grants.sql.example deploy/mysql/init/04-grants.sql

docker compose -f deploy/docker-compose.yml up -d
```

Portal ở `http://localhost:8080`, client ở `http://localhost:8080/game/`.

Tạo tài khoản GM và nạp bảng vật phẩm:

```bash
docker compose -f deploy/docker-compose.yml exec php \
  php bin/create-admin.php admin

# list_items không có trong dump — dựng lại từ gm/log.txt của release
DB_ADMIN_USER=root DB_ADMIN_PASS=<root-pw> \
  php portal/bin/import-items.php www-original/gm/log.txt
```

### Không dùng Docker

```bash
cp portal/config/config.example.php portal/config/config.php   # rồi sửa
mysql pokemon < pokemon.sql
mysql pokemon < x_keygift.sql
mysql pokemon < portal/sql/portal.sql
php -S 0.0.0.0:8080 -t portal/public
```

Trên production dùng nginx + php-fpm, lấy `deploy/nginx/default.conf` làm mẫu.
**Bắt buộc** chặn `config/`, `src/`, `bin/`, `sql/`, `tests/` — release gốc để
mật khẩu root MySQL ngay trong web root.

---

## 3. Game server .NET

Phần này **không** nằm trong Docker: 10 service là binary .NET Framework 4.5,
chỉ chạy trên Windows (hoặc Mono, chưa kiểm chứng).

Trên máy Windows:

1. Cài .NET Framework 4.5 trở lên.
2. Sửa chuỗi kết nối trong **từng** file `.cfg` dưới `Run/*/`:

   ```xml
   <connection>server=<ip-mysql>;uid=<user>;pwd=<pass>;database=pokemon;</connection>
   ```

   Mặc định đang là `192.168.31.188` / `root` / `123456`.

3. Nếu MySQL chạy trong Docker trên máy khác, đổi port binding trong
   `deploy/docker-compose.yml` từ `127.0.0.1:3306` sang địa chỉ LAN — và chỉ
   mở trong mạng nội bộ.
4. Chạy `Run/LocalServiceContainer.exe`, hoặc từng service một.
5. Cấu hình service đọc từ `Run/ServiceConfig.xml`.

> Các binary này chưa được ai kiểm định. Chạy trên máy ảo tách biệt, đừng chạy
> trên máy có dữ liệu quan trọng. Xem [SECURITY.md](SECURITY.md).

---

## 4. Trỏ client về server của bạn

Client hardcode `Auth.$serverUrl = "http://xjl.zgymw.com:8000"` trong bundle đã
minify. `index.html` nạp lại giá trị này sau khi script load — release còn để
sẵn dòng gán đó ở dạng comment, và đó chính là chỗ móc vào.

Bản web phục vụ qua Docker: sửa `index.html` của client, thay

```js
//Auth.$serverUrl = "http://pokemon.qcymw.com/";
```

bằng

```js
Auth.$serverUrl = "http://<ip-server-cua-ban>:8000";
```

Bản app: `app/scripts/prepare-client.mjs` làm việc này tự động.

---

## 5. Build app Android

```bash
cd app
npm install

CLIENT_DIR=../../XJLserver/client/Pokemon \
SERVER_URL=http://<ip-server>:8000 \
npm run prepare:client

npm run verify        # nạp client đã vá trong Chromium headless để kiểm tra

APP_ID=com.yourcompany.pokeh5 npx cap add android
npm run sync
cd android && ./gradlew assembleRelease
```

APK ra ở `app/android/app/build/outputs/apk/release/`.

Cần: JDK 17+, Android SDK (API 34), Gradle. **Không build được nếu thiếu
Android SDK** — `dl.google.com` phải truy cập được.

`prepare-client.mjs` vá ba thứ:

1. Địa chỉ server, qua `www/server-config.js`.
2. Viewport, thêm `viewport-fit=cover` cho máy có tai thỏ.
3. `Auth.$platformType = 0` — WebView không phải nền tảng client nhận ra, và
   khi không nhận ra nó sẽ tự chuyển hướng về domain của nhà phát hành cũ.

`npm run verify` kiểm chứng cả ba: engine Egret load được, canvas được tạo, và
`Auth.$serverUrl` đúng giá trị đã cấu hình.

> `appId` mặc định là `com.example.pokeh5`, **khác** `com.xulonggame.pokemon2`
> của release. Đổi sang package của bạn trước khi ký — dùng package người khác
> sẽ đụng app của họ trên máy người dùng.

---

## 6. Kiểm thử portal

```bash
mysql pokemon < portal/tests/fixtures.sql
BASE=http://localhost:8080 portal/tests/smoke.sh
```

16 kiểm tra: chặn truy cập khi chưa đăng nhập, CSRF, SQL injection, giới hạn số
lần đăng nhập sai, nhận quà trùng, và đua nhận quà đồng thời.

---

## Thứ tự khởi động

1. MySQL
2. Service .NET (chúng cần DB lúc khởi động)
3. Portal + client

Service .NET không tự đợi DB — bật DB trước, nếu không chúng sẽ thoát ngay.
