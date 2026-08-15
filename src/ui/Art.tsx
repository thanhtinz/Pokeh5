/**
 * The asset set — everything the player owns, works, draws or wins back.
 *
 * Line icons are for the interface: a tab, a lock, a state. Content is not
 * interface. A business the player has bought two hundred of, a shift they
 * chose, the dog that came home — those are things in the world, and a 1.6px
 * outline is a label for them rather than a picture of them.
 *
 * So these are drawn as flat vector assets on a 48×48 stage: solid shapes, a
 * light from the upper left, four tones plus ink and a highlight. The tones are
 * `--art-1` … `--art-4` in `base.css`, all derived from the same hue the
 * palette runs on, so an asset warms from debt-red to gold along with
 * everything else. Nothing here names a colour.
 *
 * Ground is y=43. Most pieces sit on a soft contact shadow, which is what makes
 * a flat drawing read as an object rather than a sticker.
 */
import type { JSX } from 'preact';

/** Contact shadow. Cheap, and does most of the work of grounding a shape. */
function Shade({ rx = 14, cx = 24 }: { rx?: number; cx?: number }) {
  return <ellipse class="shade" cx={cx} cy={43.5} rx={rx} ry="2.6" />;
}

/**
 * A grid of windows. Roughly a third are lit, chosen by position rather than at
 * random so a building looks the same on every render.
 */
function Windows({
  x,
  y,
  cols,
  rows,
  w = 4,
  h = 5,
  gap = 3,
}: {
  x: number;
  y: number;
  cols: number;
  rows: number;
  w?: number;
  h?: number;
  gap?: number;
}) {
  const cells: JSX.Element[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const lit = (row * 3 + col * 2) % 4 === 0;
      cells.push(
        <rect
          key={`${row}-${col}`}
          class={lit ? 'lite' : 'ink'}
          x={x + col * (w + gap)}
          y={y + row * (h + gap)}
          width={w}
          height={h}
          rx="1"
        />,
      );
    }
  }
  return <>{cells}</>;
}

function Wheel({ cx, cy, r = 4 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle class="ink" cx={cx} cy={cy} r={r} />
      <circle class="t1" cx={cx} cy={cy} r={r * 0.38} />
    </>
  );
}

