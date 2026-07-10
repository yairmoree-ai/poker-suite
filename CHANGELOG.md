# Poker-Suite — Changelog

תיעוד שינויים מסודר (במקום הודעות ה-commit הגנריות של GitSync).
כל רשומה: תאריך, קבצים שהשתנו, ותיאור מפורט.

---

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
  tombstones so sync cannot resurrect them from other devices.
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
