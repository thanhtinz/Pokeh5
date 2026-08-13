# Broke to Boss

An idle tycoon that opens at **-$1,000,000** and ends when there is nothing left
to buy back. Tap a refinery, work shifts, take contracts, buy thirty-six
businesses across six districts, trade twelve parody tickers, and reclaim twelve
pieces of the life the debt took.

Chơi bằng **tiếng Việt**, đổi sang English được trong màn Cuộc đời.

TypeScript, Preact and Vite, wrapped in Capacitor for Android and iOS.
No canvas, no engine, no runtime dependencies beyond Preact — the whole bundle
is **36 kB gzipped**.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 42 tests over the rule layer and the dictionaries
npm run build      # typecheck, then a production bundle in dist/
npm run shot       # screenshots every screen at both ends of the palette
```

Native:

```bash
npx cap add android
npm run cap:android
```

`npm run shot` needs a Chromium. If the environment pins one, point at it:
`CHROMIUM_PATH=/opt/pw-browsers/chromium npm run shot`.

## The one idea

The pitch for this genre of game is usually a number going up. Here the number
starts *below zero*, and the interface says so: **every colour in the stylesheet
is derived from net worth.**

`src/ui/theme.ts` maps net worth to a single hue and writes two custom
properties on the document root. At minus a million the entire app is a
desaturated blood red; at a quadrillion it is gold; in between it is whatever
the player has earned. Nothing else in the CSS names a colour, so the palette
is the progress bar — the screen fills with warmth at exactly the rate the
player fills it with money.

The climb out of debt is deliberately given *half* the whole scale, even though
it is a rounding error in absolute terms, because it is most of the emotional
distance and all of the first session.

### Two visual systems, and the line between them

There is not a single emoji in the game, and that follows from the palette
rather than from taste. An emoji is a small picture with its own fixed colours;
put sixty of them on a screen whose entire hue is a function of net worth and
they are the only thing that refuses to move with it.

What replaced them is two systems, split by what a thing *is*:

**Icons** (`src/ui/Icon.tsx`) are for the interface, and only for the
interface — a tab, a lock, a state. Five of them. Line drawings on a 24×24 grid
carrying geometry and nothing else; stroke weight, caps and joins live in one
CSS rule and are inherited, and `currentColor` ties each one to whatever
contains it.

**Assets** (`src/ui/Art.tsx`) are for content: sixty flat vector illustrations
on a 48×48 stage, lit from the upper left, built from four tones plus an ink and
a highlight. A business the player has bought two hundred of, the shift they
chose, the dog that came home — those are things in the world, and a 1.6px
outline is a label for them rather than a picture of them.

The tones are `--art-1` … `--art-4`, all derived from the same hue the palette
runs on, so every asset warms from debt-red to gold along with everything else.
Because custom properties inherit, a tile with a bright accent background —
a milestone disc, a card header — redeclares the ramp dark on the asset itself
and flips the whole drawing without touching a single shape.

Both are rendered inline rather than through an SVG sprite. A `<use>` reference
builds a shadow tree that ordinary CSS selectors cannot reach, which would leave
the tones inside the drawings unstylable; inline costs some DOM and buys back
the whole cascade.

### Three places wanted a picture, not an icon

`src/ui/Scene.tsx`:

**The city.** It sits behind every screen and is the literal reading of the
game's own pitch. It opens as a vacant lot — a chain-link fence, one broken
lamp, rubble — and gains a skyline layer by layer as net worth climbs, until the
windows come on. Each layer's opacity is a `calc()` on `--wealth`, the same
custom property the palette runs on, so the city is drawn by the theme engine
rather than animated by a timer. The vacant lot is the one layer that starts at
full strength and leaves; everything else is something the player put there.

Opacity is set per layer rather than capped on the parent, because the two ends
want opposite things. The lot is the only thing on screen at the start and has
to carry it; the finished skyline sits under translucent panels full of numbers
and must not compete with them.

**District strips.** One drawn scene per district, so buying into The Docks
looks like somewhere — cranes over stacked containers, water along the bottom —
rather than reading like a heading.

**The milestone payoff.** A sun clearing a horizon behind the thing you just won
back. It is the only screen in the game allowed to be mostly picture.

### Language

The game is Vietnamese by default, with English as a second locale rather than
the source one. That split is enforced by the file layout: **the rule layer
holds ids, never prose.** A business is `cans`, a shift is `night`, a milestone
is `zero`; `src/i18n/` maps those to sentences.

Two consequences worth having. Changing language touches no game logic, so it
cannot break the economy. And a save written in one language opens in the other
— the save stores `cans`, not "Nhặt lon" — which is also why an opportunity card
now persists its template id instead of the title it was showing.

`tests/i18n.test.ts` asserts the two dictionaries carry identical keys and
identical `{placeholders}`, and that every id the game can put on screen — every
district, business, job, milestone, stock and sector — has a string in both. A
missing key is a Vietnamese sentence appearing mid-English screen, and nothing
is louder than that.

The Vietnamese is written, not converted. The first pass was key-for-key
faithful and read like a machine had done it, so the whole dictionary was
rewritten against four rules, which are documented at the top of `vi.ts`:
prefer the plain word over the Sino-Vietnamese one where both exist ("Sạch nợ",
not "Thanh toán hết nợ"; "Tổng tài sản", not "Tài sản ròng" — this is a game
screen, not a financial statement); drop the pronoun where the sentence still
reads, because putting "bạn" in every line is the fastest way to sound
translated; never carry an English idiom across intact ("Your back will
remember this one" became "Xong ca này lưng nhớ đời"); and keep the milestone
lines at the original's rhythm — short, present tense, no exclamation marks.

Wording has to follow the numbers too. Early milestones sit at *negative* net
worth, so "cần -$950K" reads backwards — the player is climbing up to it, not
holding it — and the label became "khi tài sản lên -$950K".

Text length is a layout constraint, not a translation detail: Vietnamese with
diacritics runs wider than the English it replaced, which is what pushed the
tap-target label out of its circle until it was sized for the longest language
rather than the shortest.

## How the money works

This is the one mechanic that is not standard for the genre, and it exists
because a balance of -$1,000,000 plus a "you must have the money" rule is a game
with no first move.

Purchases are gated on a **credit line**, not on cash:

```
line  = 2,000 + 0.4 × (peak net worth − starting balance)
floor = starting balance − line
```

You may spend down to the floor. The line opens at $2,000 — enough to buy into
Skid Row on the loan shark's terms — and widens only with progress actually
made.

The loop cannot run away, because **net worth counts cash plus what was paid for
the businesses plus the market value of the holdings**. A purchase moves value
sideways and leaves net worth untouched, so borrowing to buy assets can never
widen the line that allowed the borrowing. The line grows from income and
nothing else. `tests/economy.test.ts` asserts exactly this invariant.

## Layout

```
src/game/     the rules — runs in plain node, no DOM, fully tested
  money.ts        formatting from -$1M to $1ap, negatives as a first-class case
  businesses.ts   the cost curve, closed-form bulk buy, O(1) "buy max"
  jobs.ts         timed shifts and opportunity cards
  stocks.ts       twelve random walks derived from (seed, tick)
  life.ts         twelve milestones, each with a permanent bonus
  state.ts        the save shape
  save.ts         sanitising, localStorage, native mirror
  store.ts        the mutable world and every action on it
  rng.ts          mulberry32 + Box–Muller
