# Broke to Boss

An idle tycoon that opens at **-$1,000,000** and ends when there is nothing left
to buy back. Tap a refinery, work shifts, take contracts, buy thirty-six
businesses across six districts, trade twelve parody tickers, and reclaim twelve
pieces of the life the debt took.

TypeScript, Preact and Vite, wrapped in Capacitor for Android and iOS.
No canvas, no engine, no runtime dependencies beyond Preact — the whole bundle
is **23 kB gzipped**.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 36 tests over the rule layer
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
src/ui/       Preact components and the theme engine
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
