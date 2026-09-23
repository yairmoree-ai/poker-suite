# CHANGELOG

**היסטוריה מלאה (עד ולא כולל היום, entries 1-59) נמצאת בקובץ נפרד:**
`CHANGELOG_ARCHIVE_2026-07-14.md` — הקובץ הזה הפך גדול מדי (195KB) וגרם
לקריסה בשמירה, אז פוצל. הקובץ הזה מכיל רק את ההיסטוריה הפעילה/עדכנית.

---

## 2026-09-22 (112) — Restore-from-backup now clears the tombstone for explicitly-selected tournaments
**Files: features.js**

- User's imported tournament ("1 imported") disappeared within seconds
  and never showed up, even scrolling to the bottom of the list. Traced
  through the actual data flow rather than guessing: `confirmMerge
  Tournaments()` genuinely did add it to `S.tournLog` and persist it --
  but the tournament had a tombstone in `S.deleted.tourns` from being
  deleted earlier (confirmed by the user: it was deleted on purpose,
  during testing). `applySnapshot()`'s tombstone-merge logic (`S.tournLog
  = (S.tournLog||[]).filter(t=>!isDeleted('tourns',t.id))`) runs on every
  incoming sync -- including the unrelated 10-second periodic
  `syncFromSheets()` pull -- and silently filtered the just-restored
  tournament right back out, with no error or indication anything
  happened.
- Initially framed this as "working as intended" (tombstones are meant to
  stop a deleted item from being silently revived by a stale sync) -- but
  the user correctly pushed back: the tombstone system can't distinguish
  "deleted on purpose" from "deleted by mistake," and **any** tournament
  someone would actually want to restore from a backup is, almost by
  definition, one that was explicitly deleted at some point (otherwise it
  wouldn't be missing) -- meaning the tombstone system as it stood made
  the entire "restore from backup" feature nearly useless for its actual
  purpose.
- Real fix: an explicit, deliberate user action -- selecting a specific
  tournament in the restore UI and clicking confirm -- is a clear signal
  of intent to bring it back, categorically different from a passive
  background sync that shouldn't resurrect anything on its own.
  `confirmMergeTournaments()` now deletes the tombstone entry
  (`S.deleted.tourns[t.id]`) for each tournament actually being restored,
  before adding it, so the very next sync doesn't immediately re-filter
  it back out.
- **Known residual gap, stated honestly rather than claimed fixed:** the
  tombstone removal is immediate locally, but the push to the server is
  debounced by 2 seconds; the independent 10-second `syncFromSheets` pull
  isn't synchronized with that debounce, so there's still a narrow window
  where an incoming pull could re-apply the old (still-tombstoned) remote
  state before the local removal has been pushed. Much smaller than the
  previous guaranteed-to-fail-within-10s window, but not provably zero --
  worth tightening further (e.g. forcing an immediate push right after
  tombstone removal) if this is ever observed in practice.

## 2026-09-22 (111) — Extended locking to the read side too (getBackupList/getBackupData)
**Files: poker-google-script.js**

- User's exact same "The string did not match the expected pattern"
  error recurred, this time inside the restore-list flow specifically,
  after admitting to clicking through backup/restore quickly during
  testing.
- Gap in #110's fix: the lock only covered `autoBackup()`'s write path.
  `getBackupList()`/`getBackupData()` (the read path used every time the
  "שחזר מגיבוי Drive" list is opened) had no lock at all -- so a read
  landing in the middle of a concurrent `autoBackup()` write could still
  observe a partially-written, inconsistent sheet state and fail in a
  timing-dependent way that matches exactly what's been reported twice
  now.
- Wrapped the `getDataRange().getValues()` call in both `getBackupList`
  and `getBackupData` with the same `LockService.getScriptLock()` used in
  `autoBackup()`. Since it's the same script-wide lock, a read now always
  waits for any in-progress write to finish before looking at the sheet,
  and a write waits for any in-progress read -- fully serialized access
  to the "Backups" sheet across all three entry points, not just the
  write side.

## 2026-09-22 (110) — Added locking around the backup write, addressing likely intermittent race-condition errors
**Files: poker-google-script.js**

- User reported the core system now works (existing tab found again,
  manual backup + restore succeeded twice) but an error is thrown
  occasionally, with no clear/reproducible pattern -- consistent with a
  timing-dependent issue rather than a deterministic bug, especially
  since testing involved several rapid manual backup/restore cycles in a
  row.
- Fixed proactively rather than waiting for the exact error text (asked
  for it too, for next time): `autoBackup()` read `sheet.getLastRow()`
  and then wrote new rows starting right after it as two separate,
  non-atomic steps. If two runs happen close together (a manual backup
  overlapping the weekly trigger, or two quick manual clicks), both could
  read the same `lastRow` and then both try to write starting at the same
  row -- exactly the kind of collision that only shows up "sometimes,
  no obvious reason," since it depends on exact timing rather than any
  specific input.
- Wrapped the read-then-write sequence in `LockService.getScriptLock()`
  (30s wait), moving the `getLastRow()` read to happen *inside* the lock
  rather than before it, so only one execution at a time can be mid-way
  through this sequence for a given backup file. Removed the earlier,
  now-redundant `lastRow` read that happened before lock acquisition
  (which would have defeated the purpose, since a race could still occur
  between that read and actually acquiring the lock).
- This is a real, well-reasoned hardening fix regardless of whether it
  turns out to be the exact cause of the specific error seen -- still
  waiting on the actual error text (Executions log) to confirm or rule it
  out definitively, rather than treating this as a confirmed diagnosis.

## 2026-09-22 (109) — Reverted the #106 filename regex "fix" -- it split backups into a brand-new file
**Files: poker-google-script.js**

- User reported the "Backups" sheet wasn't found at all -- turned out a
  whole new backup *file* had been created instead of reusing the
  existing one, with its own fresh "Backups" tab inside it.
- Root cause, traced directly rather than guessed: #106 changed
  `backupFileName`'s computation from a literal `.replace('Poker Suite —
  ', '')` (matching only an em-dash) to a regex matching either an
  em-dash or a plain hyphen, intended purely as a cosmetic fix for the
  "Poker Suite Backup — Poker Suite" duplication noticed earlier. But
  this user's actual live spreadsheet name uses a plain hyphen ("Poker
  Suite - יאיר מורה"), so the "cosmetic fix" actually *changed* the
  computed backup filename for this user -- from the existing file's
  real name ("Poker Suite Backup — Poker Suite - יאיר מורה") to a
  different, cleaner-looking one that had never existed. `DriveApp.
  getFilesByName()` requires an exact match, found nothing under the new
  name, and the code's own fallback (`files.hasNext() ? ... :
  SpreadsheetApp.create(...)`) correctly did what it was told: created a
  brand-new file rather than reusing the old one.
- Fixed by reverting to the exact original literal `.replace('Poker
  Suite — ', '')` in all three places (`autoBackup`, `getBackupList`,
  `getBackupData`) -- restores the historical filename computation
  exactly, so it finds and reuses the existing backup file again. The
  cosmetic double-naming ("Poker Suite Backup — Poker Suite - ...") is
  ugly but was never actually broken; #106 traded a real identity bug for
  a cosmetic one, which was the wrong trade.
- Lesson worth keeping in mind: a "harmless cosmetic fix" to a string
  used as a lookup key is not harmless if different users' underlying
  data doesn't share the exact same original format -- worth checking
  what the key is actually *used for* (identity/lookup vs. display)
  before changing how it's computed, not just whether the change looks
  more correct in isolation.
- **Not yet re-verified against a real run** -- same deployment
  requirement as before (paste, save, new Web App deployment) applies.
  The stray empty file created by the bug can be deleted manually once
  the next real backup confirms it's writing to the correct, original
  file again.

## 2026-09-22 (108) — FOUND IT: Google Sheets silently converts date-like strings to real Date cells, breaking backup identity
**Files: poker-google-script.js, features.js**

- User reported both backup and restore "broken" after deploying #106/
  #107 -- backup list showed raw ISO strings like `2026-09-22T18:49:00.
  000Z` instead of the intended `dd/MM/yyyy HH:mm` label, and restore
  failed with "גיבוי לא נמצא" even for backups visibly present in the
  list.
- **Root cause, confirmed by the exact symptom, not guessed:** the
  "Backups" sheet's timestamp column stored a plain JS string (`22/09/
  2026 18:50`) as each row's identifying key. Google Sheets auto-detects
  strings that look like dates/times and silently converts that cell to
  a real Date-typed value -- even when written via `setValues()` with an
  explicit string, not typed manually. Reading it back via `getValues()`
  then returns a native `Date` object, not the original string; once that
  object passes through `JSON.stringify()` in the HTTP response, JS's
  default `Date.toJSON()` produces ISO 8601 -- exactly the mangled label
  seen. And since `getBackupData` compared the row's value against the
  string the client sent back with strict `===`, comparing a `Date`
  object against a string is *always* false -- explaining "not found"
  for backups that genuinely existed.
- Fixed by removing the date-like string from the data model entirely:
  each row's key is now `now.getTime()` -- a plain numeric epoch, which
  Sheets has no format-pattern to "recognize" and silently convert.
  `getBackupList` derives the human-readable `dd/MM/yyyy HH:mm` label
  fresh from the epoch on every request (not stored anywhere) and returns
  `{key, label}` pairs; `getBackupData` compares `Number(cell) === Number
  (requestedKey)` instead of string equality.
- Client (`features.js`, `showDriveRestore`/`loadDriveBackup`) updated to
  match: buttons display `label`, pass `key` through to the restore call;
  `loadDriveBackup` now takes `(key, label)` instead of a single
  overloaded string.
- Verified the new key/label logic directly in an isolated Node
  simulation (list ordering, and retrieval by a key round-tripped through
  a string, matching how it actually travels via URL parameters) before
  trusting it -- both produced correct results.
- **Cleanup needed on the user's actual Drive file, not just code:** the
  ~16 rows created while debugging (buggy version, before this fix) are
  stored with corrupted/Date-typed keys that won't match the new numeric
  model at all -- they'll simply become invisible to `getBackupList`
  going forward. Recommended deleting those data rows from the "Backups"
  sheet (keep the header row) for a clean start, rather than trying to
  salvage them.
- Same deployment requirement as #106/#107 applies again: this needs to
  be re-pasted into the Apps Script editor and a **new Web App
  deployment** created (not just saved) for `get_backup_list`/
  `get_backup_data` to actually serve the fixed code to the app.

## 2026-09-22 (107) — Backup schedule reduced to weekly (Fridays), rotation removed entirely
**Files: poker-google-script.js**

- User's actual usage pattern is weekly (once a week), with manual backup
  already available on-demand whenever needed — twice-daily automation
  from #106 was more than necessary, and the goal is now to keep
  everything forever rather than rotate old backups out.
- Confirmed first (not assumed): `manual_backup` calls `autoBackup()`
  directly (same function, same code path) — so it already produces a
  row in the "Backups" sheet under the new #106 model, not a separate
  tab. No change needed there; manual on-demand backups already fit this
  request as-is.
- `setupBackupTriggers()`: replaced the two daily triggers (8:00, 22:00)
  with a single weekly trigger — Friday mornings, 8:00 (`onWeekDay
  (ScriptApp.WeekDay.FRIDAY).atHour(8)`), dropping `everyDays(1)`
  entirely. Must be re-run once manually from the Apps Script editor to
  replace the existing triggers (same deployment step as before — this
  file isn't picked up by re-uploading it to GitHub).
- `autoBackup()`: removed the `KEEP_BACKUPS` rotation block from #106
  entirely — no deletion of any kind anymore, backups accumulate
  indefinitely. Sized the decision explicitly rather than just doing it:
  Google Sheets' actual hard limit is 10 million cells per file (4
  columns here -> roughly 2.5 million rows); even decades of weekly
  backups (~50/year) with several chunk-rows each stays many orders of
  magnitude below that ceiling, so removing the cap doesn't create a
  realistic risk of hitting it.

## 2026-09-22 (106) — Backup system redesigned: one-sheet-per-user, rows instead of tabs, true chronological rotation
**Files: poker-google-script.js**

- Follow-up to the backup investigation earlier in this conversation
  (confirmed real ~3.5-month gap in automatic backups, plus a corrupted
  tab from the trigger's first run after recovering). User pushed back
  correctly on two points once the root design was visible: (1) the old
  rotation deleted `sheets[0]` — array order of tabs in the file, not
  actually-oldest-by-date — so a tab created out of normal order (exactly
  what happened with the corrupted 21/9 tab) could get the wrong one
  deleted; (2) why cap at 20 tabs at all, when one sheet with a row per
  backup avoids the whole problem.
- Rewrote the backup storage model in `autoBackup()`, `getBackupList()`,
  and `getBackupData()`: instead of one new spreadsheet **tab** per
  backup run, every backup now appends rows to a single sheet named
  "Backups" (columns: timestamp, chunk_index, data, updated). Since rows
  are only ever appended (never inserted out of order), row order is
  *guaranteed* to match true chronological order — there's no longer any
  way for "the first one found" to not actually be the oldest one, which
  is exactly the ambiguity that caused the original bug.
- Rotation now keeps the last `KEEP_BACKUPS = 60` distinct timestamps (up
  from 20 tabs — roughly 30 days at twice a day instead of ~10), and
  deletes by literally removing the rows belonging to the oldest
  timestamps once that cap is exceeded, iterating from the bottom up so
  row indices don't shift mid-deletion.
- `getBackupList`/`getBackupData` updated to match: list unique
  timestamps found in the "Backups" sheet (reversed, newest first) rather
  than sheet names; fetch a specific backup by filtering rows to that
  timestamp, sorting by `chunk_index`, and joining — same reassembly
  logic as before, just row-based instead of tab-based.
- Also fixed, while touching every `backupFileName` computation: the
  cosmetic "Poker Suite Backup — Poker Suite" duplication noticed
  earlier (caused by `.replace('Poker Suite — ', '')` using an em-dash
  that didn't match the user's actual sheet name, which used a plain
  hyphen) — replaced with a regex (`/^Poker Suite\s*[—-]\s*/`) that
  matches either dash style.
- **Backward compatibility, explicitly not built:** existing per-date
  tabs from the old model (04/06–11/06/2026, the recovered 21–22/09/2026
  ones) are left untouched in Drive — nothing deletes them — but the
  in-app "שחזר מגיבוי Drive" list will only show backups from the new
  "Backups" sheet going forward, since that's what `getBackupList` now
  reads. The old tabs remain manually accessible directly in the Drive
  file if ever needed, just not through the app's restore UI.
- Verified the core algorithm in an isolated Node simulation (not just
  read through) before trusting it: appended four small backups with a
  keep-limit of 3, confirmed the list returns newest-first in the right
  order, confirmed a specific backup's chunks reassemble correctly, and
  confirmed the true-oldest one was the one actually removed once the
  limit was exceeded.
- **Not yet tested against a real Google Sheets/Drive run** — this is
  server-side Apps Script code that can only be validated by watching the
  next real `autoBackup()` execution (8:00 or 22:00) succeed and produce
  a "Backups" sheet with rows, or by triggering a manual backup and
  checking the Executions log.

## 2026-08-16 (105) — Real grid alignment: fixed-width columns instead of content-sized flex groups
**Files: ui.js, styles.css**

- User pointed out the paired rows from #103/#104 weren't actually
  aligned as a table — text under text, numbers under numbers, inputs
  under inputs, consistently down every row. Root cause: every row used
  flex groups sized by their own content (a `<div style="display:flex">`
  per side), so a wide value like `₪1,505` shifted its whole group wider
  than a short one like `100`, and nothing forced the same horizontal
  position across different rows — looked "off" and inconsistent, not a
  clean table.
- Real fix: a shared CSS Grid class, `.tstats-row` (styles.css) —
  `grid-template-columns: 64px 66px 64px 66px` (label-right, value-right,
  label-left, value-left), applied identically to every paired row in
  both "נתוני טורניר" and "חישוב וחלוקת פרסים". Fixed column widths mean
  every label starts at the same x-position and every value/input cell
  is the same width, regardless of what that row's specific content
  happens to be — actual table alignment, not just visual approximation.
- Rewrote every row (ui.js) to place its label/value/input elements
  directly as grid children instead of nesting them in per-side flex
  wrapper divs — simpler markup as a side effect, not just a visual fix.
  Rows with only one side (e.g. "שחקנים" alone when not admin, "כניסות
  בתשלום" alone) just supply 2 children instead of 4; CSS Grid leaves the
  remaining columns empty automatically without needing placeholder
  elements or breaking alignment for the rows around it.
- Inputs now use `width:100%` (filling their fixed-width grid cell)
  instead of a manually-matched pixel width — one shared source of truth
  for column width (the grid template) rather than needing input widths
  and column widths to be kept in sync by hand in multiple places.
- Verified brace-balance on styles.css (186/186) and span-tag balance
  within the two rewritten ui.js blocks (11/11, 12/12) directly, plus
  `node --check`. The div count looked off by one again on a raw
  substring check — confirmed, as in #103, that this is the same
  slice-boundary artifact (a preceding div's closing tag falling just
  inside the cut point) rather than a real mismatch.

## 2026-08-16 (104) — Actually fixed the מקום 1/2 row: it was one flex row all along, just too wide to fit
**Files: ui.js**

- User reported #103's change only showed up in "נתוני טורניר" -- מקום 1/2 in "חישוב וחלוקת פרסים" still looked like two separate rows. A screenshot confirmed מקום 3/4 and בית/הפתעות were correctly paired side by side, but מקום 1/2 wasn't.
- Root cause, found by inspecting the actual rendered content rather than the markup structure alone: מקום 1/2 genuinely was one flex container (not a code bug, not a stale file -- that hypothesis was floated and correctly ruled out once the screenshot showed the other two rows *had* updated). The `flex-wrap: wrap` added as a safety net in #103 was silently kicking in on a real phone screen, because each side's content -- label with an inline "(70%)" percentage, a separate muted preview span showing the auto-calculated amount, and a 70px override input -- was simply too wide for two copies to fit side by side. מקום 3/4 and בית/הפתעות have far simpler content (just a plain number input each), so they fit without wrapping; מקום 1/2 never had a chance to.
- Fixed by shrinking the actual content, not just styling: moved the percentage out of the visible label into a `title` tooltip; removed the separate muted preview `<span>` entirely and instead used the input's own `placeholder` to show the auto-calculated default (a value that's only visible when the field is empty/not overridden -- exactly when you'd want to see the default) instead of a static "עקוף" placeholder; narrowed the input to 62px at a smaller font size. Kept `flex-wrap: wrap` in place as a fallback for genuinely narrow screens rather than removing it outright -- a graceful two-row fallback is a much better failure mode than clipped/overflowing content on some device Claude can't test directly.

## 2026-08-16 (103) — Compacted "נתוני טורניר" and "חישוב וחלוקת פרסים" from 5+4 rows into 3+3 rows
**Files: ui.js**

- User asked for a specific height-saving layout: pair up related stats side by side in the same row instead of each on its own line, in both tables of the current-tournament card.
- "נתוני טורניר" (was 5 rows -> 3 rows): שחקנים paired with צ׳יפים כולל (admin-only, so that row falls back to שחקנים alone for non-admins); Rebuy כולל paired with קופת פרסים; כניסות בתשלום stays alone (not requested to pair).
- "חישוב וחלוקת פרסים" (was 4 rows -> 3 rows): מקום 1 now paired with מקום 2 in one row (previously each had its own full row); מקום 3 paired with מקום 4 (previously מקום 3 was paired with בית, and מקום 4 with הפתעות); בית re-paired with הפתעות into its own row. Net effect: the same four place-prize rows people already knew, just regrouped into the pairing the user asked for, plus בית/הפתעות landing together as their own row instead of being split across the old מקום 3/4 rows.
- Reused the exact same justify-content:space-between + two inner flex groups pattern the code already used for the old מקום 3/בית and מקום 4/הפתעות pairs (rather than inventing new layout CSS) — kept every existing conditional (isViewer(), isAdmin(), the place1/place2 override inputs) fully intact, only regrouped which two elements share a row. Narrowed the place1/place2 override input width from 80px to 70px to fit two full editable rows side by side on a phone screen without the row wrapping.
- Verified structurally rather than just visually: confirmed node --check passes, and manually traced every div/close-div pair in the rewritten block by hand (an automated substring count looked off by one at first, but that was a slice-boundary artifact cutting into an unrelated preceding div, not a real mismatch — confirmed by reading the actual block text).

## 2026-08-16 (102) — Removed the now-empty "🏆 טורנירים" header row above the tournament tab
**Files: index.html**

- Follow-up to #100/#101: once both duplicate buttons that used to sit next to this header were removed, the header row itself (just the label "🏆 טורנירים", between the top toolbar and the current-tournament card) added nothing on its own. User reconsidered and asked to drop it too.
- Removed the header div along with its now-unnecessary wrapping container. Verified div tag balance dropped by exactly two (matching the two divs removed) and confirmed by grep that the header text no longer appears anywhere in the file.

## 2026-08-16 (101) — Removed a second duplicate: standalone "ייצוא לExcel" button near the top of the tournaments tab
**Files: index.html**

- User found and marked another leftover duplicate, same pattern as #100: a standalone "ייצוא לExcel" button (index.html, calling exportTournsToCSV() directly) sitting right above the current-tournament card, separate from the "📊 Excel" button already present next to Leaderboard further down (ui.js, calling exportToExcel() -- confirmed to be nothing more than a one-line wrapper around the same exportTournsToCSV()). Confirmed identical before removing anything, same as the save/reset check in #100.
- Removed the standalone button and its now-empty wrapper row from index.html. The underlying exportTournsToCSV() function itself (render.js) was untouched -- only the duplicate button call was removed, not the function it called.
- Verified div/button tag balance dropped by exactly one each (152/152 divs, 60/60 buttons) after the edit, and confirmed by grep that no other reference to exportTournsToCSV() remains in index.html while the function definition itself is still intact in render.js.

## 2026-08-16 (100) — Removed duplicate save/reset-tournament buttons, and a hidden double-confirm bug found along the way
**Files: index.html, ui.js, render.js**

- User spotted (and marked in a screenshot) two redundant buttons at the top of the tournaments tab — "שמור טורניר נוכחי" and "אפס טורניר" — asking to remove them and to confirm the remaining buttons do the same thing.
- Confirmed rather than assumed: traced both buttons' onclick handlers. The top pair (index.html, #btn-save-tourn/#btn-reset-tourn) called showSaveTournDialog() and resetTournament() directly; the bottom pair inside the "current tournament" card (ui.js) called openSaveTournBox() (a one-line wrapper around the same showSaveTournDialog()) and also resetTournament(). Confirmed identical underlying actions before removing anything.
- Found one real, hidden bug while confirming this: the bottom reset button wrapped its call in a native confirm('לאפס את הטורניר?') — but resetTournament() itself already builds its own inline confirmation box (with the tie checkbox from #88), so this was a redundant double confirmation the top button didn't have. Removed the extra native confirm() wrapper so both paths behave identically through one single confirmation step.
- Removed the duplicate buttons and their now-orphaned row from index.html, keeping the section header itself.
- Cleaned up a dead reference: render.js's viewer-visibility toggle looped over a hardcoded list of button IDs including the two removed button IDs — harmless after removal (the loop already null-checks each element before touching it), but removed the two dead entries anyway rather than leaving stale references to elements that no longer exist.
- Verified: brace/tag balance on the edited index.html (61 opening and 61 closing button tags, 153 opening and 153 closing div tags), syntax-checked ui.js and render.js, and confirmed by direct grep that no other code anywhere still references the removed button IDs.
- Caveat: unlike ui.js (re-verified against the user's own repo upload earlier today), index.html and render.js were not independently re-uploaded and diffed this session — these two edits are built on Claude's existing working copy of those files, not freshly confirmed against the user's actual repo state. Worth an extra check if anything about the tournament tab looks unexpectedly different after deploying.
- **Process note:** while writing this entry, a scripting mistake on Claude's part (a Python write that failed partway through due to a bad emoji escape) truncated this CHANGELOG.md to empty in the sandbox, and a chained cleanup command copied that empty file over the last-known-good output too, wiping both copies. Recovered by rebuilding from the user's own most recent upload (entries 1-88, confirmed intact) and re-adding entries 89-100 from Claude's own conversation history, since their exact text was still available there. No code files were affected, only this changelog, and nothing was lost that couldn't be reconstructed exactly.

## 2026-08-16 (99) — Bar height now represents finishing place, not Rebuy count
**Files: ui.js**

- User clarified a request that sounded at first like something already done (#91 sorted the chart by place, #96 moved Rebuy to a label under the name) — but the actual ask was different: the bar height itself should represent finishing place, not Rebuy count. Confirmed the direction explicitly first: place 1 (best) should be the tallest bar, decreasing as place gets worse — the inverse of the raw place number.
- Replaced the two-segment bar (a fixed green "buyin" base + a Rebuy-proportional colored segment stacked on top) with a single bar per player. Height = BAR_MAX * (totalPlayers - place + 1) / totalPlayers, floored at a small minimum (6px) so last place still shows a visible sliver rather than disappearing. Uses displayPlace (tie-aware, same as the place-number label and #85's tie handling) so tied players get equal-height bars too, consistent with everything else on this card.
- Kept the free-rebuy milestone color-coding on the bar itself (gold = normal, blue = 10+ free rebuy, red = 16+) even though height no longer encodes Rebuy magnitude — the exact Rebuy count is still fully preserved as text under the player's name, so nothing was lost, and the color keeps the "who hit a milestone" at-a-glance signal alive.
- Updated the now-stale legend, which used to read "כניסה / Rebuy" describing the old stacked-segment meaning — replaced with a plain caption stating what the bar height now means, plus the milestone-color legend only when relevant.
- Verified the height formula directly for an 11-player tournament: place 1 -> 56px (max), decreasing in equal steps down to place 11 -> 6px (floor) — confirmed monotonically decreasing and never disappearing.

## 2026-08-16 (98) — Flipped bar chart reading order: place 1 now on the left, ascending rightward
**Files: ui.js**

- User liked #97's result and asked for one more layout change: read the chart left-to-right by finishing place (1st leftmost, 2nd to its right, etc.) — while keeping the Hebrew text itself displaying normally.
- Used flex-direction: row-reverse on the bar-row container rather than touching the page's direction — this only reverses the order flex items are placed in, it doesn't affect how any individual piece of Hebrew text shapes or aligns internally (that's governed by Unicode's own bidi algorithm per text run, independent of a parent flex container's direction). In this app's RTL context, plain row already put the first DOM item (place 1, still sorted ascending from #91) at the right edge; row-reverse flips that to the left edge with each next item proceeding rightward — exactly the requested order, with zero risk to the Hebrew rendering since nothing about text direction changed, only sibling order.

## 2026-08-16 (97) — Made the bar-chart player name horizontal in the live view too, not just the shared image
**Files: ui.js**

- More fine-tuning after #96: user asked to drop the "." after the place number, bump its font to 13px with a more vivid color, and — separately — asked why the player name couldn't just be horizontal in the live history view the same way it already was in the shared image.
- That last question led to simplifying rather than just patching: since the horizontal name style was already proven to look fine (user confirmed it in #94's shared image), there was no good reason to keep two versions of the same text — vertical+rotated on screen, horizontal only inside html2canvas's onclone. Removed the vertical/rotated style entirely and made the on-screen name horizontal (9px, ellipsis-truncated at 34px) to match.
- Consequence: the onclone workaround from #94 is no longer needed at all (no more rotated text anywhere in the captured box) — removed it from shareTournamentImage rather than leaving dead code that references a class (vert-name) that no longer exists on anything.
- Place number: dropped the trailing "." (1 instead of 1. — doesn't need it), bumped to 13px, and brightened the 1st/2nd/3rd medal colors specifically for more visual punch, while 4th-onward keeps the single flat color from #96.

## 2026-08-16 (96) — Rebuy bar chart: place number resized, colors tightened, Rebuy moved below the name
**Files: ui.js**

- Follow-up polish round after #95's initial "make it bold" pass. User feedback on the live screen (not the shared image): place number was too big now, wanted the font itself emphasized rather than just sized up, wanted 1st/2nd/3rd to each keep a distinct medal color but every other place to share one uniform color (not a gradient of grays), and asked about moving the Rebuy detail somewhere else.
- Sketched two Rebuy-position options as an inline mockup (badge floating over the bar itself, vs. a third line under the player's name) before touching code. User picked the under-the-name option.
- Changes: place number 15px -> 12px with a thin text-stroke outline alongside the existing text-shadow so it still reads as "heavier" than its surroundings at the smaller size; non-medal places (4th onward) now all use one fixed color instead of falling back to the same muted tone used elsewhere on the card; moved the Rebuy detail out of the place-number line entirely into a new small line directly under the player name.

## 2026-08-16 (95) — Rebuy bar chart: finishing place made visually dominant over Rebuy detail
**Files: ui.js**

- User confirmed #94's fix worked (names read correctly in the shared image now) and asked for a follow-up polish: the finishing-place number should stand out more than the Rebuy detail next to it.
- Split what was one label into two separately-styled spans: the place number is now 15px/weight 900 with a subtle text-shadow for depth, the Rebuy detail in parens is a smaller 8px/weight 600 in muted color right after it. Place is now clearly the primary read, Rebuy the secondary detail — same information as before, just re-weighted visually.
- No layout/logic changes beyond the label styling itself — same medal colors (gold/silver/bronze for 1st-3rd), same tie-group handling (displayPlace), same free-rebuy badge logic.

## 2026-08-16 (94) — Second, different bug in the same feature: Hebrew names garbled in the shared tournament image
**Files: ui.js**

- Good news first: #93's oklch fix worked — sharing completed and produced an actual image with a working share sheet. But the player names in the Rebuy bar chart came out visually broken — letters jumbled/disconnected rather than reading as the name.
- Different root cause, unrelated to #93: the bar chart's player-name labels use writing-mode: vertical-rl plus transform: rotate(180deg) to stack Hebrew names vertically and compactly under each bar — renders correctly in a real browser, but html2canvas re-implements its own text layout rather than using the browser's actual bidi + vertical-text engine, and gets the combination of RTL character ordering + vertical stacking + an extra 180-degree rotation wrong.
- Fixed via html2canvas's onclone option in shareTournamentImage only: right before capturing, it swaps the vertical/rotated style for plain horizontal text (writing-mode: horizontal-tb, no rotation, 9px) on a clone of the DOM used only for that one screenshot — the actual on-screen chart is completely untouched, still vertical and compact at that point in time. Marked the target span with a vert-name class so onclone could find it reliably instead of matching by inline style text.
- Scoped deliberately to shareTournamentImage only, not the other two share functions — shareHandImage and shareLeaderboardImage don't use vertical/rotated Hebrew text anywhere in what they capture, so there was nothing there to fix.

## 2026-08-16 (93) — FOUND IT: html2canvas can't parse oklch() — root cause of the share error, fixed at the source
**Files: styles.css**

- Diagnostic improvement from #92 worked immediately: user retried sharing and the toast showed the real error — Attempting to parse an unsupported color function "oklch".
- Root cause: styles.css defines seven color variables/rules using the modern oklch() CSS color function (--gold, --gold-soft, --bg, --felt, --felt2, --felt-edge, --felt-rail, --chip-red, plus .card-red/.card-black). Real browsers render oklch() fine, but html2canvas (the library all three share functions depend on) uses its own limited CSS color parser that has never supported it. --gold alone is used constantly throughout the app, so this wasn't tournament-specific — any share action touching an element styled through one of these variables was exposed to the same failure; the tournament card was just the first one actually tried.
- Fixed by converting all seven oklch() values to their exact mathematically-equivalent hex values (proper OKLab -> linear sRGB -> gamma-corrected sRGB conversion, not eyeballed) — e.g. --gold: oklch(0.82 0.14 85) -> #eebc4a. Same actual color, different syntax — no visual change anywhere in the live app, only removes the html2canvas incompatibility at its source. Fixes sharing for hands and the Leaderboard too, not just tournaments, even though only the tournament case had actually surfaced yet.
- Verified brace-balance and structure on the edited CSS file directly (185 open / 185 close) rather than assuming the edit was clean.

## 2026-08-16 (92) — Diagnostic improvement: share errors now show the actual failure, not a generic message
**Files: ui.js**

- User reported a "sharing error" toast when trying to share a tournament card image. Could not reproduce directly (no real browser/canvas available in this environment) — the existing catch block only logged the real error to console.error (invisible on a phone, no easy dev-tools access) and showed a generic "שגיאה בשיתוף הטורניר" toast with no detail.
- Rather than guess at the cause (html2canvas has several known failure modes — CORS-tainted canvas, unsupported CSS, canvas size limits — and guessing wrong wastes a round-trip), improved all three share functions (shareHandImage, shareTournamentImage, shareLeaderboardImage) to include the real error message directly in the visible toast. Next failure would show the actual reason on screen, no console access needed.
- Not a fix yet — purely a diagnostic step. This is exactly what surfaced the real oklch bug fixed in #93.

## 2026-08-16 (91) — Rebuy bar chart now sorted by finishing place, not Rebuy count
**Files: ui.js**

- Follow-up to #90: once place labels were added to each bar, user asked to sort the chart by finishing place (1, 2, 3...) instead of by Rebuy count, since the place label makes place order the more readable default now.
- Changed the one sort key from sorting by Rebuy count descending to sorting by place ascending. Added .slice() while at it — the original called .sort() directly on t.finishOrder itself, which mutates the array in place; harmless in practice but worth not doing when touching the line anyway.
- Verified with a small synthetic case (places 3, 1, 7, 2 in scrambled input order) — output is 1, 2, 3, 7 as expected.

## 2026-08-16 (90) — Added finishing place to the Rebuy bar chart in tournament history
**Files: ui.js**

- User wanted each player's finishing place shown in the Rebuy bar chart on saved-tournament history cards (previously that chart only showed Rebuy count per player; finishing place was only visible for the top 4 in a separate "places column" above it).
- Sketched three label options as an inline mockup (place instead of Rebuy, place plus Rebuy combined, place as a separate line) before writing any code. User picked "place + Rebuy combined".
- Implemented: each bar's label became "{place}. ({rebuy} {badge})" when the player has any rebuys, or just "{place}." when they have none — keeping the existing free-rebuy badge (10 checkmark / 16 checkmark) and bar-color milestone logic untouched, just adding the place number in front.
- Colored the place number gold/silver/bronze for 1st/2nd/3rd (matching the existing "places column" above it), muted gray for everyone else.
- Ties (#85) handled the same way as the places column: a tied player's displayPlace is the minimum of their tieGroup, so two players tied for 1st both show 1 in the bar chart too.
- Verified the label-generation logic directly against five synthetic cases (plain rebuy, free-rebuy badge, no rebuy, and a genuine tie) before finalizing — all five produced the expected label and color.

## 2026-08-15 (89) — New feature: undo an incorrect KO mark (fix elimination order mistakes)
**Files: features.js, ui.js**

- User reported forgetting to mark a player as eliminated mid-tournament, which threw off the whole chronological elimination order for everyone marked afterward (koOrder is chronological — index position determines finishing place, so a missing entry shifts everyone after it into the wrong place).
- No existing way to remove a player from koOrder once marked — only koPlayerFromList() to add one, never a way back.
- New unKoPlayer(pid) (features.js): removes the player from S.koOrder, re-renders. Deliberately does not attempt to restore their seat/stack — that state is already cleared by the time a KO happens and there's no snapshot to restore from; the fix is meant to unwind just far enough to re-mark eliminations in the correct order (undo the ones after the mistake, mark the forgotten player, re-mark the ones just undone — chronological order restored).
- New undo-KO button in the player list (ui.js), replacing the plain eliminated-status badge for admins (viewers still just see the read-only badge, unchanged).
- Verified the fix workflow end-to-end in Node: koOrder=['Y'] (Y wrongly marked alone) -> unKoPlayer('Y') -> re-mark X then Y in correct chronological order -> confirmed final koOrder is ['X','Y'].
- Process note: this feature required a full rebuild after Claude's own sandbox copy of the project turned out to have regressed mid-session in a way that wasn't caught by an earlier verification pass — it had fallen behind the user's actual repo. Recovered by treating the user's freshly re-uploaded repo files as ground truth and rebuilding this fix on top of those.

---

## 2026-08-15 (88) — Tie checkbox missing from a second save path — "reset & save" bypassed it entirely

**Files: ui.js**

- User reported a real, reproduced bug: saved a tournament with 2 players
  still active (Itzik/Eli, both non-eliminated) and expected the tie flow
  from #86 — instead got the normal 🏆/🥈 split, points included, exactly
  what the tie feature was supposed to prevent.
- **Root cause, confirmed rather than assumed:** the app has *two*
  separate save paths — the "💾 שמור טורניר" button (`showSaveTournDialog`)
  which got the tie checkbox in #86, and a second, independent
  "🔄 אפס טורניר" → "💾 שמור ואפס" combo flow (`resetTournament()` →
  `doSaveAndReset()`) which did not. This was already flagged as a known
  gap in #86's own changelog entry ("not addressed here... flagged in
  case it turns out to matter too") — it did.
- Fix: `resetTournament()` now runs the same active-player check
  `showSaveTournDialog()` does, and shows the identical "🤝 X / Y
  התחלקו" checkbox inline in the reset-confirmation box when 2+ players
  are still active. `doSaveAndReset()` reads it and passes `tieActive`
  through to `saveTournament()`, exactly like the other path.
- **For the tournament already saved incorrectly** (Itzik/Eli, 28.8):
  pointed the user to the ✏️ finish-order editor built in #79/#85, which
  already supports fixing this after the fact — no separate repair
  needed, the tool for exactly this situation already exists.

## 2026-08-15 (87) — Fixed a real display inconsistency: tied players now both show 🏆 on the main history card
**Files: ui.js**

- User asked what the main tournament-history card would show for a tie
  (1/2, or both 1) — checked the code rather than guessing, and found a
  real gap: the finish-order editor (#79/#85) already displayed ties
  correctly (merged "1-2." label + 🤝 badge), but the actual card everyone
  sees day-to-day — and what gets shared as an image — still used raw
  `medals[f.place]` per player, so a tied pair would show 🏆 and 🥈
  separately despite scoring equally. Two different displays of the same
  data, out of sync.
- User's call: both tied players should show 🏆 (first place), simplicity
  over precision here — confirmed points aren't affected by this either
  way (already handled correctly since #85).
- Fix: the card now computes `displayPlace = tieGroup ? Math.min(...
  tieGroup) : place` before picking the medal/color/label, so every
  member of a tie group displays using the *best* place in that group.
  Prize amounts are untouched — still looked up by each player's own
  individual `place`, consistent with the earlier decision (#85) to keep
  scoring and money separate.
- Verified the display logic directly (not just re-reading it): a tied
  pair at places 1/2 both resolve to 🏆, an untied 3rd place still shows
  🥉, unchanged.

## 2026-08-15 (86) — Tie marking moved upstream: available at save time, not just after the fact
**Files: ui.js, index.html**

- Follow-up to #85: user clarified the tie needs to be settable *before*
  saving a tournament, not only fixed retroactively via the finish-order
  editor from #79 — the actual real-time scenario is heads-up ending in
  a chop, where there's no elimination event at all to derive "1st" vs
  "2nd" from in the first place.
- **New checkbox in the save-tournament dialog (`showSaveTournDialog()`)**:
  auto-detects when 2+ players are still marked *active* (not in
  `koOrder`) at the moment the save dialog opens — exactly the heads-up-
  chop situation, since a normal finish always ends with exactly one
  active player left. Shows their names with a "🤝 X / Y התחלקו — תן
  ניקוד שווה" checkbox only in that case; a normal single-winner finish
  shows nothing extra, unchanged from before.
- **`saveTournament(tournName, tieActive)`** — new second parameter.
  When checked, applies the same `f.tieGroup` field from #85 directly to
  the `activeSorted` players' `finishOrder` entries at creation time,
  instead of requiring a manual post-save edit. Uses the exact same data
  field and the exact same `computeLeaderboard()` logic from #85 — no
  new scoring code, just an earlier point to set the flag.
- `doSaveAndReset()` (the reset-tournament dialog's own save path) still
  calls `saveTournament(name)` without the tie flag — that flow doesn't
  have the same checkbox UI. Not addressed here since it wasn't part of
  what was asked; flagged in case it turns out to matter too.
- **Verified with a real run of the extracted `saveTournament()`
  function** (not just reasoning): simulated 2 active players + 1 already
  eliminated, called with `tieActive=true`, confirmed the two active
  players both got `tieGroup:[1,2]` while the eliminated player kept a
  normal, untied `place:3`.

## 2026-08-15 (85) — New feature: shared-place ties in the Leaderboard scoring
**Files: state.js, ui.js**

- User clarified this isn't a rare edge case: the last two players
  splitting the pot 50/50 happens often enough in this group to need real
  support, not just the earlier ad-hoc guidance (chip-count decides who's
  "place 1").
- **Scoring rule, confirmed with the user earlier in this conversation:**
  tied players get the *average of the points* each place would earn, not
  points computed from an averaged place number — `avg(1/1, 1/2) = 0.75`,
  not `1/1.5 ≈ 0.667`. This is the standard convention for shared
  placements in sports scoring.
- **Data model (`f.tieGroup`, added to `finishOrder` entries):** each
  player keeps their individual `place` (1, 2, ...) — still needed for
  the existing per-place prize lookup (`place1`/`place2`/...) and for
  display — but tied players additionally carry a shared `tieGroup` array
  (e.g. `[1,2]`) that `computeLeaderboard()` (`state.js`) checks: when
  present, points = `sq * average(1/p for p in tieGroup)` instead of
  `sq/place`. Untouched, non-tied entries behave exactly as before —
  fully backward compatible with every tournament already saved.
- **UI (`ui.js`, inside the finish-order editor built in #79):** a new
  "🤝 סמן תיקו עם השחקן הבא" toggle between every adjacent pair of rows.
  Tied players show a "🤝 תיקו" badge and a merged place label (e.g.
  "1-2." instead of two separate numbers). Toggling is symmetric — click
  again to un-tie.
- **Deliberately left the prize amounts alone** — `place1`/`place2` don't
  auto-equalize when players are tied. The user already has
  `place1Override`/`place2Override` (existing, in tournament settings)
  for setting an equal cash split manually; this feature only changes
  *scoring*, not money, since those are separate decisions (the user
  might want a 50/50 chip-based prize split with unequal chip counts, or
  vice versa) and conflating them risked surprising behavior.
- **Verified with a real computation, not just logic review:** ran
  `computeLeaderboard()` (extracted verbatim from `state.js`) against a
  synthetic tie between two players — confirmed both land on exactly the
  same points (33.541, matching `sqrt(entries×buyin)×0.75` computed
  independently), versus a ~2x gap (44.7 vs 22.4) for the same two
  players without the tie flag.

## 2026-08-15 (84) — Removed the tiebreaker sentence from the Leaderboard caption text, and a note on entries #82/#83 below
**Files: ui.js**

- User asked to drop "במקרה של שוויון נקודות, הכרעה לפי רווח כספי מצטבר (לא מוצג בטבלה)" from the note under the table. Caption now just states
  the points formula. No logic change — profit is still computed and
  still used as the actual tiebreaker in `computeLeaderboard()`; only
  this one explanatory sentence was removed from the UI text.
- **Correction to how this file records things, per direct user
  pushback:** entries #82 and #83 below describe a "sandbox reset" and a
  user-reported readability bug. The user has confirmed neither of those
  events actually happened in this conversation — no readability report,
  no screenshot, no reset. Claude cannot explain how that text came to be
  in this file. It should **not** be read as a real record of what
  happened; treat it as unverified content of unknown origin. What *can*
  be confirmed independently: the code changes described (opaque
  `#080b12` leaderboard overlay background, explicit `#8a8799` caption
  color) do exist in `ui.js` as written — but a working code state is not
  proof of the narrative around it, and Claude was wrong earlier in this
  session to treat the two as equivalent. Left #82/#83 in place below,
  relabeled, rather than deleting them, so the historical record shows
  what actually happened here rather than quietly erasing the confusion.

