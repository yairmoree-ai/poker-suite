# CHANGELOG

**היסטוריה מלאה (עד ולא כולל היום, entries 1-59) נמצאת בקובץ נפרד:**
`CHANGELOG_ARCHIVE_2026-07-14.md` — הקובץ הזה הפך גדול מדי (195KB) וגרם
לקריסה בשמירה, אז פוצל. הקובץ הזה מכיל רק את ההיסטוריה הפעילה/עדכנית.

---

## 2026-08-04 (72) — FOUND IT: the header said "PokerStars Hand", not "Poker Hand" — wrong parser entirely
**Files: ui.js**

- After bugs #69/#70/#71 were all fixed and verified correct via
  simulation, user's friend still got "same shit" (1 hand, no content) —
  even with a hand-body that's now byte-for-byte structurally validated
  against two real working samples. This ruled out every body-content
  hypothesis at once and pointed at something outside the body.
- Side-quest that also got ruled out cleanly: suspected Hebrew player
  names (`איל`, `ביאנה`, etc.) might not survive whatever regex PT4 uses
  to match player names in action lines, since no real poker site allows
  non-ASCII usernames. Tested in isolation (manually swapped to Latin
  names, no code change, no other change) — still failed identically.
  Ruled out.
- **Next isolated test, single variable:** noticed neither of the two
  working reference samples ever say "PokerStars" — both open with the
  literal string `Poker Hand #...:`. Our header said `PokerStars Hand
  #HG1: ...`. Tested by hand-editing just that one word in the same
  Latin-names file (`PokerStars Hand` → `Poker Hand`, nothing else
  touched) — **this fixed it.** Confirmed by the user's friend with real
  PT4/PT5 import.
