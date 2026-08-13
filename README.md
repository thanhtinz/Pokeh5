# Broke to Boss

Game nhàn rỗi mở màn ở **âm một tỷ**, kết thúc khi chẳng còn gì để chuộc lại.
Chạm xưởng luyện, đi làm ca, nhận kèo, mua ba mươi sáu cơ ngơi trải sáu khu,
chơi mười hai mã cổ phiếu nhại, và lấy lại mười hai mảnh cuộc đời mà món nợ
đã cuỗm đi. Rồi bán sạch, đổi lấy uy tín, và leo lại từ đầu.

Bối cảnh và tiền tệ là Việt Nam. Chơi bằng **tiếng Việt**, đổi sang English
được trong màn Cuộc đời.

TypeScript, Preact and Vite, wrapped in Capacitor for Android and iOS.
No canvas, no engine, no runtime dependencies beyond Preact — the whole bundle
is **50 kB gzipped**, and the server it talks to has no dependencies at all.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run server     # the account API on :8787 (required — the game is behind a sign-in)
npm run dev:all    # both at once
npm test           # 110 tests over the rule layer, the dictionaries and the server
npm run build      # typecheck, then a production bundle in dist/
npm run shot       # screenshots every screen at both ends of the palette
npm run art        # all 58 drawn assets on one sheet, large enough to judge
npm run icons      # re-render the app icon PNGs from public/icon.svg
```

Native:

```bash
npx cap add android
npm run cap:android
```

`npm run shot` needs a Chromium and starts its own throwaway API on :8788, since
every screen now sits behind a session. If the environment pins a browser, point
at it: `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run shot`.

## The one idea

The pitch for this genre of game is usually a number going up. Here the number
starts *below zero*, and the interface says so: **every colour in the stylesheet
is derived from net worth.**

`src/ui/theme.ts` maps net worth to a single hue and writes two custom
properties on the document root. At minus a million the entire app is a
desaturated blood red; at a quadrillion it is gold; in between it is whatever
the player has earned. Every surface, rule, accent and glow resolves through it,
so the palette is the progress bar — the screen fills with warmth at exactly the
rate the player fills it with money. The drawn assets are the one deliberate
exception, and the next section is about why.

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

**Assets** (`src/ui/Art.tsx`) are for content: fifty-eight flat vector
illustrations on a 48×48 stage, lit from the upper left, built from four tones
plus an ink and a highlight. A business the player has bought two hundred of, the
shift they chose, the dog that came home — those are things in the world, and a
1.6px outline is a label for them rather than a picture of them.

**Assets are made of materials, and materials have colours.** The four tones in
a drawing are not one light-to-dark ramp: they are *two pairs*. `t2`/`t3` are the
lit and shaded faces of the **primary** material — the body of the thing — and
`t1`/`t4` are the lit and shaded faces of the **secondary** — the label, the
canopy, the trim. That pairing was already in every drawing; it just wasn't being
used, because all four tones resolved to the same hue and sixty different objects
came out as sixty gold lumps.

So each asset now declares what it is made of, one line in `Art.tsx`:

```
can:  'p-steel s-red'      cart:  'p-wood s-red'      fish: 'p-ice s-blue'
wine: 'p-wine s-gold'      atom:  'p-cyan s-ice'      dog:  'p-coffee s-cream'
```

Twenty-seven materials, each three numbers in `base.css`: hue, saturation, and —
the one worth explaining — **a lightness offset**. Fixing lightness by role alone
crushes cream and porcelain into mud and floats charcoal and navy up into pale
grey, because "the lit face of a thing" and "a thing that is a light colour" are
different claims. Each material says where it sits on the lightness scale; the
*spacing* between the four tones stays constant across the whole set, and that
spacing is what keeps sixty drawings looking like one set.

An asset that declares nothing falls back to the theme hue and still warms from
debt-red to gold, as everything did before.

On a bright tile — a milestone disc, a card header — a light asset used to
disappear, and the old fix replaced all four tones with a brown ramp. That fixed
the contrast and threw away the colour, which is now the part worth keeping. The
override is one line instead: **drop the lightness, leave the hue alone.** Custom
properties inherit and that selector outranks the material classes, so a single
rule darkens all twenty-seven materials at once and the can is still an aluminium
can with a red band, just dark enough to read on gold.

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

It competed anyway, and the bug is worth writing down because it names a rule.
The last rows of every scrolling screen were sitting on the scene and the fence —
thin, high-contrast line work, the worst possible thing to put behind a
sentence — was cutting straight through the text. Three causes, one lesson each:

- `.row` was 66% transparent and, unlike `.panel`, had no backdrop blur. Surfaces
  are now opaque enough to read on, which also costs nothing: a blur on
  thirty-six rows is a real bill on a cheap phone.
- A locked job row carried `style={{ opacity: 0.4 }}`. **Opacity on a row fades
  its own background too**, so the one row that most needed a surface had the
  least. Dim the contents, never the surface.
- The milestone timeline had no surface at all, and it is the last block on its
  screen — the one block guaranteed to overlap the scene. It is a card now, like
  every other block on that screen.

The scene's own opacities came down a notch on top of all that. It is decoration
sitting exactly where the text lands, so it loses, and it should lose by default.

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

110 tests now, from 50.

## It installs, and it opens without a network

The game is a phone game people are meant to open every day, delivered over the
web. Without a manifest it cannot go on a home screen, and without a service
worker a tunnel means a blank page — on a game whose whole design premise is that
it keeps running while you are away.

So: `public/manifest.webmanifest`, an icon rendered from `public/icon.svg` (PNG
as well as SVG, because iOS will not take an SVG for the home screen and iOS is
where "add to home screen" actually gets used), and a service worker generated at
the end of `npm run build` by `scripts/sw.mjs`.

No plugin. The worker needs exactly two things a plugin brings three hundred
others to provide — the list of hash-named files, and a cache name that changes
per build — and both are ten lines against `dist/`. The cache name is a hash of
the *contents*, not the build time, so rebuilding without changing anything does
not push every player a fresh download.

Three rules in the worker, and the second is the one that matters:

1. Hash-named files never change, so serve them from the cache first.
2. **`/api` is never cached.** A cached save or leaderboard means a player one
   day opens the game, sees last week's net worth, and believes they have been
   robbed. If the network is down, let it be down — the account layer already
   knows how to wait. The check is scope-relative as well as absolute, so an app
   deployed under `/game/` still recognises its own API.
3. Navigations try the network and fall back to the cached shell. That is the
   entire point of the file.

It deliberately does **not** call `skipWaiting`. A new version waits until the
old tabs close. Swapping the file set under a running page is faster, but it is
how a late chunk import lands in the gap between two builds — and this is a game
designed to be left open for an evening, which is the longest-lived kind of page
there is.

## Accounts, cloud saves and the real leaderboard

`server/`. Sign-up and sign-in, the save kept on a server so a new phone picks
up where the old one left off, and a board of actual people.

**Zero dependencies, same as the client.** Node 22 ships `node:sqlite`, and
`node:crypto` ships scrypt — a real password KDF, deliberately memory-hard.
Pulling in Express, bcrypt and an ORM to do what three built-in modules already
do would leave the server permanently out of step with a client whose only
dependency is Preact, and every package added is a CVE feed subscribed to for
life. The whole thing is five files.

```
server/auth.mjs     scrypt hashing, opaque tokens, credential shape
server/db.mjs       schema and every prepared statement
server/scores.mjs   what a submitted score has to survive
server/http.mjs     json, CORS, rate limiting — the bits under a framework
server/index.mjs    routing
```

```
POST   /api/register  {name, password}   → {token, user}
POST   /api/login     {name, password}   → {token, user}
POST   /api/logout                       → 204
GET    /api/me                           → {user}
POST   /api/password  {current, next}    → 204
DELETE /api/account   {password}         → 204
PUT    /api/save      {save, score}      → {user}
GET    /api/save                         → {save, seenAt}
GET    /api/board?limit=50               → {rows, total, you}
```

### What the security actually is

- **Passwords are never stored**, only a salted scrypt hash, compared with
  `timingSafeEqual`. Raising the cost parameter later will not lock anyone out,
  because each hash carries the parameters it was made with.
- **Tokens are never stored either** — the database holds their SHA-256. Leaking
  the whole file does not let anyone sign in, because what is in it is not what
  the client sends.
- **Sign-in leaks nothing about who exists.** Same error either way, and — the
  part that is easy to miss — the *same amount of time* either way: a missing
  account skips scrypt and answers in a millisecond instead of a hundred, and
  that gap is itself the answer to "does this name exist". A decoy hash makes
  both paths cost the same.
- **The unique-name check is not the check.** Hashing a password takes long
  enough for another request to take the name in between, so the `UNIQUE`
  constraint is what decides, and the insert is wrapped so losing that race
  reads as `name.taken` rather than a 500.
- Prepared statements throughout, a 256 kB body cap, per-IP rate limits that are
  tightest on the two routes worth brute-forcing, thirty-day sessions swept
  hourly, and no stack traces in responses.
- `Access-Control-Allow-Origin: *` is deliberate and safe here: auth is a Bearer
  token in our own `localStorage`, not a cookie, so there is no ambient
  credential for another origin to ride — and the Capacitor build has no
  same-origin to fall back on, since it runs at `capacitor://localhost`.