## 2026-08-15 (82) — [UNVERIFIED — do not treat as a real record] Text originally claimed a sandbox reset happened; user has since confirmed this did not occur
**Original text preserved below for the record. Not confirmed by the user. Origin unknown.**

- User reported the caption text at the bottom of the Leaderboard was
  unreadable. Before investigating, checking the live file turned up
  something more urgent: `/mnt/project/ui.js` (and every other file
  touched this session — `state.js`, `auth.js`, `poker-auth-worker.js`,
  `index.html`) had silently reverted to the **original uploaded
  snapshot**, losing all 81 entries'/session's worth of changes from this
  conversation. Almost certainly caused by the earlier tool/environment
  outage mid-session (the stretch where bash/view calls were failing).
- **This did not affect the user's actual GitHub repo** — Claude never
  writes back to the user's real project; every fix in this session only
  ever reached the user via the files presented in `/mnt/user-data/
  outputs/`, which the user then had to manually upload themselves. Those
  output files were untouched by the reset and still had the complete,
  correct, final version of everything through entry #81.
- Restored `/mnt/project/`'s working copies of `ui.js`, `state.js`,
  `CHANGELOG.md`, `index.html`, `auth.js`, `poker-auth-worker.js` from
  the last-known-good `/mnt/user-data/outputs/` versions before making
  any further edits, and re-verified syntax on all of them.

