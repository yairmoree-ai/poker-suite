# CHANGELOG

**היסטוריה מלאה (עד ולא כולל היום, entries 1-59) נמצאת בקובץ נפרד:**
`CHANGELOG_ARCHIVE_2026-07-14.md` — הקובץ הזה הפך גדול מדי (195KB) וגרם
לקריסה בשמירה, אז פוצל. הקובץ הזה מכיל רק את ההיסטוריה הפעילה/עדכנית.

---

## 2026-07-14 (cont'd 66) — Bug: PokerTracker export only got SB/BB positions right
**Files: ui.js**

- User's friend imported an export and only SB/BB showed correct positions
  for the other players.
- **Root cause:** PokerStars-format seat numbers (`Seat 1:`, `Seat 2:`...)
  were assigned in raw physical `seatIdx` order — the code comment even
  admitted this was just an assumption ("usually sorted by position"),
  never actually enforced. PokerTracker doesn't read position from
  explicit text tags for most players — it *computes* each player's
  position by walking around the table starting from whichever seat number
  the "Seat #N is the button" line points to. SB and BB are the only
  positions PT gets "for free," directly from the `posts small/big blind`
  text lines — every other player's position depends entirely on the seat
  numbers actually reflecting true table order. With scrambled seat
  numbers, that computation breaks for everyone except the two blinds.
- Fixed by sorting seats into true table-relative order (reusing
  `_sortSeatsByPos()`, the same helper already proven correct for the
  replayer's table layout) before assigning seat numbers, instead of using
  raw seat array order.
- Verified directly with the user's actual reported hand structure (6-max,
  BTN at physical seat index 1): seat numbers now correctly cycle
  BTN→SB→BB→UTG→HJ→CO in true table order starting from the button,
  instead of the previous scrambled physical order.

## 2026-07-14 (cont'd 65) — Bug: PokerTracker export silently dropped hands while claiming success
**Files: ui.js**

- User's friend received a PT export claiming "2 hands" but with no actual
  content.
- **Root cause:** `exportHandsToPokerTracker`'s success notification
  reported `sorted.length` (how many hands were *selected*), but the
  actual file content was built via `.filter(Boolean)`, which silently
  drops any hand where `_handToPSFormat` returns `''` — which happens
  whenever a hand's `seats` array has no entries with `playerName` set
  (likely older/incomplete saved hands). The count and the content could
  diverge with no indication anything had gone wrong.
- Fixed: now tracks succeeded vs. failed hands separately. If *all* fail,
  stops before creating a file at all and shows a clear alert (no more
  empty file with a false "success" toast). If *some* fail, still exports
  the valid ones but explicitly alerts with the real count
  ("1 מתוך 2 ידיים... 1 דולגה") so the user knows to check which specific
  hands have bad data, instead of silently getting less than they expected.
- Verified both paths directly: all-broken input correctly stops with no
  file and a clear alert; mixed valid/broken input correctly exports just
  the valid hand and reports "1/2" accurately in both the toast and a
  detailed alert.

## 2026-07-14 (cont'd 64) — New table-size scaling model: shift, don't just alias
**Files: ranges.js, state.js**

- User's question about how 8/7-max derive from 9-max data led to a much
  better model than what existed. The old approach (`_RANGES[8]=_RANGES[9]`,
  a literal shared object reference) meant 8-max and 9-max used *identical*
  position ranges — same UTG range whether the table has 9 players or 8,
  which doesn't reflect real poker (fewer opponents behind you generally
  means a wider correct range at the "same-named" position).
- **User's proposed model, confirmed with a concrete example:** always drop
  only the single *earliest* opening position as the table shrinks by one
  seat, with every other early/middle position shifting up to fill the
  gap — "whoever was UTG+1 at 9-handed becomes UTG at 8-handed." Late
  positions (HJ, CO) stay anchored unchanged, since how many players act
  after HJ/CO doesn't meaningfully change with one more or fewer seat at
  the table; only the earlier ones do.
- Implemented as a general, reusable `_buildShiftedRanges(source, sourceOrder,
  targetOrder)` function — not a one-off fix. Takes the ordered list of
  opening positions for the larger table and the smaller, computes the
  offset, and maps each target position to the correct shifted source
  position, correctly applying across *every* bucket (deep/mid/short/push/
  midlow) in one pass rather than needing to special-case each one.
  `_RANGES[8]` now derives from `_RANGES[9]`, and `_RANGES[7]` derives from
  `_RANGES[8]` (chained, matching how the user re-applied the same "drop
  earliest" rule one level down when I described the mapping poorly the
  first time and they just said to apply the same rule again).
