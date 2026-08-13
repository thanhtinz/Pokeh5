/**
 * Mấy thứ lặt vặt quanh `node:http` mà không đáng kéo cả một framework về.
 */

/** Thân request lớn hơn chừng này thì cắt. Một bản lưu nén chưa tới 20 kB. */
export const MAX_BODY = 256 * 1024;

export function send(res, status, body, headers = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    // Bearer token nằm trong localStorage của chính trang mình, không phải
    // cookie, nên không có "quyền đi kèm" nào để một trang khác lợi dụng —
    // mở cho mọi origin ở đây là an toàn, và là thứ bản Capacitor cần vì
    // origin của nó là `capacitor://localhost`.
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

export function fail(res, status, code) {
  send(res, status, { error: code });
}

/** Đọc thân JSON, hoặc `undefined` nếu hỏng hay quá to. */
export async function readJson(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) return undefined;
    chunks.push(chunk);
  }

  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Đếm lượt gọi theo cửa sổ trượt, giữ trong bộ nhớ.
 *
 * Một tiến trình một máy chủ thì thế này là đủ. Chạy nhiều tiến trình thì phải
 * đổi sang chỗ đếm dùng chung — ghi ra đây để sau này không ai tưởng nó có sẵn.
 */
export function rateLimiter({ windowMs, max }) {
  const hits = new Map();

  return function allow(key, now = Date.now()) {
    const cutoff = now - windowMs;
    const times = (hits.get(key) ?? []).filter((at) => at > cutoff);

    // Dọn luôn lúc đi qua, khỏi cần một cái hẹn giờ chỉ để quét bản đồ.
    if (times.length === 0) hits.delete(key);
    else hits.set(key, times);

    if (times.length >= max) return false;
    times.push(now);
    hits.set(key, times);
    return true;
  };
}

/** IP của người gọi, tin `x-forwarded-for` chỉ khi được bảo là có proxy đứng trước. */
export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/** Token trong `Authorization: Bearer …`, hoặc null. */
export function bearer(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}
