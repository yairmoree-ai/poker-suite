# Poker-Suite — Changelog

תיעוד שינויים מסודר (במקום הודעות ה-commit הגנריות של GitSync).
כל רשומה: תאריך, קבצים שהשתנו, ותיאור מפורט.

---

## 2026-07-12 — Show + edit the actual auto-detected range (not just a label)
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
