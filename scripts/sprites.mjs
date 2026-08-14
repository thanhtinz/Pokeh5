/**
 * Bộ sprite của game, viết bằng ký tự rồi xuất ra PNG.
 *
 *   node scripts/sprites.mjs            # xuất vào src/assets/sprites
 *   node scripts/sprites.mjs --preview  # kèm một tấm phóng to để soi
 *
 * ## Vì sao đổi sang pixel art
 *
 * Ba lần vẽ trước đều hỏng ở cùng một chỗ: đặt điểm bezier bằng cách đoán rồi
 * phải dựng ảnh lên mới biết mình đoán sai. Pixel art lật ngược chuyện đó —
 * hình nằm ngay trong mã nguồn dưới dạng bản đồ ký tự, nên đường bao có kín
 * không, mắt nằm ở hàng nào, vai rộng mấy ô đều đọc thẳng ra được.
 *
 * Và nó là một lối vẽ *có luật*, hợp với việc viết ra bằng mã:
 *
 *  - **Bảng màu hẹp.** Mười sáu màu cho cả bộ. Ít màu thì buộc phải quyết định
 *    tử tế chứ không tô bừa.
 *  - **Đường bao trước, chi tiết sau.** Nhìn ở cỡ thật mà không nhận ra là cái
 *    gì thì thêm bao nhiêu chi tiết cũng vô ích.
 *  - **Không khử răng cưa.** Cạnh cứng là đặc điểm, không phải lỗi.
 */
import { mkdir, writeFile } from 'node:fs/promises';

import { Canvas, Sprite, rgb } from './pixel.mjs';

const OUT = process.argv.includes('--preview')
  ? (process.argv[process.argv.indexOf('--preview') + 1] ?? 'shots')
  : 'src/assets/sprites';

/**
 * Bảng màu chung cho cả bộ.
 *
 * Mỗi chất liệu ba tông: sáng, giữa, tối — đủ để có khối mà không đủ để trượt
 * thành tô bóng lem nhem. Đường bao dùng một màu nâu rất sẫm chứ không dùng
 * đen tuyền: đen tuyền cắt hình ra khỏi nền quá gắt và làm cả bộ trông cứng.
 */
const P = {
  o: rgb('#241a1e'), // đường bao
  O: rgb('#3a2a2c'), // đường bao nhạt, dùng trong lòng hình

  s: rgb('#f0c091'), // da sáng
  S: rgb('#d09a6a'), // da giữa
  d: rgb('#a8714b'), // da tối
  e: rgb('#2b1f28'), // mắt

  b: rgb('#5aa3d0'), // áo sáng
  B: rgb('#3d7ba8'), // áo giữa
  n: rgb('#2a5a80'), // áo tối
  p: rgb('#4a5570'), // quần sáng
  P: rgb('#333c52'), // quần tối
  k: rgb('#2b2b33'), // giày và cao su
  K: rgb('#1c1c22'), // cao su tối

  h: rgb('#e8cf8d'), // mũ sáng
  H: rgb('#b89a52'), // mũ tối

  w: rgb('#a9743f'), // gỗ sáng
  W: rgb('#7a5029'), // gỗ tối
  m: rgb('#cdd6de'), // thép sáng
  M: rgb('#8d99a6'), // thép tối
  r: rgb('#b4643a'), // gỉ sáng
  R: rgb('#7d4126'), // gỉ tối
  g: rgb('#5b4a3c'), // đất sáng
  G: rgb('#3e3229'), // đất tối
};


/**
 * Thân người, nhìn nghiêng ba phần tư, quay mặt sang phải.
 *
 * Đây là hình khó nhất trong bộ và cũng là hình quan trọng nhất, nên nó được
 * vẽ riêng, không dùng chung khối nào với thứ khác. Vai rộng hơn hông, đầu to
 * hơn tỷ lệ thật một chút — cỡ này mà vẽ đúng tỷ lệ người thì cái đầu chỉ còn
 * bốn ô và không nhét nổi hai con mắt.
 */
