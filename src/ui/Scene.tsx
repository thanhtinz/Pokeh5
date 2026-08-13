/**
 * The drawn scenes — the places that need a picture rather than an icon.
 *
 * Three of them:
 *
 *  - `CityScene` sits behind every screen and is the literal reading of the
 *    game's own pitch: a red, empty screen that slowly fills. It opens as a
 *    vacant lot with a chain-link fence and one broken lamp, and gains a
 *    skyline layer by layer as net worth climbs, until the windows come on.
 *  - `DistrictArt` gives each of the six districts a header strip, so buying
 *    into The Docks looks like somewhere rather than reading like a heading.
 *  - `Sunburst` is the milestone payoff, behind the thing you just won back.
 *
 * None of them carry a colour. Every fill is `currentColor` at an opacity set
 * in CSS, and the layers fade in against `--wealth`, the same custom property
 * the palette runs on — so the city is drawn by the theme engine rather than
 * animated by a timer.
 */
import type { JSX } from 'preact';

/**
 * The backdrop. Silhouettes only, and deliberately low contrast: this sits
 * under scrolling rows of numbers and has to stay a backdrop.
 */
export function CityScene() {
  return (
    <svg
      class="scene"
      viewBox="0 0 400 132"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* Tallest and furthest, so it arrives last. */}
      <g class="scene__layer scene__far">
        <path d="M28 132V44h26v88zM70 132V26h20v106zM104 132V58h30v74zM248 132V36h24v96zM286 132V52h22v80zM330 132V20h26v112z" />
        <path d="M80 26V14M343 20V8" />
      </g>

      <g class="scene__layer scene__mid">
        <path d="M0 132V78h34v54zM140 132V62h30v70zM178 132V88h26v44zM212 132V68h30v64zM310 132V90h18v42zM366 132V64h34v68z" />
      </g>

      {/* Low storefronts: the first thing the player can afford to put up. */}
      <g class="scene__layer scene__near">
        <path d="M0 132v-24h40v24zM46 132v-34h34v34zM88 132v-20h44v20zM140 132v-30h28v30zM176 132v-18h38v18zM222 132v-28h32v28zM262 132v-22h40v22zM310 132v-32h30v32zM348 132v-20h52v20z" />
        <path d="M46 98l17-10 17 10M310 100l15-9 15 9" />
      </g>

      <g class="scene__layer scene__lights">
        <path d="M34 56h6v8h-6zM44 56h6v8h-6zM34 72h6v8h-6zM44 72h6v8h-6zM76 38h8v9h-8zM76 56h8v9h-8zM76 74h8v9h-8zM114 70h7v8h-7zM124 70h7v8h-7zM114 86h7v8h-7zM254 48h7v9h-7zM264 48h7v9h-7zM254 66h7v9h-7zM264 66h7v9h-7zM336 32h7v9h-7zM346 32h7v9h-7zM336 50h7v9h-7zM346 50h7v9h-7zM336 68h7v9h-7zM148 74h7v8h-7zM220 80h7v8h-7zM374 76h7v8h-7zM386 76h7v8h-7z" />
      </g>

      {/*
        The vacant lot. This is the only layer that starts at full strength and
        the only one that leaves — everything else is something the player put
        there, and this is what was there before.
      */}
      <g class="scene__layer scene__lot">
        <path d="M0 130h400" />
        <path d="M96 130V98h116v32M96 106h116M96 116h116M120 98v32M144 98v32M168 98v32M192 98v32" />
        <path d="M300 130V78M300 78h16" />
        <path d="M312 74h10v9h-10z" />
        <path d="m34 130 8-11 8 11zM252 130l6-8 6 8zM356 130l7-9 7 9z" />
      </g>
    </svg>
  );
}

