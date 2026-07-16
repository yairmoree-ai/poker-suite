#!/usr/bin/env node
// validate_ranges.js — lints the _RANGES table inside ranges.js.
//
// Usage:  node validate_ranges.js path/to/ranges.js
//
// Catches, before they become silent live bugs:
//  1. "+" / "-" shorthand (GTOWizard/PokerCruncher-style, e.g. "66+", "ATs+")
//     pasted verbatim instead of expanded. _parseRangeToSet() does NOT
//     understand this notation — it silently mangles the token instead of
//     erroring, so the hand just quietly never shows up in any range.
//     (This is exactly what happened when testing this session: a "+"
//     string fed straight into the combo-builder gave 100 combos instead
//     of the correct 170 — no error, just a wrong, smaller number.)
//  2. Malformed hand tokens (bad ranks, wrong length).
//  3. Duplicate hands inside one entry (harmless but usually a paste slip).
//  4. Missing/empty required categories:
//       - BB needs 'call' AND '3bet' (used for the round=0/round=1
//         continue-range union — this was the very first bug this session).
//       - every non-BB position needs 'RFI' (its own opening range).
//       - every position (BB included) benefits from having 'call' AND
//         '3bet' populated, since ANY position can be "facing an open"
//         (round=1) once someone else acts before them — not just BB.
//     The one known, deliberately-inert exception: a 'BTN/SB' entry inside
//     a table for size != 2 is dead fallback-only data (heads-up's own
//     table resolves via the 'BTN' alias before ever reaching it) — skipped.

const fs = require('fs');
const path = process.argv[2];
if(!path){ console.error('Usage: node validate_ranges.js path/to/ranges.js'); process.exit(1); }
const src = fs.readFileSync(path, 'utf8');

const match = src.match(/const _RANGES = \{[\s\S]*?\n\};/);
if(!match){ console.error('Could not find "const _RANGES = {...};" in the file.'); process.exit(1); }
let __RANGES;
(function(){
  eval(match[0].replace('const _RANGES', 'var __RANGES_TMP'));
  __RANGES = __RANGES_TMP;
})();

const VALID_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
let errors = 0, warnings = 0;
const err = (loc,msg)=>{ console.log('ERROR  '+loc+': '+msg); errors++; };
const warn = (loc,msg)=>{ console.log('warn   '+loc+': '+msg); warnings++; };

function checkToken(token, loc){
  if(token.includes('+') || token.includes('-')){
    err(loc, '"+"/"-" shorthand found ("'+token+'") — will be silently dropped/mangled. Expand it into individual hands.');
    return;
  }
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
}

for(const size of Object.keys(__RANGES)){
  for(const depth of Object.keys(__RANGES[size])){
    const table = __RANGES[size][depth];
    for(const pos of Object.keys(table)){
      const entry = table[pos];
      const loc0 = 'size'+size+'/'+depth+'/'+pos;
      for(const cat of Object.keys(entry)){
        const tokens = (entry[cat]||'').split(',').map(t=>t.trim()).filter(Boolean);
        const seen = new Set();
        tokens.forEach(t=>{
          checkToken(t, loc0+'/'+cat);
          if(seen.has(t)) warn(loc0+'/'+cat, 'duplicate hand "'+t+'"');
          seen.add(t);
        });
      }
      if(pos==='BTN/SB' && Number(size)!==2) continue; // known-dead fallback-only entry
      if(pos==='BB'){
        if(!entry.call?.length) err(loc0, 'missing/empty "call" (needed for continue-range union)');
        if(!entry['3bet']?.length) err(loc0, 'missing/empty "3bet" (needed for continue-range union)');
      } else {
        if(!entry.RFI?.length) err(loc0, 'missing/empty "RFI" (own opening range)');
        if(!entry.call?.length) warn(loc0, 'missing/empty "call" — round=1 facing-open union will be incomplete here');
        if(!entry['3bet']?.length) warn(loc0, 'missing/empty "3bet" — round=1 facing-open union will be incomplete here');
      }
    }
  }
}

console.log('\n'+errors+' errors, '+warnings+' warnings.');
process.exit(errors>0 ? 1 : 0);
