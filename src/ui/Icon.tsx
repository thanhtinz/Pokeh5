/**
 * Every icon in the game, drawn rather than typed.
 *
 * Emoji were standing in for art, and they undo the whole premise: the palette
 * runs from debt-red to gold and emoji are the one thing on screen that refuses
 * to move with it. These are line drawings on a shared 24×24 grid with no
 * colour of their own — stroke and fill both resolve to `currentColor`, so an
 * icon is whatever colour the thing containing it is, at every point on the
 * climb.
 *
 * Icons are rendered inline rather than through an SVG sprite. A `<use>`
 * reference builds a shadow tree that ordinary CSS selectors cannot reach, so
 * the accents inside these drawings would be unstylable; inline costs some DOM
 * and buys back the whole cascade.
 *
 * Stroke width, caps and joins live in `app.css` on `.icon` and are inherited,
 * so the drawings below carry geometry and nothing else. Anything that needs to
 * be filled says so on the element itself.
 */
import type { JSX } from 'preact';

const solid = { fill: 'currentColor', stroke: 'none' } as const;

const ICONS: Record<string, () => JSX.Element> = {
  // --- Skid Row ------------------------------------------------------------
  can: () => (
    <>
      <ellipse cx="12" cy="6" rx="5" ry="2.2" />
      <path d="M7 6v11.8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V6" />
      <path d="M8.6 10.5h6.8" />
    </>
  ),
  cart: () => (
    <>
      <path d="M2.5 4h2.2l2.6 10.4a1.6 1.6 0 0 0 1.55 1.2h7.5a1.6 1.6 0 0 0 1.55-1.2L19.5 7.5H5.6" />
      <circle cx="9.8" cy="19.4" r="1.5" />
      <circle cx="16.8" cy="19.4" r="1.5" />
    </>
  ),
  spray: () => (
    <>
      <rect x="7.4" y="9" width="9.2" height="12" rx="2.2" />
      <path d="M9.8 9V6.2h4.4V9" />
      <path d="M14.2 6.4h3.4l1.8-2.4" />
      <path d="M20.8 6h.01M19.2 8.8h.01M21.6 9.4h.01" />
      <path d="M9.6 12.6h4.8" />
    </>
  ),
  mic: () => (
    <>
      <rect x="8.8" y="2.4" width="6.4" height="11.4" rx="3.2" />
      <path d="M5.4 11.2a6.6 6.6 0 0 0 13.2 0" />
      <path d="M12 17.8v3.2M9 21h6" />
    </>
  ),
  gear: () => (
    <>
      <circle cx="12" cy="12" r="6.6" />
      <circle cx="12" cy="12" r="2.6" />
      <path
        stroke-width="2.6"
        d="M12 2.4v3M12 18.6v3M2.4 12h3M18.6 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"
      />
    </>
  ),
  gem: () => (
    <>
      <path d="M6.2 3.8h11.6l3.2 5.2L12 20.5 1 9z" />
      <path d="M1 9h22M9 3.8 6.2 9l5.8 11.5M15 3.8 17.8 9 12 20.5" />
    </>
  ),

  // --- The Docks -----------------------------------------------------------
  forklift: () => (
    <>
      <path d="M2.8 15.8V8.2h6.4v7.6" />
      <circle cx="6" cy="18.6" r="2.2" />
      <circle cx="15.6" cy="18.6" r="2.2" />
      <path d="M12.6 15.8V3.6h2.2v12.2" />
      <path d="M14.8 12.6h5.8" />
      <path d="M9.2 15.8h3.4" />
    </>
  ),
  crate: () => (
    <>
      <rect x="3" y="5.4" width="18" height="13.2" rx="1.6" />
      <path d="M3 9.6h18M3 14.4h18M9 5.4v13.2M15 5.4v13.2" />
    </>
  ),
  fish: () => (
    <>
      <path d="M16.6 12c0 3.1-3.3 5.6-7.3 5.6S2 15.1 2 12s3.3-5.6 7.3-5.6 7.3 2.5 7.3 5.6Z" />
      <path d="m16.6 12 5.4-3.8v7.6z" />
      <circle cx="6.6" cy="10.6" r=".7" {...solid} />
    </>
  ),
  anchor: () => (
    <>
      <circle cx="12" cy="4.4" r="2.1" />
      <path d="M12 6.5v14.8" />
      <path d="M8.6 9.2h6.8" />
      <path d="M4.4 13.4a7.6 7.6 0 0 0 15.2 0" />
      <path d="M4.4 13.4H7M19.6 13.4H17" />
    </>
  ),
  stamp: () => (
    <>
      <path d="M8.4 10.2V7a3.6 3.6 0 0 1 7.2 0v3.2" />
      <rect x="3.6" y="10.2" width="16.8" height="5" rx="1.6" />
      <path d="M4.6 18.8h14.8" />
    </>
  ),
  containers: () => (
    <>
      <rect x="2.6" y="13" width="8.6" height="6.4" rx="1" />
      <rect x="12.8" y="13" width="8.6" height="6.4" rx="1" />
      <rect x="7.7" y="5.6" width="8.6" height="6.4" rx="1" />
      <path d="M6 13v6.4M16.2 13v6.4M11.1 5.6V12" />
    </>
  ),

  // --- Midtown -------------------------------------------------------------
  truck: () => (
    <>
      <path d="M2.4 6.2h10.4v10.2H2.4z" />
      <path d="M12.8 9.6h3.9l3.3 3.3v3.5h-7.2z" />
      <circle cx="6.8" cy="18" r="1.8" />
      <circle cx="16.6" cy="18" r="1.8" />
      <path d="M4.6 9.4h6" />
    </>
  ),
  washer: () => (
    <>
      <rect x="4" y="2.8" width="16" height="18.4" rx="2.6" />
      <circle cx="12" cy="14.2" r="4.4" />
      <path d="M7.2 6.4h.01M10.2 6.4h.01" />
    </>
  ),
  dumbbell: () => (
    <>
      <path d="M2.6 9.6v4.8M6 7.6v8.8M18 7.6v8.8M21.4 9.6v4.8M6 12h12" />
    </>
  ),
  coffee: () => (
    <>
      <path d="M3.6 7.4h13.2v5.8a5.2 5.2 0 0 1-5.2 5.2H8.8a5.2 5.2 0 0 1-5.2-5.2z" />
      <path d="M16.8 9.2h1.6a2.7 2.7 0 0 1 0 5.4h-1.6" />
      <path d="M7.4 3v2.2M11.2 3v2.2" />
    </>
  ),
  film: () => (
    <>
      <rect x="2.8" y="4.6" width="18.4" height="14.8" rx="2" />
      <path d="M7.4 4.6v14.8M16.6 4.6v14.8M2.8 9.4h4.6M2.8 14.6h4.6M16.6 9.4h4.6M16.6 14.6h4.6" />
    </>
  ),
  bed: () => (
    <>
      <path d="M2.8 19.4v-9.6" />
      <path d="M2.8 14.2h18.4v5.2" />
      <path d="M21.2 14.2v-1.8a2.4 2.4 0 0 0-2.4-2.4h-7.4v4.2" />
      <circle cx="7" cy="11.6" r="2.1" />
    </>
  ),

  // --- Financial District --------------------------------------------------
  chart: () => (
    <>
      <path d="M2.8 17.6 9 11.2l3.8 3.8 8.4-8.4" />
      <path d="M15 6.6h6.2v6.2" />
    </>
  ),
  bank: () => (
    <>
      <path d="m2.8 9 9.2-5.4L21.2 9" />
      <path d="M5.2 9.4v8.2M9.6 9.4v8.2M14.4 9.4v8.2M18.8 9.4v8.2" />
      <path d="M3.2 20.4h17.6" />
    </>
  ),
  shield: () => (
    <>
      <path d="M12 2.8 4.6 5.8v6c0 4.5 3.1 7.8 7.4 9.2 4.3-1.4 7.4-4.7 7.4-9.2v-6z" />
      <path d="m8.8 11.8 2.4 2.4 4-4.4" />
    </>
  ),
  briefcase: () => (
    <>
      <rect x="2.8" y="7.4" width="18.4" height="12.4" rx="2.2" />
      <path d="M8.8 7.4V5.8a2 2 0 0 1 2-2h2.4a2 2 0 0 1 2 2v1.6" />
      <path d="M2.8 12.6h18.4" />
    </>
  ),
  star: () => (
    <>
      <path d="m12 3.2 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.8l6.2-.9z" />
    </>
  ),
  scales: () => (
    <>
      <path d="M12 4.2v15.2M7.4 19.8h9.2" />
      <path d="m3.8 8.4 8.2-2.2 8.2 2.2" />
      <path d="M3.8 8.4 1.6 13.6a2.7 2.7 0 0 0 4.4 0zM20.2 8.4 18 13.6a2.7 2.7 0 0 0 4.4 0z" />
    </>
  ),

  // --- Uptown --------------------------------------------------------------
  frame: () => (
    <>
      <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="1.8" />
      <path d="m6.4 16.4 3.8-4.8 2.6 3.1 2.5-2.8 2.3 4.5z" />
      <circle cx="8.8" cy="8.8" r="1.2" />
    </>
  ),
  gavel: () => (
    <>
      <path d="m14.6 3.2 6.2 6.2-2.6 2.6-6.2-6.2z" />
      <path d="m12.9 7.9 3.2 3.2-7.4 7.4-3.2-3.2z" />
      <path d="M2.8 21h9.6" />
    </>
  ),
  yacht: () => (
    <>
      <path d="M2.6 16.6h18.8l-2.4 4.4H5z" />
      <path d="M11.2 14.8V3l-6.6 11.8zM12.8 14.8V7.2l5.4 7.6z" />
    </>
  ),
  plane: () => (
    <>
      <path d="M12 2.8c1.2 0 2 1.8 2 4v2.9l7.2 4.3v2.1L14 14.2v3.5l2.6 2v1.5L12 20l-4.6 1.2v-1.5l2.6-2v-3.5l-7.2 1.9v-2.1L10 9.7V6.8c0-2.2.8-4 2-4Z" />
    </>
  ),
  wine: () => (
    <>
      <path d="M7.2 3.6h9.6l-.8 5.5a4.1 4.1 0 0 1-4 3.5 4.1 4.1 0 0 1-4-3.5z" />
      <path d="M12 12.6v7.2M8.4 20.2h7.2" />
    </>
  ),
  island: () => (
    <>
      <path d="M2.4 19.4c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
      <path d="M12 16.4V9" />
      <path d="M12 9c-2.4-2.6-4.8-2.8-6.6-1.4M12 9c2.4-2.6 4.8-2.8 6.6-1.4M12 9c-1-3.2 0-5.2 1.6-6.2M12 9c1.4-2.6 3.4-3.4 5.4-3" />
    </>
  ),

  // --- The Heights ---------------------------------------------------------
  skyline: () => (
    <>
      <path d="M2.6 20V10.8h5.2V20M7.8 20V4.4h7.2V20M15 20v-6.4h6.4V20" />
      <path d="M10.4 8h2M10.4 11.6h2M10.4 15.2h2M4.6 14h1.4" />
    </>
  ),
  tv: () => (
    <>
      <rect x="2.8" y="7" width="18.4" height="12.2" rx="2.2" />
      <path d="m7.8 3.2 4.2 3.6 4.2-3.6" />
    </>
  ),
  // A body between two angled panels read as a bowtie. A rocket is unambiguous.
  rocket: () => (
    <>
      <path d="M12 2.4c3.1 2.5 4.8 6.2 4.8 9.9l-1.9 4.5H9.1l-1.9-4.5c0-3.7 1.7-7.4 4.8-9.9Z" />
      <circle cx="12" cy="9.6" r="2" />
      <path d="m9.1 16.8-2.7 2.4 1-4.6M14.9 16.8l2.7 2.4-1-4.6" />
      <path d="m10.5 19.6 1.5 2.4 1.5-2.4" />
    </>
  ),
  atom: () => (
    <>
      <circle cx="12" cy="12" r="2.1" />
      <ellipse cx="12" cy="12" rx="9.4" ry="4" />
      <ellipse cx="12" cy="12" rx="9.4" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.4" ry="4" transform="rotate(120 12 12)" />
    </>
  ),
  vault: () => (
    <>
      <rect x="2.8" y="4.2" width="18.4" height="15.6" rx="2.2" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 7.8V6M12 16.2V18M7.8 12H6M16.2 12H18" />
    </>
  ),
  crown: () => (
    <>
      <path d="M2.6 6.4 7.4 12 12 3.8 16.6 12l4.8-5.6v11.4H2.6z" />
      <path d="M2.6 20.6h18.8" />
      <path d="M2.6 6.4h.01M12 3.8h.01M21.4 6.4h.01" />
    </>
  ),

  // --- Jobs ----------------------------------------------------------------
  flyer: () => (
    <>
      <path d="M6 2.8h8L18.6 7.4V20a1.2 1.2 0 0 1-1.2 1.2H6A1.2 1.2 0 0 1 4.8 20V4A1.2 1.2 0 0 1 6 2.8Z" />
      <path d="M13.6 2.8v5h5" />
      <path d="M8 12.6h7M8 16.2h4.4" />
    </>
  ),
  plate: () => (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <circle cx="12" cy="12" r="4.6" />
    </>
  ),
  boxes: () => (
    <>
      <rect x="2.6" y="12.4" width="8.6" height="7.2" rx="1" />
      <rect x="12.8" y="12.4" width="8.6" height="7.2" rx="1" />
      <rect x="7.7" y="4.6" width="8.6" height="7.2" rx="1" />
      <path d="M6.9 12.4v7.2M17.1 12.4v7.2M12 4.6v7.2" />
    </>
  ),
  eye: () => (
    <>
      <path d="M1.8 12S5.6 5.6 12 5.6 22.2 12 22.2 12 18.4 18.4 12 18.4 1.8 12 1.8 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  derrick: () => (
    <>
      <path d="M12 3.2v13.4" />
      <path d="m6.6 19.8 5.4-16.6 5.4 16.6" />
      <path d="M9 12.4h6M7.8 16.6h8.4" />
      <path d="M3.4 20.4h17.2" />
    </>
  ),

  // --- Opportunity cards ---------------------------------------------------
  wallet: () => (
    <>
      <rect x="2.8" y="5.6" width="18.4" height="13.2" rx="2.4" />
      <path d="M2.8 10h18.4" />
      <circle cx="16.6" cy="14.4" r="1.3" {...solid} />
    </>
  ),
  coins: () => (
    <>
      <circle cx="9.2" cy="9.2" r="6.4" />
      <path d="M14.8 6.6a6.4 6.4 0 1 1-8.2 8.2" />
    </>
  ),
  coin: () => (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7v10" />
      <path d="M14.6 9.4a2.9 2.9 0 0 0-4.4.4c-.6 1.2.3 2 2.4 2.5s3 1.3 2.4 2.5a2.9 2.9 0 0 1-4.4.4" />
    </>
  ),
  flame: () => (
    <>
      <path d="M12 2.8s5.2 4.1 5.2 8.8a5.2 5.2 0 0 1-10.4 0c0-3.4 2-4.9 2-4.9s.5 2 2 2c1.9 0 1.2-3.6 1.2-5.9Z" />
    </>
  ),
  call: () => (
    <>
      <path d="M6 3.4h3l1.6 4.1-2.1 1.6a11.4 11.4 0 0 0 5.4 5.4l1.6-2.1 4.1 1.6v3a1.6 1.6 0 0 1-1.8 1.6C10.3 17.8 6.2 13.7 4.4 5.2A1.6 1.6 0 0 1 6 3.4Z" />
    </>
  ),
  ore: () => (
    <>
      <path d="M8.4 3.2h7.2l4.8 6.2L12 20.8 3.6 9.4z" />
      <path d="M3.6 9.4h16.8M8.4 3.2l-1.2 6.2L12 20.8l4.8-11.4-1.2-6.2" />
    </>
  ),
  dice: () => (
    <>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3.6" />
      <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" />
    </>
  ),

  // --- Life milestones -----------------------------------------------------
  smartphone: () => (
    <>
      <rect x="6.4" y="2.4" width="11.2" height="19.2" rx="2.6" />
      <path d="M10.4 5.4h3.2M11 18.4h2" />
    </>
  ),
  paw: () => (
    <>
      <ellipse cx="5.6" cy="9.8" rx="2.1" ry="2.6" />
      <ellipse cx="9.8" cy="6.4" rx="2.1" ry="2.9" />
      <ellipse cx="14.2" cy="6.4" rx="2.1" ry="2.9" />
      <ellipse cx="18.4" cy="9.8" rx="2.1" ry="2.6" />
      <path d="M12 12.4c3.5 0 6.2 2.4 6.2 5.3 0 2-1.6 3.5-3.6 3.5-1.3 0-1.9-.6-2.6-.6s-1.3.6-2.6.6c-2 0-3.6-1.5-3.6-3.5 0-2.9 2.7-5.3 6.2-5.3Z" />
    </>
  ),
  car: () => (
    <>
      <path d="M2.6 15.4v-3.2l2.2-.4 2.6-3.9h9.2l2.6 3.9 2.2.4v3.2z" />
      <path d="M2.6 12.2h18.8" />
      <circle cx="7" cy="15.4" r="2.1" />
      <circle cx="17" cy="15.4" r="2.1" />
    </>
  ),
  door: () => (
    <>
      <path d="M3.6 21.2h16.8" />
      <rect x="6" y="2.6" width="12" height="18.6" rx="1.2" />
      <circle cx="14.8" cy="12.4" r="1.1" {...solid} />
    </>
  ),
  receipt: () => (
    <>
      <path d="M5.6 21.4V3.6a1 1 0 0 1 1-1h10.8a1 1 0 0 1 1 1v17.8l-2.4-1.6-2.4 1.6L11 19.8l-2.4 1.6z" />
      <path d="M9 7.4h6M9 11.4h6M9 15.4h3.4" />
    </>
  ),
  cheers: () => (
    <>
      <path d="M2.6 4h7.6l-.8 7.8a2.6 2.6 0 0 1-5.2 0z" />
      <path d="M6.4 14.4v5.2M4 19.6h4.8" />
      <path d="M13.8 4h7.6l-.8 7.8a2.6 2.6 0 0 1-5.2 0z" />
      <path d="M17.6 14.4v5.2M15.2 19.6H20" />
    </>
  ),
  child: () => (
    <>
      <circle cx="12" cy="6.6" r="3.4" />
      <path d="M12 10v5.6M8.2 12.6h7.6M9.6 21l2.4-5.4 2.4 5.4" />
    </>
  ),
  house: () => (
    <>
      <path d="m2.8 11.2 9.2-7.6 9.2 7.6" />
      <path d="M5.4 9.4v10.8h13.2V9.4" />
      <path d="M9.8 20.2v-5.4h4.4v5.4" />
    </>
  ),
  ring: () => (
    <>
      <circle cx="12" cy="16" r="4.8" />
      <path d="m12 3.2 4.8 3.2-4.8 4-4.8-4z" />
      <path d="M7.2 6.4h9.6" />
    </>
  ),
  flower: () => (
    <>
      <path d="M12 12.6c-3 0-5-2.3-5-5.6 1.9 1.1 3.3 1.1 5-1 1.7 2.1 3.1 2.1 5 1 0 3.3-2 5.6-5 5.6Z" />
      <path d="M12 12.6v8.6" />
      <path d="M12 16.6c-2.4 0-3.9-1.2-4.4-3 2.5-.5 4 .6 4.4 3ZM12 18.6c2.4 0 3.9-1.2 4.4-3-2.5-.5-4 .6-4.4 3Z" />
    </>
  ),

  // --- Interface -----------------------------------------------------------
  heart: () => (
    <>
      <path d="M12 20.4s-7.8-4.9-7.8-10.2A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.8 3C19.8 15.5 12 20.4 12 20.4Z" />
    </>
  ),
  robot: () => (
    <>
      <rect x="3.8" y="7.8" width="16.4" height="11.4" rx="3.2" />
      <path d="M12 7.8V4.4" />
      <circle cx="12" cy="3.2" r="1.2" {...solid} />
      <circle cx="9" cy="13" r="1.3" {...solid} />
      <circle cx="15" cy="13" r="1.3" {...solid} />
      <path d="M9.6 16.4h4.8" />
      <path d="M2 11.6v3.2M22 11.6v3.2" />
    </>
  ),
  moon: () => (
    <>
      <path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8Z" />
    </>
  ),
  lock: () => (
    <>
      <rect x="4.4" y="10" width="15.2" height="10.6" rx="2.6" />
      <path d="M8 10V7.4a4 4 0 0 1 8 0V10" />
      <path d="M12 14v2.6" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, class: className }: { name: string; class?: string }) {
  // A save written before an icon was renamed still carries the old name, and
  // an empty tile reads as a bug rather than a missing drawing. Falling back
  // keeps the layout intact whatever the save holds.
  const draw = ICONS[name] ?? ICONS['coin']!;

  return (
    <svg class={`icon${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      {draw()}
    </svg>
  );
}

/**
 * The refinery's ore, drawn large for the tap target.
 *
 * The one place in the game that earns a real illustration rather than an icon:
 * it is the first thing a player touches and the only thing on the opening
 * screen. Facets are flat fills at different opacities of the accent, so the
 * crystal recolours with the palette like everything else, and the glint
 * sweeps on a slow loop so an untouched screen is never completely still.
 */
export function OreArt() {
  return (
    <svg class="ore" viewBox="0 0 64 64" aria-hidden="true">
      {/* Crown: three facets across the top, the middle one catching the light. */}
      <path class="ore__facet ore__facet--dim" d="M12 20 20 8h6v12z" />
      <path class="ore__facet ore__facet--lit" d="M20 8h24l-6 12H26z" />
      <path class="ore__facet ore__facet--mid" d="M44 8l8 12h-14z" />

      {/* Pavilion: three facets falling to a point. */}
      <path class="ore__facet ore__facet--dark" d="M12 20h14L32 56z" />
      <path class="ore__facet ore__facet--mid" d="M26 20h12L32 56z" />
      <path class="ore__facet ore__facet--dim" d="M38 20h14L32 56z" />

      <path
        class="ore__edge"
        d="M20 8h24l8 12L32 56 12 20zM12 20h40M26 20 20 8M38 20 44 8M26 20 32 56M38 20 32 56"
      />
      <path class="ore__glint" d="M24.5 10.5h5.5l-3 7h-5.5z" />
    </svg>
  );
}