- **Real inconsistency found and fixed along the way:** `PBN[7]` (the
  position-label array actually shown to players during a live 7-handed
  game, `state.js`) used `'MP'` for the third opening position and skipped
  `HJ` entirely — a structure that was already flagged as "unconfirmed,
  left unchanged" much earlier in this session. Under the new consistent
  shift model, 7-max's third opening position should be `HJ` (mapped from
  8-max's `HJ`, itself `9max.HJ` unchanged), not `MP`. Updated `PBN[7]`
  to `['BTN','SB','BB','UTG','UTG+1','HJ','CO']`.
- Verified thoroughly: confirmed via direct reference-equality checks that
  every mapped position (`8max.UTG === 9max['UTG+1']`, `8max.LJ ===
  9max['MP+1']`, `7max.UTG === 8max['UTG+1']`, etc.) points to exactly the
  intended source data, and that anchored positions (HJ, CO, BTN)
  correctly stay unchanged through the shift. Also verified end-to-end
  that `assignPos()` now actually displays `HJ` (not the old `MP`) for a
  real 7-handed table.
- Net effect: the real 80bb data inserted this session for UTG/UTG+1/LJ/
  HJ/CO/BTN at 9-max now also correctly and *distinctly* feeds 8-max and
  7-max through this shift, instead of all three sizes sharing one
  identical dataset as before.

## 2026-07-14 (cont'd 63) — Real 80bb RFI data inserted into 'deep' bucket (9-max), 6 positions
**Files: ranges.js**

- Culmination of a multi-turn effort: user provided "The Ultimate Tournament
  Preflop Guide" PDF (507 GTO charts across 5 depths: 80/50/30/20/12bb).
  Built a proper extraction pipeline rather than trusting visual reading —
  the first attempt on the earlier, simpler PDF had failed its own
  verification check by 61%, so this time every step was built to be
  independently checkable:
  1. Extract each chart as its own image (`pdfimages`), not a full page.
  2. OCR with a whitelisted character set to find high-confidence hand
     labels and their pixel positions (avoids garbage matches from
     unrestricted OCR).
  3. Fit a coordinate-calibration model (row/col grid index → pixel
     position) from those confident matches, with iterative outlier
     rejection — this lets *every* cell's position be computed precisely,
     not just the ones OCR happened to read correctly.
  4. Sample the dominant (mode) color at each computed cell center,
     classify against reference colors sampled from the chart's own
     legend/header (not assumed).
  5. Cross-check the resulting range's combo count against the chart's own
     stated percentage — the built-in verification step that caught real
     problems rather than silently trusting the pipeline.
- **Real bug caught and fixed mid-process:** initial row/col mapping had
  offsuit hands' grid position swapped (row/col reversed) — caused by an
  error in my own coordinate-convention code, not the image. Caught via
  the verification step immediately (calibration error of 669px, obviously
  wrong), fixed, re-verified (error dropped to ~1px).
- **Genuine discovery, not just calibration tuning:** LJ, and to a lesser
  extent the other 5 positions, showed small combo-count mismatches
  against their stated headers even after the pipeline was solid. Traced
  this to **mixed-frequency cells** — hands where the underlying solver
  output isn't a clean 100%-or-0% action, rendered as a cell split between
  two colors. A simple "sample one color" approach can miss these entirely
  if the sampling point lands on the majority portion. Built a proper
  mixed-cell detector (fraction of each reference color within the full
  cell area, not just the mode) and re-scanned all 6 charts.
- **User-defined inclusion threshold, established through direct
  spot-checks against the source PDF** (not guessed): hands with roughly
  ≥20-25% red presence in a mixed cell should count as "raise" for a
  binary range — confirmed against real examples (J8s/KTo at just under
  50%, JTo/A9o at about 25%, all confirmed for inclusion by the user
  checking the actual chart directly).
