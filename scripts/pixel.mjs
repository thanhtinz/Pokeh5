/**
 * Xuất PNG từ bản đồ ký tự.
 *
 * ## Vì sao pixel art, và vì sao viết bằng ký tự
 *
 * Mấy bản vẽ trước hỏng vì cùng một lý do: tôi đặt điểm bezier bằng cách đoán,
 * rồi phải dựng ảnh lên mới biết mình đoán sai. Pixel art lật ngược chuyện đó —
 * **mỗi pixel là một ký tự nhìn thấy được trong mã nguồn**. Cái đầu nhân vật
 * rộng mấy ô, mắt nằm ở hàng nào, đường bao có kín không: đọc thẳng ra từ file,
 * không cần dựng ảnh mới biết.
 *
 * Đây cũng là lý do pixel art hợp với việc viết ra bằng mã hơn mọi lối vẽ khác,
 * và là lý do một cái sprite 24×32 làm cẩn thận trông có nghề hơn hẳn một hình
 * vector vẽ ẩu ở độ phân giải bất kỳ.
 *
 * ## Không có thư viện nào
 *
 * PNG là chữ ký, vài khối dữ liệu, mỗi khối kèm CRC, và phần ảnh nén bằng
 * zlib — `node:zlib` có sẵn. Kéo về một gói ngoài để ghi vài trăm byte header
 * thì lệch hẳn với phần còn lại của dự án.
 */
import { deflateSync } from 'node:zlib';

// ------------------------------------------------------------------- PNG ----

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);

  return Buffer.concat([head, data, crc]);
}

/** RGBA thô thành một file PNG. */
export function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit mỗi kênh
  ihdr[9] = 6; // RGBA

  // Mỗi hàng bắt đầu bằng một byte kiểu lọc. Ảnh pixel art toàn mảng màu phẳng
  // nên lọc kiểu 0 nén đã rất tốt; chọn kiểu khác chỉ thêm phần cho zlib nghĩ.
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const at = y * (width * 4 + 1);
    raw[at] = 0;
    rgba.copy(raw, at + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------- canvas ---

/** Một mặt vẽ RGBA, mọi pixel bắt đầu ở trong suốt. */
export class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }

  set(x, y, [r, g, b, a = 255]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const at = (y * this.width + x) * 4;

    // Trộn theo alpha, vì bóng đổ là một mảng đen mờ chồng lên nền.
    if (a >= 255) {
      this.data[at] = r;
      this.data[at + 1] = g;
      this.data[at + 2] = b;
      this.data[at + 3] = 255;
      return;
    }

    const k = a / 255;
    const back = this.data[at + 3] / 255;
    const out = k + back * (1 - k);
    if (out <= 0) return;

    this.data[at] = Math.round((r * k + this.data[at] * back * (1 - k)) / out);
    this.data[at + 1] = Math.round((g * k + this.data[at + 1] * back * (1 - k)) / out);
    this.data[at + 2] = Math.round((b * k + this.data[at + 2] * back * (1 - k)) / out);
    this.data[at + 3] = Math.round(out * 255);
  }

  fill(x, y, w, h, colour) {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) this.set(x + dx, y + dy, colour);
    }
  }

  /** Đọc một pixel, cùng giao diện với `Sprite` nên dán chồng canvas được. */
  at(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    const i = (y * this.width + x) * 4;
    if (this.data[i + 3] === 0) return null;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  /** Dán một sprite hoặc một canvas khác lên, bỏ qua pixel trong suốt. */
  stamp(sprite, x, y) {
    for (let dy = 0; dy < sprite.height; dy += 1) {
      for (let dx = 0; dx < sprite.width; dx += 1) {
        const colour = sprite.at(dx, dy);
        if (colour) this.set(x + dx, y + dy, colour);
      }
    }
  }

  toPng() {
    return encodePng(this.width, this.height, this.data);
  }

  /** Phóng to bằng cách nhân đôi pixel — đúng cách xem pixel art, không làm mượt. */
  scaled(factor) {
    const out = new Canvas(this.width * factor, this.height * factor);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const at = (y * this.width + x) * 4;
        if (this.data[at + 3] === 0) continue;
        const colour = [this.data[at], this.data[at + 1], this.data[at + 2], this.data[at + 3]];
        out.fill(x * factor, y * factor, factor, factor, colour);
      }
    }
    return out;
  }
}

// ----------------------------------------------------------------- sprite ---

/**
 * Một sprite viết bằng ký tự.
 *
 * `rows` là mảng chuỗi, mỗi ký tự một pixel; dấu chấm là trong suốt. `palette`
 * ánh xạ ký tự sang màu. Viết thế này thì cái sai nằm ngay trong mã nguồn —
 * hàng nào lệch một ô là nhìn ra ngay, không phải dựng ảnh mới biết.
 */
export class Sprite {
  constructor(palette, rows) {
    this.palette = palette;
    this.rows = rows;
    this.height = rows.length;
    this.width = Math.max(...rows.map((row) => row.length));

    // Bắt lỗi ngay lúc dựng: một hàng ngắn hơn hàng khác gần như luôn là gõ
    // thiếu, và nó biểu hiện thành một mẩu bị cụt ở rìa phải — thứ rất khó
    // nhìn ra trên ảnh đã phóng to.
    const ragged = rows.findIndex((row) => row.length !== this.width);
    if (ragged >= 0) {
      throw new Error(
        `sprite có hàng ${ragged} dài ${rows[ragged].length}, các hàng khác dài ${this.width}`,
      );
    }

    for (const row of rows) {
      for (const ch of row) {
        if (ch !== '.' && !(ch in palette)) {
          throw new Error(`ký tự '${ch}' không có trong bảng màu`);
        }
      }
    }
  }

  at(x, y) {
    const ch = this.rows[y]?.[x];
    if (!ch || ch === '.') return null;
    return this.palette[ch];
  }
}

/** `#rrggbb` thành `[r, g, b, a]`. */
export function rgb(hex, alpha = 255) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    alpha,
  ];
}
