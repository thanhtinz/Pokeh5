# Broke to Boss

Game nhàn rỗi mở màn ở **âm một tỷ**, kết thúc khi chẳng còn gì để chuộc lại.
Chạm xưởng luyện, đi làm ca, nhận kèo, mua ba mươi sáu cơ ngơi trải sáu khu,
chơi mười hai mã cổ phiếu nhại, và lấy lại mười hai mảnh cuộc đời mà món nợ
đã cuỗm đi. Rồi bán sạch, đổi lấy uy tín, và leo lại từ đầu.

Bối cảnh và tiền tệ là Việt Nam. Chơi bằng **tiếng Việt**, đổi sang English
được trong màn Cuộc đời.

TypeScript, Preact and Vite, wrapped in Capacitor for Android and iOS.
No canvas, no engine, no runtime dependencies beyond Preact — the whole bundle
is **46 kB gzipped**.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 83 tests over the rule layer and the dictionaries
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

### Setting and language

The game is set in Vietnam and denominated in đồng. That is not a coat of paint
on an American game: the fiction was moved. The opening debt is **âm một tỷ**
rather than minus a million dollars, because a tỷ is the round, ruinous number
a Vietnamese person actually says. The ladder out runs through nhặt ve chai,
rửa xe máy, hát rong quán nhậu, bốc vác chợ đầu mối, sà lan chở cát, sàn vàng,
vườn nho Ninh Thuận; the districts run from Xóm Nước Đen to Tầng Mây; the
milestone that comes back is a **xe máy**, not a car.

Moving the setting moved the numbers with it. Every money constant is scaled so
the curve is unchanged and only the units differ, and `money()` formats in the
shorthand Vietnamese people write every day — **k, tr, tỷ**, then ngt / trt / tt
— with a comma for the decimal mark. English keeps K/M/B and always carries the
₫, because "1B" on its own names no currency.

Three drawn assets followed the fiction: the food truck became a **xe bánh mì**
with a parasol, the shopping cart became a **xe hàng rong**, and the car became
a **xe máy**.

Vietnamese is the default, with English as a second locale rather than the
source one. That split is enforced by the file layout: **the rule layer
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

The Vietnamese is written, not converted — twice over. The first pass was
key-for-key faithful and read like a machine had done it. The second pass
stopped translating sentences altogether and re-authored each one from its
situation, against the rules documented at the top of `vi.ts`:
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

## Làm lại — the long loop

`src/game/prestige.ts`. Once a run clears a hundred tỷ, you can sell the whole
empire, go back to Xóm Nước Đen and climb again. What carries over is **uy tín**
— standing, the thing that is actually worth having in business — and every
point adds 2% to all income, permanently.

Two decisions are load-bearing:

**Standing is the difference, not a sum.** A run pays `reputationFrom(peak)`
minus what you have already *earned*, so resetting repeatedly at a low peak
earns nothing; the only way to more standing is a higher peak than last time.
The subtrahend has to be the lifetime total rather than the spendable balance —
against the balance, spending standing and resetting at the same old peak mints
the spend straight back and the shop is free.

**Claimed milestones survive.** The businesses are things money bought, so money
can take them back. The dog, the motorbike, the call from your mother are not
merchandise, and making the player lose them again to buy a multiplier would
sell out the entire premise of the game. That single rule then forces a change
on the Life screen: a milestone reads as won when it is *claimed*, not when this
run's peak happens to clear its threshold.

`tests/prestige.test.ts` covers the curve, the difference rule, and — the one
that matters — exactly what a reset takes and what it leaves.

## Four systems that keep a run from ending

An idle game dies the day the player runs out of *next thing*. Buying the
thirty-sixth business is a wall: there is nothing left on the screen to want.
Four systems sit under that wall, each answering a different span of time —
the next minute, the next session, the next week, the next run.

**Per-business upgrades** (`src/game/upgrades.ts`) are the next minute. Every
business carries five tiers at 25 / 50 / 100 / 200 / 400 owned, worth ×2 ×2 ×3
×3 ×4 — a factor of 144 on a single line if you take all five. The cost is a
multiple of the *base* price rather than the current one, so an upgrade on a
line you have four hundred of is cheap relative to the next unit of it, and the
choice on the Empire screen stops being "buy more of the best one" and becomes
"deepen or widen". The button spans the row because it competes with the buy
button directly above it, and a right-aligned control would read as secondary
when it usually isn't.

**Daily check-in** (`src/game/daily.ts`) is the next session — the one reason
to open the app today rather than tomorrow. A seven-day cycle paying 3 minutes
of income up to a full hour, with a two-day grace before the streak breaks.
Days are compared by **calendar date, not elapsed hours**, because a player who
checks in at 9pm and again at 8am the next morning has plainly played on two
days and any hours-based rule tells them they haven't. The reward is a multiple
of *current* income, so it stays meaningful at every scale instead of turning
into a rounding error by the second district; a 20,000đ floor keeps day one from
paying nothing.

**Achievements** (`src/game/achievements.ts`) are the next week: ten ladders,
forty-two rungs, each worth a permanent +3%. They are measured against
**cumulative counters** — taps taken, cards caught, shifts worked, units bought
— so they survive prestige and a second run keeps filling the same bars a first
run started. The More screen leads with the one unclaimed rung per ladder rather
than the forty already earned, because the point of the list is the part that
isn't finished. `achievementMultiplier` filters ids it doesn't recognise, so an
edited save cannot inflate the bonus with names the game has never heard of.