const ART: Record<string, () => JSX.Element> = {
  // ------------------------------------------------------------- Skid Row --
  can: () => (
    <>
      <Shade rx={11} />
      <path class="t2" d="M15 13h18v24a9 4.5 0 0 1-18 0z" />
      <path class="t3" d="M24 13h9v24a4.5 4.5 0 0 1-9 4.5z" />
      {/* Chỉ cái nhãn quấn quanh mới ăn màu vật liệu phụ; nắp lon là nhôm, và
          vẽ nó đỏ theo nhãn thì cái lon thành hộp sơn. */}
      <path class="t1" d="M15 20h18v8H15z" />
      <path class="t4" d="M24 20h9v8h-9z" />
      <ellipse class="t2" cx="24" cy="13" rx="9" ry="4.5" />
      <ellipse class="t3" cx="24" cy="13" rx="5.6" ry="2.6" />
    </>
  ),

  cart: () => (
    <>
      <Shade rx={13} />
      <path class="t1" d="M3 11c0-4.4 8.4-7.6 21-7.6S45 6.6 45 11z" />
      <path class="t3" d="M22.6 9h2.8v13h-2.8z" />
      <path class="t2" d="M7 22h28v13H7z" />
      <path class="t3" d="M24 22h11v13H24z" />
      <path class="t4" d="M11 26h8v6h-8zM25 26h8v6h-8z" />
      <path class="t3" d="M35 24h7v3h-7z" />
      <Wheel cx={14} cy={38} r={4} />
      <Wheel cx={29} cy={38} r={4} />
    </>
  ),

  spray: () => (
    <>
      <Shade rx={11} />
      <path class="t2" d="M16 20h16a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3V23a3 3 0 0 1 3-3z" />
      <path class="t3" d="M24 20h8a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-8z" />
      <path class="t1" d="M17 25h14v8H17z" />
      <path class="t4" d="M24 25h7v8h-7z" />
      <path class="t3" d="M19 12h9v8h-9z" />
      <path class="t1" d="M28 12h5l4-5h-9z" />
      <circle class="lite" cx="41" cy="9" r="1.6" />
      <circle class="lite" cx="38" cy="15" r="1.2" />
      <circle class="lite" cx="43" cy="15" r="1" />
    </>
  ),

  mic: () => (
    <>
      <Shade rx={10} />
      <rect class="t2" x="18" y="6" width="12" height="20" rx="6" />
      <rect class="t1" x="18" y="6" width="6" height="20" rx="3" />
      <path class="t4" d="M20 10h8v2h-8zM20 15h8v2h-8zM20 20h8v2h-8z" />
      <path class="t3" d="M12 22a12 12 0 0 0 24 0h-3.6a8.4 8.4 0 0 1-16.8 0z" />
      <path class="t3" d="M22 34h4v8h-4z" />
      <path class="t2" d="M16 41h16v3H16z" />
    </>
  ),

  gear: () => (
    <>
      <Shade rx={13} />
      <path
        class="t2"
        d="M21 4h6l1 5 5 2 4-3 4 4-3 4 2 5 5 1v6l-5 1-2 5 3 4-4 4-4-3-5 2-1 5h-6l-1-5-5-2-4 3-4-4 3-4-2-5-5-1v-6l5-1 2-5-3-4 4-4 4 3 5-2z"
      />
      <circle class="t3" cx="24" cy="24" r="9" />
      <circle class="t4" cx="24" cy="24" r="4.6" />
      <path class="t1" d="M21 4h3l-.6 5-4.4 1.8z" />
    </>
  ),

  gem: () => (
    <>
      <Shade rx={11} />
      <path class="t1" d="M17 8h14l7 11H10z" />
      <path class="t2" d="M10 19h14L24 42z" />
      <path class="t3" d="M24 19h14L24 42z" />
      <path class="t4" d="M17 8 14 19h20L31 8z" opacity="0.28" />
      <path class="lite" d="M19.5 10h4l-2 7h-4z" />
    </>
  ),

  // ------------------------------------------------------------ The Docks --
  forklift: () => (
    <>
      <Shade />
      <path class="t2" d="M6 22h14v14H6z" />
      <path class="t3" d="M13 22h7v14h-7z" />
      <path class="t1" d="M8 25h8v6H8z" />
      <path class="t3" d="M26 8h4v28h-4z" />
      <path class="t4" d="M30 30h11v3.4H30z" />
      <path class="t2" d="M20 30h6v6h-6z" />
      <Wheel cx={12} cy={38} r={4.4} />
      <Wheel cx={28} cy={38} r={4} />
    </>
  ),

  crate: () => (
    <>
      <Shade />
      <path class="t2" d="M6 12h36v30H6z" />
      <path class="t3" d="M24 12h18v30H24z" />
      <path class="t1" d="M6 12h36v5H6zM6 37h36v5H6z" />
      <path class="t4" d="M12 17h5v20h-5zM31 17h5v20h-5z" />
      <path class="t1" d="M19 22h10v9H19z" />
    </>
  ),

  fish: () => (
    <>
      <Shade rx={13} />
      <path class="t2" d="M34 24c0 7-6.7 12-15 12S4 31 4 24s6.7-12 15-12 15 5 15 12Z" />
      <path class="t3" d="M34 24 46 15v18z" />
      <path class="t1" d="M14 12.8c3 3 3 19.4 0 22.4-6-2-10-6.6-10-11.2s4-9.2 10-11.2Z" />
      <path class="t4" d="M19 8h8l-4 5z" />
      <circle class="lite" cx="11" cy="21" r="2.4" />
      <circle class="ink" cx="11" cy="21" r="1.2" />
    </>
  ),

  anchor: () => (
    <>
      <Shade rx={13} />
      <circle class="t1" cx="24" cy="8" r="5" />
      <circle class="t4" cx="24" cy="8" r="2.2" />
      <path class="t2" d="M21.4 12h5.2v29h-5.2z" />
      <path class="t1" d="M14 15h20v4.4H14z" />
      <path class="t3" d="M6 24c0 10 8 18 18 18S42 34 42 24h-6c0 6.6-5.4 12-12 12s-12-5.4-12-12z" />
      <path class="t4" d="M3 20h8l-4 6zM45 20h-8l4 6z" />
    </>
  ),

  stamp: () => (
    <>
      <Shade rx={13} />
      <path class="t1" d="M19 6h10v8H19z" />
      <path class="t2" d="M14 14h20v10H14z" />
      <path class="t3" d="M24 14h10v10H24z" />
      <path class="t4" d="M8 26h32v6H8z" />
      <path class="t2" d="M6 34h36v7H6z" />
      <path class="t3" d="M24 34h18v7H24z" />
    </>
  ),

  containers: () => (
    <>
      <Shade />
      <path class="t3" d="M4 30h18v12H4z" />
      <path class="t2" d="M26 30h18v12H26z" />
      <path class="t1" d="M15 16h18v12H15z" />
      <path class="t4" d="M7 32.5h1.6v7H7zM11 32.5h1.6v7H11zM15 32.5h1.6v7H15zM29 32.5h1.6v7H29zM33 32.5h1.6v7H33zM37 32.5h1.6v7H37zM18 18.5h1.6v7H18zM22 18.5h1.6v7H22zM26 18.5h1.6v7H26z" opacity="0.5" />
    </>
  ),

  // -------------------------------------------------------------- Midtown --
  truck: () => (
    <>
      <Shade />
      <path class="t1" d="M2 9c0-5 9.8-8.6 22-8.6S46 4 46 9z" />
      <path class="t3" d="M22.6 7h2.8v6h-2.8z" />
      <path class="t1" d="M8 13h32v13H8z" />
      <path class="lite" d="M10 15h28v9H10z" />
      <path class="t4" d="M13 17.5h9c1.4 0 1.4 4 0 4h-9c-1.4 0-1.4-4 0-4zM26 17.5h9c1.4 0 1.4 4 0 4h-9c-1.4 0-1.4-4 0-4z" />
      <path class="t2" d="M6 26h36v11H6z" />
      <path class="t3" d="M24 26h18v11H24z" />
      <Wheel cx={14} cy={39} r={4} />
      <Wheel cx={34} cy={39} r={4} />
    </>
  ),

  washer: () => (
    <>
      <Shade rx={12} />
      <path class="t2" d="M10 6h28v36H10z" />
      <path class="t3" d="M26 6h12v36H26z" />
      <path class="t1" d="M10 6h28v7H10z" />
      <circle class="t4" cx="24" cy="27" r="10" />
      <circle class="lite" cx="24" cy="27" r="6.4" />
      <circle class="t3" cx="33" cy="9.5" r="2" />
      <circle class="t3" cx="27" cy="9.5" r="2" />
    </>
  ),

  dumbbell: () => (
    <>
      <Shade />
      <path class="t3" d="M14 22h20v6H14z" />
      <path class="t2" d="M6 16h8v18H6zM34 16h8v18h-8z" />
      <path class="t1" d="M2 20h5v10H2zM41 20h5v10h-5z" />
      <path class="t4" d="M14 24h20v2H14z" />
    </>
  ),

  coffee: () => (
    <>
      <Shade rx={13} />
      <path class="t2" d="M8 14h26v16a13 13 0 0 1-26 0z" />
      <path class="t3" d="M21 14h13v16a13 13 0 0 1-13 13z" />
      <path class="t1" d="M6 10h30v5H6z" />
      <path class="t3" d="M34 18h4a5.6 5.6 0 0 1 0 11.2h-4z" />
      <path class="lite" d="M12 18h8v9h-8z" opacity="0.35" />
    </>
  ),

  film: () => (
    <>
      <Shade />
      <path class="t2" d="M6 18h36v22H6z" />
      <path class="t3" d="M26 18h16v22H26z" />
      <path class="t1" d="m6 8 34 4-1.6 6L4 14z" />
      <path class="t4" d="m11 8.6 5 .6-3 5.2-5-.6zM21 9.8l5 .6-3 5.2-5-.6zM31 11l5 .6-3 5.2-5-.6z" />
      <path class="lite" d="M12 24h10v9H12z" opacity="0.4" />
    </>
  ),

  bed: () => (
    <>
      <Shade />
      <path class="t3" d="M4 12h6v30H4z" />
      <path class="t2" d="M10 24h34v10H10z" />
      <path class="t1" d="M12 16h14v8H12z" />
      <path class="t3" d="M10 34h34v3H10z" />
      <path class="t2" d="M40 20h4v22h-4z" />
      <path class="t4" d="M6 37h4v5H6zM40 37h4v5h-4z" />
    </>
  ),

  // -------------------------------------------- Financial District --------
  chart: () => (
    <>
      <Shade />
      <path class="t3" d="M6 28h9v14H6z" />
      <path class="t2" d="M19 20h9v22h-9z" />
      <path class="t1" d="M32 10h9v32h-9z" />
      <path class="lite" d="M4 24 16 14l8 6L44 4v8L24 28l-8-6-10 8z" opacity="0.55" />
    </>
  ),

  bank: () => (
    <>
      <Shade />
      <path class="t1" d="M24 4 4 16h40z" />
      <path class="t2" d="M8 18h32v18H8z" />
      <path class="t4" d="M12 18h4v18h-4zM21 18h4v18h-4zM30 18h4v18h-4z" />
      <path class="t3" d="M4 36h40v6H4z" />
      <path class="lite" d="M24 8 12 15h24z" opacity="0.4" />
    </>
  ),

  shield: () => (
    <>
      <Shade rx={12} />
      <path class="t2" d="M24 4 8 10v13c0 10 6.6 17 16 20 9.4-3 16-10 16-20V10z" />
      <path class="t3" d="M24 4v39c9.4-3 16-10 16-20V10z" />
      <path class="t1" d="m15 23 3.4-3.4 4 4L32 14l3.4 3.4L22.4 30z" />
    </>
  ),

  briefcase: () => (
    <>
      <Shade />
      <path class="t3" d="M17 8h14v7h-4v-3h-6v3h-4z" />
      <path class="t2" d="M4 15h40v25H4z" />
      <path class="t1" d="M4 15h40v6H4z" />
      <path class="t4" d="M4 24h40v4H4z" />
      <path class="t1" d="M20 22h8v8h-8z" />
    </>
  ),

  star: () => (
    <>
      <Shade rx={11} />
      <path class="t3" d="M17 26h5v16l-4.6-3.4L13 42V28zM26 26h5v16l-4.6-3.4L22 42V28z" />
      <circle class="t2" cx="24" cy="18" r="15" />
      <circle class="t1" cx="24" cy="18" r="11" />
      <path class="t4" d="m24 9 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2-4.5-4.4 6.2-.9z" />
    </>
  ),

  scales: () => (
    <>
      <Shade />
      <path class="t3" d="M22 8h4v30h-4z" />
      <path class="t2" d="M6 14h36v3.4H6z" />
      <circle class="t1" cx="24" cy="7" r="3.4" />
      <path class="t1" d="M4 20h16l-8 10zM28 20h16l-8 10z" />
      <path class="t2" d="M14 38h20v5H14z" />
    </>
  ),

  // --------------------------------------------------------------- Uptown --
  frame: () => (
    <>
      <Shade />
      <path class="t3" d="M4 6h40v34H4z" />
      <path class="t2" d="M8 10h32v26H8z" />
      <path class="t1" d="M8 26h32v10H8z" />
      <path class="t4" d="m8 26 8-9 6 6 7-8 11 11z" />
      <circle class="lite" cx="15" cy="16" r="3" />
    </>
  ),

  gavel: () => (
    <>
      <Shade />
      <path class="t2" d="m28 6 14 14-6 6-14-14z" />
      <path class="t1" d="m28 6 4 4-10 10-4-4z" />
      <path class="t3" d="m22 16 6 6L12 38l-6-6z" />
      <path class="t4" d="M6 40h20v4H6z" />
    </>
  ),

  yacht: () => (
    <>
      <Shade />
      <path class="t1" d="M12 20h20l4 8H12z" />
      <path class="lite" d="M16 22h5v4h-5zM24 22h5v4h-5z" />
      <path class="t2" d="M4 28h40l-6 10H10z" />
      <path class="t3" d="M24 28h20l-6 10H24z" />
      <path class="t4" d="M4 40c6-3 10 2 16 0s10-3 16 0 8 0 8 0v3H4z" opacity="0.6" />
      <path class="t3" d="M20 12h3v8h-3z" />
    </>
  ),

  plane: () => (
    <>
      <Shade rx={13} />
      <path class="t2" d="M24 4c2.4 0 4 3.6 4 8v6l16 9v4l-16-4v7l5 4v3l-9-2-9 2v-3l5-4v-7L4 31v-4l16-9v-6c0-4.4 1.6-8 4-8Z" />
      <path class="t1" d="M24 4c2.4 0 4 3.6 4 8v6l16 9v4l-16-4v7l5 4v3l-9-2z" />
      <circle class="lite" cx="24" cy="14" r="2.4" />
    </>
  ),

  wine: () => (
    <>
      <Shade />
      <path class="t3" d="M17 4h6v10c4 3 5 6 5 10v18h-16V24c0-4 1-7 5-10z" />
      <path class="t2" d="M20 4h3v10c4 3 5 6 5 10v18h-8z" />
      <path class="t1" d="M12 22h16v9H12z" />
      <path class="t2" d="M31 14h12l-2 10a4 4 0 0 1-8 0z" />
      <path class="t4" d="M31 14h12l-.7 4H31.7z" />
      <path class="t3" d="M36 28h2v12h-2zM32 40h10v3H32z" />
    </>
  ),

  island: () => (
    <>
      <Shade rx={16} />
      <path class="t3" d="M4 38c8-5 32-5 40 0v4H4z" />
      <path class="t1" d="M8 38c6-4 26-4 32 0z" />
      <path class="t3" d="M23 20h3v18h-3z" />
      <path class="t2" d="M24 20c-5-6-11-6-15-2 5-1 9 0 12 3zM24 20c5-6 11-6 15-2-5-1-9 0-12 3zM24 20c-2-7 0-11 4-13-3 4-3 8-1 11z" />
      <circle class="t4" cx="24" cy="19" r="2.4" />
    </>
  ),

  // ---------------------------------------------------------- The Heights --
  tower: () => (
    <>
      <Shade />
      <path class="t2" d="M14 12h20v30H14z" />
      <path class="t3" d="M26 12h8v30h-8z" />
      <path class="t1" d="M18 4h12v8H18z" />
      <path class="t4" d="M23 0h2v4h-2z" />
      <Windows x={17} y={16} cols={2} rows={4} w={4} h={4} gap={3} />
      <path class="t3" d="M6 30h8v12H6zM34 26h8v16h-8z" />
    </>
  ),

  media: () => (
    <>
      <Shade />
      <path class="t2" d="M6 14h36v22H6z" />
      <path class="t4" d="M10 18h28v14H10z" />
      <path class="lite" d="M13 20h9v10h-9z" opacity="0.45" />
      <path class="t3" d="M14 38h20v4H14z" />
      <path class="t1" d="m17 4 7 8 7-8 3 2-6 8h-8l-6-8z" />
      <circle class="t1" cx="24" cy="8" r="2" />
    </>
  ),

  rocket: () => (
    <>
      <Shade rx={10} />
      <path class="t2" d="M24 2c6 5 9.6 12.4 9.6 20L31 32H17l-2.6-10c0-7.6 3.6-15 9.6-20Z" />
      <path class="t1" d="M24 2c6 5 9.6 12.4 9.6 20L31 32h-7z" />
      <circle class="t4" cx="24" cy="16" r="4.4" />
      <circle class="lite" cx="24" cy="16" r="2.2" />
      <path class="t3" d="m17 32-5 6 2-10zM31 32l5 6-2-10z" />
      <path class="t1" d="M20 34h8l-4 10z" />
    </>
  ),

  atom: () => (
    <>
      <Shade rx={12} />
      <g class="orbit">
        <ellipse cx="24" cy="24" rx="20" ry="8" />
        <ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(60 24 24)" />
        <ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(120 24 24)" />
      </g>
      <circle class="t2" cx="24" cy="24" r="6" />
      <circle class="t1" cx="22" cy="22" r="3" />
    </>
  ),

  vault: () => (
    <>
      <Shade />
      <path class="t3" d="M4 6h40v36H4z" />
      <path class="t2" d="M8 10h32v28H8z" />
      <circle class="t3" cx="24" cy="24" r="11" />
      <circle class="t1" cx="24" cy="24" r="7" />
      <path class="t4" d="M23 14h2v6h-2zM23 28h2v6h-2zM14 23h6v2h-6zM28 23h6v2h-6z" />
      <circle class="t4" cx="24" cy="24" r="2.4" />
    </>
  ),

  crown: () => (
    <>
      <Shade rx={15} />
      <path class="t2" d="M4 12 13 24 24 6l11 18 9-12v20H4z" />
      <path class="t1" d="M24 6l11 18 9-12v20H24z" />
      <path class="t3" d="M4 32h40v8H4z" />
      <circle class="lite" cx="4" cy="12" r="3" />
      <circle class="lite" cx="24" cy="6" r="3.4" />
      <circle class="lite" cx="44" cy="12" r="3" />
      <path class="t4" d="M20 34h8v4h-8z" />
    </>
  ),

  // ----------------------------------------------------------------- jobs --
  flyer: () => (
    <>
      <Shade />
      <path class="t3" d="M12 10h22l6 6v26H12z" />
      <path class="t2" d="M8 6h22l6 6v26H8z" />
      <path class="t1" d="M30 6l6 6h-6z" />
      <path class="t4" d="M12 18h18v2.6H12zM12 24h18v2.6H12zM12 30h11v2.6H12z" />
    </>
  ),

  plate: () => (
    <>
      <Shade rx={14} />
      <circle class="t3" cx="19" cy="26" r="16" />
      <circle class="t2" cx="19" cy="26" r="12" />
      <circle class="lite" cx="15" cy="22" r="4" opacity="0.4" />
      <circle class="t3" cx="34" cy="30" r="12" />
      <circle class="t1" cx="34" cy="30" r="9" />
      <circle class="lite" cx="30" cy="10" r="4" />
      <circle class="lite" cx="38" cy="7" r="2.6" />
      <circle class="lite" cx="36" cy="15" r="2" />
    </>
  ),

  boxes: () => (
    <>
      <Shade />
      <path class="t2" d="M4 26h18v16H4z" />
      <path class="t1" d="m4 26 4-4h18l-4 4z" />
      <path class="t3" d="M26 26h18v16H26z" />
      <path class="t2" d="m26 26 4-4h18l-4 4z" opacity="0.7" />
      <path class="t1" d="M14 8h20v16H14z" />
      <path class="t3" d="M26 8h8v16h-8z" />
      <path class="t4" d="M22 8h4v16h-4zM12 26h2v16h-2zM34 26h2v16h-2z" opacity="0.55" />
    </>
  ),

  camera: () => (
    <>
      <Shade rx={11} />
      <path class="t3" d="M22 4h4v10h-4z" />
      <path class="t2" d="M6 14h30v12H6z" />
      <path class="t1" d="M6 14h30v4H6z" />
      <path class="t3" d="m36 15 8-4v14l-8-4z" />
      <circle class="t4" cx="12" cy="20" r="3.4" />
      <circle class="lite" cx="11" cy="19" r="1.4" />
      <path class="t3" d="M18 26h4v8h-4z" />
      <path class="t2" d="M12 34h16v8H12z" />
    </>
  ),

  derrick: () => (
    <>
      <Shade />
      <path class="t2" d="M24 4 8 42h5L24 14l11 28h5z" />
      <path class="t3" d="M24 4v10l11 28h5z" />
      <path class="t4" d="M17 24h14v3H17zM13 32h22v3H13z" opacity="0.6" />
      <path class="t1" d="M20 0h8v6h-8z" />
      <path class="t3" d="M4 38h40v6H4z" />
    </>
  ),

  // -------------------------------------------------------------- cards ---
  wallet: () => (
    <>
      <Shade />
      <path class="t1" d="M12 10h20v12H12z" />
      <path class="lite" d="M16 13h12v6H16z" />
      <path class="t2" d="M4 18h40v24H4z" />
      <path class="t3" d="M24 18h20v24H24z" />
      <path class="t4" d="M28 26h16v9H28z" />
      <circle class="t1" cx="34" cy="30.5" r="2.6" />
    </>
  ),

  coins: () => (
    <>
      <Shade rx={15} />
      <ellipse class="t3" cx="24" cy="36" rx="17" ry="6" />
      <ellipse class="t2" cx="24" cy="33" rx="17" ry="6" />
      <ellipse class="t3" cx="20" cy="26" rx="14" ry="5" />
      <ellipse class="t1" cx="20" cy="23" rx="14" ry="5" />
      <ellipse class="t3" cx="29" cy="16" rx="11" ry="4" />
      <ellipse class="t1" cx="29" cy="13" rx="11" ry="4" />
      <path class="t4" d="M28 9h2v8h-2z" />
    </>
  ),

  coin: () => (
    <>
      <Shade rx={13} />
      <circle class="t3" cx="24" cy="26" r="17" />
      <circle class="t2" cx="24" cy="23" r="17" />
      <circle class="t1" cx="24" cy="23" r="12.5" />
      <path class="t4" d="M23 13h2.4v20H23z" />
      <path class="t4" d="M19 18h10v3H19zM19 25h10v3H19z" />
    </>
  ),

  flame: () => (
    <>
      <Shade rx={11} />
      <path class="t3" d="M24 2s12 9 12 20a12 12 0 0 1-24 0C12 14 17 10 17 10s1 5 4.6 5c4.2 0 2.4-8 2.4-13Z" />
      <path class="t2" d="M24 14s7 6 7 12a7 7 0 0 1-14 0c0-4 3-7 3-7s.6 3 2 3c1.8 0 2-4 2-8Z" />
      <path class="t1" d="M24 24s3 3 3 6a3 3 0 0 1-6 0c0-2 3-6 3-6Z" />
    </>
  ),

  call: () => (
    <>
      <Shade rx={13} />
      <path
        class="t2"
        d="M11 6h7l4 10-5 4a26 26 0 0 0 12 12l4-5 10 4v7a4 4 0 0 1-4.4 4C20 40 8 28 7 10.4A4 4 0 0 1 11 6Z"
      />
      <path class="t1" d="M11 6h7l4 10-5 4-9-9.6A4 4 0 0 1 11 6Z" />
      <path class="t4" d="M34 6a10 10 0 0 1 9 9h-3.4A6.6 6.6 0 0 0 34 9.4z" />
      <path class="t4" d="M34 0a16 16 0 0 1 14 15h-3.4A12.6 12.6 0 0 0 34 3.4z" opacity="0.5" />
    </>
  ),

  ore: () => (
    <>
      <Shade rx={13} />
      <path class="t1" d="M16 6h16l8 12H8z" />
      <path class="t2" d="M8 18h16l-2 24z" />
      <path class="t3" d="M24 18h16L22 42z" />
      <path class="lite" d="M19 8h4.6l-2.4 8h-4.6z" />
    </>
  ),

  dice: () => (
    <>
      <Shade />
      <rect class="t3" x="22" y="18" width="22" height="22" rx="5" />
      <rect class="t2" x="22" y="18" width="22" height="11" rx="5" />
      <rect class="t2" x="6" y="8" width="22" height="22" rx="5" />
      <rect class="t1" x="6" y="8" width="22" height="11" rx="5" />
      <circle class="t4" cx="12" cy="14" r="2.2" />
      <circle class="t4" cx="22" cy="24" r="2.2" />
      <circle class="t4" cx="17" cy="19" r="2.2" />
      <circle class="t4" cx="28" cy="24" r="2" />
      <circle class="t4" cx="38" cy="34" r="2" />
      <circle class="t4" cx="28" cy="34" r="2" />
      <circle class="t4" cx="38" cy="24" r="2" />
    </>
  ),

  // ------------------------------------------------------------ milestones --
  smartphone: () => (
    <>
      <Shade rx={10} />
      <rect class="t3" x="12" y="2" width="24" height="44" rx="5" />
      <rect class="t1" x="15" y="7" width="18" height="32" rx="2" />
      <path class="t2" d="M15 27h18v12H15z" />
      <path class="t4" d="m15 27 5-6 4 4 5-6 4 8z" />
      <circle class="t4" cx="24" cy="42.5" r="2" />
      <circle class="lite" cx="19" cy="13" r="2.6" />
    </>
  ),

  dog: () => (
    <>
      <Shade rx={13} />
      <path class="t3" d="M9 10c-3 4-3 12-1 17l7-4zM39 10c3 4 3 12 1 17l-7-4z" />
      <path class="t2" d="M24 6c9 0 15 6 15 14v6c0 8-6.6 15-15 15S9 34 9 26v-6C9 12 15 6 24 6Z" />
      <path class="t1" d="M24 6c-9 0-15 6-15 14v6c0 4 1.6 7.6 4.4 10.4C11 33 24 6 24 6Z" opacity="0.35" />
      <path class="t1" d="M15 26c0-5 4-8 9-8s9 3 9 8-4 9-9 9-9-4-9-9Z" />
      <circle class="t4" cx="24" cy="25" r="3.4" />
      <path class="t4" d="M23 28h2v5h-2z" />
      <circle class="t4" cx="16" cy="17" r="2.6" />
      <circle class="t4" cx="32" cy="17" r="2.6" />
    </>
  ),

  car: () => (
    <>
      <Shade />
      <path class="t3" d="M10 28h28v7H10z" />
      <path class="t2" d="M11 20h15v9H11z" />
      <path class="t1" d="M24 17h11v11H24z" />
      <path class="t3" d="m33 17 6-8h3.4v3.4L38 19z" />
      <circle class="lite" cx="41" cy="21" r="3.2" />
      <Wheel cx={12} cy={34} r={7} />
      <Wheel cx={37} cy={34} r={7} />
    </>
  ),

  door: () => (
    <>
      <Shade />
      <path class="t3" d="M8 2h32v40H8z" />
      <path class="t2" d="M12 6h24v36H12z" />
      <path class="t1" d="M16 10h16v12H16z" />
      <path class="t4" d="M16 26h16v12H16z" />
      <circle class="lite" cx="31" cy="24" r="2.6" />
    </>
  ),

  receipt: () => (
    <>
      <Shade rx={11} />
      <path class="t2" d="M9 2h30v42l-5-3.4-5 3.4-5-3.4-5 3.4-5-3.4L9 44z" />
      <path class="t3" d="M24 2h15v42l-5-3.4-5 3.4-5-3.4z" />
      <path class="t4" d="M14 10h20v3H14zM14 17h20v3H14zM14 24h12v3H14z" />
      <circle class="t1" cx="30" cy="30" r="6" />
      <path class="t4" d="m26.6 30 2-2 1.6 1.6 3.6-3.6 2 2-5.6 5.6z" />
    </>
  ),

  cheers: () => (
    <>
      <Shade />
      <path class="t2" d="M4 8h16l-2 18a6 6 0 0 1-12 0z" />
      <path class="t1" d="M4 8h16l-.6 5H4.6z" />
      <path class="t3" d="M11 32h2v9h-2zM6 41h12v3H6z" />
      <path class="t2" d="M28 8h16l-2 18a6 6 0 0 1-12 0z" />
      <path class="t1" d="M28 8h16l-.6 5h-14.8z" />
      <path class="t3" d="M35 32h2v9h-2zM30 41h12v3H30z" />
      <circle class="lite" cx="24" cy="6" r="2.4" />
      <circle class="lite" cx="19" cy="2" r="1.6" />
      <circle class="lite" cx="29" cy="2" r="1.6" />
    </>
  ),

  child: () => (
    <>
      <Shade />
      <circle class="t2" cx="16" cy="10" r="6.4" />
      <path class="t2" d="M10 18h12l3 14h-4v11h-10V32h-4z" />
      <circle class="t1" cx="34" cy="20" r="5" />
      <path class="t1" d="M29 26h10l2 9h-3v9h-8v-9h-3z" />
      <path class="t3" d="M24 30h6v3h-6z" />
    </>
  ),

  house: () => (
    <>
      <Shade />
      <path class="t3" d="M24 4 2 20h44z" />
      <path class="t2" d="M8 20h32v22H8z" />
      <path class="t3" d="M24 20h16v22H24z" />
      <path class="t1" d="M20 28h8v14h-8z" />
      <rect class="lite" x="11" y="24" width="6" height="6" rx="1" />
      <rect class="lite" x="31" y="24" width="6" height="6" rx="1" />
      <path class="t4" d="M32 6h4v6h-4z" />
    </>
  ),

  ring: () => (
    <>
      <Shade rx={11} />
      <path
        class="t2"
        fill-rule="evenodd"
        d="M24 17a13 13 0 1 1 0 26 13 13 0 0 1 0-26Zm0 5.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2Z"
      />
      <path
        class="t3"
        fill-rule="evenodd"
        d="M24 17a13 13 0 0 1 0 26 13 13 0 0 0 0-26Zm0 5.4a7.6 7.6 0 0 1 0 15.2 7.6 7.6 0 0 0 0-15.2Z"
      />
      <path class="t1" d="m24 3 9.4 7.6L24 22.6l-9.4-12z" />
      <path class="t2" d="M24 3v19.6l9.4-12z" />
      <path class="lite" d="M18.6 8.6h4l-2.2 5.4h-4z" />
    </>
  ),

  flower: () => (
    <>
      <Shade rx={11} />
      <path class="t3" d="M23 20h3v23h-3z" />
      <path class="t2" d="M24 30c-6 0-9.6-3-11-8 6-1 10 1.4 11 8ZM24 36c6 0 9.6-3 11-8-6-1-10 1.4-11 8Z" />
      <path class="t1" d="M24 24c-7 0-11.6-5.2-11.6-13 4.4 2.4 7.6 2.4 11.6-2.4 4 4.8 7.2 4.8 11.6 2.4 0 7.8-4.6 13-11.6 13Z" />
      <path class="t2" d="M24 8.6V24c7 0 11.6-5.2 11.6-13-4.4 2.4-7.6 2.4-11.6-2.4Z" />
    </>
  ),

  // ------------------------------------------------------- other content ---
  robot: () => (
    <>
      <Shade rx={13} />
      <path class="t3" d="M22 2h4v6h-4z" />
      <circle class="t1" cx="24" cy="3" r="3" />
      <rect class="t2" x="8" y="8" width="32" height="26" rx="7" />
      <rect class="t3" x="24" y="8" width="16" height="26" rx="7" />
      <rect class="t4" x="13" y="14" width="22" height="12" rx="4" />
      <circle class="lite" cx="19" cy="20" r="3" />
      <circle class="lite" cx="29" cy="20" r="3" />
      <path class="t2" d="M2 16h6v10H2zM40 16h6v10h-6z" />
      <path class="t3" d="M14 34h20v8H14z" />
    </>
  ),

  moon: () => (
    <>
      <path class="t1" d="M40 30A17 17 0 0 1 18 8 17.6 17.6 0 1 0 40 30Z" />
      <path class="t2" d="M40 30A17 17 0 0 1 24 25.6 17.6 17.6 0 0 0 40 30Z" />
      <circle class="lite" cx="38" cy="9" r="2.2" />
      <circle class="lite" cx="44" cy="17" r="1.6" />
      <circle class="lite" cx="33" cy="3" r="1.4" />
    </>
  ),
};