/** Six strips, one per district, drawn on a 300×46 stage sitting on the line. */
const DISTRICTS: Record<string, () => JSX.Element> = {
  'Skid Row': () => (
    <>
      {/* Lean-tos, a barrel fire and the shopping cart you started with. */}
      <path d="M4 46V32h28v14zM36 46V26h24v20zM64 46V34h30v12z" />
      <path d="m4 32 14-9 14 9M36 26l12-8 12 8" />
      <path d="M112 46V32h18v14z" />
      <path d="m118 28c0-4 4-5 3-9 3 2 6 5 6 9a4.5 4.5 0 0 1-9 0Z" />
      <path d="M156 42h22l4-12h-28M160 42v-12" />
      <circle cx="162" cy="45" r="2.4" />
      <circle cx="176" cy="45" r="2.4" />
      <path d="M206 46V34h20v12zM230 46V30h18v16zM252 46V36h22v10zM278 46V32h18v14z" />
      <path d="M0 46h300" />
    </>
  ),

  'The Docks': () => (
    <>
      {/* Gantry cranes over stacked containers, water along the bottom. */}
      <path d="M28 40V8M52 40V8M18 8h44M62 8h20M82 8v8" />
      <path d="M118 40V10M142 40V10M108 10h44M152 10h18M170 10v7" />
      <path d="M8 40h22v6H8zM34 40h26v6H34zM64 40h22v6H64zM8 32h26v6H8zM38 32h22v6H38z" />
      <path d="M186 46V28h26v18zM216 46V34h24v12z" />
      <path d="M250 30h34l6 10h-40z" />
      <path d="M262 30V20h4v10" />
      <path d="M0 46c14-4 24 4 38 0s24 4 38 0 24 4 38 0 24 4 38 0 24 4 38 0 24 4 38 0 24 4 38 0" />
    </>
  ),

  Midtown: () => (
    <>
      {/* Mid-rise blocks with awnings and a street of shopfronts. */}
      <path d="M6 46V16h34v30zM44 46V22h28v24zM76 46V12h30v34z" />
      <path d="M14 22h6v6h-6zM26 22h6v6h-6zM14 32h6v6h-6zM26 32h6v6h-6zM52 28h6v6h-6zM62 28h6v6h-6zM84 18h6v6h-6zM94 18h6v6h-6zM84 30h6v6h-6zM94 30h6v6h-6z" />
      <path d="M116 46V30h32v16zM152 46V24h30v22zM186 46V32h28v14z" />
      <path d="M116 30h32l-4-6h-24zM186 32h28l-4-6h-20z" />
      <path d="M222 46V18h32v28zM258 46V26h36v20z" />
      <path d="M230 24h7v7h-7zM242 24h7v7h-7zM230 35h7v7h-7zM242 35h7v7h-7zM266 32h8v7h-8zM278 32h8v7h-8z" />
      <path d="M0 46h300" />
    </>
  ),

  'Financial District': () => (
    <>
      {/* A columned bank in front, towers behind it. */}
      <path d="M12 46V14h24v32zM40 46V6h26v40zM70 46V18h22v28z" />
      <path d="M18 20h5v6h-5zM27 20h5v6h-5zM18 30h5v6h-5zM27 30h5v6h-5zM47 12h5v7h-5zM56 12h5v7h-5zM47 24h5v7h-5zM56 24h5v7h-5zM47 36h5v6h-5z" />
      <path d="m112 20 32-14 32 14" />
      <path d="M118 24v18M130 24v18M142 24v18M154 24v18M166 24v18" />
      <path d="M110 44h68M112 24h64" />
      <path d="M196 46V10h26v36zM226 46V22h24v24zM254 46V4h30v42z" />
      <path d="M262 10h6v7h-6zM272 10h6v7h-6zM262 22h6v7h-6zM272 22h6v7h-6zM262 34h6v7h-6zM272 34h6v7h-6z" />
      <path d="M0 46h300" />
    </>
  ),

  Uptown: () => (
    <>
      {/* Low villas, planted trees, a mast on the water behind. */}
      <path d="M10 46V28h36v18z" />
      <path d="m6 28 22-12 22 12" />
      <path d="M22 46V36h12v10" />
      <path d="M70 46V30h30v16z" />
      <path d="m66 30 19-10 19 10" />
      <path d="M124 46V36c0-6 5-11 11-11s11 5 11 11v10z" />
      <path d="M135 25v-6" />
      <path d="M166 46V38c0-5 4-9 9-9s9 4 9 9v8z" />
      <path d="M175 29v-5" />
      <path d="M212 46V26h34v20z" />
      <path d="m208 26 21-12 21 12" />
      <path d="M266 44V12M266 16h20l-20 10z" />
      <path d="M0 46h300" />
    </>
  ),

  'The Heights': () => (
    <>
      {/* Supertalls, an aerial, and the moon clear of the roofline. */}
      <path d="M8 46V20h22v26zM34 46V4h26v42zM64 46V26h20v20z" />
      <path d="M46 4V0" />
      <path d="M110 46V12h24v34zM138 46V2h22v44zM164 46V22h26v24z" />
      <path d="M148 2v-2" />
      <path d="M204 46V16h28v30zM236 46V8h24v38zM264 46V28h28v18z" />
      <path d="M40 12h6v7h-6zM50 12h6v7h-6zM40 24h6v7h-6zM50 24h6v7h-6zM40 36h6v6h-6zM116 20h6v7h-6zM126 20h6v7h-6zM116 32h6v7h-6zM144 10h6v7h-6zM152 10h6v7h-6zM144 22h6v7h-6zM152 22h6v7h-6zM212 24h6v7h-6zM222 24h6v7h-6zM242 16h6v7h-6zM250 16h6v7h-6zM242 28h6v7h-6z" />
      <circle class="scene__moon" cx="284" cy="12" r="7" />
      <path d="M0 46h300" />
    </>
  ),
};

export function DistrictArt({ district }: { district: string }) {
  const draw = DISTRICTS[district];
  if (!draw) return null;

  return (
    <svg class="district-art" viewBox="0 0 300 46" preserveAspectRatio="none" aria-hidden="true">
      {draw()}
    </svg>
  );
}

/**
 * Behind a reclaimed milestone. A sun clearing a horizon, which is the only
 * image the sentence under it needs.
 */
export function Sunburst() {
  // Stops short of horizontal at both ends, so no ray ever falls below the
  // horizon it is supposed to be rising over.
  const rays = Array.from({ length: 17 }, (_, index) => {
    const angle = -78 + (index * 156) / 16;
    return (
      <path
        key={index}
        class="sunburst__ray"
        d="M100 78 98.7 2h2.6z"
        transform={`rotate(${angle} 100 78)`}
      />
    );
  });

  return (
    <svg
      class="sunburst"
      viewBox="0 0 200 96"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g class="sunburst__rays">{rays}</g>
      <circle class="sunburst__sun" cx="100" cy="78" r="40" />
      <path class="sunburst__horizon" d="M0 78h200" />
    </svg>
  );
}