const BODY = new Sprite(P, [
  '......................',
  '.......oooooo.........',
  '......ohhhhhho........',
  '....oohhhhhhhhoo......',
  '...ohhhhhhhhhhhhho....',
  '...oHHHHHHHHHHHHHo....',
  '....oooooooooooooo....',
  '......ossssssssdo.....',
  '......ossssssssdo.....',
  '......ossessessdo.....',
  '......ossssssSSdo.....',
  '......odsssssSSdo.....',
  '.......oSSSSSSdo......',
  '.......ooooooooo......',
  '....oobbbbbbbbbbboo...',
  '...obbbbbbbbbbbbbbbo..',
  '...obbbbbbbbbbbbbbbo..',
  '...obbbobbbbbbbbbbbo..',
  '...obbbobbbbbbbbbbbo..',
  '...obbbobbbbbbbbbbbo..',
  '...osssobbbbbbbbbbbo..',
  '...ooooonnnnnnnnnnno..',
  '.....oppppppppppppo...',
  '.....opppppoppppppo...',
  '.....opppppoppppppo...',
  '.....oPPPPPoPPPPPPo...',
  '.....oPPPPPoPPPPPPo...',
  '.....oPPPPPoPPPPPPo...',
  '....okkkkkookkkkkkko..',
  '....oooooooooooooooo..',
]);

/** Tay phải giơ búa lên. Dán vào vai, nên gốc toạ độ là khớp vai. */
const ARM_UP = new Sprite(P, [
  '......oooooo..',
  '.....ommmmmmo.',
  '.....oMMMMMMo.',
  '.....ommmmmmo.',
  '.....oMMMMMMo.',
  '......oooooo..',
  '.......oo.....',
  '.......owo....',
  '.......oWo....',
  '......oowo....',
  '......osso....',
  '.....ossso....',
  '....obbso.....',
  '...obbbo......',
  '..obbbo.......',
  '..obbo........',
  '..ooo.........',
  '..............',
]);

/** Tay phải bổ búa xuống. Cùng khớp vai, khác dáng. */
const ARM_DOWN = new Sprite(P, [
  '..oo..........',
  '.obbo.........',
  '.obbbo........',
  '..obbbo.......',
  '...obbso......',
  '....osso......',
  '....owwo......',
  '.....owwo.....',
  '.....oWWo.....',
  '......owwo....',
  '......oWWo....',
  '.....ooooooo..',
  '.....ommmmmo..',
  '.....oMMMMMo..',
  '.....ommmmmo..',
  '.....ooooooo..',
]);

/** Cái đe: chỗ búa rơi xuống. */
const ANVIL = new Sprite(P, [
  '...........',
  '..ooooooo..',
  '.ommmmmmmo.',
  '.oMMMMMMMo.',
  '..oMMMMMo..',
  '..oRRRRRo..',
  '.oRRRRRRRo.',
  '.oRRRRRRRo.',
  '.orrrrrrro.',
  '.ooooooooo.',
  '...........',
]);

/** Thùng phuy. */
const DRUM = new Sprite(P, [
  '...oooooo...',
  '..orrrrrro..',
  '.oorrrrrroo.',
  '.orRRRRRRro.',
  '.orRRRRRRro.',
  '.orrRRRRrro.',
  '.orRRRRRRro.',
  '.orRRRRRRro.',
  '.orrRRRRrro.',
  '.orRRRRRRro.',
  '.orRRRRRRro.',
  '.oRRRRRRRRo.',
  '..oooooooo..',
]);

/** Đống sắt vụn. */
const HEAP = new Sprite(P, [
  '.......oooo.......',
  '......ommmmo......',
  '....oooMMMMooo....',
  '...orrroooorrro...',
  '..orRRRoooorRRRo..',
  '.oommmmoooommmmoo.',
  '.oMMMMMMooMMMMMMo.',
  'oorrrrrrrrrrrrrroo',
  'oRRRRRRRRRRRRRRRRo',
  'oooooooooooooooooo',
]);

/** Lốp xe. */
const TYRE = new Sprite(P, [
  '...oooooo...',
  '.ookkkkkkoo.',
  '.okkkoookkko',
  'okkkoMMokkko',
  'okkkoMMokkko',
  '.okkkoookkko',
  '.ookkkkkkoo.',
  '...oooooo...',
]);

/** Một tấm tôn hàng rào. */
const FENCE = new Sprite(P, [
  'oooooo',
  'orrRro',
  'orrRro',
  'oRrRro',
  'orrRro',
  'orrRro',
  'oRrRro',
  'orrRro',
  'orrRro',
  'oRrRro',
  'orrRro',
  'oooooo',
]);

const SHEET = {
  body: BODY,
  'arm-up': ARM_UP,
  'arm-down': ARM_DOWN,
  anvil: ANVIL,
  drum: DRUM,
  heap: HEAP,
  tyre: TYRE,
  fence: FENCE,
};

/**
 * Cảnh nền của màn Cày: mọi thứ trừ nhân vật.
 *
 * Nhân vật và cánh tay dán riêng ở phía ứng dụng, vì tay phải đổi khung hình
 * theo nhịp búa — gộp vào nền thì mỗi khung hình lại là một tấm ảnh mới.
 */