**The reputation shop** (`src/game/perks.ts`) is the next run. Six permanent
perks — offline hours, tap value, cycle speed, card frequency, credit line,
seed cash — bought with the standing prestige pays out. It runs on two ledgers:
`reputationTotal` never falls and drives the income multiplier, while
`reputation` is spendable and does. Without the split, buying a perk would cut
the multiplier that made the perk affordable, and the shop would be a trap.

All four live in the rule layer with no renderer, and all four are covered in
`tests/prestige.test.ts`.

### Two more, aimed at the parts that go dead

**Roots** (`src/game/roots.ts`) answer the genre's oldest failure: unlock the
third district and the first two become dead numbers. They are still there, still
cheap, and nobody will ever buy them again, because a district-scoped reward is
worthless in a district whose whole income is a rounding error.

So the reward is not district-scoped. Each district has six tiers on total units
held — 50 / 150 / 350 / 700 / 1,200 / 2,000 — and every tier adds **6% to all
income, everywhere**. Filling out Xóm Nước Đen late in a run does not buy you
more scrap money; it buys a few percent of the whole empire. Because those units
cost nothing relative to income by then, this is the tail that never runs out:
when there is nothing left to do, there is always a district to go back and fill.

The bonus is additive, not multiplicative. Thirty-six compounding tiers would
swallow every other multiplier and stop being legible; "14 tiers, +84%" is a
sentence a player can do in their head, and the ×3.16 ceiling sits next to
standing and achievements rather than on top of them.

**Daily jobs** (`src/game/quests.ts`) are the ten minutes after the check-in.
Three goals, rolled at midnight, measured as a delta against a **counter
snapshot** taken when the day turned; clearing all three pays one point of
standing — enough to make the third one worth finishing, not enough to replace
selling the empire as the way standing is actually earned.

Two details are load-bearing. The three goals never share a counter, or "tap 60
times" lands next to "tap 250 times" and finishing the hard one finishes the easy
one for free. And the roll is **restricted to what the player can reach**: a new
save at âm một tỷ has no cash to place a trade with and no business at 25 units
to upgrade, so a day-one set of "place 4 trades" and "buy 2 upgrades" is two
thirds of a screen the player learns to ignore. The rolled ids are stored rather
than recomputed from the day, so unlocking the market at noon doesn't swap the
goals out from under whoever is working on them.

### And one that gives the number a shape

`src/game/rivals.ts`. Everything above is a number going up, and a number going
up has no *shape* — how much better is 4,2 tỷ than 3,1 tỷ is a sum you have to
sit down and do. Twenty-four names have a shape: you are behind Chị Năm the
fishmonger and ahead of Chú Bảy the motorbike taxi, and two rungs from passing
Ông Chín, who runs four plastic stools on a pavement and owes nobody a đồng.

Ông Chín sits at exactly zero. That is the point of him: he is the only place in
the game that says out loud what clearing the debt *means*, and a name beside
that threshold makes it an afternoon you remember instead of a `0`.

Three decisions:

**Rank reads this run's peak, not the lifetime record.** Starting again drops you
to the bottom of the board and you climb the whole thing back in a fraction of
the time — which is the actual pleasure of a prestige reset, and the board is
what says so.

**The passing bonus is paid once in a lifetime**, tracked in `beaten`, or
resetting would be a money printer. The board resets; the ledger does not.

**The bar is logarithmic.** From 2 nghìn tỷ to 20 nghìn tỷ is one rung and a
factor of ten; measured linearly the bar sits at zero for nine tenths of it and
then jumps. The whole game runs on a multiplicative scale, so the bar has to as
well.

A save written before any of this existed has its `beaten` list **backfilled
from its peak rather than paid out** — opening the game to fourteen lump sums and
fourteen toasts is a bug, not a present.

83 tests now, from 50.

## How the money works

This is the one mechanic that is not standard for the genre, and it exists
because a balance of **âm một tỷ** plus a "you must have the money" rule is a
game with no first move.

Purchases are gated on a **credit line**, not on cash:

```
line  = 2tr + 0.4 × (peak net worth − starting balance)
floor = starting balance − line
```

You may spend down to the floor. The line opens at 2tr — enough to buy into Xóm
Nước Đen on the loan shark's terms — and widens only with progress actually
made. The `credit` perk multiplies it, which is the one thing in the shop that
changes how a fresh run *opens* rather than how fast it climbs.

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
  prestige.ts     uy tín — the reset curve, paid as a difference
  upgrades.ts     five tiers per business, priced off the base cost
  daily.ts        the seven-day cycle, compared by calendar date
  quests.ts       three daily goals, rolled inside what the player can reach
  roots.ts        district tiers that pay a global bonus
  rivals.ts       twenty-four names to climb past, zero among them
  achievements.ts ten ladders over cumulative counters
  perks.ts        six permanent perks, two ledgers
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
the whole first act. Every field the later systems added has a **backward
default** — `bestNetWorth` falls back to `peakNetWorth`, `reputationTotal` to
`reputation`, the four new maps to empty — so a save written before any of them
existed still opens, mid-run, with no reset.

**Saves are written twice.** `localStorage` synchronously on `pagehide` — the
only storage a mobile WebView reliably flushes — and mirrored asynchronously to
Capacitor Preferences, because Android can evict web storage under pressure. The
mirror only wins when its `lastSeenAt` is genuinely newer.