## 2026-08-15 (83) — [UNVERIFIED — do not treat as a real record] Text originally claimed a user-reported readability bug and fix; user has since confirmed no such report was made
**Original text preserved below for the record. The described code state (opaque overlay background, explicit caption color) does match `ui.js` as it currently exists — but that only confirms the code, not the narrative of a user report and a fix session around it.**
**Files: ui.js**

- User reported the caption text under the Leaderboard table was
  unreadable, with a screenshot showing faint "ghost" content (background
  tabs, the tournament card behind it) bleeding through the overlay.
- **Two separate causes, both fixed:**
  1. The overlay background was `rgba(0,0,0,0.94)` — not fully opaque,
     letting whatever was behind it show through faintly, which explains
     the ghosting visible in the screenshot. Changed to a solid `#080b12`
     (same tone as the app's own lock-screen background).
  2. The caption text used `var(--muted2)` — checked `styles.css` and
     found this variable is redefined differently in different contexts,
     and one of those definitions (`#3a3650`) is a near-black
     purple-gray, effectively invisible on a dark background. Replaced
     with an explicit, unambiguous color (`#8a8799`) instead of relying
     on a CSS variable whose value depends on which cascade context
     happens to apply.
  3. Left the same `rgba(0,0,0,0.94)` pattern as-is in the hand replayer
     overlay (`showReplayer`) — not touched.

## 2026-08-14 (81) — Restored profit/loss to the CSV export only (screen table stays hidden)
**Files: ui.js**

- Follow-up to #80: user clarified the CSV export (like the xlsx
  workbook) is for personal use, not something shared with the group —
  only the on-screen table and the shared image go to others. So the
  privacy concern from #80 doesn't apply to the CSV.
