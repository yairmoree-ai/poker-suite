---

## 2026-07-14 (cont'd 7) — Inserted UTG-vs-3bet data (60bb, per-opponent)
**Files: ranges.js, tools/validate_ranges.js**

- Landed the 7-screenshot GTOWizard dataset built earlier this session:
  UTG's `call` and `4bet` at `_RANGES[9].mid.UTG` (shared with 7/8 via the
  existing aliasing — decided to leave that as-is for now, see prior entry)
  are no longer flat generic strings; each is now an object keyed by the
  specific 3-bettor's position (`UTG+1`, `LJ`, `HJ`, `CO`, `BTN`, `SB`,
  `BB`), resolved through `_resolveOpponentRangeStr`'s `vsPos` support
  (added earlier this session, previously untested against real data).
  Replaces the old placeholder `call:'JJ,TT'` / `4bet:'AA,KK,AKs'`.
- Sanity-checked combo counts before shipping (table shared with the user):
  continue-range vs each opponent ranges 8.7% (vs UTG+1, tightest — most
  polarized early 3-bettor) up to 13.1% (vs BB, widest) with a smooth
  monotonic climb in between — no discontinuities.
- `tools/validate_ranges.js` needed a real fix, not just a re-run: it
  crashed (`.split is not a function`) the first time, because it assumed
  every `entry[cat]` was a flat string — the first time that assumption was
  actually false in this codebase. Updated `checkToken`'s call site and the
  missing/empty completeness checks to handle both shapes (flat string, or
  `{vsPos: string}` object, recursing per sub-range). Re-ran clean: 0
  errors, 0 warnings.
- Verified the live resolution path end-to-end (not just the data lookup):
  `_getContextualRangeInfo(seat,'UTG',8,'mid',2,'LJ')` and `...,'BB')` each
  return the correct distinct per-opponent union; omitting `vsPos` still
  correctly falls back to the union of all 7 known sub-ranges (36 hands) —
  confirming the graceful-degradation design (discussed at length before
  committing to the shared `_RANGES[8]===_RANGES[9]` object) behaves as
  intended for opponents/table-sizes without a specific data point.
- This is the first real data to exercise: the `vsPos`-aware `call`/`4bet`
  schema, the round=2 facing-a-3bet branch of `_getContextualRangeInfo`,
  and the `S.lastRaiser`-based aggressor detection in the equity panel —
  all added earlier this session but previously only tested with synthetic
  placeholder data. Next real-world step: exercise this in the live app
  with an actual UTG-opens-gets-3bet-from-a-specific-seat hand and confirm
  the equity panel's numbers match this table.


## 2026-07-14 (cont'd 6) — Split the 35-74BB 'mid' depth bucket in two
**Files: ranges.js**

- User noticed the existing `mid` bucket (35-74BB) was too coarse — a 35bb
  stack and a 74bb stack got the exact same theoretical range, a 39bb-wide
  span glossed over as one number. Asked to add another bucket.
- Split: `mid` now covers **55-74BB**, new `midlow` covers **35-54BB**.
  60bb (today's active data point) sits solidly inside `mid`, not on an
  edge. `deep` (75+), `short` (20-34), `push` (<20) unchanged.
- `midlow` populated for all 8 table sizes (2-9) as an explicit deep-copy of
  `mid` — a documented placeholder, not fabricated data, same principle as
  every other "we don't have real numbers for this yet" spot in this file.
  When real 35-54BB solver data comes in for a given size/position, it
  overwrites `midlow` directly, same pattern already used for `mid`'s own
  RFI overrides.
- Verified: boundaries land exactly as intended (35bb→midlow, 54bb→midlow,
  55bb→mid, 74bb→mid); `midlow` and `mid` return identical combo counts
  right now (expected, since one is a copy of the other); full validator
  pass, 0 errors/0 warnings, across all 8 sizes.


## 2026-07-14 (cont'd 5) — Fixed position labels for 6-max and 8-max: MP → LJ
**Files: state.js**

- Came up while preparing to import today's "UTG vs 3-bet" data (7 GTOWizard
  screenshots, one per 3-bettor position at 8-handed/60bb): user noticed the
  app's own 3rd-position label ("MP") didn't match what solvers/training
  sites actually call that seat, and wasn't sure which was right. Correctly
  refused to guess and pushed to verify before touching anything, since this
  is foundational — wrong here means every future range import is silently
  mislabeled.
- Verified two real data points directly (not guessed, not inferred from a
  single source):
  - **8-handed**: GTOWizard's own glossary (gtowizard.com/glossary/middle-position)
    states explicitly that the two seats between CO and UTG+1 are "Lojack
    (LJ) and Hijack (HJ)" — matches the 7 screenshots exactly (UTG, UTG+1,
    LJ, HJ, CO, BTN, SB, BB).
  - **6-handed**: user found independent confirmation from a second tool
    (PokerCoaching.com's cash-game range tool), whose own position selector
    for 6-max shows LJ, HJ, CO, BTN, SB, BB — no UTG at all.
  Both directly contradicted `state.js`'s existing `PBN` table (which had
  `UTG,MP,CO` for 6-max and `UTG,UTG+1,MP,HJ,CO` for 8-max — an older/
  alternate naming convention, also real and used elsewhere, just not the
  one matching the solver data this project is now standardizing on).
