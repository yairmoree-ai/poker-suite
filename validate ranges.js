#!/usr/bin/env node
// validate_ranges.js — lints the _RANGES table inside ranges.js.
//
// Usage:  node validate_ranges.js path/to/ranges.js
//
// Loads the real _RANGES data and the real _parseRangeToSet/_expandPlusToken
// via require() (ranges.js exports them at the bottom, Node-only, invisible
// to the browser) — so this checks against the app's actual parsing logic,
// not a separate reimplementation that could quietly drift from it.
//
// Catches, before they become silent live bugs:
//  1. Malformed "+" tokens — e.g. a typo'd rank, or "+" on a token shape it
//     doesn't apply to. _expandPlusToken() returns such tokens UNCHANGED
//     (it never invents a result), so any token that still contains "+"
//     after expansion is one it couldn't parse — flagged as an error.
//     Well-formed "+" tokens (e.g. "66+", "ATs+") ARE understood by
//     _parseRangeToSet as of this session and expand correctly — but a
//     warning still fires (see #2).
//  2. "+" notation used at all, even when well-formed: _RANGES entries feed
//     the range-editor UI's own separate raw-`.split(',')` seeding code
//     (render.js), which does NOT expand "+" — a stored "66+" would show up
//     as one broken, non-highlighting grid cell in the editor rather than 9
//     correctly-highlighted ones. Recommendation: run expand_range.js first
//     and store the fully-expanded result; this warning is what enforces
//     that habit.
//  3. Malformed hand tokens (bad ranks, wrong length).
//  4. Duplicate hands inside one entry (harmless but usually a paste slip).
//  5. Missing/empty required categories:
//       - BB needs 'call' AND '3bet' (used for the round=0/round=1
//         continue-range union — this was the very first bug this session).
//       - every non-BB position needs 'RFI' (its own opening range).
//       - every position (BB included) benefits from having 'call' AND
//         '3bet' populated, since ANY position can be "facing an open"
//         (round=1) once someone else acts before them — not just BB.
//     The one known, deliberately-inert exception: a 'BTN/SB' entry inside
//     a table for size != 2 is dead fallback-only data (heads-up's own
//     table resolves via the 'BTN' alias before ever reaching it) — skipped.

const path = process.argv[2];
if(!path){ console.error('Usage: node validate_ranges.js path/to/ranges.js'); process.exit(1); }
const { _RANGES, _expandPlusToken } = require(require('path').resolve(path));

const VALID_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
let errors = 0, warnings = 0;
const err = (loc,msg)=>{ console.log('ERROR  '+loc+': '+msg); errors++; };
const warn = (loc,msg)=>{ console.log('warn   '+loc+': '+msg); warnings++; };

function checkToken(rawToken, loc){
  const parts = _expandPlusToken(rawToken);
  if(parts.length===1 && parts[0]===rawToken && rawToken.endsWith('+')){
    err(loc, '"+"-notation token "'+rawToken+'" is malformed and was NOT expanded — check the rank/shape.');
    return;
  }
  if(rawToken.endsWith('+')){
    warn(loc, '"+"-notation token "'+rawToken+'" is understood for equity math, but the range-EDITOR UI does not expand it and will show a broken cell. Run expand_range.js and store the expanded form instead.');
  }
  parts.forEach(token=>{
    const isPair = token.length===2 && token[0]===token[1];
    if(isPair){
      if(!VALID_RANKS.includes(token[0])) err(loc, 'invalid rank in pair "'+token+'"');
      return;
    }
    const suited = token.endsWith('s'), offsuit = token.endsWith('o');
    if(!suited && !offsuit){
      warn(loc, 'token "'+token+'" has no s/o suffix — will silently expand to BOTH suited AND offsuit. Confirm that\'s intended.');
      return;
    }
    const ranks = token.slice(0, token.length-1);
    if(ranks.length!==2 || !VALID_RANKS.includes(ranks[0]) || !VALID_RANKS.includes(ranks[1]) || ranks[0]===ranks[1]){
      err(loc, 'malformed hand token "'+token+'"');
    }
  });
}

// entry[cat] יכול להיות מחרוזת שטוחה (כרגיל) *או* אובייקט {עמדת-יריב: מחרוזת}
// (טווח לפי-יריב-ספציפי, ראו _resolveOpponentRangeStr) — הבודק הזה תומך בשניהם.
function nonEmpty(v){
  if(typeof v==='string') return v.length>0;
  if(v && typeof v==='object') return Object.keys(v).length>0 && Object.values(v).some(s=>(s||'').length>0);
  return false;
}
function checkCategory(v, loc){
  if(typeof v==='string'){
    const tokens = v.split(',').map(t=>t.trim()).filter(Boolean);
    const seen = new Set();
    tokens.forEach(t=>{
      checkToken(t, loc);
      if(seen.has(t)) warn(loc, 'duplicate hand "'+t+'"');
      seen.add(t);
    });
  } else if(v && typeof v==='object'){
    Object.keys(v).forEach(vsPos=>checkCategory(v[vsPos], loc+'/vs'+vsPos));
  }
}

for(const size of Object.keys(_RANGES)){
  for(const depth of Object.keys(_RANGES[size])){
    const table = _RANGES[size][depth];
    for(const pos of Object.keys(table)){
      const entry = table[pos];
      const loc0 = 'size'+size+'/'+depth+'/'+pos;
      for(const cat of Object.keys(entry)){
        checkCategory(entry[cat], loc0+'/'+cat);
      }
      if(pos==='BTN/SB' && Number(size)!==2) continue; // known-dead fallback-only entry
      if(pos==='BB'){
        if(!nonEmpty(entry.call)) err(loc0, 'missing/empty "call" (needed for continue-range union)');
        if(!nonEmpty(entry['3bet'])) err(loc0, 'missing/empty "3bet" (needed for continue-range union)');
      } else {
        if(!nonEmpty(entry.RFI)) err(loc0, 'missing/empty "RFI" (own opening range)');
        if(!nonEmpty(entry.call)) warn(loc0, 'missing/empty "call" — round=1 facing-open union will be incomplete here');
        if(!nonEmpty(entry['3bet'])) warn(loc0, 'missing/empty "3bet" — round=1 facing-open union will be incomplete here');
      }
    }
  }
}

console.log('\n'+errors+' errors, '+warnings+' warnings.');
process.exit(errors>0 ? 1 : 0);