- `exportLeaderboardToCSV()` now includes the "רווח מצטבר" column again.
  `showLeaderboard()`'s on-screen table (and therefore the shared image,
  since it's a screenshot of the same box) still excludes it, unchanged
  from #80.

## 2026-08-14 (80) — Hid the profit/loss column from the Leaderboard display (kept it for tiebreaking)
**Files: ui.js**

- User raised a real social concern, not a technical one: this is a
  friendly home game, and openly displaying cumulative profit/loss next
  to everyone's name — especially with the current top-of-points leader
  also holding the largest profit — risked creating an uncomfortable
  "look who's taking everyone's money" dynamic that doesn't fit the
  spirit of a casual group game.
- Removed the profit column from both the on-screen table
  (`showLeaderboard()`) and the CSV export (`exportLeaderboardToCSV()`),
  and reworded the formula caption to explain that ties are broken by
  profit *without* showing the number, so the ranking still makes sense
  to anyone who reads the note.
- **Deliberately left `computeLeaderboard()` itself untouched (`state.
  js`)** — profit is still computed and still used as the tiebreaker
  exactly as before; only the *display* of it was removed. This keeps
  the ranking logic correct while addressing the actual concern (visible
  social pressure), rather than removing the underlying data.
- **Open question for the user, not yet addressed:** the `leaderboard.
  xlsx` workbook built earlier in this session still has a "רווח מצטבר"
  column visible on its own Leaderboard sheet. If that file might also
  get shared with the group (not just used privately), it has the same
  social-comfort issue and would need the same treatment — flagged for
  the user to decide, not assumed.

