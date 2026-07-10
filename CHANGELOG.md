# Poker-Suite — Changelog

תיעוד שינויים מסודר (במקום הודעות ה-commit הגנריות של GitSync).
כל רשומה: תאריך, קבצים שהשתנו, ותיאור מפורט.

---

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
