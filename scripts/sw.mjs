/**
 * Sinh service worker sau khi dựng xong.
 *
 *   node scripts/sw.mjs   (chạy tự động ở cuối `npm run build`)
 *
 * Không dùng plugin. Cái service worker này cần đúng hai thứ mà một plugin
 * mang theo cả trăm thứ khác để cho: danh sách file đã băm tên, và một cái tên
 * kho đổi mỗi lần dựng. Cả hai đều đọc được từ `dist/` bằng mười dòng.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const DIST = 'dist';

/** Mọi file trong `dist/`, đường dẫn tương đối, đã sắp xếp cho ổn định. */
async function walk(dir, prefix = '') {
  const entries = await readdir(`${DIST}/${dir}`, { withFileTypes: true });
  const found = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...(await walk(`${dir}/${entry.name}`, path)));
    else found.push(path);
  }
  return found;
}

const files = (await walk('.')).filter((name) => name !== 'sw.js');

// Tên kho lấy từ nội dung chứ không lấy từ giờ dựng: dựng lại y hệt thì tên y
// hệt, nên người chơi không bị tải lại cả bộ vì một lần dựng không đổi gì.
const version = createHash('sha256')
  .update(
    (await Promise.all(files.map((name) => readFile(`${DIST}/${name}`)))).reduce(
      (all, one) => Buffer.concat([all, one]),
      Buffer.alloc(0),
    ),
  )
  .digest('hex')
  .slice(0, 12);

const worker = `/*
 * Service worker của Broke to Boss — sinh ra bởi scripts/sw.mjs, đừng sửa tay.
 *
 * Ba luật, và luật thứ hai là luật quan trọng nhất:
 *
 *  1. File có băm trong tên thì không bao giờ đổi, nên lấy từ kho trước.
 *  2. **Đường /api không bao giờ vào kho.** Bản lưu và bảng xếp hạng mà nằm
 *     trong kho thì có ngày người chơi mở ra thấy tài sản của tuần trước và
 *     tưởng mình mất tiền. Mạng hỏng thì để nó hỏng ra hỏng — lớp tài khoản
 *     đã biết cách chờ.
 *  3. Điều hướng thì thử mạng trước, hỏng thì trả cái vỏ trong kho. Đó là chỗ
 *     duy nhất của cái tệp này: mở app dưới hầm tàu điện vẫn ra game chứ không
 *     ra trang trắng.
 */
const CACHE = 'btb-${version}';
const SHELL = ${JSON.stringify(files.map((name) => `./${name}`), null, 2)};

/*
 * Thư mục mà worker này cai quản.
 *
 * Bản dựng đặt \`base: './'\`, nên app dựng ở gốc miền cũng chạy mà dựng trong
 * một thư mục con cũng chạy — và ở thư mục con thì API nằm ở \`/game/api\` chứ
 * không phải \`/api\`. Kiểm cả hai: một cho trường hợp API đi cùng app, một cho
 * trường hợp nó ngồi ở gốc miền sau một reverse proxy.
 */
const SCOPE = new URL('./', self.location).pathname;

function isApi(pathname) {
  return pathname.startsWith('/api') || pathname.startsWith(SCOPE + 'api');
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApi(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html', { cacheName: CACHE })),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { cacheName: CACHE }).then((hit) => hit ?? fetch(request)),
  );
});
`;

await writeFile(`${DIST}/sw.js`, worker);
console.log(`sw.js — ${files.length} file, kho btb-${version}`);