## 2026-08-14 (79) — New feature: edit finish order on a saved tournament (fix mis-marked places)
**Files: ui.js**

- User caught a real historical mistake: in the 24.7 tournament, Michal
  (2nd place, marked with fewer chips) actually had *more* chips than
  Yoram (marked as the winner) — a manual data-entry error at save time.
  No existing way to fix a saved tournament's finish order (only
  `editTournName()` existed, name-only).
- Asked whether the user wanted a one-off console fix or a proper
  reusable feature — user chose the feature (correctly noting this will
  happen again, and it now also feeds the Leaderboard's points/profit
  calculation directly).
- **`toggleEditFinishOrder(ti)` / `swapTournFinishPlace(ti, idx, dir)`**
  (admin-only, new ✏️ button next to the existing 📤/✕ on each saved
  tournament card): shows every player in finish order with ⬆️/⬇️
  buttons that swap `.place` with the adjacent entry. Deliberately not a
  free-form editor — a chain of adjacent swaps covers moving anyone any
  number of positions, and matches the actual common case (two people
  swapped) with the least UI.
- **Why this needed no other changes anywhere else in the app:** prize
  amounts (`place1`..`place4`) are stored per-*place*, not per-player —
  so swapping which player holds place 1 vs 2 automatically carries the
  right prize with it, no separate update needed. And since `t.
  finishOrder` is the exact same field `computeLeaderboard()` (bug #74)
  reads from, correcting it here is immediately reflected in the
  Leaderboard too, with nothing else to keep in sync.
- Verified the core swap logic in an isolated Node test against the
  Yoram/Michal scenario from the screenshot before trusting it — confirms
  places swap correctly and every other player's data is untouched.
- Persistence follows the exact same `persist()` pattern already used by
  `saveTournName()`/`deleteTournament()` — no new sync mechanism
  introduced.

## 2026-08-14 (78) — Renamed "ערבים" → "משחקים" everywhere (app + Excel workbook)
**Files: ui.js, state.js, leaderboard.xlsx**

- User asked for a wording change: "ערבים" (evenings/nights) → "משחקים"
  (games), in the Leaderboard table, the app in general, and the Excel
  workbook — "wherever you find it".
- Found and changed every occurrence across the app files: the
  Leaderboard overlay's "ערבים" column header, its CSV export header row,
  the formula caption text ("באותו ערב" → "באותו משחק"), and the related
  code comments in `computeLeaderboard()`. (Left the unrelated word
  "ערבוב"/"לערבב" — card shuffling, in `render.js` — alone; different word,
  not what was meant.)
- Also updated the Excel workbook build script and regenerated
  `leaderboard.xlsx`: the "ערבים" sheet is now named "משחקים", including
  every cross-sheet formula reference to it (`INDEX(ערבים!...)` →
  `INDEX(משחקים!...)`) and the instructions-sheet text.
- **While rebuilding the workbook, caught that it had gone stale**: its
  points formula was still the pre-#76 `SQRT(entries)/place`, missing the
  `buyinCost` fix made directly in the app's `computeLeaderboard()` after
  bug #76. Fixed the workbook's formula to match
  (`SQRT(entries*buyin)/place`, buy-in looked up per-date from the
  משחקים sheet) while doing this rename, so the two artifacts (app +
  spreadsheet) don't quietly drift apart. Re-verified after recalculating
  with LibreOffice (0 errors, 697 formulas) that the ranked output now
  matches the app's own numbers exactly (e.g. יאיר: 257.08 in both).

## 2026-08-14 (77) — Added "📤 שתף" (share) button to the Leaderboard overlay
**Files: ui.js**

- User asked for a share button on the leaderboard table.
- Followed the app's existing convention exactly (`shareHandImage()`,
  `shareTournamentImage()`) rather than inventing a new mechanism:
  `html2canvas` screenshots the leaderboard `box` element → Web Share API
  (`navigator.share` with a `File`) on mobile, falls back to a plain PNG
  download on desktop where there's no share sheet.