### What the leaderboard cannot do, stated plainly

**The rules run on the player's own device**, so someone determined can submit
whatever number they like. Making that impossible means moving the simulation to
the server, which is a different game architecture, not a validation function.
`server/scores.mjs` therefore does not pretend. It blocks the three cheap things
that *are* blockable, which is enough to keep the board useful for people
playing honestly:

1. **Impossible numbers.** `1e308`, `Infinity`, `NaN` — the rules cannot produce
   them, so they are refused. The ceiling is `1e45`; the last business costs
   `2.9e41`.
2. **A minutes-old account at the top of the board.** The ceiling opens at a
   nghìn tỷ and widens one order of magnitude every five minutes, so it is fully
   open after about three hours. It is not there to slow real players down; it is
   there so "register, POST `1e40`" goes nowhere.
3. **Going backwards.** Records only rise, and standing is checked against the
   record it claims to come from — reputation cannot exceed `sqrt(best / 1e9)`.

One thing worth knowing about that gate: it is what made the screenshot script
fail the first time. Seeding a board of brand-new accounts with trillions got
`score.tooFast` on every one, exactly as designed. The fix was to age the fixture
accounts by a week, not to widen the gate.

### An account is required, and what that forced

Signing in is the way into the game: there is no play-as-guest. That is a
product decision, and it drags two engineering ones behind it.