src/i18n/     every string the player reads, in vi and en
src/ui/       Preact components, the theme engine, icons, assets and scenes
src/styles/   two stylesheets: tokens, then components
tests/        vitest over src/game/
scripts/      playwright screenshots of every screen
```

### Things worth knowing before changing them

**Prices are derived, not stored.** A save holds a seed and a tick counter;
`pricesAt(seed, tick)` walks the difference and keeps a 72-tick tail so
sparklines and change columns are free. Replaying from zero is capped at 20,000
ticks — past that the walk is statistically indistinguishable and an unbounded
loop would stall a cold start.

**The tick runs at frame rate, the UI at ten hertz.** `store.tick()` marks the
world dirty; the render loop flushes on a timer. Sixty state-driven re-renders a
second across thirty-six rows buys nothing a 120ms CSS transition cannot fake,
and costs a phone its battery. The bar transitions in `app.css` are tuned to
that flush rate.

**A backgrounded tab is the same problem as a cold start.** Frames stop, so
`visibilitychange` persists on the way out and runs the offline credit on the
way back — the same path a fresh launch takes.

**Saves are never trusted.** `sanitise()` clamps every field, drops ids the game
no longer knows, and turns an unsalvageable file into a fresh start rather than
a crash on boot. Cash is the one field allowed to be negative, because that is
the whole first act.

**Saves are written twice.** `localStorage` synchronously on `pagehide` — the
only storage a mobile WebView reliably flushes — and mirrored asynchronously to
Capacitor Preferences, because Android can evict web storage under pressure. The
mirror only wins when its `lastSeenAt` is genuinely newer.