/**
 * Chất liệu của từng asset.
 *
 * Bốn tông trong mỗi hình không phải một dải sáng-tối liền mạch mà là **hai
 * cặp**: `t2`/`t3` là mặt sáng và mặt khuất của vật liệu chính, `t1`/`t4` là
 * mặt sáng và mặt khuất của vật liệu phụ. Cái lon là nhôm với nhãn đỏ, bình xịt
 * là nhựa xanh với tem trắng — hai cặp đó có sẵn trong từng hình rồi, chỉ là
 * trước đây cả bốn tông đều rút từ một màu nên nhìn ra một cục vàng.
 *
 * Nên bảng này chỉ cần nói mỗi hình làm bằng gì. `p-` là chính, `s-` là phụ;
 * bảng màu của từng chất liệu nằm trong `base.css`, và tên nào không có ở đây
 * thì vẫn chạy theo màu chủ đề như cũ.
 */
const PALETTE: Record<string, string> = {
  // --------------------------------------------------------- Xóm Nước Đen --
  can: 'p-steel s-red',
  cart: 'p-wood s-red',
  spray: 'p-blue s-cream',
  mic: 'p-graphite s-gold',
  gear: 'p-steel s-rust',
  gem: 'p-violet s-ice',

  // -------------------------------------------------------------- Bến Cảng --
  forklift: 'p-amber s-graphite',
  crate: 'p-wood s-cream',
  fish: 'p-ice s-blue',
  anchor: 'p-steel s-rust',
  stamp: 'p-wood s-red',
  containers: 'p-rust s-teal',

  // -------------------------------------------------------------- Phố Thị --
  truck: 'p-red s-cream',
  washer: 'p-cream s-blue',
  dumbbell: 'p-graphite s-red',
  coffee: 'p-coffee s-cream',
  film: 'p-graphite s-amber',
  bed: 'p-wood s-cream',

  // ------------------------------------------------------- Phố Tài Chính --
  chart: 'p-cream s-green',
  bank: 'p-stone s-gold',
  shield: 'p-navy s-gold',
  briefcase: 'p-leather s-gold',
  star: 'p-gold s-amber',
  scales: 'p-gold s-stone',

  // ------------------------------------------------------- Khu Nhà Giàu ---
  frame: 'p-gold s-teal',
  gavel: 'p-wood s-gold',
  yacht: 'p-cream s-navy',
  plane: 'p-cream s-blue',
  wine: 'p-wine s-gold',
  island: 'p-sand s-leaf',

  // --------------------------------------------------------------- Tầng Mây --
  tower: 'p-ice s-cyan',
  media: 'p-graphite s-magenta',
  rocket: 'p-cream s-red',
  atom: 'p-cyan s-ice',
  vault: 'p-steel s-gold',
  crown: 'p-gold s-ruby',

  // ------------------------------------------------------------- ca làm ----
  flyer: 'p-cream s-red',
  plate: 'p-cream s-leaf',
  boxes: 'p-cardboard s-wood',
  camera: 'p-graphite s-steel',
  derrick: 'p-steel s-rust',

  // ---------------------------------------------------------- kèo và tiền --
  wallet: 'p-leather s-gold',
  coins: 'p-gold s-amber',
  coin: 'p-gold s-amber',
  flame: 'p-flame s-amber',
  call: 'p-graphite s-green',
  ore: 'p-violet s-ice',
  dice: 'p-cream s-red',

  // ------------------------------------------------------- mốc cuộc đời ---
  smartphone: 'p-graphite s-cyan',
  dog: 'p-coffee s-cream',
  car: 'p-red s-steel',
  door: 'p-wood s-gold',
  receipt: 'p-cream s-stone',
  cheers: 'p-amber s-cream',
  child: 'p-skin s-teal',
  house: 'p-cream s-red',
  ring: 'p-gold s-ice',
  flower: 'p-leaf s-pink',
  robot: 'p-steel s-cyan',
  moon: 'p-ice s-cream',
};

/** Every name the set answers to, for the review sheet. */
export const ART_NAMES: readonly string[] = Object.keys(ART);

export function Art({ name, class: className }: { name: string; class?: string }) {
  // A save written before a rename should keep its layout rather than leaving a
  // hole where a picture was.
  const draw = ART[name] ?? ART['coin']!;
  const palette = PALETTE[name] ?? '';

  return (
    <svg
      class={`art ${palette}${className ? ` ${className}` : ''}`}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      {draw()}
    </svg>
  );
}