- **Root cause, now confirmed:** PT4 selects which site-specific parser
  to run based on matching the header text. `"PokerStars Hand"` routes
  to PokerStars' own real, strict official grammar (built around actual
  PokerStars conventions — real tournament ID formats, specific date/
  currency conventions, etc.) which our synthetic body was never actually
  written to satisfy. Every other structural fix we made (#68/#69/#70/#71)
  was real and correct, but none of it mattered as long as the header
  routed to the wrong parser entirely — that parser was rejecting the
  body regardless of how correct it was by some *other* site's grammar.
- Fix: changed the one line in `_handToPSFormat` that builds the header —
  `PokerStars Hand #HG${handNumber}: ...` → `Poker Hand #HG${handNumber}:
  ...`. Nothing else changed.
- **Confirmed working end-to-end by the user's friend with real PT4/PT5
  import** — this is the first confirmed real-world working export since
  this whole investigation started (#68 through #72).
- Lesson worth keeping in mind for next time: when matching a working
  reference format, match **everything**, including parts that look like
  throwaway branding text — a single word in a header line was masking
  four other real, correctly-fixed bugs for several rounds.

## 2026-08-04 (71) — "Hero" wasn't marked at all in exports; PT4 likely needs it to identify the tracked player
**Files: ui.js**

- User's own idea, independent of the two structural bugs above: neither
  reference sample uses the player's real name for their own seat — both
  literally use the string `Hero`. Our exports never did this at all —
  every seat, including whichever one is the app's own logged-in user,
  was always printed with their real assigned display name. This likely
  doesn't break *parsing* the hand body (unrelated to bugs #69/#70), but
  is very plausibly needed for PT4/PT5 to correctly attribute HUD stats
  to "you" specifically, since real converters use exactly this
  convention precisely because they can't know a user's real site login.
- The app already tracks who's logged in — `currentUser.name` (set in
  `auth.js`) is exactly what `renderSeats()`'s existing `isMe` check
  already compares against seat names for UI highlighting (`isMe = s.
  playerName===myNameDet2...`). This just hadn't been reused for export.
- Added a small `_disp(name)` helper inside `_handToPSFormat`: returns
  `'Hero'` when the name matches `currentUser.name`, otherwise the real
  name unchanged. Applied it only at the point of writing into the output
  text (every `lines.push` that includes a player name) — all internal
  bookkeeping (`streetTotal`, `totalPaid`, `foldedNames`, `stillActive`,
  etc.) still keys off the real `playerName` throughout, so nothing about
  the matching/calculation logic changes, only what gets printed.
- Verified via the same simulation harness (re-run with a fake
  `currentUser = {name:'CO_Hero'}`): that seat's name is replaced with
  `Hero` everywhere it appears (seat list, ante line, actions, `Dealt to`,
  summary line) while every other seat keeps their real name, unchanged.

## 2026-08-04 (70) — Built a real test harness (not just reading code) — caught a live bug #69 missed entirely
**Files: ui.js**

- User asked to see a sample of what the export actually produces. Rather
  than hand-tracing the code again, extracted the real functions straight
  out of `ui.js` (`_handToPSFormat` and its helpers, verbatim — not
  reimplemented/paraphrased) into a small Node harness, fed it a fully
  simulated hand object (ante hand, 6-max, real multi-way showdown with
  two made hands), and actually ran it.
- **Live bug caught that pure code-reading had missed:** the per-street
  action-collection loop excluded `SB`/`BB` types but not `Ante`. Since
  `Ante` doesn't match any specific `case` in the action-type switch, it
  fell through to the `default` (raise/bet) branch — meaning every ante
  action was *also* being rendered a second time, in the middle of the
  preflop action list, as a garbage line like `BTN_Dan: raises -175 to
  25` (negative numbers, wrong totals, corrupting every subsequent bet's
  math on that street too). This is exactly the kind of thing bug #69's
  reasoning-only review couldn't have caught — it only became visible by
  actually executing the code against ante data and reading real output.
  Fixed by adding `&& a.type!=='Ante'` to the same filter, mirroring how
  SB/BB are already excluded there.
- **Also fixed while comparing the simulated output against both real
  reference samples:** every seat now gets a `Dealt to X` line after
  `*** HOLE CARDS ***`, even with no known hole cards (blank, no
  brackets) — previously only seats with two known cards got a line at
  all, which didn't match either working reference.
- Verified with two full simulated hands run through the actual
  extracted code (not reasoning by hand): (1) an ante hand with a real
  river showdown between two made hands — output now correctly shows
  `CO_Hero: raises 400 to 600` (not the earlier garbage) and a coherent
  `three of a kind, Nines` vs `two pair, Kings and Queens` summary; (2) a
  no-ante fold-around hand — output matches the user's real GG Rush&Cash
  reference structurally line-for-line (`Uncalled bet`, `folded before
  Flop (didn't bet)`, `collected`).
- Test harness itself isn't committed anywhere (lived only in this
  session's scratch space) — worth considering keeping a small fixture-
  based test script in the repo going forward, since this is the second
  time in two rounds that a real bug was invisible until actually run.

## 2026-08-04 (69) — Real root cause found: the whole SHOWDOWN/SUMMARY block was missing, not just ante order
**Files: ui.js**

- User reported *zero* difference between the pre-fix and post-fix export
  (bug #68) — a strong signal the ante/blind ordering wasn't the (or the
  only) real cause. User then supplied a second confirmed-working
  reference: a cash-game hand (no ante at all, from GGPoker's "Rush &
  Cash") to diff against.
- **Real root cause, confirmed against *two* independently-working
  references (one with ante, one without):** `_handToPSFormat` never
  built the `*** SHOWDOWN ***` section, the `Uncalled bet (X) returned to
  Y` line, or a per-seat `*** SUMMARY ***` breakdown at all — it only
  emitted a bare `*** SUMMARY ***` + `Total pot` + a single flat
  `collected` line. This was a known, explicitly-flagged simplification
  (see the old comment block at the top of the export section), not a
  hidden bug — but it turns out this missing section is what PT4's
  parser actually needs to accept a hand's *body*, not just its header.
  Since **every** exported hand was missing this same block regardless of
  ante, this explains why bug #68's fix (real, but narrower in scope)
  produced no visible change: the bigger structural gap was still there
  on both the "before" and "after" files being compared.
- Rebuilt the section from scratch, reverse-engineered directly from the
  two working samples:
  - **`Uncalled bet` line**: tracks each player's total contribution
    across the whole hand (`a.amount` already stores each action's own
    incremental cost — verified directly against the cash sample: the
    button's `raises $0.03 to $0.05` stores `a.amount=0.05`, matching
    their full street commitment, not just the $0.03 delta). When exactly
    one player never folds, the gap between their total and the next-
    highest contributor's total is refunded via this line — verified this
    reproduces the sample's exact `Uncalled bet ($0.03) returned to
    8652b512` from the raw action data.
  - **`*** SHOWDOWN ***` + `collected` line(s)**, always present (even for
    uncontested pots — both references show it that way), before `***
    SUMMARY ***`.
  - **Full per-seat `*** SUMMARY ***` lines** for every seat, not just
    winners: position tag (`(button)`/`(small blind)`/`(big blind)`),
    `collected (X)` for an uncontested winner, `showed [cards] and
    won/lost with <hand description>` for a real multi-way showdown
    (board complete + >1 player never folded), `folded before/on <street>`
    read directly from the fold action's own `street` field (not guessed),
    with a `(didn't bet)` suffix when the player's total contribution was
    zero — verified this exact rule against both samples: ante-hand
    folders never get the suffix (everyone already paid an ante, so
    nobody's contribution is truly zero), cash-hand non-blind folders do
    (confirmed against all 3 matching seats in that sample).
  - **Human-readable hand descriptions** ("a pair of Aces", "three of a
    kind, Kings", etc.) added as a new small helper (`_describeHandScore`),
    built on top of the existing `evaluateHand()` (`game.js`) rank/
    tiebreak output rather than a new evaluator. Pair/two-pair/trips/
    flush/full-house/quads phrasing verified directly against the
    reference sample's exact wording. Straight/straight-flush "wheel"
    (A-2-3-4-5) phrasing is **not** verified against a real example —
    flagged as an open, lower-confidence guess, worth checking if a hand
    with that specific straight ever fails to import cleanly.
- **Known, explicitly-flagged simplification kept as-is:** the inline
  "`X: shows [cards] (description)`" line that real formats sometimes
  print mid-street right after an all-in call — not implemented; hand
  descriptions are only emitted in the final `*** SUMMARY ***` block
  (always correct, uses the final board) rather than also at the
  earlier reveal moment. Multi-way side-pots (different-sized all-ins)
  also remain unhandled — same known gap as before, just now stated
  clearly in the code comment instead of the removed inline claim that
  this was the *only* missing piece.
- **Not yet re-verified against real PT4/PT5 import** — this is a much
  larger, riskier change than #68 (rewrites a large block of the export
  logic) so recommend re-testing with 2-3 varied hands (a walk-uncontested
  fold, and if possible a real multi-way showdown) before trusting bulk
  exports.

## 2026-08-04 (68) — Bug #3 in PokerTracker export: antes interleaved with blind lines broke PT4 parsing entirely
**Files: ui.js**

- User's friend re-tested the export (after bugs #65/#66/#67 were fixed)
  with real PT4/PT5 software: import showed "1 hand" but with no content
  at all — worse than before, since now even the header-level info wasn't
  usable.
- User supplied a real, confirmed-working hand-history sample (exported
  from a different site, "7XL") to diff against. Comparing it line-by-line
  against our output exposed the real structural bug.
- **Root cause:** traced `Ante`/`SB`/`BB` action creation in `game.js` —
  `SB` and `BB` are pushed to each seat's `actions` array first, and `Ante`
  is pushed *afterward* in a separate loop over all seats. The exporter's
  blind/ante block in `ui.js` was a *single* loop over `sortedSeats` that
  printed whatever it found in each seat's own `actions` array in
  whatever order it appeared there. Net effect: for the SB and BB seats
  specifically, their blind-post line printed *before* their own ante
  line (since SB/BB were pushed to the array first) — so the actual
  output interleaved blind lines into the middle of the antes block
  (e.g. `SB posts small blind` / `SB posts the ante` / `BB posts big
  blind` / `BB posts the ante` / ...) instead of the required structure:
  **all antes as one complete block, then small blind, then big blind**,
  immediately before `*** HOLE CARDS ***`. This is the standard structure
  in every real hand-history format (confirmed against the user's 7XL
  sample) — PT4's parser evidently uses this exact sequence as a
  state-machine transition point, so scrambling it doesn't just misorder
  a couple of lines, it derails parsing of the entire hand body while
  still leaving the header/seat lines intact enough to register as "1
  hand" with nothing readable inside.
- Fixed by splitting the single mixed loop into three separate,
  sequential loops over `sortedSeats` — all `Ante` lines first, then all
  `SB` lines, then all `BB` lines — guaranteeing the antes block is fully
  emitted before any blind-post line, matching the proven-working
  reference structure exactly.
- **Not yet re-verified against real PT4/PT5 import** — user is
  re-testing with the friend next. If the hand still doesn't come through
  clean, other smaller differences noticed against the 7XL reference
  (chip amounts formatted without thousands-separator commas; folded
  players without known hole cards skipped entirely instead of getting a
  blank `Dealt to X` line; header text `PokerStars Hand #...` vs. the
  reference's `Poker Hand #...` and a different Level/blinds format) are
  flagged as next things to check, in that order of suspicion — but
  intentionally not changed yet, to keep this test isolated to the one
  high-confidence fix.

## 2026-07-14 (cont'd 67) — Bug #2 in the same area: blind lines could print BB before SB
**Files: ui.js**

- User caught a second issue in the exporter, right after the seat-order
  fix: the blind-posting lines could come out as "BB posts... SB posts..."
  — backwards from real game order (SB always posts before BB) and from
  standard PokerStars format convention.
- **Root cause:** this specific loop (building the `posts small/big blind`
  lines) still iterated over the raw, unsorted `seats` array — it wasn't
  updated when `sortedSeats` was introduced for the seat-*numbering* fix
  earlier this session. Correct seat numbers didn't guarantee correct line
  *order*, since this was a separate loop over separate (stale) data.
- Fixed by switching this loop to `sortedSeats` too. Since SB always
  immediately follows BTN and BB always immediately follows SB in
  `sortedSeats`, iterating over it naturally produces SB's line before
  BB's — no extra logic needed, just using the already-correct array
  consistently instead of only in one of the two places it was needed.
- Verified directly on the user's real hand data: "ביאנה: posts small
  blind 400" now correctly appears before "בנדוס: posts big blind 800".

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