function scene() {
  const width = 128;
  const height = 88;
  const canvas = new Canvas(width, height);

  // Trời: một dải sẫm. Đây là chỗ chữ của giao diện nằm đè lên, nên nó phải
  // tối và phải trống.
  canvas.fill(0, 0, width, 34, rgb('#20181c'));

  // Đất: hai dải, dải xa nhạt hơn dải gần — mẹo cũ để một mặt phẳng có chiều sâu.
  canvas.fill(0, 34, width, 12, rgb('#4a3c31'));
  canvas.fill(0, 46, width, height - 46, rgb('#5b4a3c'));
  for (let x = 0; x < width; x += 1) {
    // Mép giữa hai dải nhấp nhô một pixel, để nó không thành một đường kẻ.
    if ((x * 7) % 11 < 4) canvas.set(x, 46, rgb('#4a3c31'));
  }

  // Hàng rào chạy ngang phía sau.
  for (let x = -2; x < width + 6; x += FENCE.width) {
    canvas.stamp(FENCE, x, 22);
  }

  canvas.stamp(DRUM, 8, 24);
  canvas.stamp(DRUM, 20, 28);
  canvas.stamp(HEAP, 84, 48);
  canvas.stamp(TYRE, 106, 66);
  // Cái đe phải nằm đúng dưới chỗ đầu búa rơi xuống ở khung "bổ". Căn bằng mắt
  // trên ảnh đã ghép, chứ không đoán: lệch sáu pixel là búa nện xuống đất trống
  // ngay cạnh cái đe, và ở cỡ này sáu pixel là rất rõ.
  canvas.stamp(ANVIL, 47, 60);

  // Bóng đổ dưới chân người và dưới cái đe: một dải mờ, không phải một hình bầu
  // dục — ở cỡ này một hình bầu dục chỉ còn là bốn pixel xám.
  canvas.fill(30, 68, 24, 2, [0, 0, 0, 90]);
  canvas.fill(47, 70, 12, 2, [0, 0, 0, 80]);

  return canvas;
}

/**
 * Nhân vật kèm cánh tay, ghép sẵn thành một khung hình hoàn chỉnh.
 *
 * Ghép ở đây chứ không ghép ở phía ứng dụng: căn cánh tay vào vai là việc phải
 * nhìn mới biết đúng, và ở đây thì nhìn được — bên kia chỉ có mấy con số phần
 * trăm trong CSS, sai một pixel cũng không ai hay.
 */
function hero(arm, armY) {
  const canvas = new Canvas(34, 34);
  canvas.stamp(BODY, 0, 4);
  canvas.stamp(arm, 15, armY);
  return canvas;
}

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/yard.png`, scene().toPng());
await writeFile(`${OUT}/hero-up.png`, hero(ARM_UP, 2).toPng());
await writeFile(`${OUT}/hero-down.png`, hero(ARM_DOWN, 16).toPng());

for (const [name, sprite] of Object.entries(SHEET)) {
  const canvas = new Canvas(sprite.width, sprite.height);
  canvas.stamp(sprite, 0, 0);
  await writeFile(`${OUT}/${name}.png`, canvas.toPng());
}

// Một tấm soi: cả bộ bày cạnh nhau, phóng to tám lần, trên nền của game.
{
  const pad = 6;
  const width = Object.values(SHEET).reduce((sum, s) => sum + s.width + pad, pad);
  const height = Math.max(...Object.values(SHEET).map((s) => s.height)) + pad * 2;

  const sheet = new Canvas(width, height);
  sheet.fill(0, 0, width, height, rgb('#191317'));

  let x = pad;
  for (const sprite of Object.values(SHEET)) {
    sheet.stamp(sprite, x, height - pad - sprite.height);
    x += sprite.width + pad;
  }

  await writeFile(`${OUT}/sheet.png`, sheet.scaled(8).toPng());

  // Và một tấm cảnh đã ghép người vào, phóng to, để soi bố cục thật.
  const staged = scene();
  staged.stamp(hero(ARM_UP, 2), 28, 34);
  await writeFile(`${OUT}/scene.png`, staged.scaled(6).toPng());

  const swung = scene();
  swung.stamp(hero(ARM_DOWN, 16), 28, 34);
  await writeFile(`${OUT}/scene-down.png`, swung.scaled(6).toPng());
}

console.log(`Đã xuất ${Object.keys(SHEET).length} sprite vào ${OUT}/`);