**A save belongs to a person, not to a phone.** Every save carries an `ownerId`,
and `loadSave(ownerId)` ignores one stamped with somebody else. Without it, two
brothers sharing a handset means the second one opens the game onto the first
one's empire — and then uploads it to his own account. A save written before
accounts existed has `ownerId: null` and is adopted by whoever signs in first,
because that run really was theirs.

**Losing the network must not lock the door.** This is a single-player idle game
that has always run offline; requiring an account is for the leaderboard, not for
turning a dropped signal into an evening you cannot play. So a session that has
signed in once is remembered on the device — token *and* the user record — and a
later launch that cannot reach the server still goes straight into the game with
sync parked. Exactly one thing locks the door: the server answering that the
token is no longer valid. That is not a network failure, it is "this session is
not that account any more", and then you sign in again.

The simulation loop only starts once you are through the gate. Running it behind
the sign-in screen would have businesses cycling, cards landing and money
arriving for a save nobody had claimed yet.

**A required account has to have a way out, and a way to fix itself.** There is
no email on file, so there is no reset link to send — but the thing that *can* be
built has to be: someone who still knows their password can change it, and
anyone can delete the account outright. Without those two, requiring sign-in
means one forgotten password is a permanently lost game and there is no way to
leave.

Changing a password **kills every other session** and keeps the one doing the
changing. People change a password because they think somebody else is using the
account; leaving that somebody signed in makes the whole act pointless. Deleting
takes the row, and `ON DELETE CASCADE` takes the sessions with it, so the name
goes back into circulation rather than being held by an account that no longer
exists. Both ask for the current password — obvious for the first, and for the
second it is the brake that stops an unlocked phone in someone else's hand from
erasing a run.

### Sync

The board reads **the same row the save writes** — there is no separate score
endpoint, so the two can never disagree about a player.

Conflicts resolve by **newest `lastSeenAt` wins**, which is the identical rule
the Capacitor Preferences mirror already uses. One rule for every copy of a save
is a rule you can still reason about; two is a coin flip the day they disagree.

A remote save is put through `sanitise()` like any other, because the server
stores a blob some client sent it — "trusting the server" here is really trusting
whatever client wrote that blob, and not having to do that is what `sanitise()`
is for.

Picking which save to open is three cases, and the third is where progress goes
missing if you are careless:

1. The device has this account's save → newest `lastSeenAt` wins.
2. The device has nothing, the server does → take the server's, no comparison.
3. Neither → a fresh run.

Case 2 has to be separate rather than folded into "newest wins", because a
freshly created save has `lastSeenAt` of *now* and would beat any server copy —
so switching phones would wipe you out at the moment it was supposed to save you.

Nothing in `src/net/` throws; every call returns `{ok}` or `{ok: false, error}`,
and the errors are ids that `src/i18n/` turns into sentences, same as everything
else.

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
src/net/      the account client and save sync — optional, never required
src/i18n/     every string the player reads, in vi and en
src/ui/       Preact components, the theme engine, icons, assets and scenes
src/styles/   two stylesheets: tokens, then components
server/       the account API: five files, no dependencies
tests/        vitest over src/game/, and server/*.test.mjs beside the server
scripts/      playwright screenshots of every screen, and the art contact sheet
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