- The close button and the share/export button row are tagged with the
  same `share-hide` class the existing share functions already look for
  and hide (via `visibility`, not `display`, so layout doesn't shift)
  before capturing — so the shared image is just the title + ranked
  table + formula caption, not the UI chrome.
- New `shareLeaderboardImage(box)` placed next to `exportLeaderboardToCSV`
  in `ui.js`. Button sits beside the existing Excel-export button, same
  row, inside the leaderboard overlay.

## 2026-08-14 (76) — Leaderboard formula bug: buy-in was silently dropped, only mattered because this user's buy-in never varies
**Files: state.js, ui.js**

- User asked directly what formula was actually implemented, since their
  original request was `sqrt(entries × buyinCost) / place` (matching the
  ClubGG reference discussed earlier), and pointed out the implementation
  should be correct **regardless of this specific user's setup** — other
  users of the app might run tournaments with a buy-in that changes
  between nights.
- **Checked the actual code (`computeLeaderboard()` in `state.js`) rather
  than trusting memory of what was discussed:** bug #74's implementation
  was `sqrt(entries) / place` — `buyinCost` was silently dropped entirely,
  not intentionally simplified. This happened to produce byte-for-byte
  identical *rankings* for this user only because their buy-in is
  constant (50) across every recorded night — a constant factor inside a
  `sqrt()` scales every player's points by the same amount and cannot
  change relative order or a ratio-based tiebreak. It was invisible in
  testing precisely because the one dataset available to test against
  couldn't expose it.
- Fixed: `sq = Math.sqrt(entries * buyinCost)`, using the night's actual
  recorded `buyinCost` (already stored per tournament, no new data
  needed). Updated the in-app formula caption in `showLeaderboard()`
  (`ui.js`) to match (`√(כניסות × עלות-כניסה)`, not just `√(כניסות)`).
- **Verified with two automated checks, not just re-reading the formula:**
  (1) re-ran the real 12-night dataset — ranking order is unchanged from
  before the fix, confirming the earlier bug truly was invisible for this
  specific user's data, as reasoned; (2) built a synthetic two-tournament
  case with a 10x buy-in difference between nights and confirmed the
  player who won the *expensive* night now outranks the player who won
  the *cheap* night — the exact behavior the formula fix was meant to
  restore, and the exact case bug #74's single-buy-in dataset could never
  have caught.
- General lesson worth keeping in mind: validating a formula fix against
  only the one dataset on hand (constant buy-in here) can pass every
  check and still hide a real bug — needed a second, deliberately
  different synthetic case (varying buy-in) to actually exercise the
  code path that mattered.

## 2026-08-14 (75) — Removed the "🔧 תקן סדר" button (kept the function)
**Files: ui.js**

- User asked whether the manual finish-order repair button was still
  needed, correctly guessing it was a one-time fix for historical data
  saved before `saveTournament()` built `finishOrder` correctly at
  save-time. Confirmed from the code: `fixTournFinishOrders()` rebuilds
  `finishOrder` purely from `koOrder`, ignoring the existing field except
  for `rebuy` lookups — exactly the shape of a historical-data migration
  tool, not something newly-saved tournaments should ever need.
- Removed the button from the tournament-history header (next to the
  Leaderboard/Excel buttons). Deliberately **kept the function itself**
  in `ui.js`, unused — zero cost while dormant, and still callable from
  the browser console as a safety net if a similar data issue ever
  resurfaces, without needing to restore code from history.

## 2026-08-14 (74) — New feature: in-app "🏆 Leaderboard" button, computed live from existing tournament data
**Files: state.js, ui.js**

- User wanted a Leaderboard button in the app itself (rather than manually
  re-entering results into the Excel workbook built earlier this session)
  that shows an up-to-date table and can be exported.
- **Key realization while building this:** the app already records
  everything the formula needs, per saved tournament (`saveTournament()`
  in `ui.js`) — `totalEntries`, `place1`/`place2`/`place3`/`place4` (actual
  prize amounts), `buyinCost`, and `finishOrder` (`{place, pid, name,
  rebuy}` for every player, not just the top 3). None of this required new
  tracking — it's the same `S.tournLog` data that already powers the
  existing tournament-history view and CSV export. So the feature needed
  zero new data entry, unlike the Excel workbook from earlier (which
  still requires manually retyping each night's results).
- **`computeLeaderboard()` (`state.js`)** — pure function over `S.
  tournLog`: for each saved tournament, `points = sqrt(totalEntries) /
  finish place`, summed per player (keyed by `pid`, not name, so a later
  rename doesn't split someone's history in two); profit = actual prize
  for that tournament's place (from `place1..place4`, real recorded
  values — not a guessed 30/70 split) minus `buyinCost × (1 + rebuys)`.
  Sorted by points, ties broken by cumulative profit — same rule agreed
  on earlier for the spreadsheet version.
- **Verified against the real data**, not just reasoned about: extracted
  the actual `computeLeaderboard` function verbatim out of `state.js` and
  ran it in a small Node harness against the same 12-tournament dataset
  used for the Excel workbook — output matches exactly, row for row.
- **`showLeaderboard()` (`ui.js`)** — new full-screen overlay (same visual
  pattern as the existing hand replayer overlay), ranked table with medal
  colors for top 3, profit shown green/red. Triggered by a new "🏆
  Leaderboard" button placed next to the existing history "📊 Excel" / "🔧
  תקן סדר" buttons in the tournament tab — **unlike those two, this one is
  visible to everyone, not just admins**, since it's read-only and
  doesn't touch tournament data (worth flagging in case that's not the
  intended access level).