- Tried to independently verify 9-max and 10-max too (searched GTOWizard's
  own glossary/blog, couldn't find an explicit statement; asked the user to
  check the product directly, but GTOWizard's free tier caps at 8-handed).
  Given no reliable source for those two, left `PBN[7]`, `PBN[9]`, `PBN[10]`
  completely untouched — 7 was a tempting, low-risk interpolation between
  two now-confirmed endpoints, but per the same standard applied all
  session, an interpolation is still a guess until it's actually confirmed
  against a real source, so it stays as-is for now too.
- Fix: `PBN[6]` → `['BTN','SB','BB','LJ','HJ','CO']` (was `...,'UTG','MP',...`).
  `PBN[8]` → `['BTN','SB','BB','UTG','UTG+1','LJ','HJ','CO']` (was
  `...,'MP','HJ',...`). Verified by actually running `assignPos()` (not just
  reading the array) for real 6- and 8-seated tables — output matches both
  confirmed screenshots exactly, seat-for-seat.
- Checked the blast radius before shipping: `S.playerRanges` (manual range
  saves) key off `playerId`, not position label — unaffected. Historical
  hand logs keep whatever label they already recorded — unaffected, and
  correctly so (that's what actually happened at the table at the time).
  `_RANGES`' existing alias table already had `'LJ':'MP'` mapped (pre-
  existing, likely added for the 10-max entry that already used LJ) — so
  6-max's newly-relabeled LJ seat automatically falls back to the existing
  `MP` theoretical data with zero loss, no extra work needed.
- Unexpected bonus found while checking 8-max: `_RANGES[8]` already
  contained *both* an `MP` entry and a separate, wider, more complete `LJ`
  entry (looked like genuine solver data, e.g. `RFI` at `mid` depth: 18
  hands under `MP` vs 45 under `LJ`) — the `LJ` entry was already sitting
  there correctly populated but silently unreachable, because `assignPos()`
  was never labeling any real seat "LJ" at 8-handed before this fix. So this
  wasn't purely a naming fix — it also activated better data that already
  existed but was dead weight. The old `MP` entries at size 8 are now
  themselves the dead/vestigial ones (same pattern as the `BTN/SB` leftover
  found earlier this session) — left in place, not deleted, in case they're
  wanted for reference.
- Re-ran `validate_ranges.js` after the change — still 0 errors, 0 warnings
  (the now-vestigial `MP` entries at size 8 don't trigger anything, since
  `MP` remains genuinely required and in active use at sizes 7/9/10, which
  weren't touched).


## 2026-07-14 (cont'd 4) — New RANGES workflow: "+" notation support + expand/validate tools
**Files: ranges.js, tools/validate_ranges.js (rewritten), tools/expand_range.js (new)**

- Follow-up to the standing plan (search out and add solver-backed ranges for
  many more situations/table sizes) — user asked to fix the *working method*
  itself before starting that at volume, rather than repeating the manual
  expand-by-hand process each time (which is exactly how the "66+" → 100-
  combos-instead-of-170 near-miss happened earlier this session).
- **Root parser now understands "+" notation.** `_parseRangeToSet` (the
  single function everything else — `_rangeStrToCombos`, `_adjustRangeForType`,
  etc. — already builds on) now expands standard solver shorthand: `"66+"` →
  `66,77,88,...,AA`; `"ATs+"`/`"A2s+"` → suited combos up to `AKs`; same for
  offsuit. Added via a new small `_expandPlusToken` helper. Existing tables
  (already fully spelled out, no "+") are completely unaffected — this is
  additive, not a format change. Also rewrote `_countCombos` to build on
  `_parseRangeToSet` instead of its own separate parsing loop (was the last
  place in the file still duplicating that logic — same drift risk as every
  other bug this session, now closed).
- **Important scope limit, on purpose:** `_RANGES` entries themselves should
  still be *stored* fully expanded, not with raw "+". The range-editor UI
  (render.js) seeds its grid selection straight from `.split(',')` on the
  stored string, without going through `_parseRangeToSet` — a stored `"66+"`
  would show up as one broken, non-highlighting cell instead of 9 correctly-
  highlighted ones. The parser fix is a safety net (anything that slips
  through degrades gracefully into a correct equity number instead of a
  silently wrong one), not a green light to store raw solver shorthand.
- **`tools/expand_range.js` (new):** takes solver-style "+" input, returns
  the fully-expanded, ready-to-paste comma list plus a hand-count/combo-
  count/percentage summary — using the app's own real `_parseRangeToSet`/
  `_countCombos` via `require()`, not a reimplementation. Verified against
  two ranges already confirmed correct earlier this session (the UTG 236-
  combo/17.8% and 170-combo/12.8% GTOWizard ranges) — both reproduced bit-
  for-bit.
- **`tools/validate_ranges.js` (rewritten):** now `require()`s `ranges.js`
  directly instead of regex-scraping the source text and `eval`-ing the
  extracted object literal — more robust, and guaranteed to check against
  the actual live data structure rather than a brittle parse of it. Updated
  "+" handling to match the new capability: a malformed "+" token (bad
  rank/shape, `_expandPlusToken` returns it unchanged) is still an error; a
  *well-formed* "+" token is now only a warning, pointing at the editor-UI
  caveat above and at `expand_range.js` as the fix. Re-verified against the
  same injected-mistake tests as before (malformed → error, well-formed →
  warning, clean file → 0/0).
- **Enabling change:** added a guarded `module.exports` at the bottom of
  `ranges.js` (`if(typeof module!=='undefined')...`) exposing `_RANGES` and
  the parsing functions to Node tooling. Invisible to the browser (`module`
  doesn't exist there, so the whole block is skipped) — confirmed the file
  still loads and behaves identically as a plain `<script>` include.
- **New intake workflow going forward:** paste solver output (any "+"
  shorthand) → run `expand_range.js` → paste the expanded result into the
  right `_RANGES[size][depth][pos][category]` slot → run
  `validate_ranges.js` before shipping. Both tools now read the app's actual
  logic instead of a parallel copy, so they can't drift from what the app
  really does the way earlier bugs this session did.
- Side note, noticed incidentally while testing (not investigated further,
  not necessarily a problem): table sizes 5 and 6 currently appear to share
  some underlying BB range data by reference in the source, based on how a
  test edit to one location showed up as flagged in both. Worth a look if
  5-max and 6-max are ever meant to diverge and don't.


## 2026-07-14 (cont'd 3) — Unified the three duplicated seat-range resolvers
**Files: ranges.js, render.js**

- Direct follow-up to the three bugs fixed earlier today (BB continue-range
  hole, Station actionCat mismatch, manual range ignored in the opening-spot
  flow) — all three were different symptoms of the same structural problem:
  two places in `render.js` (`unknownOppRangeInfo`'s per-seat resolver, and
  `computeFieldCombos`) each re-implemented "what's this seat's effective
  range" with their own inline priority logic, and drifted apart on details
  each time. User asked directly why not fix that properly now instead of
  leaving it as a noted risk.
- Added `_resolveOpponentRangeStr(seat, opts)` in `ranges.js` — single
  implementation of the priority chain used everywhere an opponent's range
  needs resolving: (1) manually-saved range (`S.playerRanges`), (2) old
  global range-selection (`rs`/`S._rangeSelection`, only reachable from the
  "normal" equity flow — the opening-spot flow always has `rs===null` by its
  own definition, so this tier is naturally inert there), (3) automatic
  (position + action category, with player-type adjustment). Supports
  `actionCatOverride` for the call-only/3bet-only split; if a manual range
  is present and a split is requested, explicitly returns `rangeStr:null`
  (still no attempt to fabricate a split from an unstructured manual range —
  same behavior as the standalone fix from earlier today, just centralized).
- Rewired both call sites (`unknownOppRangeInfo` and `computeFieldCombos`)
  to call the shared function instead of their own inline copies. Left
  `_getAutoRangeForSeat` (range-editor seed) as its own function — its
  caller already does its own manual-range check *before* calling it
  (`existing || _getAutoRangeForSeat(...).rangeStr`), and it intentionally
  computes depth from the seat's own stack rather than the min-effective-
  stack the equity flows use, which is a real, deliberate difference, not
  drift — folding it into the shared resolver would either lose that
  distinction or need extra parameters most callers don't need.
- Verified (node): all three priority tiers of the unified function return
  the expected result in isolation (manual range wins and correctly refuses
  to split; global-selection tier reachable and scoped by table size/depth
  as before; automatic tier reproduces both of today's earlier fixes). Most
  importantly, the BB-hole and Station-mismatch fixes are now *structurally*
  unified rather than just independently patched — confirmed
  `_resolveOpponentRangeStr` gives identical combo counts for round=0 vs
  round=1 for a Station-tagged BB (898 combos both ways), which is no longer
  two code paths that happen to agree, but literally one code path.
- Net effect for future changes: a fourth bug of this exact shape (someone
  adds a new range-affecting rule to one call site and forgets the other) is
  no longer possible for these two call sites, since there's only one place
  left to add it.


## 2026-07-14 (cont'd 2) — Opening-spot equity ignored manually-saved opponent ranges entirely
**Files: render.js**

- User's follow-up test was decisive and ruled out player-type as the cause,
  as suspected: pulled up GTOWizard at 200bb (UTG open range, and BB's
  call/raise/fold breakdown facing that open), edited both אילן's (UTG) and
  איתן's (BB) *manually-saved* ranges in the app to match GTOWizard exactly
  (236 combos/17.8% and 858 combos/64.7% respectively — confirmed via the
  range editor, which displayed those exact numbers), then ran the identical
  two ranges through PokerCruncher independently: 59.6% for the UTG hand/
  range. The app's own equity panel showed 46.2% — a 13-point gap, this time
  with zero player-type adjustment involved (manual ranges bypass
  `_adjustRangeForType` entirely elsewhere in the app, by design).
- Root cause: `computeFieldCombos` (the isOpeningSpot equity helper added/
  touched earlier this session) built every opponent's range purely from
  `_getContextualRangeInfo` (the theoretical solver table) — it never checked
  `S.playerRanges[playerId]` at all. Every *other* range-lookup site in the
  codebase (the range editor's seed, the "normal" equity-vs-already-acted-
  opponent flow at `unknownOppRangeInfo`, hero's own range in this very same
  isOpeningSpot block) follows a documented priority order — manual range
  first, theoretical table as fallback. This one helper was the one place
  that skipped straight to the fallback, silently discarding any manual
  range the user had carefully calibrated and saved for that opponent.
- Fix: added the same manual-range lookup (`S.playerRanges?.[s.playerId]`,
  same priority-1 check used at the `unknownOppRangeInfo` site) at the top of
  `computeFieldCombos`'s per-seat loop, before falling through to
  `_getContextualRangeInfo`. One edge case handled: the call-only/3bet-only
  split (this session's earlier addition) has no principled way to split a
  flat manually-saved range into a call-portion and a 3bet-portion — if the
  focused opponent has a manual range, the split silently doesn't fire for
  that opponent (returns null, so no CALL/3BET boxes render) rather than
  fabricating a meaningless number; the merged/full equity figure is
  unaffected and now correctly uses the manual range.
- Verified the lookup-priority mechanics directly (node): confirmed a
  populated `S.playerRanges` entry now produces a materially different,
  correctly-divergent equity figure compared to the old theoretical-only
  path (57.5% vs 50.5% against a partial hand-reconstructed stand-in for the
  saved BB range) — proving the priority branch is reachable and changes the
  outcome as intended. Couldn't reproduce the user's exact 858-combo string
  byte-for-byte outside the live app (the on-screen text was truncated with
  "K..."), so the precise 46.2%→59.6% figures weren't independently
  re-derived here — next step is to re-run the identical in-app scenario
  post-fix and confirm the panel now lands close to PokerCruncher's 59.6%.
- This is the third distinct bug this session traced to the same underlying
  pattern: multiple code paths independently re-deriving "this seat's
  effective range" instead of sharing one lookup, and drifting apart on
  different dimensions each time (missing union, actionCat-gated type
  adjustment, and now a missing priority tier entirely). Reinforces the
  standing suggestion to eventually consolidate `_getAutoRangeForSeat`,
  `unknownOppRangeInfo`'s per-seat resolver, and `computeFieldCombos` into
  one shared range-resolution function used everywhere.


## 2026-07-14 (cont'd) — Fixed Station-type widening mismatch between range editor and equity panel
**Files: ranges.js**

- User did the right thing after the earlier fix in this same session: took the
  app's own numbers to an external tool (PokerCruncher) to verify independently
  — hero's saved 170-combo UTG range vs. BB's auto-computed continue-range.
  Two things looked wrong: (1) the range editor's grid for BB looked far wider
  than the ~20% the earlier union-fix should produce, and (2) the equity panel's
  "55.9%" didn't match PokerCruncher's "64.7%" for what should've been the same
  matchup.
- Root cause, found by reproducing both code paths standalone (node, with
  `game.js`'s real `evaluateHand` loaded — an earlier attempt using a stub
  environment without it silently returned a constant hand-rank and produced a
  misleading flat 50% every time, worth remembering as a pitfall for future
  headless testing here). `_adjustRangeForType`'s `Station` branch only adds
  `_RANGE_STATION_EXTRA` (the wide extra-calling-hands set) when
  `actionCat==='call'` exactly. But the two call sites that both ask "what's
  this BB's continue-range" hand back *different* actionCat labels for what is
  conceptually the identical situation: `_getAutoRangeForSeat` (seeds the
  manual range editor) returns `'call'` for the not-yet-acted-BB case (per
  earlier fix this session), while `computeFieldCombos` (equity panel, opening-
  spot flow) always simulates `round=1` and gets back `'facing-open'`. For a
  `Station`-tagged player, that label difference silently skipped
  `_RANGE_STATION_EXTRA` in one path and not the other — editor showed ~68%
  of hands, equity math used ~45%, hero equity came out ~55% (matching the
  in-app panel almost exactly) instead of ~64% (matching PokerCruncher almost
  exactly, once the correct wider range is used).
- Fix: widened the `Station` gate to `actionCat==='call' || actionCat==='facing-open'`
  — both labels represent the same "this player calls wide" decision point,
  so both should get the same treatment. `Fish` was never gated this way (adds
  `_RANGE_STATION_EXTRA` unconditionally) so it was never affected; `Nit`/`LAG`
  don't reference `actionCat` at all.
- Verified (node, both files + `game.js` loaded together): for a `Station`
  player, `_adjustRangeForType(range, 'Station', 'call')` and
  `_adjustRangeForType(range, 'Station', 'facing-open')` now both return
  exactly 898/1326 combos (67.7%) — identical, where before they diverged
  (898 vs 598 combos). Re-ran the actual `monteCarloEquityMulti` (12,000
  iterations, real hero range vs. real BB continue-range) through both paths
  post-fix and got consistent equity figures in the low-to-mid 60s for both,
  in line with PokerCruncher's independent 64.7%.
- Broader note for future debugging in this codebase: this is the second bug
  in the same afternoon caused by two code paths computing "the same" derived
  value (a seat's effective range) through parallel logic that quietly drifted
  apart on an edge case. Worth keeping an eye out for a third instance, and
  possibly worth a follow-up someday to unify `_getAutoRangeForSeat` and the
  opening-spot `computeFieldCombos` into one shared helper so this class of
  bug becomes structurally harder to reintroduce.


## 2026-07-14 — Fixed BB continue-range hole (call/3bet split preserved); added per-category equity split
**Files: ranges.js, render.js**

- User caught it via screenshots: opened the manual range editor for a BB
  player from an opening-spot equity screen (MP about to open, nobody has
  acted, "EQUITY vs BB" showing 41.0%) and found the auto-seeded range had a
  clear hole — AA/KK/QQ/JJ/TT and AKs/AQs/KQs were all missing, while weaker
  hands directly below them (99 down to 22, AJs-A7s, KJs-K9s, etc.) were
  present. Not a rendering bug — the actual range content had the gap.
- Root cause: `_RANGES[6].deep.BB` correctly splits `call` and `3bet` into
  two separate tables (premium hands live in `3bet`, not `call` — by
  design, and this split is important and was NOT touched). The bug was in
  `_getContextualRangeInfo`'s `round===0` branch: for BB with no actions
  yet, it returned the `call` table alone. That's correct when BB is
  genuinely facing zero aggression, but wrong for the common case where a
  live actor (MP here) is mid-decision to open — in that case BB's
  realistic continue-range is `call∪3bet`, exactly what `round===1` already
  computes elsewhere (the field-equity calc at the old line 584, hardcoded
  to round=1 for this exact reason). Two call sites answering the same
  question ("BB's range once action reaches them") gave two different
  answers because only one of them did the union.
- Fix: `round===0` branch, BB case only, now unions `call` and `3bet` the
  same way `round===1` does. Non-BB positions (RFI) unaffected — their
  tables were never split this way, so there was no hole there. The
  `call`/`3bet` table split itself is completely untouched; the union only
  happens at the point of use.
- Verified (node, direct call to `_getContextualRangeInfo(seat,'BB',6,'deep',0)`):
  before fix, 29 hands / missing AA,KK,QQ,JJ,TT,AKs,AQs,KQs; after fix, 45
  hands, all of the above present alongside the original `call`-table hands
  (99, AJo, etc.) — hole closed, nothing dropped.
- **Follow-up, same conversation:** since the call/3bet split is real and
  meaningful, user asked to also surface it in the equity display rather
  than only ever showing the merged number. Added: when focused on a
  single opponent (the existing per-seat focus picker), the panel now also
  shows two extra numbers — equity vs that opponent's `call`-only range and
  vs their `3bet`-only range — alongside the existing merged equity. Only
  fires in single-opponent focus mode (splitting call/3bet across multiple
  simultaneous opponents has no clean combinatorial meaning, so "כולם"
  mode still shows only the merged number, unchanged). Implemented via an
  `actionCatOverride` param on the existing `computeFieldCombos` helper —
  no new range data, just two extra targeted Monte Carlo calls reusing the
  same machinery as the main figure.
- Not yet touched, flagged for a possible separate follow-up: the
  historical postflop-equity replay path in `render.js` (~line 256) calls
  `_inferPreflopActionCat` directly and feeds its result straight into
  `_getRangeStrForDepth`, bypassing `_getContextualRangeInfo` entirely —
  so the same BB hole could still show up there for old saved hands. Left
  alone this round since it's a different code path with different
  side effects (historical hand replay, not live equity) and wasn't part
  of what was reported.


## 2026-07-12 — Per-winner amount saved; dead hand-level fields removed; CSV result column fixed
**Files: game.js, render.js**

- Direct outcome of a long data-architecture review (planning ahead
  for future stats — "show me all my AK hands", per-player win/loss
  over time). Confirmed most of what's needed is already free from the
  existing `handLog` (cards, position, actions, timestamp) — but found
  two real, concrete gaps worth fixing before more hands accumulate on
  the old shape.
- **Gap 1 — winner amounts computed then discarded.** `awardPot()`
  already computes exactly how much each winner receives (`awards`,
  respecting side pots and remainder rounding) — used only for the
  chip-flying animation, then thrown away. `S._lastWinners` (and by
  extension every saved hand's `winners[]`) only ever stored
  `{seatIdx, playerId, name}`. Fix: added `amount: awards[idx]||0` to
  each entry — one field, using a number the code already had.
- This single fix resolves two things identified during the review:
  per-hand profit/loss per player (previously uncomputable for
  winners — the amount simply wasn't there), and reconstructing
  "effective stack before the hand" (confirmed via code trace that
  `saveHandWithLabel()` reads `s.stack` *after* `awardPot()` already
  ran — so the saved stack is post-hand, not pre-hand; pre-hand stack
  = saved stack + total invested − amount won, and the winning amount
  was the missing piece).
- **Gap 2 — three unused hand-level fields.** `result:null, amount:'',
  notes:''` on every saved hand. Searched the whole codebase for any
  read of these before removing anything: found two, both dead —
  `ui.js`'s `winners2` (computed, never referenced again after that
  line) and `render.js`'s CSV export "תוצאה" column, which read
  `h.result` — always blank in every export ever produced, since
  nothing ever set it. Removed both fields from `saveHandWithLabel()`.
- **CSV export fixed as a direct follow-up**, not a separate ask: the
  "תוצאה" column was hand-level (same value shown for every player
  row in a hand — wrong shape even if populated, since players in the
  same hand can have opposite results). Rewritten to be per-row: sums
  each player's `actions[].amount` (total invested, correctly handles
  the delta-not-total storage already in place) against their
  `winners[]` entry if any, giving true per-player net for that hand.
- Verified (jsdom) end-to-end: played a full 2-seat hand (SB raises to
  2000, BB calls, SB wins a 5000 pot) → `S._lastWinners[0].amount`
  correctly 5000; saved hand's `winners[]` carries the same amount;
  `result`/`amount`(hand-level)/`notes` confirmed absent from the
  saved object; CSV export produced exactly `+3000` for the winner and
  `-3000` for the loser — manually verified against the actual
  investments (SB invested 2000 total, won 5000, net +3000; BB
  invested 3000, won 0, net −3000) — zero-sum, as poker without rake
  should be.


**Files: ranges.js**

- First actual application of the 60BB solver dataset (PokerCoaching,
  collected across the last several messages) into production range
  tables — everything up to now was comparison/analysis only.
- Critical scoping correction caught before writing any code: the
  original plan said "update the mid table" generically, but
  PokerCoaching's 8-max structure (UTG, UTG+1, LJ, HJ, CO, BTN, SB — 6
  non-blind positions) doesn't map onto `_RANGES[6]` (true 6-max: only
  UTG, MP, HJ, CO, BTN — 5 positions, no LJ, no separate UTG+1).
  Correct target is `_RANGES[9]`, whose 9-max position set already has
  all 7 solved positions with no collapsing needed. Confirmed in code
  that `_RANGES[8]=_RANGES[9]` and `_RANGES[7]=_RANGES[9]` (literal
  same-object aliases) — so this single edit correctly covers 7, 8,
  and 9-handed tables at once, matching the user's actual home-game
  setup (fixed at 8-handed).
- Only `RFI` written for each position — the one action with real
  solver backing. `3bet`/`call`/`4bet` deliberately left undefined on
  these mid entries; confirmed (not assumed) that `_getRangeStrForDepth`'s
  existing fallback chain (`rByDepth[pos][action] → six[pos][action] →
  alias chain`) already resolves them sensibly to the 6-max tables
  without any new fallback code needed — including through the
  `LJ→MP`/`UTG+1→UTG` alias for the two positions 6-max doesn't have
  at all.
- Mixed-frequency cells (e.g. K7s at ~40% raise) excluded from all 7
  ranges, consistent with the boolean-only in/out design decided
  earlier this session — this is why each position's combo-weighted
  % comes in a few points below the app's own frequency-weighted
  number (e.g. UTG here: 15.1% vs the screenshot's 16.5%) — expected,
  not a transcription error.
- Verified (jsdom, `_getRangeStrForDepth` called directly — not just
  string-literal inspection): all 7 positions × table sizes 7/8/9
  return the exact expected hand-type count (UTG 37, UTG+1 41, LJ 45,
  HJ 59, CO 63, BTN 114, SB 153 — 21/21 checks passed) with zero
  duplicate hands in any list; 3bet/call/4bet fallback confirmed
  non-empty for both a position with its own 6-max entry (UTG) and one
  that only exists via alias (LJ→MP); `deep`/`short`/`push` and the
  untouched `MP`/`BB` positions confirmed unchanged (byte-identical
  hand counts to before this edit).
- Noted in passing, out of scope for this fix: `_RANGES[9].deep.UTG`
  is oddly narrow (13 hand-types — narrower than the new mid entry at
  37) — a pre-existing gap, not introduced or touched here; needs its
  own deep-depth 9-max solver pass later.


**Files: render.js**

- Direct response to the sticky-selection bug fixed a moment ago: user
  proposed a cleaner redesign instead of just adding a quick-clear
  button — let "equity vs field" default to the full field (unchanged),
  but add the ability to tap any *specific* remaining opponent and see
  equity vs just their range, with an obvious way back to the default.
  This replaces the disconnected old `S._rangeSelection` mechanism
  (arbitrary position/action lookup, not tied to real seats — the thing
  that got stuck) with something anchored to actual seats at the table.
- New `S._openingFocusSeat` (a seatIdx or null). In the opening-spot
  calc, `remainingSeats` narrows to just that one seat when set;
  `computeFieldCombos()` (shared by both hand-mode and range-mode,
  already extracted last entry) works unchanged either way — it just
  receives a shorter seat list. Hero side (fixed hand or range) is
  completely untouched by which mode is active, exactly as the user
  described ("of course, if you pick a hand it changes accordingly" —
  it already did, no new code needed there).
- Self-healing by construction, not by extra logic: `focusSeatIdx` is
  only honored if it's still present in the *current* `allRemainingSeats`
  list (recomputed fresh every render from live seat state) — if the
  focused seat folded, left, or simply doesn't exist (e.g. stale seatIdx
  from a previous hand), it silently falls back to full-field mode.
  Structurally cannot get stuck the way the old selector did, since
  there's no separate "clear" step required — invalid input just isn't
  matched, full stop.
- UI: label switches "EQUITY מול השדה" → "EQUITY מול {name}" when
  focused, with matching sub-caption ("הטווח שלו בלבד" vs "אם כולם
  ממשיכים"). New chip row below the main bar (only shown when field
  data exists): "🌐 כולם" (reset) plus one chip per remaining opponent's
  actual name — tapping any of them sets the focus, "כולם" clears it.
- Verified (jsdom): AA vs full 3-opponent field = 62.7% (consistent with
  the earlier ~62–65% reference range); AA focused on a single opponent
  = 83.9% (consistent with the well-known AA-vs-1-random ≈ 85%
  reference — confirms the narrowed field-combos path computes
  correctly, not just a UI label change); explicit clear-back-to-field
  works; deliberately setting an invalid seatIdx (99, simulating a
  stale/impossible focus) self-heals to full-field mode automatically
  with no separate recovery action needed — the exact property the
  previous fix had to bolt on manually for the old selector.


**Files: render.js**

- User reproduced exactly: opened the old position/action reference
  selector ("🎯 Range"), picked BB, then picked BTN again — but the
  new opening-spot info (RFI check, range-vs-field, everything from
  the last few entries) stayed hidden even after "switching back."
  Root cause (pre-existing design, not introduced today, but now much
  more consequential since more useful info depends on it):
  `isOpeningSpot` requires `!rs` (`rs = S._rangeSelection`) — picking
  ANY position in that selector sets `_rangeSelection` to a non-null
  object and it *stays* non-null no matter what you pick next;
  "switching back to BTN" just changes its value, never clears it.
  The only clear path (`S._rangeSelection=null`) was a small text link
  buried *inside* the expanded selector panel — invisible once you
  collapse it, so there was no way back without reopening it.
- Fix: added a small red "✕" button next to the "🎯 Range ✓" toggle
  itself, shown whenever `rs` is truthy — reachable whether the panel
  is expanded or collapsed, one tap to clear
  (`S._rangeSelection=null`) and restore the opening-spot behavior
  immediately. The original clear link inside the expanded panel is
  untouched (still works, just no longer the only way).
- Verified (jsdom): reproduced the exact reported sequence (select
  BB → select BTN, no explicit clear) — opening-spot info correctly
  absent, matching the bug report; new quick-clear button confirmed
  present in that state; clicking it (simulated) restores the display
  immediately.


**Files: render.js**

- Direct follow-up to the "equity vs field" feature from a few messages
  ago. User's question: the hero side of that calc is currently always
  a *fixed hand* (via `holeCards`) — but the app already supports
  sampling the hero's hand from a *range* each iteration (`heroCombos`,
  used elsewhere for regular "range vs range" equity). Since the field
  side doesn't need to change at all, could the same opening-spot
  mechanism work with the hero's assigned range instead of requiring
  specific cards? Confirmed yes — this was a natural, low-risk
  extension of the existing engine, not new equity logic.
- `isOpeningSpot` broadened from requiring exactly 2 hole cards to
  `holeCards.length!==1` (covers both 0 and 2; the ambiguous
  half-entered state is unchanged/excluded, same as before). Inside,
  the block now branches: **sub-mode 1** (cards entered) is the
  existing in-range check + hand-vs-field equity, unchanged. **New
  sub-mode 2** (no cards, but a range is available — manual save, or
  falls through to the same theoretical position range used
  elsewhere) samples the hero's hand from that range every Monte Carlo
  iteration via `heroCombos`, against the exact same
  `computeFieldCombos()` helper (extracted from the field-equity
  feature, now shared by both sub-modes instead of duplicated).
- Emergent (untested-for, but correct) behavior: since sub-mode 2 falls
  back to the theoretical RFI table when no manual range exists, an
  opening spot with no cards entered now ALWAYS shows *something*
  (range size + field equity) rather than only "פתיחה — הזן קלפים" —
  that fallback message is now reached only when position itself can't
  be resolved. Not something explicitly requested, but consistent with
  the session's running theme (prefer showing grounded information over
  a bare placeholder) and didn't require extra code — the existing
  manual-range-first / theoretical-fallback priority already produced it.
- UI: label switches between "RFI {pos} (ידני)" (hand mode) and "טווח
  {pos} (ידני/אוטומטי)" (range mode); primary display shows
  combos/percentage instead of a specific hand's in/out-of-range
  verdict in range mode. The "EQUITY מול השדה" column is unchanged and
  now populates correctly in both sub-modes.
- Verified (jsdom): no-cards + no manual range → auto theoretical UTG
  range kicks in (202 combos/15.2%), field equity 23.0%; no-cards +
  manual strong range (AA-88 + AK/AQ/AJ/AT, 82 combos/6.2%) → field
  equity 30.0% (higher than the wider auto range, as expected — a
  tighter/stronger range should out-equity a wider one against the
  same field); specific-hand mode (AA) unaffected and still shows
  62.1%, correctly higher than the range containing it (AA is the
  range's strongest member, pulling the range average down) — all
  three numbers move in the theoretically correct relative direction;
  hand-mode display confirmed to never leak range-mode markup ("combos"
  string absent) and vice versa.


**Files: render.js**

- User caught a real, reproducible bug via screenshots: manually saved
  a range for a player (UTG) that included 76s, but the live "בטווח/
  מחוץ לטווח" check at the opening-spot moment still said "מחוץ לטווח"
  for that exact hand. Root cause: `openRangeInfo` (the isOpeningSpot
  branch) called `_getRangeStrForDepth` directly, never checking
  `S.playerRanges[seat.playerId]` first — the ONE place in the app
  that didn't already follow the established manual-range-first
  priority order used everywhere else (range editor, live equity,
  hero auto-range).
- Fix: check the manual range first, fall back to the theoretical
  table only if none exists — same pattern as everywhere else. Added
  an `isManual` flag, surfaced in the UI ("RFI UTG (ידני)") so this
  specific discrepancy is visible at a glance next time instead of
  silently mismatching.
- Separate follow-up from the same conversation: user asked why an
  opening spot shows "in range?" instead of an equity number, since a
  range's equity is computable. Explained the real reason (no actual
  opponent has acted yet — equity vs nobody is meaningless, per the
  "meaningless 100% equity" fix from earlier this session) — then user
  proposed a good middle ground: equity vs the *hypothetical*
  continue-ranges of everyone still left to act (not a single "average"
  opponent, real multi-way equity, one range per remaining seat).
- New "equity מול השדה" (field equity): for every other active,
  non-folded seat, computes their continue-range via the existing
  `_getContextualRangeInfo(seat, pos, tableSize, depth, 1)` — passing
  a *hypothetical* raiseRound of 1 (not touching the real
  `S.raiseRound`, since no one has actually raised yet) to simulate
  "if I open now, what would they play back with." Runs through
  `monteCarloEquityMulti` same as any other multi-way equity in the
  app. Shown as an additional info column next to the existing
  in/out-of-range check — doesn't replace it, doesn't change any
  decision logic, purely informational.
- Verified (jsdom): reproduced the exact screenshot scenario — before
  the manual-range fix, 76s at UTG showed "מחוץ לטווח"; after saving a
  manual range containing 76s, correctly flips to "✓ בטווח (ידני)".
  Field-equity sanity check against known values: AA vs a 3-opponent
  wide field ≈ 62.5% (real-world AA-vs-3-random reference is ~65% —
  consistent, since the ranges here are wide but not literally
  random); 32o ≈ 15.4%, correctly far lower — ordering and magnitude
  both check out.


**Files: render.js, ranges.js (new), index.html**

- User's question ahead of the big solver-data update (7 positions ×
  multiple depths incoming): with `render.js` about to grow
  significantly from range tables alone, does it make sense to split
  that out, and is it even possible given the app has no bundler
  (plain `<script>` tags, everything global via `window`, no
  import/export)? Confirmed: yes, trivially — global scripts don't
  care which file a function/const lives in, only that all relevant
  files have executed before anything is actually called at runtime
  (already relied on this today for render.js/game.js cross-references).
- Extracted a single clean, contiguous block (`render.js` lines
  73–665) into new `ranges.js`: `_RANGES` (all table sizes/depths),
  `_POS_BY_SIZE`, `_ACTIONS_LABELS`, `_HAND_RANKING`, `_RANGE_LOOSEN`/
  `_RANGE_TIGHTEN`/`_RANGE_STATION_EXTRA`, and every function that
  operates on this data: `_depthFromBB`, `_getRangeStrForDepth`,
  `_adjustRangeForType`, `_inferPreflopActionCat`,
  `_getContextualRangeInfo`, `_getAutoRangeForSeat`,
  `_getEmpiricalLimpHands`, `_topPercentRange`, `_rangeStrToCombos`,
  `_cardsToHandNotation`, `_parseRangeToSet`, `_unionRangeStr`. The
  Monte Carlo equity engine itself (`monteCarloEquity`,
  `monteCarloEquityMulti`, `_fullDeck`, `_handRankMC`, etc.) is a
  separate concern — deliberately left in `render.js`, since it
  doesn't grow with new solver data the way the range tables do.
  `index.html` updated with `<script src="ranges.js"></script>`
  right before `render.js`.
- `render.js`: 2893 → 2295 lines. New `ranges.js`: 603 lines, with
  room to grow as the 7-position × multi-depth solver dataset
  (collected this session, not yet applied) gets added — without
  bloating the UI/rendering file further.
- Verified (jsdom, loading all 7 scripts in the exact `index.html`
  order): `_RANGES`/`_getAutoRangeForSeat`/`_HAND_RANKING` (169
  entries) all accessible after the split; re-ran this session's key
  scenarios end-to-end post-split — facing-open (UTG opens → MP gets
  `facing-open`, 12 hands), real limp (still empty/`'limp'`, no
  fabrication), range editor open + live type-switch refresh
  (TAG→Fish, 19→101 hands), HU deep BTN/SB still includes 32s (this
  session's very first fix) — all identical to pre-split behavior;
  `node --check` clean on all 4 changed/new files; no duplicate or
  missing function definitions between the two files (every extracted
  name confirmed to exist exactly once, total).


**Files: render.js**

- User caught it visually across three screenshots (LAG/Station/Fish,
  all at UTG mid-depth RFI): A4s/A3s/A2s showed as clear gaps in an
  otherwise-continuous range, with the same missing-K9s pattern from
  the earlier `call`-table finding now visible again at mid-depth.
- Root cause confirmed: `_RANGE_LOOSEN` (the additive list for
  LAG/Station/Fish) contained ZERO suited-ace hands (only offsuit A9o-
  A2o), and jumped straight from KQs to K8s (no K9s). UTG's mid-depth
  RFI base table only goes down to A5s — so for any position/depth
  whose base range doesn't reach A4s-A2s, and since LOOSEN never
  contributed any Axs at all, those hands were permanently
  unreachable for LAG/Station/Fish, regardless of how wide the tag
  should nominally make the range.
- Fix: added `A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,K9s` to `_RANGE_LOOSEN`.
  Adding hands already present in some base tables is harmless (the
  adjustment logic already dedupes via a `Set`) — this specifically
  targets the positions/depths where they were missing without
  affecting anywhere they already existed.
- Verified: LAG/Station/Fish at UTG-mid RFI now all include A4s, A3s,
  A2s, K9s (previously absent in every one of them); TAG (no type tag)
  produces byte-identical output to before (early-return path
  untouched); Nit is completely unaffected (it never reads
  `_RANGE_LOOSEN` — it only removes hands from the base range via its
  own separate `_RANGE_TIGHTEN` list, so this change has zero surface
  area there).


**Files: index.html, game.js, ui.js**

- User caught it via screenshot: the seat card-picker popup showed TWO
  camera buttons — the one added earlier today inside the popup
  content, and a pre-existing one already built into the popup's
  header (`index.html`) that I hadn't noticed. Worse, the pre-existing
  header button was hardcoded to `openCameraForCards('board')`
  unconditionally — meaning if it had ever been tapped while the popup
  was open for a SEAT card (which it always could be, since it's the
  same shared `card-picker` element for both), it would have silently
  tried to recognize the wrong target (the board instead of the
  player's hand) — a latent bug independent of today's duplicate.
- Fix: removed the duplicate button from `openSeatCardPicker`'s
  content entirely (kept only "🗑️ נקה קלף" there). Gave the header
  button an id (`cp-camera-btn`) and made it context-aware instead:
  `openSeatCardPicker` points it at the specific seat
  (`openCameraForCards('${seatIdx}')`) when opened for a player's
  card; `openCP` (the generic board/etc. picker in ui.js) resets it
  back to `'board'` on every open, so reopening for the board after
  using it on a seat doesn't leave it pointed at the wrong target.
- Verified (jsdom): exactly one `#cp-camera-btn` exists in the DOM
  (no duplicate); opening a seat's card picker sets its onclick to
  target that seat; no camera button duplicated in the popup content;
  the existing clear-card button still appears correctly once a card
  is set; reopening the generic picker for a board card resets the
  camera button back to `'board'`.


**Files: game.js**

- User friction: to compare how a range looks under different player
  types, you had to exit edit mode, tap a different type chip, then
  re-enter edit mode — the editor's grid was only ever seeded once, at
  open time, and never revisited on a type change while it stayed open.
- `setSeatPlayerType` now re-seeds `_rangeEditSel` live when relevant,
  with a careful distinction to avoid clobbering real work:
  - No manual range saved for the player yet → the editor's default
    view ('original') *is* effectively just the auto/theoretical
    range under the hood, so it updates live on every type switch —
    this is the exact case the user hit (comparing LAG/Fish/etc. on a
    fresh, never-saved seat).
  - A real manual range *is* saved, and the editor is showing "↩️
    המקורי" → stays frozen. That view is an intentional anchor back to
    what the person actually assigned; it shouldn't shift just because
    they're experimenting with type tags.
  - Explicit "🎯 אוטומטי" view → always live, in every case (its whole
    purpose is to show the current theoretical range).
  - "🃏 לימפים" view or a manually-edited grid (no active view) →
    untouched, as before — type doesn't affect empirical limp data,
    and hand-picked edits are never silently overwritten by a tag change.
- Always does one full `renderSeatPanel()` regardless of the above
  (previously always did this too) — needed so the type-chip
  highlighting itself updates, independent of whether the grid content
  changed.
- Verified (jsdom): fresh seat, no saved range — TAG(131)→Fish(141)→
  Nit(108) hand-types update live across two consecutive type switches
  without leaving the editor; same player with a real saved manual
  range (AA,KK,QQ) — switching type while viewing "המקורי" stays at
  exactly 3, unmoved; explicitly switching to "אוטומטי" afterward
  still recomputes correctly per type.


**Files: render.js**

- User's concrete test case: UTG opens (RFI). Before this fix, the
  next player's auto-range (seat panel, or as an "unknown opponent" in
  equity) showed RFI too — identical to the case where UTG hadn't
  acted at all — because `_getAutoRangeForSeat`/`_inferPreflopActionCat`
  only ever looked at a seat's OWN action history, never at what had
  already happened elsewhere at the table. A player facing an open
  isn't a candidate to open themselves anymore; showing RFI there
  implied a decision that's no longer available. Explicit ask: this
  needed to work between any two players at the table, not just
  hero-vs-a-specific-opponent.
- New `_getContextualRangeInfo(seat, pos, tableSize, depth,
  currentRaiseRound)`: single shared function now used by every
  auto-range call site (seat panel, live opponent equity, hero range).
  If the seat has already acted, unchanged (their real action). If
  not, checks `S.raiseRound` (the live global preflop raise counter,
  already tracked and reset per-hand/street — reused, not new state):
  - 0 raises so far → they're first up: RFI (or `call` for BB),
    exactly as before.
  - 1 raise so far → facing an open, undecided yet: union(call,3bet)
    — the "continue range" concept already used for the hero in one
    specific spot, now generalized to every seat via one function
    instead of a second, slightly different, hand-written copy.
  - 2+ raises → a third player facing a 3bet+ isn't a spot the basic
    per-position RFI/3bet/call/4bet tables were built to describe
    accurately (they only chart the original-raiser/original-caller
    roles) — consistent with the limp decision earlier today, returns
    no theoretical range rather than stretching a table beyond its
    design. New `'unclear'` category/label, same empty-range behavior
    as `'limp'` (including through the `_adjustRangeForType` empty-stays-empty
    guard from the previous fix — verified no player-type leak here either).
  - `_unionRangeStr` restored (it existed briefly for the reverted
    VPIP-union attempt, removed, now needed again for a genuinely
    well-founded reason: this is a real "continuing range" concept,
    not a guess at what a limp represents).
- Hero's auto-range in `renderPotOdds` now calls the same function
  instead of its own hand-written duplicate — which also fixes a
  latent version of the same bug for hero specifically (the old hero
  code used call∪3bet unconditionally whenever hero hadn't acted, with
  no check for whether hero was actually first-to-act with nothing
  having happened yet).
- Live opponent equity range also switched to the shared function for
  consistency, though in practice `unknownOppSeats` is already filtered
  to opponents who've acted this street, so this call site's behavior
  is unchanged (defensive alignment, not a functional fix there).
- Verified (jsdom): UTG-hasn't-opened → next seat gets RFI (43 hands,
  unchanged); UTG opens → next seat now gets `facing-open` (12 hands,
  confirmed equal to the real call∪3bet union for that position/depth,
  not a coincidental RFI match); a third seat behind an existing 3bet
  gets `unclear` with an empty range across all player types (TAG,
  Fish); UTG's own range after opening is unaffected; real-limp
  regression still empty; range editor opens correctly pre-seeded from
  `facing-open`; `renderPotOdds` runs cleanly end-to-end in a live
  facing-open scenario with no errors.


**Files: render.js**

- User pushback (correctly) on both of the last two attempts: RFI-only
  and RFI∪call-union are both fabrications feeding into equity math as
  if they were real strategy, and the team had already agreed earlier
  today not to spend effort inventing limp-range tables — the correct
  long-term answer is the empirical "🃏 לימפים ידועים" feature, built
  from real hand documentation over time, not a synthesized guess.
  Explicit instruction: stay theory-clean, don't touch equity-calc
  logic to "solve" limping.
- `_inferPreflopActionCat`: real limp (`Call` with `raiseRound===0`)
  now returns `'limp'` — a key that exists in NO `_RANGES` table for
  any position/depth/size. `_getRangeStrForDepth`'s existing fallback
  chain naturally resolves this to `''` everywhere it's called (seat
  panel auto-range, live opponent equity, historical hand equity, hero
  auto-range) — one change, uniform "no theoretical range" result,
  no per-call-site special-casing needed.
  `'RFI'` for no-action-yet (this session's earlier fix) is unchanged.
- `_getAutoRangeForSeat` reverted to the simple single-lookup version
  (the union logic added an entry ago is fully removed).
- Found and fixed a related leak while re-verifying end-to-end:
  `_adjustRangeForType` was unconditionally adding `_RANGE_LOOSEN` /
  `_RANGE_STATION_EXTRA` hands for LAG/Station/Fish-tagged players
  even when `baseRangeStr` was already empty — silently manufacturing
  a non-empty range purely from the type-adjustment step, defeating
  the "no theoretical range" guarantee for exactly the players most
  likely to be flagged as limpers. Fixed with an early return: empty
  base stays empty regardless of player type.
- `_ACTIONS_LABELS.limp` set to an explicit, honest label pointing at
  the empirical feature instead of implying a table exists.
- Verified (jsdom): all 5 player types (TAG/Nit/LAG/Station/Fish) now
  return `rangeStr:''` for a real limp with no exceptions; normal RFI
  (not a limp) is unaffected — Fish (141 hands) still wider than TAG
  (131), confirming the type-adjustment fix didn't break the working
  case; full equity-input chain confirmed 0 combos for a Fish limper,
  which correctly triggers the pre-existing (untouched) random-hand
  fallback already built into `monteCarloEquityMulti` — no new equity
  code written or modified anywhere in this fix.


**Files: render.js**

- User pushed back on the previous fix (real limp → RFI as the
  approximation): showing pure RFI implies "the hands they'd open
  with," which is backwards for a player who specifically chose NOT to
  open. Correct theoretical framing instead: since no limp-range table
  exists, show every hand that's VPIP-consistent — the union of RFI
  and call, without claiming more precision than that.
- New `_unionRangeStr(a,b)`: dedupes two comma-separated hand lists
  into one. `_getAutoRangeForSeat` now detects a true limp (last
  preflop action `Call` with `raiseRound===0`) directly (not just via
  the `_inferPreflopActionCat` category, which only returns a single
  label) and computes `_getRangeStrForDepth(...,'RFI',...) ∪
  _getRangeStrForDepth(...,'call',...)` instead of RFI alone.
- Player-type adjustment for this case now runs with `actionCat='call'`
  (not RFI) when passed to `_adjustRangeForType` — a limp is
  fundamentally a calling action, so a Station/Fish-tagged player
  correctly gets the extra wide-calling-range boost (`_RANGE_STATION_EXTRA`)
  that only applies to the 'call' category, not the RFI-only path.
- Display label added: `_ACTIONS_LABELS.VPIP = 'VPIP (לימפ)'` — the
  seat panel's "מבוסס על:" line now says VPIP instead of misleadingly
  saying "פתיחה" (RFI) for a hand the player didn't open.
- Verified (jsdom): BTN/SB heads-up limp → union (131 hand-types,
  equal to RFI alone here since the small call table is already a
  subset of the wide BTN/SB RFI range — union logic confirmed correct
  even where it doesn't visibly change the count); Fish-tagged limp
  (141) ≥ TAG-tagged limp (131), confirming the call-path type
  adjustment fired; a real call-vs-raise (`raiseRound:1`) is
  unaffected, still resolves to plain `call`.


**Files: render.js**

- Closed the gap flagged in the flowchart discussion two entries ago:
  `_inferPreflopActionCat` already defaulted a not-yet-acted non-BB
  seat to RFI (earlier fix today), but a seat that had *actually*
  limped this hand (last preflop action is `Call` with `raiseRound===0`
  — i.e. a real call with no raise having happened yet) still fell
  through to the generic `return 'call'` at the end of the function,
  pulling the narrow flat-vs-raise table (e.g. UTG: JJ,TT,AQs,AJs,
  KQs,AQo) for a player who, by definition, had no raise to flat
  against.
- Fix: `Call` actions now branch on `round`— `round===0` (true limp)
  returns `'RFI'` (same approximation already used for the no-action
  default, for consistency); `round>=1` (calling an actual raise)
  keeps returning `'call'`, unchanged, since that's exactly what the
  table represents.
- Documented explicitly, in code and to the user, that this is a
  deliberate approximation, not a precise fix: RFI describes hands a
  player *would open*, while a player who chose to limp specifically
  chose *not* to open — there's no solver-sourced "limp range" table
  to fall back on instead (mainstream theory mostly doesn't recommend
  limping at all). The empirical "🃏 לימפים ידועים" feature (added
  earlier today) remains the accurate tool for a specific player's
  real limping tendency; the auto-range is, and will stay, a
  reasonable-but-imperfect default.
- Verified (jsdom): a seat with `actions:[{type:'Call',raiseRound:0}]`
  now returns RFI (wide open-range) instead of the narrow call table;
  a seat calling an actual raise (`raiseRound:1`) is unaffected,
  still correctly returns `call` with the narrow table.


**Files: render.js**

- User asked to collapse the 3-tab layout (המקורי / אוטומטי / לימפים)
  down to 2 buttons: one for "אוטומטי" (unchanged), and a single button
  that toggles between "המקורי" and "לימפים" rather than two separate
  tabs for those.
- New `_toggleOriginalLimpView()`: if currently on 'limp', switches to
  'original'; otherwise switches to 'limp' — but only if the player
  actually has limp data. If not, it always resolves to 'original'
  (never toggles into an empty limp view), so the button's label and
  behavior are guaranteed to match — no dead-end where the label says
  one thing and the click does another.
- Button label is computed dynamically each render: "↩️ המקורי" while
  on the limp view, "🃏 לימפים (N)" otherwise (or "↩️ המקורי" always,
  for a player with zero limp history — the button never disappears,
  so there's always a way back to "המקורי" even from the "אוטומטי" tab).
- Verified (jsdom): full toggle cycle (original→limp→original) still
  round-trips a custom manual range exactly, same as the 3-button
  version; clicking toggle while on "אוטומטי" jumps straight to limp
  when data exists; a player with no limp history gets a button that's
  always labeled "המקורי" and always lands on the real (auto-seeded)
  original range, never an empty grid.


**Files: render.js**

- User caught a real gap in the base/limp toggle added moments earlier
  this session: "בסיס" always recomputed the generic theoretical auto
  range, so a player with a hand-picked custom manual range (not equal
  to auto) who isolated limps and then went "back" would get the
  generic solver range instead of what they'd actually assigned —
  silently discarding their custom range.
- Fix: split into three distinct, separately-tracked views instead of
  two. New `_rangeEditOriginal` (string) snapshots exactly what was
  saved for the player at the moment the editor opened — the existing
  custom manual range if one existed, or the auto range only as a
  fallback if none did — and never changes while the editor stays
  open, regardless of how many times the view is switched.
  - **↩️ המקורי** → restores `_rangeEditOriginal` exactly (the "go
    back" the user actually wanted — protects a real custom
    assignment, not just a generic recompute).
  - **🎯 אוטומטי** → theoretical solver range, recomputed fresh, for
    comparison only — intentionally separate from "המקורי" now, since
    the two can differ.
  - **🃏 לימפים (N)** → unchanged, empirical set from hand history.
- `_openRangeEditorShowLimps` (the seat-panel shortcut button) updated
  to compute and store `_rangeEditOriginal` the same way — it was
  skipping this before, which would have left "המקורי" stale/wrong
  when entering via that shortcut specifically.
- Verified (jsdom): assigned a custom manual range (AA,KK,QQ,AKs — not
  matching the deep-auto range for that seat), isolated to a known limp
  (73s), switched back to "המקורי" — got exactly AA,KK,QQ,AKs back
  (not the 131-combo auto range); "אוטומטי" tab independently showed
  the real auto range for comparison; re-saving after returning to
  "המקורי" round-tripped correctly.


**Files: render.js, game.js, ui.js**

- User feedback on the empirical-limp feature (previous entry today):
  isolating limps overwrote the working selection with no way back
  except fully closing the editor; and once a limp-only range was
  *saved* as the manual range, there was no way to get back to the
  theoretical base without leaving the editor and using the separate
  "🤖 אוטומטי" button (which deletes the manual range entirely rather
  than letting you preview-then-resave the base).
- Added `_setRangeEditorView('base'|'limp')` + `_rangeEditActiveView`
  state: two tab buttons at the top of the range editor ("🎯 בסיס
  (אוטומטי)" / "🃏 לימפים (N)") that fully swap the working grid
  selection between the theoretical auto range (recomputed fresh via
  `_getAutoRangeForSeat` — deliberately ignores whatever's currently
  saved, so it's always available as a revert target) and the
  empirical limp set. Works identically whether opening on a fresh
  seat, an auto-seeded editor, or one seeded from an already-saved
  manual range — reopening the editor on a saved limp-only range still
  lets you tab back to "בסיס" and resave it, achieving the requested
  "resettable, not saved" toggle.
- `_rangeEditActiveView` resets to `null` (custom/unlabeled) on any
  manual cell tap or Top% slider use — those are deliberate departures
  from either pure view, so neither tab should show as "active"
  afterward. Old `_isolateLimpRange()` kept as a thin alias to
  `_setRangeEditorView('limp')` for backward compatibility with the
  seat-panel shortcut button.
- Reset wired into all 4 seat-panel close paths (`closeSeatPanel`,
  seat re-tap toggle-close, `removeSeat`, `doKO`) alongside the
  existing `_rangeEditPid`/`_rangeEditSel` resets, so no stale view
  state leaks into the next seat opened.
- Verified (jsdom): base→limp→base cycle preserves the correct
  131-combo base range each time, including after an intermediate
  save/reopen; manual cell edit and slider both correctly clear the
  active-view highlight; a test-harness mistake (an accidental
  double `clickSeat` closing the panel) was caught and fixed during
  verification, not a real bug — confirms the toggle only behaves
  correctly within the actual open-panel flow the UI enforces.


**Files: render.js, game.js**

- User question surfaced a real gap: the app has no distinct concept
  of "open-limp" vs. "call a raise" — both are logged as the same
  `type:'Call'` and mapped to the same narrow, value-heavy 'call'
  range table (e.g. UTG deep: JJ,TT,AQs,AJs,KQs,AQo — deliberately
  excludes premiums, which "should" 3-bet instead). That table was
  never meant to represent limping, and no solver-sourced limp range
  exists for most positions anyway (mainstream theory is raise-or-fold
  — limping usually isn't a GTO action to begin with), so building a
  static theoretical limp table isn't defensible the way the BTN/SB
  fix earlier this session was.
- Instead, added a purely informational, opt-in empirical view: new
  `_getEmpiricalLimpHands(pid)` scans `S.handLog` (existing persistent
  hand history) for hands where this player's cards were known AND
  their first preflop action was `Call` with `raiseRound===0` (the
  data needed to distinguish limp-from-nothing vs. call-a-raise
  already existed via `raiseRound`, just wasn't being used this way).
  Tallies real hands seen limped, by hand-type.
- Zero changes to the equity engine or `_getAutoRangeForSeat` — this
  is deliberately kept separate. The only integration point is the
  EXISTING manual-range save path (`S.playerRanges[pid]`), so if the
  user chooses to save an isolated limp set, the equity engine picks
  it up automatically as a normal manual range — no new equity code,
  ever, even if this proves useful later.
- Seat panel: new "🃏 N לימפ/ים ידועים" button (shown from the very
  first known limp — no minimum sample threshold, per user's explicit
  choice) opens the range editor pre-isolated to just the observed
  limp hands. Editor grid also gained a persistent purple-border
  overlay marking every cell with known limp history (with a count),
  independent of what's currently selected — plus a "🃏 בודד לימפים
  בלבד" button inside the editor itself for the same isolate action
  mid-edit. Nothing is saved until the user explicitly hits 💾 שמור —
  purely a view/isolate aid, exactly as scoped.
- Explicit bias warning shown inline wherever the limp data appears:
  only hands with entered cards count (usually showdowns), so it likely
  skews toward stronger-looking limped hands than reality.
- Verified (jsdom, synthetic hand history): correctly counted a
  hand limped twice (73s → count 2) while excluding a call-after-raise
  (AKs, raiseRound 1) and a limp with no known cards; seat panel button
  text and count correct; isolate produces exactly the limped set;
  save flows through the existing, already-tested manual-range path
  with no special-casing.


**Files: render.js**

- User caught it live via the new auto-range display (this session's
  previous change): UTG player, no actions yet this hand, showed
  "UTG · Call · 35-74BB" — a "call" range for the first player to act,
  who by definition has nothing to call yet.
- Root cause: `_inferPreflopActionCat(seat)` defaulted EVERY seat with
  no recorded preflop actions to `'call'`. That's the right guess for
  BB (can "check" without a logged action if everyone limped) but
  wrong for UTG/MP/CO/BTN/SB — a seat that hasn't acted and is first
  in line is about to *open*, not call something that hasn't happened.
  This bug pre-dates today's session (the function itself is older)
  but was invisible until the new auto-range display surfaced it
  directly in the UI; the live hero-equity code elsewhere already had
  a separate, deliberate workaround for the same issue (union of
  call+3bet as a "continue range") that wasn't applied consistently.
- Fix: `_inferPreflopActionCat(seat, pos)` now takes position; default
  with no actions is `pos==='BB' ? 'call' : 'RFI'`. Updated all 4 call
  sites (new `_getAutoRangeForSeat`, historical postflop-equity replay,
  live opponent auto-range, hero auto-range) to pass position through.
- Verified (jsdom): reproduced the exact screenshot scenario (4-max,
  no actions yet) — UTG-equivalent seat now returns RFI; heads-up
  BTN/SB → RFI, BB → call (unchanged, correct as before).


**Files: render.js, game.js**

- The seat panel's range section previously just said "אוטומטי" with no
  detail when no manual range was saved, and "✏️ ערוך טווח" opened an
  EMPTY grid — editing meant rebuilding a range from scratch even
  though the app already computes a perfectly good default.
- New `_getAutoRangeForSeat(seatIdx)`: reuses the exact same logic the
  equity engine already applies per-opponent (assignPos → position,
  _inferPreflopActionCat → RFI/call/3bet/4bet, seat's own stack/BB →
  depth, _adjustRangeForType → player-type adjustment) but as a
  standalone, reusable lookup — no hand/equity context required, so it
  works from the seat panel alone.
- Seat panel now shows real combos/% for the auto range when no manual
  range is saved, plus a one-line breakdown ("מבוסס על: BB · Call ·
  35-74BB · Fish") so the number is explainable, not a black box.
- `_openRangeEditor` seeds `_rangeEditSel` from the auto range (not
  empty) whenever there's no existing manual range — editing starts as
  fine-tuning a real baseline. Once saved, it becomes a normal manual
  range (same override behavior as before — playerType stops applying).
- Verified (jsdom, full app loaded, real function calls — not just
  syntax check): auto range for BB/call/mid-depth = 19 hand-types,
  editor opens pre-filled with exactly those 19; save flips status to
  "ידני" correctly; edge case (no valid position resolved) degrades to
  "אין נתונים מספיקים" instead of crashing.
- Also ran a broader regression pass on the prior seat-panel
  restructure (this session's earlier change) before adding this:
  full jsdom simulation of seat/player/range/card-picker/KO/remove-seat
  flows across table sizes 3 and 6, mid-edit switching between two
  players, and panel-close from all 4 close paths — no errors, no
  stale `_rangeEditPid` state.

## 2026-07-12 — Consolidate player attributes (range, type) into the seat panel
**Files: render.js, game.js, ui.js**

- User feedback: card selection was duplicated (mini-cards on the seat
  itself vs. a full 52-button grid inside the seat panel), and
  range/player-type editing lived in a separate Pot Odds panel instead
  of naturally living next to the player being edited.
- Removed the redundant inline 52-button card grid + preview boxes
  from the seat panel entirely — card picking now happens exclusively
  via the seat's own mini-card buttons (table view), which open the
  existing per-slot popup (`openSeatCardPicker`).
- Added a clear ("🗑️ נקה קלף") button directly inside that popup, plus
  a restored camera/AI-recognition button ("📷 זהה") — both were only
  reachable from the removed seat-panel grid before, so neither was
  dropped, just relocated to the popup's header.
- Seat panel gained two new sections in the freed space:
  - **Player type** (TAG/LAG/Nit/Station/Fish chips) — new
    `setSeatPlayerType()` writes directly to `playerLib` and persists
    immediately (no separate "save profile" step needed, unlike the
    Players-tab editor which still uses its own save flow).
  - **Manual range** — status line (auto vs. manual + combos/%) with
    edit/clear buttons. Editing opens the existing 13×13 grid + Top%
    slider inline in the seat panel.
- Range editor internals (`_openRangeEditor`, `_closeRangeEditor`,
  `_rangeEditorRefresh` fallback) now target `renderSeatPanel()`
  instead of `renderPotOdds()`. Grid-building logic extracted into
  `_rangeEditorPanelHtml()` for reuse. `_rangeEditPid` is reset on every
  seat-panel close path (toggle-close, remove seat, KO, `closeSeatPanel`)
  to avoid stale editor state reopening on a different seat.
- Removed the old per-player range chip row from the Pot Odds panel
  (Range selector there now only covers the position/action reference
  tool, which is a separate feature — not player-specific — and was
  left untouched). Added a one-line hint pointing to the seat instead.
- Verified: node --check passed on all three files; no dangling
  references to the removed `editableOpps`/old grid markup; the single
  `range-editor-grid/-count/-slider` DOM ids now only defined once
  (in `_rangeEditorPanelHtml`), no duplicate-id conflicts with the old
  Pot Odds copy.
- Not yet field-tested: this is a structural UI change — needs a real
  device pass (tapping through seat → type → range → save/cancel, and
  card popup clear/camera) before considering it fully verified.


**Files: render.js**

- User field intuition flagged that the deep BTN/SB (HU, 75BB+) range
  felt too narrow at the bottom despite K3s now correctly showing
  in-range: many low suited connectors/gappers seemed to be missing.
- Verified against the range string: 11 suited hands were absent from
  the deep list — 32s,42s,43s,52s,53s,62s,63s,72s,73s,82s,83s (the
  bottom tier of _HAND_RANKING). Confirmed all Kxs were already
  present (K2s-K9s) — only the very bottom suited connectors/gappers
  were missing. Range was 142/169 hands (1,090/1,326 combos = 82.2%).
- Researched real solver sources before changing anything (per user
  request): true heads-up SB opens are ante-dependent — GTO Wizard's
  AI HU solver shows SB folding only 4% at 50BB WITH a 0.12bb ante
  (~96% open); PokerCoaching's no-ante 6-max blind-vs-blind numbers
  (structurally equivalent to HU sizing, since action is already
  folded to SB) show 62.3% GTO / 69% exploitative at 100BB no ante,
  widening to 81.6% at 75BB MTT (likely ante-influenced). The app's
  default blind structure uses ante:0 at every level (user-configurable,
  usage varies) — so no single authoritative % target exists without
  knowing whether antes are active. Deferred a full re-target of the
  RFI width; made the narrower, unambiguous fix instead.
- Fix: added the 11 missing suited hands to deep BTN/SB RFI (in
  _HAND_RANKING order). This particular gap (excluding an entire tier
  of suited hands wholesale) isn't defensible under ANY of the sourced
  ranges — every source above includes suited connectors/gappers all
  the way down when opening this wide. mid (75.3%) and short (65.3%)
  left untouched pending the same source-by-source review.
- New deep BTN/SB: 153/169 hands (1,134/1,326 combos = 85.5%).
- Verified: node --check passed; all Kxs and all suited hands now
  present in deep BTN/SB (0 missing); combo-weighted % recount matches
  85.5% exactly.
- Open item: mid/short BTN/SB not yet reviewed against sourced data;
  the ante-dependence question (deep/short specific %) remains
  unresolved — revisit if/when a genuine HU solver becomes available
  (user has GTO Wizard free tier, but it caps at 8-max, no HU access).

## 2026-07-12 — REAL fix for K3s/BTN-SB: per-table-size range tables
**Files: render.js**

- Root cause finally found (previous cache explanations were wrong —
  user correctly persisted): _RANGES contains a table for EVERY table
  size (2-9, some built programmatically further down the file). With
  the table configured to 3 players, lookups hit _RANGES[3] — an old,
  narrow standalone table (BTN K8s+ only, no BTN/SB key) — and never
  fell through to _RANGES[6], which is the only place the dedicated
  HU entries and the updated ranges were added. The alias then mapped
  BTN/SB→BTN *of the size-3 table* → K3s out of range. All my prior
  tests ran with tableSize=6, which is why they passed.
- Fix in _getRangeStrForDepth: fallback chain is now
  size-table[pos] → SIX-table[pos] → size-table[alias] → six[alias].
  Special entries (BTN/SB HU ranges) and future updates to the 6-max
  tables are now reachable from every table size; size-specific tables
  still win when they define a position.
- Verified: exact reproduction (tableSize=3, 39.5BB, K♠3♠, BTN/SB) now
  in range (75.3% HU mid); K3s in at ALL sizes 2-9 × all depths;
  BTN/SB 3bet resolves via alias; regular positions unchanged
  (size-3 BTN 25.5% as before, 6-max BTN 42.8%, UTG 17.0%, 9-max
  untouched).

## 2026-07-11 — Dedicated heads-up (BTN/SB) opening ranges
**Files: render.js**

- User field-tested HU and correctly flagged that mapping BTN/SB→BTN
  (38-43%) is far too tight for heads-up — real HU SB opens ~75-85%,
  and at short depth K3s fell outside the mapped range.
- Added dedicated 'BTN/SB' RFI entries at all three depths, generated
  from _HAND_RANKING (combo-weighted top-X%): deep 82.2%, mid 75.3%,
  short 65.3%. K3s/Q5o in at every depth; 72o out.
- _getRangeStrForDepth fallback upgraded from entry-level to
  ACTION-level: BTN/SB has its own RFI but 3bet/call/4bet fall back to
  BTN's tables (previously a partial entry would have returned empty
  strings for missing actions).
- Verified: all depths include K3s; 3bet fallback non-empty; regular
  positions unchanged (BTN 42.8%, UTG 17.0%).
- Note: the earlier screenshot (K3s out at 44BB) also reflected the
  pre-alias code — with the previous fix alone K3s was already in at
  deep/mid; this change makes HU ranges properly wide at all depths.

## 2026-07-11 — Fix "KK out of range" on BTN/SB; clearer opening-spot message
**Files: render.js**

- BUG: heads-up hands assign the combined position label "BTN/SB",
  which has no entry in the _RANGES tables — range lookups returned an
  EMPTY string, so the RFI check declared every hand (even KK!)
  "מחוץ לטווח". Fixed at the single choke point (_getRangeStrForDepth):
  positions without a dedicated table map to the closest existing one
  (BTN/SB→BTN — conservative, real HU opens even wider; also
  UTG+1→UTG, UTG+2→MP, LJ→MP, MP+1→HJ for larger tables).
- UX: opening spot (preflop, nobody acted) with no hero cards showed
  the misleading "ממתין ליריב" — the missing piece there is the hero's
  cards (for the RFI check), not an opponent. Now shows
  "פתיחה — הזן קלפים". No behavior change beyond the message —
  intentionally still no equity in this spot (nothing meaningful to
  compute; opponents' ranges unknown until they act).
- Verified: BTN/SB RFI now 504 combos, KK/QJs in, 72o out; all alias
  positions resolve; new message shows in the exact screenshot
  scenario; entering cards still triggers the RFI in-range check.

## 2026-07-11 — Auto range for the acting player (range-vs-range by default)
**Files: render.js**

- Previously the acting player needed entered cards OR a saved manual
  range for equity to compute — a hero who hadn't acted showed
  "הזן קלפים" even when opponents had ranges (auto-detection only ever
  applied to opponents, since it infers ranges from actions taken).
- New hero range priority: entered cards > saved manual range > AUTO:
  if the hero already acted this hand — range inferred from their
  action (same logic as opponents); if they haven't acted yet — their
  position's "continue range" (union of call + 3bet tables at current
  depth), i.e. "assuming they continue, this is their range".
- Equity label distinguishes: "טווח (אוטו׳) מול טווח" vs manual
  "טווח מול טווח". Cache keys include hcont/hauto tags.
- Verified vs direct engine runs: CO continue (9.5%) vs top-19% =
  57.1%; manual AA,KK override = 80.0-80.7%; label toggles correctly;
  manual range still beats auto.
- Known caveat (by design): the auto number assumes the hero continues
  — it measures how the ranges match up, not whether a specific hand
  should continue.

## 2026-07-11 — Remove temporary cleanup mechanism (cleanup completed)
**Files: state.js**

- The one-time purge of duplicate admin entries completed successfully
  on all storage contexts (user confirmed clean lists on webapp and
  Safari); tombstones now prevent any resurrection.
- ensureSelfAsPlayer reduced to an intentional no-op (kept because
  auth.js calls it on several login paths; history documented inline).
- Permanent protection retained: dedupePlayersByName still runs after
  every playerLib sync merge — guards against future same-name
  duplicates created concurrently on different devices.
- Verified: no-op is safe (no add, no delete, no crash); permanent
  dedupe still merges same-name players arriving from sync.

## 2026-07-11 — Remove auto-add-admin feature; purge its duplicates
**Files: state.js**

- The auto-add-admin-as-player feature created duplicates on every
  fresh-context login (name-based existence check + new id each time +
  id-based sync merge → dozens of empty "יאיר מורה" entries). Per user
  decision the feature is now REMOVED — the user plays with a player
  they created manually long ago; auto-created entries were never used.
- ensureSelfAsPlayer repurposed as self-cleanup (all existing call
  sites in auth.js remain valid): merges name-duplicates
  (dedupePlayersByName, also runs after sync merge) and then deletes
  every entry matching the admin's name that carries NO data — with a
  safety net: any entry that has buyins, an occupied seat, a KO record,
  or a saved manual range is never deleted. Deleted ids get tombstones
  so other devices' pushes cannot resurrect them.
- Verified: 10 empty auto-copies → all removed with tombstones; the
  real manually-created player and other players untouched; a
  same-named entry WITH a buyin survives; remote pushing old copies is
  blocked.

## 2026-07-11 — (superseded by the entry above) dedupe-by-name groundwork
**Files: state.js**

- ensureSelfAsPlayer checked existence by NAME but created a new id
  each time, while sync merge (applySnapshot) merges playerLib by ID —
  so fresh storage contexts (Safari vs webapp) and failed initial pulls
  each spawned another "יאיר מורה" copy; merge-by-id kept them all
  (dozens accumulated during testing).
- New dedupePlayersByName(): keeps the oldest entry per name, merges
  data into it (buyins summed, manual range moved, seat playerId and
  koOrder remapped), removes the rest, and marks dropped ids with
  tombstones so sync cannot resurrect them.
- Runs after playerLib merge in applySnapshot and on login in
  ensureSelfAsPlayer — existing duplicates clean themselves up
  automatically on next load/sync across all devices.
- Verified: 10 copies with data scattered across them → 1 entry with
  all data merged (buyin+rebuy, range, seat, KO order); remote pushing
  old copies blocked by tombstones; real players untouched.

## 2026-07-11 — Fix meaningless 100% equity with zero opponents
**Files: render.js**

- Range-vs-range mode computed equity even when NO opponent had acted
  yet (hero first to act, saved range from a previous session) —
  zero opponents in the simulation → hero "wins" every iteration →
  meaningless 100.0% displayed.
- The fixed-cards mode had the isOpeningSpot guard, but it requires
  entered hole cards, so hero-range mode slipped past it. A similar
  pre-existing hole existed for fixed cards + global range selection +
  no opponents acted.
- Fix: equity (both modes) now requires at least one opponent in the
  calculation (known cards or acted-with-range). Otherwise shows
  "ממתין ליריב" instead of a number.
- Verified: exact screenshot scenario reproduced → no 100%, shows
  waiting message; after an opponent raises, real range-vs-range
  equity (42.9%) appears with its label.

## 2026-07-10 — Slider fixes: RTL direction + smooth dragging
**Files: render.js, game.js**

- Both sliders (Raise amount in quick-input, Top-X% in range editor)
  rendered right-to-left due to the app's RTL layout — min was on the
  right. Added `direction:ltr` to both inputs (and the min/max labels
  row under the Raise slider): minimum now starts on the left, dragging
  right increases.
- Range editor slider felt like it "jumped between preset states".
  Root cause: every `oninput` called `renderPotOdds()`, rebuilding the
  ENTIRE panel's DOM — including the slider itself — mid-drag, breaking
  the touch gesture. Fix: targeted refresh (`_rangeEditorRefresh`)
  updates only the 13×13 grid and combos/% counter during drag; never
  rebuilds or forces a value on the slider being dragged. Tapping a
  grid cell (not a drag) also syncs the slider position.
- Verified: 10 simulated consecutive drag events → 0 full re-renders
  (was 10); cell tap updates selection, counter, and slider position.

## 2026-07-10 — Range-vs-range equity (hero range)
**Files: render.js**

- The acting player now appears in the manual-range chips row (marked
  "(בתור)") — assigning them a range enables true range-vs-range
  equity when no specific cards are entered for them.
- `monteCarloEquityMulti` extended with `heroCombos` param: hero's hand
  is sampled from their range each iteration. Entered cards still take
  priority over a saved range.
- "טווח מול טווח" label shown under the equity number in this mode.
- Verified: AA-range vs KK-range = 82.2% (known value ~81-82%);
  top30% vs top5% = 35.1%; regression on fixed-cards mode passed.

## 2026-07-10 — Per-player manual range editor + hand ranking engine
**Files: render.js, state.js**

- `_HAND_RANKING`: fixed array of all 169 hand types sorted by equity
  vs a random hand (precomputed Monte Carlo, verified
  AA>KK>QQ>JJ>TT>99>88).
- `_topPercentRange(pct)`: percentage → concrete hand list by
  accumulating actual combos (pair=6, suited=4, offsuit=12 of 1,326) —
  combo-weighted, not naive type-count. Requested 42.8% → produced 43.1%.
- 13×13 grid editor (tap to toggle) inside the 🎯 Range panel, with
  Top-X% slider, live combos/% counter, Save / Back-to-auto / Cancel.
- Saved ranges keyed by **playerId** (not seat — follows the person),
  persist until manually changed. Stored in `S.playerRanges`:
  localStorage (`ps_pranges`) + cloud sync (fullSnapshot/applySnapshot).
- Range priority per unknown opponent:
  player-manual > global pos/action selection > auto-detection.
- Chips row shows ALL active players (initially only players who had
  already acted — fixed after field testing).
- Design decision: hand-curated `_RANGES` tables kept for
  auto-detection (closer to solver, accounts for realized equity);
  the algorithmic ranking powers only the editor's slider.

## 2026-07-10 — CRITICAL: T/10 card representation bug
**Files: render.js**

- Monte Carlo deck used rank `'T'` but `evaluateHand()` (game.js)
  expects `'10'` — every ten generated inside simulations (opponent
  range combos, random runouts) was scored as **worthless** (rank 0).
  Known-hand test: TT vs random showed 51.9% instead of the correct
  74.9%.
- Fixed `_MC_RANKS` to `'10'` and added `_notationRankToCard('T'→'10')`
  in both range-to-combos builders.
- Impact on prior results moderate (89s vs BTN: 42.0→41.4%; KQs vs SB
  3bet: 29.5→31.3%) but affected every range containing Tx hands
  (ATs/KTs/QTs/JTs/T9s — very common).

## 2026-07-10 — Monte Carlo iterations 3,000 → 8,000
**Files: render.js**

- All equity entry points raised to 8,000 iterations (~1-1.2s measured
  on Node; 12,000 was rejected at 2.3s — too slow for live use).

## 2026-07-10 — Updated RFI ranges (modern solver sources)
**Files: render.js**

- UTG/MP/CO/BTN RFI at deep/mid/short depths updated per modern solver
  sources (pokercoaching.com et al). Deep: UTG 17.0%, MP 21.1%,
  CO 27.8%, BTN 42.8% (was ~22% — far too tight).
- Verified: 89s vs BTN-deep now 41.4-42.0% (above the 40.9% break-even
  in the tested spot — matches external sources). Position ordering
  UTG<MP<CO<BTN holds at every depth.
- Not touched: 3bet/call/4bet tables, SB/BB, push tier, 9-max table.

## 2026-07-09 — Cross-context sync fixes (Safari ↔ home-screen webapp)
**Files: features.js, state.js, auth.js**

Three compounding bugs caused table data to appear empty/stale when
switching between separate iOS storage contexts:

1. `syncToSheets()` now waits for `_initialSyncDone` before pushing —
   prevents pushing stale/empty local state before the first real pull.
   Retries every 500ms instead of dropping the change.
2. `applySnapshot()` now advances `S.savedAt` to match accepted
   incoming data. Previously any later unrelated `persist()` would
   permanently block future pulls (local savedAt always "newer").
3. `ensureSelfAsPlayer()` polls `_initialSyncDone` (300ms) instead of a
   fixed delay — a fixed delay still races variable network latency.

Also: `tryUpgrade()` (admin upgrade path) now initializes sync itself.
Diagnosed via a temporary on-screen debug panel (added and removed);
root cause confirmed with actual device logs.

Note: iOS intentionally separates localStorage between Safari and
"Add to Home Screen" webapps (privacy feature) — the cloud sync is the
bridge; starting empty and filling within ~1s is expected behavior.