- **SB set aside deliberately, not force-fit:** SB's chart has a 3-way
  split (Raise/Call/Fold) with far more mixed cells (36 vs LJ's 4) —
  applying the same threshold mechanically produced a result that didn't
  match any hypothesis for the target percentage, and unlike LJ, the user
  hadn't personally verified any of the 36 cells. Correctly identified
  this as a bigger extrapolation than what was validated and stopped
  rather than guess — SB explicitly deferred to a future round with a more
  careful approach.
- **Final result inserted:** `_RANGES[9].deep`'s `RFI` field updated for
  UTG (226 combos/17.04%), UTG+1 (266/20.06%), LJ (320/24.13%), HJ
  (374/28.21%), CO (470/35.44%), BTN (726/54.75%) — replacing what were
  previously unverified/placeholder ranges for 9-max at this depth. Only
  the `RFI` field was touched; each position's existing `3bet`/`call`/
  `4bet` fields were left untouched, since those haven't been verified
  against this source yet. Verified the final inserted values directly
  against the source JSON — all six match exactly.
- SB (RFI), and the `3bet`/`call`/`4bet` fields for all positions, remain
  open for future rounds, along with the other 4 depths (50/30/20/12bb)
  in this same PDF.

## 2026-07-14 (cont'd 62) — Bug: table visibly shrank when the Raise/Bet keyboard opened
**Files: render.js**

- User's screenshot: opening the Raise amount input squeezed the entire
  poker table into a small strip at the bottom of the screen, behind the
  modal.
- **Root cause:** `renderTableShape()` sizes the table using
  `visualViewport.height`, which — correctly and intentionally — shrinks
  whenever Safari's on-screen keyboard opens (that's literally what
  `visualViewport` is for, and there was already a good reason it's used
  here: it lets the table correctly adapt across different browsers/
  toolbar states). There was already a guard for this exact problem, but
  it only lived inside `_handleViewportResize` (the `visualViewport`
  resize-event listener) — checking `document.activeElement` for a
  focused input before re-running the layout. That guard alone wasn't
  enough: `renderTableShape()` is *also* called unconditionally from the
  main `render()` function, which runs on nearly every state change in the
  app — including the background sync pull that fires every 10 seconds.
  If that unrelated call happened to fire while the Raise keyboard was
  open, the table would shrink regardless of whether the resize-event path
  itself was properly guarded.
- Fixed by moving the same focused-input check to the very top of
  `renderTableShape()` itself, rather than only at one of its several
  call sites — now it protects against every path that can trigger a
  re-layout, not just the resize event specifically. Verified the guard's
  `return` is correctly positioned before any of the actual table-sizing
  calculations run.

## 2026-07-14 (cont'd 61) — BTN-at-bottom applied to the hand-detail view too
**Files: ui.js**

- User asked for the same BTN-at-bottom layout (done for the replayer a
  few rounds ago) to be applied to the hand-detail view's table in
  history — the other of the two table renderers found earlier this
  session (`showHandDetail`, separate from the replayer's
  `_renderReplayerFrame`). Same one-line fix: angle offset changed from
  `-Math.PI/2` (top) to `+Math.PI/2` (bottom). Verified directly — BTN now
  lands at the bottom of the ellipse here too, matching the replayer.

## 2026-07-14 (cont'd 60) — LIMP% added to the long-press HUD popup and the players tab
**Files: render.js, ui.js**

- User asked to add LIMP% to two existing stat displays. Both already had
  the underlying data available — `calcPlayerHUD()` already computes
  `limp` (added earlier this session, using the same definition as
  `_getEmpiricalLimpHands`) — just wasn't surfaced in these two specific
  UI spots yet.
- **Long-press seat popup** (`render.js`, `showPlayerHUD`'s box): added a
  LIMP stat card right after VPIP (same thematic grouping — both about
  entering the pot preflop), using the same color-coded `hudStat()` helper
  as the other five stats there. Color logic inverted relative to VPIP/PFR
  (`100-hud.limp` instead of `hud.limp` as the input to `statColor`) since
  a *lower* limp rate is generally considered the stronger habit, unlike
  VPIP/PFR where higher is highlighted as green — this is a judgment call
  on my part, not an objective rule, so flagging it in case a different
  color treatment is preferred.
- **Players tab** (`ui.js`, the quick per-player HUD row): added LIMP right
  after VPIP in the same flex-wrap stat row, matching the existing compact
  style used for VPIP/PFR/3B/AF/W there.
- Left the third VPIP/PFR-only spot found while searching (`render.js`,
  the hand-analysis AI-prompt text generator) untouched — that's a
  different context (a text prompt fed to an external analysis, not a
  visual stat display) and wasn't part of what was asked; mentioned as an
  option if the user wants it included there too.