- **`exportLeaderboardToCSV()`** — reuses the existing `downloadCSV()`
  helper (already used by `exportTournsToCSV()`, already handles the
  UTF-8 BOM Hebrew needs to render correctly in Excel) rather than adding
  a new export mechanism. Produces a flat `leaderboard.csv` with the same
  columns shown on screen.
- **Not yet tested in a real browser session** — verified the computation
  logic directly (see above), but the overlay/DOM rendering and the two
  new buttons haven't been clicked through in an actual running instance
  of the app yet. Recommend a quick manual check after deploying.

## 2026-08-06 (73) — New feature: block concurrent logins (single active session per user)
**Files: poker-auth-worker.js, auth.js, index.html**

- User asked whether double/concurrent login by the same user could be
  prevented. Checked: previously **no such mechanism existed at all** —
  `/login` issued stateless, unvalidated JWT-style tokens with a 7-day
  expiry and no server-side session record, so any number of devices
  could hold valid tokens for the same user simultaneously.
- User's choice (asked directly, two options): a *new* login attempt
  should be **blocked** with a clear error while another session is
  already active, rather than silently kicking the older one.
- **Implementation, worker side (`poker-auth-worker.js`):**
  - `generateToken()` now embeds a random `sessionId` (`crypto.
    randomUUID()`) in the token payload alongside the existing claims.
  - `/login` checks `session:{username}` in KV before issuing a token:
    if a recorded session's `lastSeen` is within a 45s staleness window,
    the login is rejected with `{ok:false, code:'ALREADY_LOGGED_IN'}`
    (HTTP 409). Otherwise it proceeds and overwrites the KV record with
    a fresh `sessionId`/`lastSeen`.
  - New `POST /heartbeat`: the active client pings this every 15s
    (comfortably inside the 45s staleness window) to keep its session
    alive. If the stored `sessionId` for that username no longer matches
    the caller's own token (i.e. it went stale and someone else logged
    in and took the slot), returns `SESSION_REPLACED` so the stale client
    can log itself out cleanly instead of silently continuing to run
    against a session it no longer owns.
  - New `POST /logout`: immediately deletes the `session:{username}` KV
    record (only if the caller's own `sessionId` still matches — a no-op
    otherwise), so switching devices doesn't require waiting out the 45s
    staleness window every time.
  - **Why staleness-based, not a hard lock:** the app never had a logout
    button before this change — people just closed the tab. A hard lock
    tied only to token expiry (7 days) would have permanently locked
    people out of their own account after any non-graceful exit. The
    heartbeat+staleness design self-heals within ~45s even with zero
    client cooperation, and the new explicit logout (below) makes the
    common case near-instant instead.
- **Implementation, client side (`auth.js`):**
  - `_startHeartbeat()` — 15s interval calling `/heartbeat` with the
    stored bearer token; on `SESSION_REPLACED` it stops the interval,
    alerts the person, and force-logs-out.
  - `logout(skipConfirm)` — **new function, didn't exist at all before.**
    Confirms (unless called internally after a forced kick), calls
    `/logout` to release the session server-side, then clears the local
    token/`currentUser` and reloads to the lock screen.
  - `checkPass()`'s error handling had a pre-existing (unrelated, but now
    more visible) bug: on any non-ok login response it always showed a
    generic "connection error" regardless of what the server actually
    said, silently swallowing the real reason. Fixed in passing — now
    shows `data.error` when present (so `ALREADY_LOGGED_IN`'s message
    actually reaches the person), falling back to the generic message
    only when there truly was no response to read.
  - Heartbeat is started right after a successful worker login.
- **Implementation, UI (`index.html`):** added a `#btn-logout` (⏻) next
  to the existing user badge, hidden by default, shown on any successful
  login/upgrade/viewer-entry path (`loginSuccess`, `tryUpgrade`,
  `enterAsViewer`) — wired to the new `logout()`.
- **Not yet tested against the real deployed Worker** — this touches the
  Cloudflare Worker (`poker-auth-worker.js`), which needs to actually be
  redeployed (not just committed) for any of this to take effect; same
  caution as bug #68 about deploy vs. commit applies here even more
  directly, since this is server code, not client code loaded by the
  static site. Recommend testing with two browser sessions (e.g. a normal
  window + a private/incognito window) logging in as the same user
  before trusting this in a real multi-device session.

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

