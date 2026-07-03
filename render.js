// ── Monte Carlo Equity (מקומי, ללא שרת) ───────────────────
const _MC_RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const _MC_SUITS = ['♠','♥','♦','♣'];
const _MC_RANK_VAL = Object.fromEntries(_MC_RANKS.map((r,i)=>[r,i]));

function _fullDeck(){ const d=[]; _MC_RANKS.forEach(r=>_MC_SUITS.forEach(s=>d.push({rank:r,suit:s}))); return d; }
function _cardKey(c){ return c.rank+c.suit; }
function _handRankMC(cards){
  // מחזיר ערך השוואה (מספר גדול = יד טובה יותר)
  // שימוש ב-evaluateHand שכבר קיים ב-game.js
  try {
    const h = evaluateHand(cards);
    return h.rank * 1e10 + (h.tiebreak||[]).reduce((a,v,i)=>a+v*Math.pow(15,4-i),0);
  } catch(e){ return 0; }
}

function monteCarloEquity(holeCards, boardCards, numOpponents, iterations=8000){
  // holeCards: [{rank,suit},{rank,suit}]
  // boardCards: קלפי בורד קיימים (0-4)
  // numOpponents: מספר יריבים פעילים
  if(!holeCards || holeCards.filter(Boolean).length < 2) return null;

  const known = [...holeCards, ...boardCards].filter(Boolean);
  const knownKeys = new Set(known.map(_cardKey));
  const deck = _fullDeck().filter(c=>!knownKeys.has(_cardKey(c)));
  const boardNeeded = 5 - boardCards.filter(Boolean).length;

  let wins=0, ties=0;

  for(let i=0; i<iterations; i++){
    // ערבוב מהיר (Fisher-Yates חלקי)
    for(let j=deck.length-1; j>0; j--){
      const k=Math.floor(Math.random()*(j+1));
      [deck[j],deck[k]]=[deck[k],deck[j]];
    }
    let idx=0;
    // השלמת בורד
    const runBoard = [...boardCards.filter(Boolean)];
    for(let b=0;b<boardNeeded;b++) runBoard.push(deck[idx++]);

    // קלפים ליריבים
    const oppHands=[];
    for(let o=0;o<numOpponents;o++) oppHands.push([deck[idx++],deck[idx++]]);

    // חישוב ידיים
    const myVal = _handRankMC([...holeCards,...runBoard]);
    let best = myVal, iWin=true, iTie=false;
    for(const oh of oppHands){
      const ov = _handRankMC([...oh,...runBoard]);
      if(ov > best){ iWin=false; iTie=false; break; }
      if(ov === best){ iWin=false; iTie=true; }
    }
    if(iWin) wins++;
    else if(iTie) ties++;
  }

  return ((wins + ties*0.5) / iterations * 100);
}

// ── Pot Odds Bar ──────────────────────────────────────────
// ── Range data (GTO presets לפי גודל שולחן) ──────────────
// ── GTO Ranges (מבוסס FreeBetRange + ThinkGTO + PokerCoaching, מותאם stack depth) ──
// מבנה: _RANGES[tableSize][stackDepth][position][action]
// stackDepth: 'deep' (75BB+), 'mid' (35-74BB), 'short' (20-34BB), 'push' (<20BB)

const _RANGES = {
  6: {
    deep: { // 75BB+ — פתיחות 2.5-3x, ranges מלאים לפי solver
      BTN:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,QJs,QTs,Q9s,JTs,J9s,T9s,98s,87s,76s,65s,54s,AKo,AQo,AJo,ATo,KQo,KJo,KTo,QJo,QTo,JTo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AJs,AKo,AQo,A5s,A4s,A3s,A2s,KQs,98s,87s,76s',
        call:  'TT,99,88,77,66,ATs,A9s,A8s,KJs,KTs,K9s,QJs,QTs,Q9s,JTs,J9s,T9s,AJo,ATo,KQo,KJo',
        '4bet': 'AA,KK,QQ,AKs,AKo,A5s,A4s',
      },
      CO:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,AKs,AQs,AJs,ATs,A9s,A8s,A5s,A4s,A3s,KQs,KJs,KTs,K9s,QJs,QTs,JTs,J9s,T9s,98s,87s,76s,65s,AKo,AQo,AJo,ATo,KQo,KJo,QJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,A4s,KQs,76s,65s',
        call:  'TT,99,88,77,AJs,ATs,A9s,KJs,KTs,QJs,QTs,JTs,T9s,AJo,ATo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo,A5s',
      },
      HJ:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,A4s,A3s,KQs,KJs,KTs,QJs,QTs,JTs,T9s,98s,87s,76s,AKo,AQo,AJo,ATo,KQo,KJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,A4s,KQs',
        call:  'TT,99,88,AJs,ATs,A9s,KJs,KTs,QJs,JTs,T9s,AJo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo',
      },
      MP:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,KQo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s,A4s',
        call:  'TT,99,88,AQs,AJs,ATs,KQs,KJs,QJs,JTs,AQo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo',
      },
      UTG:{
        // ThinkGTO solver: 22-AA, AKs/AQs/AJs/ATs, A5s-A2s, KQs/KJs, QJs, JTs, T9s, 98s + AKo/AQo/KQo
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A5s,A4s,A3s,A2s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo',
        call:  'JJ,TT,AQs,AJs,KQs,AQo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      SB:{
        // 39-47% — FreeBetRange
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,QJs,QTs,JTs,J9s,T9s,98s,87s,76s,65s,AKo,AQo,AJo,ATo,A9o,KQo,KJo,QJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,A4s,KQs,76s',
        call:  'TT,99,88,AJs,ATs,A9s,KJs,KTs,QJs,JTs,T9s,AJo,ATo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo,A5s',
      },
      BB:{
        RFI: '',
        '3bet': 'AA,KK,QQ,JJ,TT,AKs,AQs,AKo,AQo,A5s,A4s,A3s,KQs,87s,76s,65s,54s',
        call:  '99,88,77,66,55,44,33,22,AJs,ATs,A9s,A8s,A7s,KJs,KTs,K9s,QJs,QTs,Q9s,JTs,J9s,T9s,98s,AJo,ATo,KQo,KJo,QJo',
        '4bet': 'AA,KK,QQ,AKs,AKo,A5s',
      },
    },
    mid: { // 35-74BB — ranges יותר צרים, פחות speculative
      BTN:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,QJs,QTs,JTs,J9s,T9s,98s,87s,76s,65s,AKo,AQo,AJo,ATo,KQo,KJo,QJo,JTo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,A4s,KQs',
        call:  'TT,99,88,77,AJs,ATs,KJs,QJs,JTs,T9s,AJo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo',
      },
      CO:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,KTs,QJs,JTs,T9s,98s,87s,AKo,AQo,AJo,KQo,KJo,QJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,KQs',
        call:  'TT,99,88,AJs,ATs,KJs,QJs,JTs,AJo,KQo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      HJ:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,KQo,KJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s',
        call:  'TT,99,AJs,ATs,KQs,QJs,JTs,AJo,KQo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      MP:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,ATs,A5s,KQs,KJs,QJs,JTs,T9s,AKo,AQo,AJo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo,A5s',
        call:  'JJ,TT,AQs,AJs,KQs,AQo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      UTG:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,ATs,A5s,KQs,KJs,QJs,JTs,AKo,AQo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo',
        call:  'JJ,TT,AQs,AJs,KQs',
        '4bet': 'AA,KK,AKs,AKo',
      },
      SB:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,AKs,AQs,AJs,ATs,A9s,A8s,A5s,A4s,A3s,KQs,KJs,QJs,JTs,T9s,98s,87s,AKo,AQo,AJo,ATo,KQo,KJo,QJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,KQs',
        call:  'TT,99,88,AJs,ATs,KJs,QJs,JTs,AJo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo',
      },
      BB:{
        RFI: '',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,A4s,KQs,87s,76s',
        call:  'TT,99,88,77,66,55,AJs,ATs,A9s,KJs,KTs,QJs,JTs,T9s,98s,AJo,ATo,KQo,KJo',
        '4bet': 'AA,KK,QQ,AKs,AKo',
      },
    },
    short: { // 20-34BB — ranges צרים, value-heavy, פחות bluffs
      BTN:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A5s,A4s,KQs,KJs,KTs,QJs,JTs,T9s,98s,87s,AKo,AQo,AJo,ATo,KQo,KJo,QJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s',
        call:  'TT,99,88,AJs,KQs,QJs,JTs,AJo,KQo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      CO:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,KQo,KJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s',
        call:  'TT,99,AJs,KQs,JTs,AJo,KQo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      HJ:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,A5s,KQs,KJs,QJs,JTs,T9s,AKo,AQo,AJo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo,A5s',
        call:  'JJ,TT,AJs,KQs,AJo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      MP:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,ATs,KQs,KJs,QJs,JTs,AKo,AQo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo',
        call:  'JJ,TT,AQs,KQs',
        '4bet': 'AA,KK,AKs,AKo',
      },
      UTG:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,AKs,AQs,AJs,ATs,KQs,KJs,AKo,AQo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo',
        call:  'JJ,TT,AQs',
        '4bet': 'AA,KK,AKs',
      },
      SB:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,KQo,KJo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s',
        call:  'TT,99,AJs,KQs,AJo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      BB:{
        RFI: '',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s,87s',
        call:  'TT,99,88,77,66,AJs,ATs,A9s,KQs,KJs,QJs,JTs,T9s,AJo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo',
      },
    },
    push: { // <20BB — push/fold בלבד
      BTN:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,QJs,QTs,JTs,T9s,AKo,AQo,AJo,ATo,A9o,KQo,KJo,QJo',
        '3bet': 'AA,KK,QQ,JJ,TT,AKs,AQs,AKo,AQo',
        call:  '99,88,77,AJs,KQs,AJo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      CO:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,KQs,KJs,QJs,JTs,T9s,AKo,AQo,AJo,KQo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo',
        call:  'TT,99,AJs,KQs',
        '4bet': 'AA,KK,AKs,AKo',
      },
      HJ:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,KQs,KJs,QJs,JTs,AKo,AQo,AJo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo',
        call:  'JJ,TT,AQs',
        '4bet': 'AA,KK,AKs',
      },
      MP:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,KQs,JTs,AKo,AQo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo',
        call:  'JJ,TT',
        '4bet': 'AA,KK,AKs',
      },
      UTG:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,AKs,AQs,AJs,KQs,AKo,AQo',
        '3bet': 'AA,KK,QQ,AKs,AKo',
        call:  'JJ,TT',
        '4bet': 'AA,KK,AKs',
      },
      SB:{
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,AKo,AQo,AJo,KQo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo',
        call:  'TT,99,KQs',
        '4bet': 'AA,KK,AKs,AKo',
      },
      BB:{
        RFI: '',
        '3bet': 'AA,KK,QQ,JJ,TT,AKs,AQs,AKo',
        call:  '99,88,77,AJs,ATs,KQs,QJs,JTs,AJo',
        '4bet': 'AA,KK,AKs,AKo',
      },
    },
  },
};
// 9-max (deep stack)
_RANGES[9] = { deep:{
  BTN:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,QJs,QTs,JTs,J9s,T9s,98s,87s,76s,65s,54s,AKo,AQo,AJo,ATo,KQo,KJo,KTo,QJo,QTo,JTo','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,A4s','call':'TT,99,88,AJs,ATs,KQs,QJs,JTs,AJo,KQo','4bet':'AA,KK,QQ,AKs,AKo'},
  CO:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,KTs,QJs,QTs,JTs,T9s,98s,87s,AKo,AQo,AJo,ATo,KQo,KJo,QJo','3bet':'AA,KK,QQ,AKs,AQs,AKo,A5s','call':'JJ,TT,AJs,ATs,KQs,QJs,JTs,AJo','4bet':'AA,KK,AKs,AKo'},
  HJ:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,A9s,A5s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,KQo,KJo','3bet':'AA,KK,QQ,AKs,AKo,A5s','call':'JJ,TT,AQs,AJs,KQs,QJs,AQo','4bet':'AA,KK,AKs,AKo'},
  LJ:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,ATs,KQs,KJs,QJs,JTs,T9s,AKo,AQo,AJo,KQo','3bet':'AA,KK,QQ,AKs,AKo','call':'JJ,TT,AQs,KQs,AQo','4bet':'AA,KK,AKs,AKo'},
  MP:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,KQs,KJs,QJs,JTs,AKo,AQo,KQo','3bet':'AA,KK,QQ,AKs,AKo','call':'JJ,TT,AQs,KQs','4bet':'AA,KK,AKs'},
  'UTG+1':{RFI:'AA,KK,QQ,JJ,TT,99,88,AKs,AQs,AJs,KQs,JTs,AKo,AQo,KQo','3bet':'AA,KK,QQ,AKs,AKo','call':'JJ,TT,AQs','4bet':'AA,KK,AKs'},
  UTG:{RFI:'AA,KK,QQ,JJ,TT,99,88,AKs,AQs,AJs,KQs,AKo,AQo','3bet':'AA,KK,QQ,AKs,AKo','call':'JJ,TT','4bet':'AA,KK,AKs'},
  SB:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,ATo,KQo,KJo','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s','call':'TT,99,AJs,KQs,QJs,AJo,KQo','4bet':'AA,KK,AKs,AKo'},
  BB:{RFI:'','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s,A4s,87s,76s','call':'TT,99,88,77,66,AJs,ATs,A9s,KQs,KJs,QJs,JTs,T9s,AJo,KQo','4bet':'AA,KK,QQ,AKs,AKo'},
}, mid:{}, short:{}, push:{} };
// העתק mid/short/push ל-9max מה-6max (קירוב טוב לתחילה)
['mid','short','push'].forEach(d=>{
  _RANGES[9][d]={};
  Object.keys(_RANGES[6][d]).forEach(pos=>{
    _RANGES[9][d][pos]=_RANGES[9].deep[pos]||_RANGES[6][d][pos];
  });
  ['LJ','UTG+1'].forEach(p=>{ if(!_RANGES[9][d][p]) _RANGES[9][d][p]=_RANGES[9].deep[p]||{}; });
});
// 2-5 players
[2,3].forEach(n=>{
  _RANGES[n]={deep:{BTN:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,QJs,QTs,JTs,T9s,98s,87s,76s,65s,54s,AKo,AQo,AJo,ATo,A9o,A8o,KQo,KJo,KTo,QJo,QTo,JTo,T9o','3bet':'AA,KK,QQ,JJ,TT,AKs,AQs,AKo,AQo',call:'99,88,AJs,KQs,AJo','4bet':'AA,KK,AKs,AKo'},SB:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,ATo,KQo,KJo','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s',call:'TT,99,AJs,KQs,AJo','4bet':'AA,KK,AKs,AKo'},BB:{RFI:'','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s',call:'TT,99,88,77,AJs,ATs,KQs,QJs,JTs,AJo,KQo','4bet':'AA,KK,AKs,AKo'}},mid:{},short:{},push:{}};
  ['mid','short','push'].forEach(d=>{ _RANGES[n][d]=_RANGES[n].deep; });
});
_RANGES[4]={deep:{BTN:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,QJs,QTs,JTs,T9s,98s,87s,76s,65s,AKo,AQo,AJo,ATo,KQo,KJo,QJo,JTo','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s,A4s',call:'TT,99,88,AJs,ATs,KQs,QJs,JTs,AJo','4bet':'AA,KK,AKs,AKo'},CO:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,87s,AKo,AQo,AJo,ATo,KQo,KJo,QJo','3bet':'AA,KK,QQ,AKs,AQs,AKo,A5s',call:'JJ,TT,AJs,KQs,QJs,AJo,KQo','4bet':'AA,KK,AKs,AKo'},SB:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,KQo','3bet':'AA,KK,QQ,AKs,AKo,A5s',call:'JJ,TT,AJs,KQs','4bet':'AA,KK,AKs'},BB:{RFI:'','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s,87s',call:'TT,99,88,77,66,AJs,ATs,KQs,QJs,JTs,AJo,KQo','4bet':'AA,KK,AKs,AKo'}},mid:{},short:{},push:{}};
['mid','short','push'].forEach(d=>{ _RANGES[4][d]=_RANGES[4].deep; });
_RANGES[5]=_RANGES[6]; _RANGES[7]=_RANGES[9]; _RANGES[8]=_RANGES[9];

const _POS_BY_SIZE = {
  2:['BTN','BB'], 3:['BTN','SB','BB'], 4:['BTN','CO','SB','BB'],
  5:['BTN','CO','SB','BB'], 6:['BTN','CO','HJ','MP','UTG','SB','BB'],
  7:['BTN','CO','HJ','MP','UTG','SB','BB'],
  8:['BTN','CO','HJ','LJ','MP','UTG','SB','BB'],
  9:['BTN','CO','HJ','LJ','MP','UTG+1','UTG','SB','BB'],
};
const _ACTIONS_LABELS = {RFI:'פתיחה','3bet':'3-Bet',call:'Call','4bet':'4-Bet'};

function _parseRangeToSet(str){
  const s=new Set();
  if(!str)return s;
  str.split(',').map(x=>x.trim()).filter(Boolean).forEach(h=>{
    if(h.length===2&&h[0]===h[1])s.add(h);
    else if(h.endsWith('s'))s.add(h);
    else if(h.endsWith('o'))s.add(h);
    else{s.add(h+'s');s.add(h+'o');}
  });
  return s;
}

function _countCombos(str){
  if(!str)return 0;
  let n=0;
  str.split(',').map(x=>x.trim()).filter(Boolean).forEach(h=>{
    if(h.length===2&&h[0]===h[1])n+=6;
    else if(h.endsWith('s'))n+=4;
    else if(h.endsWith('o'))n+=12;
    else{n+=4+12;}
  });
  return n;
}

function _getStackDepth(){
  // חישוב effective stack (קטן בין currentActor לשאר) חלקי BB
  const actor = S.currentActor;
  const bb = (getBlinds&&getBlinds()?.bb)||50;
  const actorSeat = S.seats.find(s=>s.seatIdx===actor);
  const actorStack = actorSeat?.stack||0;
  const opponents = S.seats.filter(s=>s.playerId&&!s.folded&&!s.allin&&s.seatIdx!==actor);
  const minOppStack = opponents.length ? Math.min(...opponents.map(s=>s.stack||0)) : actorStack;
  const effStack = Math.min(actorStack, minOppStack);
  const effBB = bb>0 ? effStack/bb : 100;
  if(effBB >= 75) return 'deep';
  if(effBB >= 35) return 'mid';
  if(effBB >= 20) return 'short';
  return 'push';
}

function _getDepthLabel(){
  const d = _getStackDepth();
  return {deep:'75BB+ עמוק',mid:'35-74BB בינוני',short:'20-34BB קצר',push:'<20BB Push/Fold'}[d]||d;
}

function _getRangeStr(tableSize, pos, action){
  const ts = tableSize||S.tableSize||6;
  const depth = _getStackDepth();
  const rBySize = _RANGES[ts]||_RANGES[6];
  const rByDepth = rBySize[depth]||rBySize.deep||rBySize;
  return (rByDepth[pos]||{})[action]||'';
}

// Monte Carlo vs specific range (מחליף את הקודם)
function monteCarloEquityVsRange(holeCards, boardCards, rangeStr, iterations=6000){
  if(!holeCards||holeCards.filter(Boolean).length<2)return null;
  if(!rangeStr)return monteCarloEquity(holeCards,boardCards,1,iterations);

  // בנה deck פנוי מקלפים ידועים
  const known=[...holeCards,...boardCards].filter(Boolean);
  const knownKeys=new Set(known.map(c=>c.rank+c.suit));
  const deck=_fullDeck().filter(c=>!knownKeys.has(c.rank+c.suit));
  const boardNeeded=5-boardCards.filter(Boolean).length;

  // בנה רשימת קומבינציות range
  const SUITS=['♠','♥','♦','♣'];
  const RANKS_ORDER=['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
  const rangeCombos=[];
  const rangeSet=_parseRangeToSet(rangeStr);
  rangeSet.forEach(h=>{
    if(h.length===2&&h[0]===h[1]){
      // pair
      _MC_SUITS.forEach((s1,i)=>_MC_SUITS.forEach((s2,j)=>{
        if(i<j){
          const c1={rank:h[0],suit:s1},c2={rank:h[0],suit:s2};
          if(!knownKeys.has(c1.rank+c1.suit)&&!knownKeys.has(c2.rank+c2.suit))
            rangeCombos.push([c1,c2]);
        }
      }));
    } else if(h.endsWith('s')){
      const r1=h[0],r2=h[1];
      _MC_SUITS.forEach(s=>{
        const c1={rank:r1,suit:s},c2={rank:r2,suit:s};
        if(!knownKeys.has(c1.rank+c1.suit)&&!knownKeys.has(c2.rank+c2.suit))
          rangeCombos.push([c1,c2]);
      });
    } else if(h.endsWith('o')){
      const r1=h[0],r2=h[1];
      _MC_SUITS.forEach(s1=>_MC_SUITS.forEach(s2=>{
        if(s1!==s2){
          const c1={rank:r1,suit:s1},c2={rank:r2,suit:s2};
          if(!knownKeys.has(c1.rank+c1.suit)&&!knownKeys.has(c2.rank+c2.suit))
            rangeCombos.push([c1,c2]);
        }
      }));
    }
  });

  if(!rangeCombos.length)return monteCarloEquity(holeCards,boardCards,1,iterations);

  let wins=0,ties=0;
  for(let i=0;i<iterations;i++){
    // בחר קומבו אקראי מה-range
    const oppHand=rangeCombos[Math.floor(Math.random()*rangeCombos.length)];
    // בנה deck זמני ללא קלפי היריב
    const iterDeck=deck.filter(c=>!oppHand.some(oc=>oc.rank===c.rank&&oc.suit===c.suit));
    // ערבב
    for(let j=iterDeck.length-1;j>0;j--){
      const k=Math.floor(Math.random()*(j+1));
      [iterDeck[j],iterDeck[k]]=[iterDeck[k],iterDeck[j]];
    }
    // השלם בורד
    const runBoard=[...boardCards.filter(Boolean)];
    for(let b=0;b<boardNeeded;b++)runBoard.push(iterDeck[b]);
    const myVal=_handRankMC([...holeCards,...runBoard]);
    const oppVal=_handRankMC([...oppHand,...runBoard]);
    if(myVal>oppVal)wins++;
    else if(myVal===oppVal)ties++;
  }
  return (wins+ties*0.5)/iterations*100;
}

function renderPotOdds(){
  const bar = document.getElementById('pot-odds-bar');
  if(!bar) return;
  if(S.showPotOdds === false){ bar.style.display='none'; return; }

  const actor = S.currentActor;
  if(!S.btnLocked || S.bettingClosed || actor===null){ bar.style.display='none'; return; }
  const seat = S.seats.find(s=>s.seatIdx===actor);
  if(!seat?.playerId || seat.folded || seat.allin){ bar.style.display='none'; return; }

  const pot = calcPot();
  const alreadyIn = getStreetInvested(actor);
  const callAmt = Math.max(0, (S.lastBet||0) - alreadyIn);
  // אם אין call פעיל — הצג HUD של השחקן הפעיל
  if(callAmt <= 0 || pot <= 0){
    bar.style.display='none';
    // הצג HUD קומפקטי של currentActor
    if(S.btnLocked && !S.bettingClosed && actor!==null && seat?.playerId){
      const hud = calcPlayerHUD(seat.playerId);
      if(hud && hud.n > 0){
        const afStr = hud.af===Infinity||hud.af>9 ? '∞' : hud.af.toFixed(1);
        bar.style.display='block';
        bar.innerHTML=`<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:7px 12px;direction:rtl;display:flex;align-items:center;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch">
          <span style="font-size:11px;font-weight:800;color:#e2ddd4;white-space:nowrap;flex-shrink:0">${pName(seat.playerId)||'?'}</span>
          <span style="color:rgba(255,255,255,0.15);flex-shrink:0">|</span>
          <span style="font-size:9px;color:#5a5870;white-space:nowrap;flex-shrink:0">VPIP <span style="color:#c8a96e;font-weight:800">${hud.vpip}%</span></span>
          <span style="font-size:9px;color:#5a5870;white-space:nowrap;flex-shrink:0">PFR <span style="color:#5b9bd5;font-weight:800">${hud.pfr}%</span></span>
          <span style="font-size:9px;color:#5a5870;white-space:nowrap;flex-shrink:0">3B <span style="color:#7eb8a4;font-weight:800">${hud.bet3}%</span></span>
          <span style="font-size:9px;color:#5a5870;white-space:nowrap;flex-shrink:0">AF <span style="color:#e07b6a;font-weight:800">${afStr}</span></span>
          <span style="font-size:9px;color:#5a5870;white-space:nowrap;flex-shrink:0">W <span style="color:#5fc47a;font-weight:800">${hud.won}%</span></span>
          <span style="color:rgba(255,255,255,0.1);flex-shrink:0">·</span>
          <span style="font-size:9px;color:#3a3850;white-space:nowrap;flex-shrink:0">${hud.n} ידיים</span>
        </div>`;
      }
    }
    return;
  }

  const totalPot = pot + callAmt;
  const breakEvenNum = callAmt / totalPot * 100;
  const breakEven = breakEvenNum.toFixed(1);
  const ratio = pot / callAmt;
  const fmt = n => n>=10000 ? '₪'+(n/1000).toFixed(0)+'K' : '₪'+n.toLocaleString();
  const ratioStr = '1:'+(ratio<2?ratio.toFixed(1):Math.round(ratio));

  const holeCards = (seat.cards||[]).filter(Boolean);
  const boardCards = (S.board||[]).filter(Boolean);
  const rs = S._rangeSelection;

  // חישוב equity
  let equityPct = null;
  if(holeCards.length===2){
    if(rs){
      const rangeStr = _getRangeStr(S.tableSize, rs.pos, rs.action);
      equityPct = monteCarloEquityVsRange(holeCards, boardCards, rangeStr);
    } else {
      const numOpp = Math.max(1, S.seats.filter(s=>s.playerId&&!s.folded&&!s.allin&&s.seatIdx!==actor).length);
      equityPct = monteCarloEquity(holeCards, boardCards, numOpp);
    }
  }

  const ev = equityPct!==null ? equityPct - breakEvenNum : null;
  const evHtml = ev!==null
    ? (ev>=0
      ? `<span style="color:#5fc47a;font-size:9px;font-weight:900">✅ +EV</span>`
      : `<span style="color:#e07b6a;font-size:9px;font-weight:900">❌ -EV</span>`)
    : '';

  // snapshot
  S._potOddsSnapshot = {
    pot, callAmt,
    breakEven: parseFloat(breakEven),
    ...(equityPct!==null ? {equity:parseFloat(equityPct.toFixed(1)),ev:parseFloat((ev||0).toFixed(1)),evPositive:ev>=0} : {}),
    ...(rs ? {range:{...rs}} : {}),
  };

  // Range selector state
  const tableSize = S.tableSize||6;
  const positions = _POS_BY_SIZE[tableSize]||_POS_BY_SIZE[6];
  const showRange = S._showRangeSelector;
  const selPos = rs?.pos||positions[0];
  const selAction = rs?.action||'RFI';
  const rangeStr = _getRangeStr(tableSize, selPos, selAction);
  const combos = _countCombos(rangeStr);
  const pct = combos ? (combos/1326*100).toFixed(0) : 0;

  const chipStyle = (active,color='#c8a96e') => active
    ? `padding:4px 9px;border-radius:14px;border:1px solid ${color}88;background:${color}22;color:${color};font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap`
    : `padding:4px 9px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#5a5870;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap`;

  bar.style.display = 'block';
  bar.innerHTML = `
  <div style="background:rgba(91,155,213,0.08);border:1px solid rgba(91,155,213,0.22);border-radius:12px;padding:8px 12px;direction:rtl">

    <!-- שורה ראשית -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;min-width:50px">
        <span style="font-size:8px;color:#5a5870;font-weight:700;letter-spacing:.4px">POT ODDS</span>
        <span style="font-size:16px;font-weight:900;color:#5b9bd5;line-height:1">${ratioStr}</span>
        <span style="font-size:9px;color:#5a5870">Call ${fmt(callAmt)}</span>
      </div>
      <div style="width:1px;background:rgba(255,255,255,0.07);align-self:stretch"></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;min-width:50px">
        <span style="font-size:8px;color:#5a5870;font-weight:700;letter-spacing:.4px">BREAK-EVEN</span>
        <span style="font-size:16px;font-weight:900;color:#c8a96e;line-height:1">${breakEven}%</span>
        <span style="font-size:9px;color:#5a5870">נדרש</span>
      </div>
      <div style="width:1px;background:rgba(255,255,255,0.07);align-self:stretch"></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;min-width:50px">
        <span style="font-size:8px;color:#5a5870;font-weight:700;letter-spacing:.4px">EQUITY</span>
        ${equityPct!==null
          ? `<span style="font-size:16px;font-weight:900;color:#7eb8a4;line-height:1">${equityPct.toFixed(1)}%</span>${evHtml}`
          : `<span style="font-size:10px;color:#3a3850;margin-top:2px">${holeCards.length<2?'הזן קלפים':'בחר range'}</span>`}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        <button onclick="S.showPotOdds=false;persist();renderPotOdds()" style="background:none;border:none;color:#3a3850;font-size:13px;cursor:pointer;padding:0;line-height:1">✕</button>
        <button onclick="S._showRangeSelector=!S._showRangeSelector;renderPotOdds()"
          style="background:${showRange?'rgba(200,169,110,0.15)':'rgba(255,255,255,0.04)'};border:1px solid ${showRange?'rgba(200,169,110,0.5)':'rgba(255,255,255,0.1)'};border-radius:7px;color:${showRange?'#c8a96e':'#5a5870'};font-size:10px;font-weight:800;cursor:pointer;padding:3px 7px;white-space:nowrap">
          🎯 Range${rs?' ✓':''}
        </button>
      </div>
    </div>

    <!-- Range selector (מתרחב) -->
    ${showRange ? `
    <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;display:flex;flex-direction:column;gap:8px">

      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:9px;color:#5a5870;font-weight:700;letter-spacing:.4px">EFFECTIVE STACK</span>
        <span style="font-size:10px;color:#c8a96e;font-weight:800">${_getDepthLabel()}</span>
      </div>

      <div>
        <div style="font-size:8px;color:#5a5870;font-weight:700;letter-spacing:.5px;margin-bottom:5px">עמדת היריב</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${positions.map(p=>`<button style="${chipStyle(p===selPos,'#5b9bd5')}" onclick="S._rangeSelection={pos:'${p}',action:'${selAction}'};renderPotOdds()">${p}</button>`).join('')}
        </div>
      </div>

      <div>
        <div style="font-size:8px;color:#5a5870;font-weight:700;letter-spacing:.5px;margin-bottom:5px">פעולתו</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${Object.entries(_ACTIONS_LABELS).map(([a,lbl])=>`<button style="${chipStyle(a===selAction,'#7eb8a4')}" onclick="S._rangeSelection={pos:'${selPos}',action:'${a}'};renderPotOdds()">${lbl}</button>`).join('')}
        </div>
      </div>

      ${rangeStr ? `
      <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:6px 10px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:10px;color:#8a8799">${selPos} ${_ACTIONS_LABELS[selAction]||selAction}</span>
        <span style="font-size:10px;color:#c8a96e;font-weight:800">${combos} combos · ${pct}%</span>
        ${holeCards.length===2
          ? `<span style="font-size:10px;font-weight:800;color:${equityPct!==null?(ev>=0?'#5fc47a':'#e07b6a'):'#5a5870'}">${equityPct!==null?equityPct.toFixed(1)+'%':'...'}</span>`
          : `<span style="font-size:9px;color:#3a3850">הזן קלפים</span>`}
      </div>` : `
      <div style="font-size:10px;color:#3a3850;text-align:center;padding:4px">אין range לבחירה זו</div>`}

      <button onclick="S._rangeSelection=null;S._showRangeSelector=false;renderPotOdds()"
        style="font-size:10px;color:#5a5870;background:none;border:none;cursor:pointer;text-align:right;padding:0">
        ✕ נקה range
      </button>
    </div>` : ''}
  </div>`;
}

function renderLiveActions(){
  const bar = document.getElementById('live-actions-bar');
  if(!bar) return;
  const swp = assignPos();
  const streets = ['פרה-פלופ','פלופ','טרן','ריבר'];
  const streetLabels = {'פרה-פלופ':'Pre','פלופ':'Flop','טרן':'Turn','ריבר':'River'};
  const colFn = t=>t==='Fold'?'#555':t==='SB'?'#8b7cb8':t==='BB'?'#e07b6a':t==='Check'?'#5fc47a':t==='Call'?'#5b9bd5':t==='All-in'?'#e05555':'#c8a96e';
  const typeShortFn = (t,a)=>a?.displayType||(t==='Raise'?'R':t==='Check'?'CH':t==='Call'?'C':t==='All-in'?'AI':t==='Fold'?'F':t);
  const posColFn = p=>p==='BTN'?'#c8a96e':p==='SB'?'#8b7cb8':p==='BB'?'#e07b6a':'#6a8090';

  // Pre-flop order: SB→BB→UTG→...→BTN
  const preflopOrder = ['SB','BB','UTG','UTG+1','UTG+2','LJ','MP','MP+1','HJ','CO','BTN','BTN/SB'];
  // Post-flop order: SB→BB→UTG→...→BTN (same, SB acts first)
  const postflopOrder = ['SB','BB','UTG','UTG+1','UTG+2','LJ','MP','MP+1','HJ','CO','BTN','BTN/SB'];

  let html = '';
  let hasAny = false;

  streets.forEach(st=>{
    const allActs = [];
    swp.filter(s=>s.playerId).forEach(s=>{
      const seat = S.seats.find(st2=>st2.seatIdx===s.seatIdx)||{};
      (seat.actions||[]).forEach(a=>{
        if(a.street===st){
          allActs.push({
            name:pName(s.playerId)||'?',
            pos:s.pos,
            type:a.type,
            displayType:a.displayType,
            amt:a.amount,
            idx:a.idx??999
          });
        }
      });
    });
    if(!allActs.length) return;

    // Sort by action index (actual order performed)
    allActs.sort((a,b)=>{
      // SB and BB always first in pre-flop
      if(st==='פרה-פלופ'){
        if(a.type==='SB') return -1;
        if(b.type==='SB') return 1;
        if(a.type==='BB') return -1;
        if(b.type==='BB') return 1;
      }
      return (a.idx??999)-(b.idx??999);
    });

    hasAny=true;

    // Street label FIRST (left side)
    html+=`<div style="display:inline-flex;align-items:stretch;gap:0;flex-shrink:0">`;
    html+=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border-radius:6px 0 0 6px;padding:3px 7px;min-width:34px;flex-shrink:0">
      <span style="font-size:9px;font-weight:800;color:#8a8090">${streetLabels[st]}</span>
    </div>`;

    allActs.forEach(item=>{
      const col=colFn(item.type);
      const rawAmt=Number(item.amt)||0;
      const amt=rawAmt?(rawAmt>=1000?Math.round(rawAmt/100)/10+'K':String(rawAmt)):'';
      const typeShort=typeShortFn(item.type,item);
      const posCol=posColFn(item.pos);
      html+=`<div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border-right:1px solid rgba(255,255,255,0.06);padding:3px 8px;flex-shrink:0;min-width:46px;border-top:2px solid ${col}">
        <span style="font-size:8px;font-weight:800;color:${posCol};white-space:nowrap">${item.pos||''}</span>
        <span style="font-size:10px;font-weight:700;color:#e2ddd4;white-space:nowrap">${item.name}</span>
        <span style="font-size:10px;font-weight:900;color:${col};white-space:nowrap">${typeShort}${amt?' '+amt:''}</span>
      </div>`;
    });

    html+=`</div><div style="display:inline-flex;width:10px;flex-shrink:0"></div>`;
  });

  bar.style.display='block';
  // Scroll to end (latest action) after render
  setTimeout(()=>{ bar.scrollLeft = bar.scrollWidth; },50);
  bar.innerHTML=hasAny?html:'<div style="font-size:11px;color:#3a3650;padding:4px 6px">אין פעולות עדיין</div>';
  setTimeout(()=>{ bar.scrollLeft = bar.scrollWidth; },50);
}

// ═══════════════════════════
// BLIND TIMER
// ═══════════════════════════
let _timerInterval = null;

function startBlindTimer(){
  if(_timerInterval) clearInterval(_timerInterval);
  _timerInterval = setInterval(()=>{
    if(!S.blindTimer.running){ clearInterval(_timerInterval); _timerInterval=null; return; }
    if(!isAdmin()) return; // only admin controls the real timer
    S.blindTimer.secondsLeft--;

    if(S.blindTimer.secondsLeft <= 0){
      // Auto advance to next level
      nextBlindLevel(true);
    }
    updateTimerDisplay();
    // Warning at 60 seconds
    if(S.blindTimer.secondsLeft === 60){
      notify('⚠️ דקה אחרונה לרמה '+(S.blindLevel+1));
    }
  }, 1000);
}

function toggleBlindTimer(){
  S.blindTimer.running = !S.blindTimer.running;
  if(S.blindTimer.running){
    // Record when we started (for viewer timestamp calculation)
    S.blindTimer.startedAt = Date.now();
    S.blindTimer.pausedAt = S.blindTimer.secondsLeft; // seconds remaining when started
  } else {
    // Save current remaining time
    const elapsed = S.blindTimer.startedAt ? Math.floor((Date.now()-S.blindTimer.startedAt)/1000) : 0;
    S.blindTimer.secondsLeft = Math.max(0, (S.blindTimer.pausedAt||S.blindTimer.secondsLeft) - elapsed);
    S.blindTimer.startedAt = null;
    S.blindTimer.pausedAt = S.blindTimer.secondsLeft;
  }
  const btn = document.getElementById('btn-timer-toggle');
  if(btn) btn.textContent = S.blindTimer.running ? '⏸' : '▶';
  if(S.blindTimer.running && !_timerInterval) startBlindTimer();
  persist();
  syncToSheets(true);
}

function exportHandsToCSV(){
  const rows = [['תאריך','בליינדים','לוח','שחקן','עמדה','פעולות','תוצאה']];
  (S.handLog||[]).forEach(h=>{
    const board = (h.board||[]).filter(Boolean).map(c=>c.rank+c.suit).join(' ');
    if(!h.seats?.length){ rows.push([h.date,h.blinds,board,'','','',h.result||'']); return; }
    h.seats.forEach(s=>{
      const acts = (s.actions||[]).map(a=>a.type+(a.amount?'('+a.amount+')':'')).join(', ');
      rows.push([h.date, h.blinds, board, s.playerName||s.playerId, s.pos, acts, h.result||'']);
    });
  });
  downloadCSV(rows, 'hands.csv');
}

function exportTournsToCSV(){
  const rows = [['תאריך','שם','Buy-in','Buyins','Rebuys','כניסות','קופה','1מקום','2מקום','3מקום']];
  (S.tournLog||[]).forEach(t=>{
    rows.push([t.date, t.name||'', t.buyinCost, t.totalBuyins, t.totalRebuys,
      t.totalEntries, t.prizePool, t.place1||'', t.place2||'', t.place3||'']);
  });
  // Add finish order per tournament
  (S.tournLog||[]).forEach(t=>{
    if(t.finishOrder?.length){
      rows.push([]);
      rows.push([t.date+' – סדר סיום']);
      rows.push(['מקום','שחקן','Rebuy']);
      t.finishOrder.forEach(f=>rows.push([f.place, f.name, f.rebuy||0]));
    }
  });
  downloadCSV(rows, 'tournaments.csv');
}

function downloadCSV(rows, filename){
  const sep = ',', nl = String.fromCharCode(10);
  const BOM = String.fromCharCode(0xFEFF);
  const esc = v=>{ const s=String(v==null?'':v); return '"'+s.replace(/"/g,'""')+'"'; };
  const csv = BOM + rows.map(r=>r.map(esc).join(sep)).join(nl);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  notify('מוריד '+filename+' ✓');
}

function announceBlindLevel(level, sb, bb){
  if(!window.speechSynthesis) return;
  function numToEn(n){
    if(n>=1000000) return (n/1000000)+' million';
    if(n>=1000) return (n/1000)+' thousand';
    return String(n);
  }
  const text = 'Blinds: ' + numToEn(sb) + ', ' + numToEn(bb);
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.85;
  utter.pitch = 1;
  // Prefer a clear English voice
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v=>v.lang==='en-US'&&v.name.includes('Samantha'))
    || voices.find(v=>v.lang==='en-US')
    || null;
  if(preferred) utter.voice = preferred;
  speechSynthesis.speak(utter);
}

function nextBlindLevel(auto=false){
  const next = S.blindLevel + 1;
  if(next >= BLIND_LEVELS.length){ notify('הגעת לרמה האחרונה'); return; }
  S.blindLevel = next;
  S.blindTimer.secondsLeft = getLevelDuration(next);
  // Update timestamp for new level
  if(S.blindTimer.running){ S.blindTimer.startedAt=Date.now(); S.blindTimer.pausedAt=getLevelDuration(next); }
  // Flash animation on blind-up
  const bar = document.getElementById('blind-timer-bar');
  if(bar){
    bar.style.transition='background 0.3s';
    bar.style.background='rgba(200,169,110,0.2)';
    setTimeout(()=>{ bar.style.background='#0a0e18'; },800);
  }
  if(!auto) S.blindTimer.running = false;
  const btn = document.getElementById('btn-timer-toggle');
  if(btn) btn.textContent = S.blindTimer.running ? '⏸' : '▶';
  updateTimerDisplay();
  renderStats();
  persist();
  notify('רמה '+(next+1)+': '+BLIND_LEVELS[next].sb.toLocaleString()+'/'+BLIND_LEVELS[next].bb.toLocaleString());
  persist(); syncToSheets(true);
  // Announce new blinds
  const nb = BLIND_LEVELS[next];
  setTimeout(()=>announceBlindLevel(next+1, nb.sb, nb.bb), 500);
}

function updateTimerDisplay(){
  const el = document.getElementById('timer-display');
  if(!el) return;
  const s = S.blindTimer.secondsLeft;
  const m = Math.floor(s/60), sec = s%60;
  el.textContent = m+':'+(sec<10?'0':'')+sec;
  el.style.color = s<=60?'#e07b6a':s<=120?'#FFB347':'#5fc47a';

  const lvl = document.getElementById('timer-level');
  if(lvl) lvl.textContent = 'רמה '+(S.blindLevel+1)+' / '+BLIND_LEVELS.length;

  const b = getBlinds();
  const bl = document.getElementById('timer-blinds');
  if(bl) bl.textContent = b.sb.toLocaleString()+' / '+b.bb.toLocaleString()+(b.ante?' · ante '+b.ante.toLocaleString():'');

  // Next level
  const nextB = BLIND_LEVELS[S.blindLevel+1];
  const nextEl = document.getElementById('timer-next');
  if(nextEl) nextEl.textContent = nextB ? 'הבא: '+nextB.sb.toLocaleString()+' / '+nextB.bb.toLocaleString() : 'רמה אחרונה';

  // Progress bar
  const dur = getLevelDuration(S.blindLevel);
  const pct = dur>0 ? Math.max(0,(s/dur)*100) : 0;
  const prog = document.getElementById('timer-progress');
  if(prog){ prog.style.width=pct+'%'; prog.style.background=s<=60?'#e07b6a':s<=120?'#FFB347':'#c8a96e'; }

  // Prize & active
  const prizeEl = document.getElementById('timer-prize');
  if(prizeEl) prizeEl.textContent = '₪'+(prizePool()||0).toLocaleString();
  const activeEl = document.getElementById('timer-active');
  if(activeEl) activeEl.textContent = activeTournPlayers().length;
  const p1El = document.getElementById('timer-place1');
  if(p1El){
    const pp = prizePool()||0;
    const p1 = Math.round(pp*0.7);
    p1El.textContent = '₪'+p1.toLocaleString();
  }
}

function showTimerSettings(){
  const cur = S.blindTimer.levelDuration;
  const mins = Math.round(cur/60);
  const overlay = document.createElement('div');
  overlay.id = 'timer-settings-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7)';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:14px;padding:18px;width:260px';
  box.onclick = e=>e.stopPropagation();
  const opts = [5,10,15,20,25,30].map(m=>{
    const btn2 = document.createElement('button');
    btn2.style.cssText = 'padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:'+(mins===m?'#c8a96e':'rgba(255,255,255,0.05)')+';color:'+(mins===m?'#0a0d14':'#e2ddd4')+';font-size:13px;font-weight:700;cursor:pointer';
    btn2.textContent = m+" דק'";
    btn2.onclick = ()=>{ setLevelDuration(m*60); overlay.remove(); };
    return btn2.outerHTML;
  }).join('');
  const title2 = document.createElement('div');
  title2.style.cssText = 'font-size:14px;font-weight:800;color:#c8a96e;margin-bottom:12px;text-align:center';
  title2.textContent = 'משך כל רמה';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px';
  grid.innerHTML = opts;
  const closeBtn2 = document.createElement('button');
  closeBtn2.style.cssText = 'width:100%;padding:10px;border-radius:9px;border:none;background:rgba(255,255,255,0.08);color:#5a5870;cursor:pointer';
  closeBtn2.textContent = 'סגור';
  closeBtn2.onclick = ()=>overlay.remove();
  box.appendChild(title2); box.appendChild(grid); box.appendChild(closeBtn2);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function parseBlindCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const result = [];
  lines.forEach((line,i)=>{
    // Skip header row
    if(i===0 && isNaN(parseFloat(line.split(/[,\t]/)[0]))) return;
    const parts = line.split(/[,\t]/).map(p=>p.trim().replace(/[^0-9.]/g,''));
    if(parts.length<2) return;
    const sb = parseInt(parts[0])||0;
    const bb = parseInt(parts[1])||0;
    const ante = parseInt(parts[2])||0;
    const dur = parseInt(parts[3])||20;
    if(sb>0&&bb>0) result.push({sb,bb,ante,duration:dur});
  });
  return result;
}

function showStructureEditor(){
  document.getElementById('structure-editor-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'structure-editor-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.85);overflow-y:auto';
  
  const struct = S.blindStructure || BLIND_LEVELS.map(b=>({...b, duration:S.blindTimer.levelDuration}));
  
  const box = document.createElement('div');
  box.style.cssText = 'margin:20px auto;background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:14px;padding:16px;max-width:400px';
  
  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:800;color:#c8a96e;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center';
  title.textContent = '📋 מבנה בליינדים';
  const closeX = document.createElement('button');
  closeX.style.cssText = 'background:none;border:none;color:#5a5870;font-size:18px;cursor:pointer';
  closeX.textContent = '✕';
  closeX.onclick = ()=>overlay.remove();
  title.appendChild(closeX);
  
  // Build rows
  const rows = document.createElement('div');
  rows.id = 'struct-rows';
  
  function buildRows(){
    rows.innerHTML = '';
    struct.forEach((lvl,idx)=>{
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:24px 1fr 1fr 1fr 80px 28px;gap:4px;align-items:center;margin-bottom:6px';
      const durMins = Math.round((lvl.duration||S.blindTimer.levelDuration)/60);
      row.innerHTML = 
        '<span style="font-size:11px;color:#5a5870;text-align:center">'+(idx+1)+'</span>'+
        '<input type="number" value="'+lvl.sb+'" placeholder="SB" data-field="sb" data-idx="'+idx+'" style="padding:5px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:#0a0e18;color:#e2ddd4;font-size:12px;text-align:center;outline:none;width:100%;box-sizing:border-box">'+
        '<input type="number" value="'+lvl.bb+'" placeholder="BB" data-field="bb" data-idx="'+idx+'" style="padding:5px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:#0a0e18;color:#e2ddd4;font-size:12px;text-align:center;outline:none;width:100%;box-sizing:border-box">'+
        '<input type="number" value="'+(lvl.ante||0)+'" placeholder="Ante" data-field="ante" data-idx="'+idx+'" style="padding:5px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:#0a0e18;color:#e2ddd4;font-size:12px;text-align:center;outline:none;width:100%;box-sizing:border-box">'+
        '<input type="number" value="'+durMins+'" placeholder="דק׳" data-field="duration" data-idx="'+idx+'" style="padding:5px;border-radius:6px;border:1px solid rgba(200,169,110,0.3);background:#0a0e18;color:#c8a96e;font-size:12px;text-align:center;outline:none;width:100%;box-sizing:border-box">'+
        '<button data-del="'+idx+'" style="padding:4px;border-radius:6px;border:none;background:rgba(224,123,106,0.2);color:#e07b6a;font-size:14px;cursor:pointer;width:100%">✕</button>';
      rows.appendChild(row);
    });
    // Input change handlers
    rows.querySelectorAll('input').forEach(inp=>{
      inp.oninput = ()=>{
        const i=+inp.dataset.idx, f=inp.dataset.field;
        struct[i][f] = f==='duration'? (+inp.value||20)*60 : +inp.value||0;
      };
    });
    rows.querySelectorAll('[data-del]').forEach(btn=>{
      btn.onclick = ()=>{ struct.splice(+btn.dataset.del,1); buildRows(); };
    });
  }
  buildRows();
  
  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:grid;grid-template-columns:24px 1fr 1fr 1fr 80px 28px;gap:4px;margin-bottom:4px';
  hdr.innerHTML = '<span></span><span style="font-size:10px;color:#5a5870;text-align:center">SB</span><span style="font-size:10px;color:#5a5870;text-align:center">BB</span><span style="font-size:10px;color:#5a5870;text-align:center">Ante</span><span style="font-size:10px;color:#c8a96e;text-align:center">דק׳</span><span></span>';
  
  // Add level button
  const addBtn = document.createElement('button');
  addBtn.style.cssText = 'width:100%;padding:8px;border-radius:8px;border:1px dashed rgba(255,255,255,0.15);background:transparent;color:#5a5870;font-size:13px;cursor:pointer;margin-top:6px';
  addBtn.textContent = '+ הוסף רמה';
  addBtn.onclick = ()=>{ const last=struct[struct.length-1]||{sb:500,bb:1000,ante:0}; struct.push({sb:last.sb*2,bb:last.bb*2,ante:last.ante,duration:S.blindTimer.levelDuration}); buildRows(); };
  
  // Import from CSV/Excel button
  const importBtn = document.createElement('button');
  importBtn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(95,196,122,0.4);background:rgba(95,196,122,0.1);color:#5fc47a;font-weight:700;font-size:13px;cursor:pointer;margin-top:8px';
  importBtn.textContent = '📂 ייבא מ-Excel/CSV';
  importBtn.onclick = ()=>{
    const fileInp = document.createElement('input');
    fileInp.type = 'file';
    fileInp.accept = '.csv,.xlsx,.xls,.txt';
    fileInp.onchange = async ()=>{
      const file = fileInp.files[0];
      if(!file) return;
      const text = await file.text();
      const imported = parseBlindCSV(text);
      if(!imported.length){ notify('לא נמצאו נתונים תקינים'); return; }
      // Update struct array
      struct.length = 0;
      imported.forEach(r=>struct.push(r));
      // Re-render rows
      rowsContainer.innerHTML = '';
      struct.forEach((_,idx2)=>rowsContainer.appendChild(buildRow(idx2)));
      notify('✓ יובאו '+imported.length+' רמות');
    };
    fileInp.click();
  };
  box.appendChild(importBtn);

  // Download template button
  const templateBtn = document.createElement('button');
  templateBtn.style.cssText = 'width:100%;padding:8px;border-radius:10px;border:1px solid rgba(91,155,213,0.3);background:rgba(91,155,213,0.08);color:#5b9bd5;font-size:12px;cursor:pointer;margin-top:6px';
  templateBtn.textContent = '⬇️ הורד תבנית CSV';
  templateBtn.onclick = ()=>{
    const csv = 'SB,BB,Ante,Minutes\n500,1000,0,20\n1000,2000,0,20\n1500,3000,0,20\n2000,4000,0,20\n3000,6000,0,20\n';
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'blind_structure.csv';
    a.click();
  };
  box.appendChild(templateBtn);

  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.style.cssText = 'width:100%;padding:12px;border-radius:10px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:14px;cursor:pointer;margin-top:10px';
  saveBtn.textContent = '💾 שמור מבנה';
  saveBtn.onclick = ()=>{
    S.blindStructure = struct.map(l=>({sb:l.sb,bb:l.bb,ante:l.ante||0,duration:l.duration||S.blindTimer.levelDuration}));
    BLIND_LEVELS = [...S.blindStructure];
    S.customBlinds = null; // clear manual override so structure takes effect
    persist();
    overlay.remove();
    renderTimerBar();
    notify('מבנה נשמר ✓');
  };
  
  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:13px;cursor:pointer;margin-top:6px';
  resetBtn.textContent = 'איפוס למבנה ברירת מחדל';
  resetBtn.onclick = ()=>{ S.blindStructure=null; BLIND_LEVELS=[...DEF_BLINDS]; persist(); overlay.remove(); notify('מבנה אופס'); };
  
  box.appendChild(title); box.appendChild(hdr); box.appendChild(rows);
  box.appendChild(addBtn); box.appendChild(saveBtn); box.appendChild(resetBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function closeICM(){ document.getElementById('icm-overlay')?.remove(); }

function calcPlayerHUD(playerId){
  const hands = S.handLog||[];
  if(!hands.length) return null;
  
  const playerHands = hands.filter(h=>(h.seats||[]).some(s=>s.playerId===playerId));
  if(playerHands.length < 3) return null;
  
  let vpip=0, pfr=0, raises=0, calls=0, checks=0, bet3=0, wtsd=0, won=0;
  
  playerHands.forEach(h=>{
    const seat = (h.seats||[]).find(s=>s.playerId===playerId);
    if(!seat) return;
    const acts = seat.actions||[];
    
    // VPIP: entered pot preflop (call or raise)
    const preflopActs = acts.filter(a=>a.street==='פרה-פלופ'&&a.type!=='SB'&&a.type!=='BB');
    if(preflopActs.some(a=>['Call','Raise','Open','3bet','4bet','All-in'].includes(a.type))) vpip++;
    
    // PFR: raised preflop
    if(preflopActs.some(a=>['Raise','Open','3bet','4bet','All-in'].includes(a.type))) pfr++;
    
    // 3bet: re-raised preflop
    if(preflopActs.some(a=>['3bet','4bet'].includes(a.type)||a.displayType==='3b'||a.displayType==='4b')) bet3++;
    
    // All actions for AF
    const allActs = acts.filter(a=>a.type!=='SB'&&a.type!=='BB');
    raises += allActs.filter(a=>['Raise','Open','3bet','4bet','All-in'].includes(a.type)).length;
    calls  += allActs.filter(a=>a.type==='Call').length;
    checks += allActs.filter(a=>a.type==='Check').length;
    
    // WTSD: made it to showdown (not folded + has river or all-in)
    if(!seat.folded&&(h.board||[]).filter(Boolean).length===5) wtsd++;
    
    // Won
    if((h.winners||[]).some(w=>w.playerId===playerId)) won++;
  });
  
  const n = playerHands.length;
  
  // Trend: last 10 vs previous 10
  const recent = playerHands.slice(0,10);
  const older = playerHands.slice(10,20);
  let trend = '→';
  if(recent.length>=5&&older.length>=5){
    const recentAgg = recent.filter(h=>{
      const s=(h.seats||[]).find(s=>s.playerId===playerId);
      return (s?.actions||[]).some(a=>['Raise','Open','3bet','4bet','All-in'].includes(a.type));
    }).length/recent.length;
    const olderAgg = older.filter(h=>{
      const s=(h.seats||[]).find(s=>s.playerId===playerId);
      return (s?.actions||[]).some(a=>['Raise','Open','3bet','4bet','All-in'].includes(a.type));
    }).length/older.length;
    trend = recentAgg > olderAgg+0.1 ? '↑' : recentAgg < olderAgg-0.1 ? '↓' : '→';
  }
  
  return {
    n,
    vpip: Math.round(vpip/n*100),
    pfr: Math.round(pfr/n*100),
    bet3: Math.round(bet3/n*100),
    af: calls>0 ? (raises/calls).toFixed(1) : raises>0?'∞':'0',
    wtsd: Math.round(wtsd/n*100),
    won: Math.round(won/n*100),
    trend
  };
}

function closeHUD(){ document.getElementById('hud-overlay')?.remove(); }

function closeAnalyze(){ document.getElementById('analyze-overlay')?.remove(); }
async function analyzeHand(h){
  // Permission check
  if(currentUser?.role==='local'||currentUser?.role==='viewer'){
    notify('🔍 ניתוח יד חסום'); return;
  }
  if(isAdminOnly()){
    requireSuperAdmin(()=>analyzeHand(h)); return;
  }
  const token = currentUser?.token||localStorage.getItem('auth_token')||'';
  if(!token){ notify('נדרשת כניסה כמנהל'); return; }
  
  // Build context for Claude
  const board = (h.board||[]).filter(Boolean).map(c=>c.rank+c.suit).join(' ');
  const blinds = h.blinds||'';
  
  // My seat
  const myName = currentUser?.name||'';
  const mySeat = (h.seats||[]).find(s=>s.playerName===myName);
  const myCards = mySeat?(mySeat.cards||[]).filter(Boolean).map(c=>c.rank+c.suit).join(' '):'לא ידוע';
  const myPos = mySeat?.pos||'לא ידוע';
  
  // Build street-by-street actions
  const streets = ['פרה-פלופ','פלופ','טרן','ריבר'];
  const streetActions = streets.map(st=>{
    const acts = (h.seats||[]).flatMap(s=>
      (s.actions||[]).filter(a=>a.street===st).map(a=>
        s.playerName+'('+s.pos+'): '+(a.displayType||a.type)+(a.amount?' '+Number(a.amount).toLocaleString():'')
      )
    );
    return acts.length ? st+': '+acts.join(', ') : null;
  }).filter(Boolean).join('\n');

  // HUD data for opponents
  const opponents = (h.seats||[]).filter(s=>s.playerName!==myName&&s.playerName);
  const hudInfo = opponents.map(s=>{
    const hud = calcPlayerHUD(s.playerId);
    if(!hud) return s.playerName+': אין נתונים';
    return s.playerName+': VPIP '+hud.vpip+'% PFR '+hud.pfr+'% AF '+hud.af+' ('+hud.n+' ידיים)';
  }).join('\n');

  const prompt = 'אתה מומחה פוקר GTO. נתח את היד הבאה ותן המלצות ספציפיות לכל רחוב.\n\n'+
    '**פרטי יד:**\n'+
    'בליינדים: '+blinds+'\n'+
    'לוח: '+(board||'טרם נחשף')+'\n'+
    'הקלפים שלי ('+myName+'): '+myCards+'\n'+
    'העמדה שלי: '+myPos+'\n\n'+
    '**פעולות:**\n'+streetActions+'\n\n'+
    '**HUD יריבים:**\n'+(hudInfo||'אין נתונים')+'\n\n'+
    '**נתח:**\n'+
    '1. כל רחוב - האם הפעולה הייתה נכונה? GTO vs Exploitative\n'+
    '2. האם היה מקום לבלף/ליותר אגרסיביות?\n'+
    '3. המלצה לסיטואציות דומות\n\n'+
    'ענה בעברית, בצורה ממוקדת ומעשית.';

  // Show loading
  document.getElementById('analyze-overlay')?.remove();
  const aOverlay = document.createElement('div');
  aOverlay.id = 'analyze-overlay';
  aOverlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);overflow-y:auto;direction:rtl';
  aOverlay.onclick = e=>{ if(e.target===aOverlay) aOverlay.remove(); };
  
  const aBox = document.createElement('div');
  aBox.style.cssText = 'max-width:480px;margin:20px auto;background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:16px;padding:18px';
  aBox.onclick = e=>e.stopPropagation();
  
  const aHdr = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
    '<span style="font-size:15px;font-weight:800;color:#c8a96e">🔍 ניתוח יד</span>'+
    '<button onclick="closeAnalyze()" style="background:none;border:none;color:#5a5870;font-size:20px;cursor:pointer">✕</button></div>';
  
  const aContent = document.createElement('div');
  aContent.id = 'analyze-content';
  aContent.style.cssText = 'font-size:13px;color:#e2ddd4;line-height:1.7;white-space:pre-wrap';
  aContent.textContent = '⏳ מנתח יד...';
  
  aBox.innerHTML = aHdr;
  aBox.appendChild(aContent);
  aOverlay.appendChild(aBox);
  document.body.appendChild(aOverlay);

  try {
    console.log('Token:', token ? token.substring(0,20)+'...' : 'NONE');
    console.log('Sending prompt length:', prompt.length, 'First 50:', prompt.substring(0,50));
    const resp = await fetch(AUTH_WORKER_URL+'/analyze-hand',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+token
      },
      body: JSON.stringify({ prompt: prompt })
    });
    const text2 = await resp.text();
    console.log('Response:', text2.substring(0,100));
    let data;
    try { data = JSON.parse(text2); } catch(e){ throw new Error('תגובה לא תקינה: '+text2.substring(0,50)); }
    if(!data.ok) throw new Error(data.error||'שגיאה');
    aContent.textContent = data.text;
    
    // Add copy + save buttons after result
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:14px';
    
    const copyBtn = document.createElement('button');
    copyBtn.style.cssText = 'flex:1;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#e2ddd4;font-size:13px;font-weight:700;cursor:pointer';
    copyBtn.textContent = '📋 העתק';
    copyBtn.onclick = ()=>{
      navigator.clipboard.writeText(data.text).then(()=>{
        copyBtn.textContent = '✓ הועתק!';
        setTimeout(()=>copyBtn.textContent='📋 העתק', 2000);
      });
    };
    
    const saveBtn2 = document.createElement('button');
    saveBtn2.style.cssText = 'flex:1;padding:10px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-size:13px;font-weight:800;cursor:pointer';
    saveBtn2.textContent = '💾 שמור ביד';
    saveBtn2.onclick = async ()=>{
      const handIdx = (S.handLog||[]).findIndex(x=>x.id===h.id);
      if(handIdx>=0){
        S.handLog[handIdx].analysis = data.text;
        S.handLog[handIdx].analysisDate = new Date().toLocaleDateString('he-IL');
        h.analysis = data.text;
        h.analysisDate = S.handLog[handIdx].analysisDate;
        persist();
        saveBtn2.textContent = '✓ נשמר!';
        saveBtn2.disabled = true;
        notify('ניתוח נשמר ✓');

        // Auto-generate notes per player
        const token2 = currentUser?.token||localStorage.getItem('auth_token')||'';
        const playerNames = (h.seats||[]).map(s=>s.playerName).filter(Boolean).join(', ');
        try {
          const nr = await fetch(AUTH_WORKER_URL+'/analyze-hand',{
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token2},
            body:JSON.stringify({prompt:
              'בהתבסס על ניתוח הפוקר הבא:\n\n'+data.text+'\n\n'+
              'כתוב הערה קצרה ומעשית (משפט אחד) לכל שחקן: '+playerNames+
              '.\nהחזר JSON בלבד: {"notes":{"שם":"הערה",...}} ללא כלום נוסף.'
            })
          });
          const nd = await nr.json();
          if(nd.ok){
            const clean = nd.text.replace(/```json|```/g,'').trim();
            const parsed = JSON.parse(clean);
            const notes = parsed.notes||{};
            const dateStr = new Date().toLocaleDateString('he-IL');
            Object.entries(notes).forEach(([pName, note])=>{
              const player = S.playerLib.find(p=>p.name===pName);
              if(player){
                if(!S.playerNotes) S.playerNotes={};
                const existing = S.playerNotes[player.id]||'';
                S.playerNotes[player.id] = (existing?existing+'\n':'')+'['+dateStr+'] '+note;
              }
            });
            persist();
            notify('📝 הערות נוספו לשחקנים');
          }
        } catch(e){ console.log('Notes error:',e); }
      }
    };
    
    btnRow.appendChild(copyBtn);
    btnRow.appendChild(saveBtn2);
    aBox.appendChild(btnRow);
    
  } catch(e){
    aContent.textContent = 'שגיאה: '+e.message;
  }
}
function showPlayerHUDById(playerId){
  const name = pName(playerId)||'שחקן';
  const hud = calcPlayerHUD(playerId);
  if(!hud){ notify('נדרשות לפחות 3 ידיים'); return; }
  _renderHUDOverlay(name, hud);
}

function _renderHUDOverlay(name, hud){
  document.getElementById('hud-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'hud-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl';
  overlay.onclick = ()=>overlay.remove();

  const box = document.createElement('div');
  box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:16px;padding:16px;width:100%;max-width:340px';
  box.onclick = e=>e.stopPropagation();

  const statColor = (val, low, high) => val>=high?'#5fc47a':val>=low?'#FFB347':'#e07b6a';

  box.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
    '<div><div style="font-size:15px;font-weight:800;color:#c8a96e">📊 '+name+'</div>'+
    '<div style="font-size:10px;color:#5a5870">'+hud.n+' ידיים · Trend '+hud.trend+'</div></div>'+
    '<button onclick="closeHUD()" style="background:none;border:none;color:#5a5870;font-size:20px;cursor:pointer">✕</button></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'+
    hudStat('VPIP', hud.vpip+'%', statColor(hud.vpip,20,40), 'נכנס לקופה')+
    hudStat('PFR', hud.pfr+'%', statColor(hud.pfr,15,30), 'Raise פרה-פלופ')+
    hudStat('3bet', hud.bet3+'%', statColor(hud.bet3,5,10), '3bet%')+
    hudStat('AF', hud.af, statColor(parseFloat(hud.af),1,3), 'אגרסיביות')+
    hudStat('WTSD', hud.wtsd+'%', statColor(hud.wtsd,25,40), 'הגיע לשואודאון')+
    hudStat('W%', hud.won+'%', statColor(hud.won,30,50), '% ניצחון')+
    '</div>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function showPlayerHUD(seatIdx){
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat?.playerId) return;
  const hud = calcPlayerHUD(seat.playerId);
  const name = pName(seat.playerId)||'שחקן';
  if(!hud){
    document.getElementById('hud-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id='hud-overlay';
    overlay.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl';
    overlay.onclick=()=>overlay.remove();
    const box=document.createElement('div');
    box.style.cssText='background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:16px;padding:16px;width:100%;max-width:340px';
    box.onclick=e=>e.stopPropagation();
    box.innerHTML='<div style="text-align:center;padding:20px"><div style="font-size:15px;font-weight:800;color:#c8a96e;margin-bottom:8px">📊 '+name+'</div><div style="color:#5a5870;font-size:12px">נדרשות לפחות 3 ידיים לחישוב HUD</div></div>';
    overlay.appendChild(box); document.body.appendChild(overlay); return;
  }
  _renderHUDOverlay(name, hud);
}

function hudStat(label, value, color, desc){
  return '<div style="background:#0d1120;border-radius:10px;padding:10px;text-align:center">'+
    '<div style="font-size:10px;color:#5a5870;margin-bottom:4px">'+label+'</div>'+
    '<div style="font-size:20px;font-weight:900;color:'+color+'">'+value+'</div>'+
    '<div style="font-size:9px;color:#5a5870;margin-top:2px">'+desc+'</div>'+
    '</div>';
}

async function openCameraForCards(target){
  if(!getGsUrl()){ notify('הגדר Google Sheets URL קודם'); return; }
  // בדיקת הרשאות — רק superadmin
  requireSuperAdmin(()=>_openCameraForCardsInner(target));
}
async function _openCameraForCardsInner(target){
  // Create file input for camera
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment'; // rear camera
  input.onchange = async ()=>{
    if(!input.files[0]) return;
    notify('🔍 מזהה קלפים...');
    try {
      const base64 = await new Promise((res,rej)=>{
        const r = new FileReader();
        r.onload = ()=>res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(input.files[0]);
      });
      
      const prompt = target==='board'
        ? 'זהה את קלפי הפוקר בתמונה. החזר JSON בלבד: {"cards":[{"rank":"A","suit":"♥"},...]}'
        : 'זהה את 2 קלפי הפוקר של השחקן בתמונה. החזר JSON בלבד: {"cards":[{"rank":"A","suit":"♥"},{"rank":"K","suit":"♠"}]}';

      // Use Google Apps Script as proxy to avoid CORS
      const resp = await fetch(getGsUrl(), {
        method:'POST',
        redirect:'follow',
        headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({
          action:'identify_cards',
          image: base64,
          prompt: prompt
        })
      });
      
      const data = JSON.parse(await resp.text());
      if(!data.ok) throw new Error(data.error||'שגיאה לא ידועה');
      const cards = data.cards||[];

      
      if(!cards.length){ notify('לא זוהו קלפים'); return; }
      
      if(target==='board'){
        // Fill next empty board slots
        let filled = 0;
        cards.forEach(c=>{
          const slot = S.board.findIndex(b=>!b);
          if(slot>=0&&slot<5){ S.board[slot]=c; filled++; }
        });
        persist(); renderBoard();
        notify('✓ זוהו '+filled+' קלפים');
        document.getElementById('card-picker').classList.remove('open');
      } else {
        // Fill seat cards (target = seatIdx)
        const seat = S.seats.find(s=>s.seatIdx===parseInt(target));
        if(seat){
          seat.cards = [cards[0]||null, cards[1]||null];
          persist(); renderSeats(); renderSeatPanel();
          notify('✓ קלפי שחקן זוהו');
        }
      }
    } catch(e){
      const errMsg = e.message||String(e);
      // Show full error details on screen for debugging
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'position:fixed;bottom:80px;left:10px;right:10px;background:#1a0000;border:1px solid #e07b6a;border-radius:10px;padding:12px;font-size:11px;color:#e07b6a;z-index:999;direction:ltr;word-break:break-all';
      errDiv.textContent = 'שגיאה: '+errMsg;
      document.body.appendChild(errDiv);
      setTimeout(()=>errDiv.remove(), 8000);
      notify('שגיאה בזיהוי');
    }
  };
  input.click();
}
function calcICM(stacks, prizes){
  const total = stacks.reduce((s,v)=>s+v,0);
  const n = stacks.length;
  const ev = new Array(n).fill(0);
  
  function simulate(remaining, prizeIdx, prob){
    if(prizeIdx >= prizes.length || remaining.length===0) return;
    remaining.forEach((stackIdx,i)=>{
      const p = stacks[stackIdx]/remaining.reduce((s,j)=>s+stacks[j],0);
      ev[stackIdx] += prob * p * prizes[prizeIdx];
      const nextRemaining = remaining.filter((_,j)=>j!==i);
      simulate(nextRemaining, prizeIdx+1, prob*p);
    });
  }
  simulate(stacks.map((_,i)=>i), 0, 1);
  return ev;
}

function showICM(){
  // Use tournament active players (not in koOrder, have buyins)
  const activePids = S.playerLib.filter(p=>!S.koOrder.includes(p.id)&&S.buyins[p.id]?.buyin>0);
  if(activePids.length<2){ notify('נדרשים לפחות 2 שחקנים פעילים בטורניר'); return; }
  
  // Show stack input form first
  showICMStackForm(activePids);
}

function showICMStackForm(activePids){
  document.getElementById('icm-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'icm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.85);overflow-y:auto;direction:rtl';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
  
  const box = document.createElement('div');
  box.style.cssText = 'max-width:360px;margin:20px auto;background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:16px;padding:16px';
  box.onclick = e=>e.stopPropagation();
  
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px';
  hdr.innerHTML = '<span style="font-size:15px;font-weight:800;color:#c8a96e">ICM – הזן ערימות</span>';
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none;border:none;color:#5a5870;font-size:22px;cursor:pointer';
  closeBtn.textContent = '✕';
  closeBtn.onclick = ()=>overlay.remove();
  hdr.appendChild(closeBtn);
  box.appendChild(hdr);
  
  // Total chips in tournament
  const icmTotalChips = Object.values(S.buyins||{}).reduce((s,b)=>s+(b.buyin||0)+(b.rebuy||0),0)*50000;
  const defaultStack = activePids.length>0 ? Math.round(icmTotalChips/activePids.length) : 50000;
  const stacks = {};
  activePids.forEach(p=>{ stacks[p.id] = defaultStack||50000; });

  // Show total chips
  const totalDiv = document.createElement('div');
  totalDiv.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#0d1120;border-radius:8px;margin-bottom:10px';
  const tl = document.createElement('span'); tl.style.cssText='font-size:11px;color:#5a5870'; tl.textContent='ציפים בטורניר:';
  const tv = document.createElement('span'); tv.style.cssText='font-size:14px;font-weight:800;color:#c8a96e'; tv.textContent=icmTotalChips.toLocaleString();
  totalDiv.appendChild(tl); totalDiv.appendChild(tv);
  box.appendChild(totalDiv);

  // Status line
  const statusDiv = document.createElement('div');
  statusDiv.id='icm-status';
  statusDiv.style.cssText='font-size:11px;text-align:center;margin-bottom:8px';
  box.appendChild(statusDiv);

  function updateTotal(){
    const sum = Object.values(stacks).reduce((a,b)=>a+b,0);
    const el = document.getElementById('icm-status'); if(!el) return;
    const diff = sum-icmTotalChips;
    if(diff===0){ el.style.color='#5fc47a'; el.textContent='✓ מוזן: '+sum.toLocaleString(); }
    else if(diff>0){ el.style.color='#e07b6a'; el.textContent='⚠️ עודף '+diff.toLocaleString()+' | מוזן: '+sum.toLocaleString(); }
    else { el.style.color='#FFB347'; el.textContent='⚠️ חסר '+Math.abs(diff).toLocaleString()+' | מוזן: '+sum.toLocaleString(); }
  }

  activePids.forEach(p=>{
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
    row.innerHTML = '<span style="flex:1;font-size:13px;font-weight:700;color:#e2ddd4">'+p.name+'</span>';
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.inputMode = 'numeric';
    inp.value = 50000;
    inp.style.cssText = 'width:110px;padding:7px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#0a0e18;color:#e2ddd4;font-size:13px;text-align:center;outline:none;-webkit-appearance:none';
    inp.oninput = ()=>{ stacks[p.id]=parseInt(inp.value)||0; updateTotal(); };
    row.appendChild(inp);
    box.appendChild(row);
  });

  updateTotal(); // show initial status
  
  const calcBtn = document.createElement('button');
  calcBtn.style.cssText = 'width:100%;padding:12px;border-radius:10px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:14px;cursor:pointer;margin-top:6px';
  calcBtn.textContent = 'חשב ICM';
  calcBtn.onclick = ()=>{
    const active = activePids.map(p=>({playerId:p.id, stack:stacks[p.id]||0}));
    const total = active.reduce((s,a)=>s+a.stack,0);
    if(total===0){ notify('הזן ערימות'); return; }
    overlay.remove();
    showICMResult(active);
  };
  box.appendChild(calcBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function showICMResult(active){
  const stacks = active.map(s=>s.stack||0);
  const total = stacks.reduce((a,b)=>a+b,0);
  const pp = prizePool()||0;
  const p1 = S.place1Override||Math.round(pp*(active.length<=2?0.7:0.5));
  const p2 = S.place2Override||Math.round(pp*(active.length<=2?0.3:0.3));
  const p3 = active.length>=3?(S.place3||0):0;
  const prizes = [p1,p2,p3].filter(p=>p>0);
  const icmEV = calcICM(stacks, prizes);
  
  // Build overlay
  document.getElementById('icm-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'icm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.85);overflow-y:auto;direction:rtl';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
  
  const box = document.createElement('div');
  box.style.cssText = 'max-width:420px;margin:20px auto;background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:16px;padding:16px';
  box.onclick = e=>e.stopPropagation();
  
  // Header
  box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
    '<div><div style="font-size:15px;font-weight:800;color:#c8a96e">ICM</div>'+
    '<div style="font-size:11px;color:#5a5870">קופה: ₪'+pp.toLocaleString()+'</div></div>'+
    '<button onclick="closeICM()" style="background:none;border:none;color:#5a5870;font-size:22px;cursor:pointer">✕</button></div>';
  
  // Prizes row
  const prizesRow = document.createElement('div');
  prizesRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px';
  prizes.forEach((p,i)=>{
    prizesRow.innerHTML += '<div style="flex:1;background:#0d1120;border-radius:8px;padding:6px;text-align:center">'+
      '<div style="font-size:10px;color:#5a5870">מקום '+(i+1)+'</div>'+
      '<div style="font-size:13px;font-weight:700;color:#c8a96e">₪'+p.toLocaleString()+'</div></div>';
  });
  box.appendChild(prizesRow);
  
  // Table
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px';
  table.innerHTML = '<thead><tr style="border-bottom:1px solid rgba(255,255,255,0.08)">'+
    '<th style="padding:6px 8px;text-align:right;color:#5a5870;font-weight:600">שחקן</th>'+
    '<th style="padding:6px 8px;text-align:center;color:#5a5870;font-weight:600">ערימה</th>'+
    '<th style="padding:6px 8px;text-align:center;color:#5a5870;font-weight:600">% צ יפים</th>'+
    '<th style="padding:6px 8px;text-align:center;color:#5a5870;font-weight:600">שווי ICM</th>'+
    '<th style="padding:6px 8px;text-align:center;color:#5a5870;font-weight:600">% פרסים</th>'+
    '</tr></thead><tbody id="icm-tbody"></tbody>';
  box.appendChild(table);
  
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  const tbody = document.getElementById('icm-tbody');
  active.forEach((seat,i)=>{
    const chipPct = total>0?Math.round(seat.stack/total*1000)/10:0;
    const icmVal = Math.round(icmEV[i]);
    const icmPct = pp>0?Math.round(icmEV[i]/pp*1000)/10:0;
    const diff = icmPct - chipPct;
    const diffColor = diff>0?'#5fc47a':diff<0?'#e07b6a':'#5a5870';
    const row = document.createElement('tr');
    row.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.04)';
    row.innerHTML = '<td style="padding:8px;font-weight:700;color:#e2ddd4">'+pName(seat.playerId)+'</td>'+
      '<td style="padding:8px;text-align:center;color:#aaa">'+seat.stack.toLocaleString()+'</td>'+
      '<td style="padding:8px;text-align:center;color:#aaa">'+chipPct+'%</td>'+
      '<td style="padding:8px;text-align:center;font-weight:800;color:#5fc47a">₪'+icmVal.toLocaleString()+'</td>'+
      '<td style="padding:8px;text-align:center"><span style="font-weight:700;color:#e2ddd4">'+icmPct+'%</span> <span style="font-size:10px;color:'+diffColor+'">'+(diff>0?'+':'')+diff.toFixed(1)+'%</span></td>';
    tbody.appendChild(row);
  });
}

function resetBlindTimer(){
  S.blindLevel = 0;
  S.blindTimer.running = false;
  S.blindTimer.secondsLeft = getLevelDuration(0);
  const btn = document.getElementById('btn-timer-toggle');
  if(btn) btn.textContent = '▶';
  updateTimerDisplay();
  persist();
  notify('טיימר אופס ↺');
}

function setLevelDuration(secs){
  S.blindTimer.levelDuration = secs;
  S.blindTimer.secondsLeft = secs;
  updateTimerDisplay();
  persist();
}

function renderTableShape(){
  const wrap = document.getElementById('table-wrap');
  const svg = document.getElementById('table-svg');
  if(!wrap || !svg) return;

  // Lovable: max-w-[420px] aspect-[3/4]
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const topBarH = 175;
  const maxW = Math.min(vw - 40, 360);
  const maxH = vh - topBarH - 100; // מרווח למושבים שגולשים
  let w = maxW;
  let h = w * 4/3;
  if(h > maxH){ h = maxH; w = h * 3/4; }
  w = Math.round(w); h = Math.round(h);

  wrap.style.width = w + 'px';
  wrap.style.height = h + 'px';
  wrap.style.borderRadius = '50%';
  wrap.style.overflow = 'visible';

  // SVG viewBox 300x400 (aspect 3:4)
  svg.setAttribute('viewBox','0 0 300 400');
  svg.style.borderRadius = '50%';
  svg.innerHTML = `<defs>
    <radialGradient id="gFelt" cx="50%" cy="40%">
      <stop offset="0%" stop-color="oklch(0.42 0.12 155)"/>
      <stop offset="100%" stop-color="oklch(0.22 0.07 150)"/>
    </radialGradient>
    <linearGradient id="gRail" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="oklch(0.32 0.07 150)"/>
      <stop offset="100%" stop-color="oklch(0.22 0.05 150)"/>
    </linearGradient>
  </defs>
  <!-- outer rail: inset 8% -->
  <ellipse cx="150" cy="200" rx="138" ry="184" fill="url(#gRail)" filter="drop-shadow(0 20px 40px rgba(0,0,0,0.7))"/>
  <ellipse cx="150" cy="200" rx="138" ry="184" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
  <!-- felt: inset 13% -->
  <ellipse cx="150" cy="200" rx="124" ry="170" fill="url(#gFelt)" filter="drop-shadow(inset 0 0 40px rgba(0,0,0,0.5))"/>
  <!-- inner highlight -->
  <ellipse cx="150" cy="200" rx="116" ry="162" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
  <!-- gold ring -->
  <ellipse cx="150" cy="200" rx="108" ry="154" fill="none" stroke="rgba(200,169,110,0.08)" stroke-width="0.8"/>`;

  // עדכן כפתור orientation  // עדכן כפתור orientation
  const orientBtn = document.getElementById('btn-orientation');
  if(orientBtn) orientBtn.textContent = S.tableOrientation==='horizontal' ? '⇔ אופקי' : '⇅ אנכי';
  // Show/hide viewer banner
  const vb = document.getElementById('viewer-banner');
  if(vb) vb.style.display = isViewer()?'flex':'none';
  // Hide tabs not available for viewers
  ['tab-table','tab-hands'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display = isViewer()?'none':'';
  });
  // Check current active tab and apply hide logic
  const curTab = document.querySelector('.nav-tab.active')?.id?.replace('tab-','') || 'table';
  const timerCtrl = document.getElementById('timer-controls');
  if(timerCtrl) timerCtrl.style.display = isViewer() ? 'none' : 'flex';
  const sb2 = document.getElementById('statsbar');
  if(sb2) sb2.style.display = (curTab==='table'||curTab==='hands') ? 'none' : '';
  const lb2 = document.getElementById('live-actions-bar');
  if(lb2) lb2.style.display = curTab==='table' ? 'block' : 'none';
  const ab2 = document.getElementById('btn-active');
  if(ab2) ab2.style.display = (curTab==='table'||curTab==='hands'||isViewer()) ? 'none' : '';
  // Show refresh button only for viewers
  const vRefresh = document.getElementById('btn-viewer-refresh');
  if(vRefresh) vRefresh.style.display = isViewer()?'':'none';
  // Hide action buttons for viewers
  ['btn-settings','btn-newhand','btn-savehand','btn-resethand','sbox-tablesize','sbox-buyincost','btn-export','btn-restore','btn-addplayer','add-player-row','btn-save-tourn','btn-reset-tourn'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display = isViewer()?'none':'';
  });
}
function render(){
  // Safety: if currentActor is set and hand is active, ensure bettingClosed is correct
  if(S.btnLocked && S.currentActor!==null && S.bettingClosed){
    const boardCount = S.board.filter(Boolean).length;
    const street = boardCount===0?'פרה-פלופ':boardCount<=3?'פלופ':boardCount===4?'טורן':'ריבר';
    const order = getActingOrder(street);
    if(order.includes(S.currentActor)) S.bettingClosed = false;
  }
  renderTableShape();
  renderStats(); renderSeats(); renderBoard(); renderBlindsBtn();
  // עדכן כפתור orientation
  const orientBtn = document.getElementById('btn-orientation');
  if(orientBtn) orientBtn.textContent = S.tableOrientation==='horizontal' ? '⇔ אופקי' : '⇅ אנכי';
  // Show/hide viewer banner
  const vb = document.getElementById('viewer-banner');
  if(vb) vb.style.display = isViewer()?'flex':'none';
  ['tab-table','tab-hands'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display = isViewer()?'none':'';
  });
  const timerCtrl = document.getElementById('timer-controls');
  if(timerCtrl) timerCtrl.style.display = isViewer() ? 'none' : 'flex';
  const sb2 = document.getElementById('statsbar');
  const curTab = document.querySelector('.nav-tab.active')?.id?.replace('tab-','') || 'table';
  if(sb2) sb2.style.display = (curTab==='table'||curTab==='hands') ? 'none' : '';
}

function renderStats(){
  const buy=Object.keys(S.buyins).filter(pid=>S.buyins[pid]?.buyin>0).length;
  document.getElementById('stat-players').textContent=buy;
  document.getElementById('stat-rebuys').textContent=totalRebuys();
  const freeR=calcFreeRebuys();
  const paidE=calcPaidEntries();
  const entriesEl=document.getElementById('stat-entries');
  if(freeR>0){
    entriesEl.innerHTML=`${totalEntries()} <span style="font-size:9px;color:#5b9bd5;font-weight:700">(${freeR}✓)</span>`;
  } else {
    entriesEl.textContent=totalEntries();
  }
  document.getElementById('stat-active').textContent=`${activeTournPlayers().length}/${totalEntries()}`;
  document.getElementById('stat-prize').textContent=`₪${prizePool().toLocaleString()}`;
  document.getElementById('inp-buyin-cost').value=S.buyinCost;
  document.querySelectorAll('#sel-table-size,#sel-table-size-stats').forEach(el=>el.value=S.tableSize);
  document.getElementById('sel-table-size').value=S.tableSize;
}
function renderSeats(){
  // אל תרנדר מחדש כשcard-picker פתוח
  if(document.getElementById('card-picker')?.classList.contains('open')) return;
  const cont=document.getElementById('seats-container'); cont.innerHTML='';
  // class לאפקט scale
  const hasActor = S.btnLocked && !S.bettingClosed && S.currentActor!==null;
  cont.classList.toggle('seats-has-actor', hasActor);
  const swp=assignPos();
  for(let i=0;i<S.tableSize;i++){
    let{x,y}=getSeatXY(i,S.tableSize);
    if(window._tunerSeatDist){
      const cx=50,cy=50;
      const angle=(Math.PI/2)+(2*Math.PI*i/S.tableSize);
      const d=window._tunerSeatDist*100;
      const horiz=false; // תמיד אנכי
      x=cx+(horiz?d*1.25:d*0.82)*Math.cos(angle);
      y=cy+(horiz?d*0.82:d)*Math.sin(angle);
    }
    const seat=swp.find(s=>s.seatIdx===i);
    const name=seat?.playerId?pName(seat.playerId):null;
    const isAct=activeSeat===i, isFold=seat?.folded, isAlin=seat?.allin, isBtn=i===S.btnSeat&&seat?.playerId;
    const bb=getBB();
    const sbb=seat?.stack&&bb?(seat.stack/bb).toFixed(1):null;
    const lastAct=seat?.actions?.filter(a=>a.type!=='SB'&&a.type!=='BB').slice(-1)[0];
    const blindAct=seat?.actions?.filter(a=>a.type==='SB'||a.type==='BB').slice(-1)[0];
    const displayAct = lastAct||blindAct;
    const w=seat?.playerId?88:38;
    const isCurrentActor = i===S.currentActor;
    const isWinner = S._winners&&S._winners.includes(i);
    let cls='seat-btn';
    if(seat?.playerId)cls+=' occupied';
    if(isAct)cls+=' active';
    if(isFold)cls+=' folded';
    if(!isFold&&!isAlin&&seat?.playerId&&(seat?.stack||0)===0)cls+=' broke';
    if(seat?.sittingOut)cls+=' sitting-out';
    if(isAlin)cls+=' allin';
    if(isCurrentActor&&seat?.playerId&&!isFold)cls+=' current-actor';
    if(isWinner)cls+=' winner';
    const isCurActor = S.btnLocked && !S.bettingClosed && S.currentActor!==null && S.currentActor===i;
    const el=document.createElement('div');
    el.className='seat-el';
    el.dataset.seat=i;
    el.style.left=`${x}%`;
    el.style.top=`${y}%`;
    el.style.transform='translate(-50%,-50%)';
    if(isCurActor){
      el.classList.add('is-actor');
      el.style.transform='translate(-50%,-50%) scale(1.35)';
      el.style.zIndex='30';
    }
    el.innerHTML=`<div class="${cls}" style="width:88px;min-height:64px;box-sizing:border-box" onclick="if(event.target.closest('button'))return;clickSeat(${i})" oncontextmenu="event.preventDefault();showPlayerHUD(${i})">
      ${seat?.playerId?`
        <div style="display:flex;gap:2px;align-items:center;flex-wrap:wrap;justify-content:center;margin-bottom:1px">
          ${seat.pos&&S.btnLocked?`<span class="seat-pos" style="background:${PC[seat.pos]||'#c8a96e'}35;color:${PC[seat.pos]||'#c8a96e'};font-size:9px;font-weight:900;padding:2px 6px;border:1px solid ${PC[seat.pos]||'#c8a96e'}50">${seat.pos}</span>`:''}
          ${isBtn?`<span class="dealer-chip" style="cursor:pointer" onclick="event.stopPropagation();if(!S.btnLocked||confirm('להעביר את ה-BTN? היד הנוכחית תאופס')){S.btnSeat=null;S.btnLocked=false;resetHand();renderSeats();}">D</span>`:''}
        </div>
        <div class="seat-name">${name||'?'}</div>
        ${(seat.stack>=0&&seat.playerId)?`<div class="seat-stack" id="stack-div-${seat.seatIdx}" onclick="event.stopPropagation();inlineEditStack(${seat.seatIdx},this)" style="cursor:pointer;user-select:none">${sbb?`<span style="color:#5a6a54;font-size:8px">(${sbb}) </span>`:''}<span style="font-size:9px">${seat.stack.toLocaleString()}</span></div>`:''}
        ${seat.playerId&&S.btnLocked&&!seat.folded?`<div class="seat-cards-mini" style="display:flex;gap:3px;margin-top:3px;justify-content:center">${[0,1].map(i2=>{const c=(seat.cards||[])[i2];return c?`<button onclick="openSeatCardPicker(${seat.seatIdx},${i2})" style="width:20px;height:28px;border-radius:3px;background:#fff;border:1px solid #ddd;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;padding:0"><span style="font-size:8px;font-weight:900;color:${SC[c.suit]};line-height:1">${c.rank}</span><span style="font-size:7px;color:${SC[c.suit]};line-height:1">${c.suit}</span></button>`:`<button onclick="openSeatCardPicker(${seat.seatIdx},${i2})" style="width:20px;height:28px;border-radius:3px;background:rgba(255,255,255,0.08);border:1px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0"><span style="font-size:10px;color:rgba(255,255,255,0.25)">+</span></button>`;}).join('')}</div>`:''}
        ${(()=>{const bCnt=S.board.filter(Boolean).length;const cSt=bCnt===0?'פרה-פלופ':bCnt<=3?'פלופ':bCnt===4?'טרן':'ריבר';const cSa=(seat.actions||[]).filter(a=>a.street===cSt&&a.type!=='SB'&&a.type!=='BB');const showUndo=!isViewer()&&cSa.length>0&&(()=>{const allSt=['פרה-פלופ','פלופ','טרן','ריבר'];const stIdx=allSt.indexOf(cSt);const nextDealt=stIdx===0?S.board[0]!=null:stIdx===1?S.board[3]!=null:stIdx===2?S.board[4]!=null:false;return !nextDealt;})();const showBtn=!isViewer()&&!S.btnLocked&&seat.playerId&&(seat.stack||0)>0;
    const showRebuy=!isViewer()&&seat.playerId&&(seat.stack||0)===0&&(seat.folded||seat.sittingOut||!S.btnLocked);
    const isSittingOut = seat.sittingOut||false;
    return(showBtn?`<button onclick="event.stopPropagation();setBTN(${seat.seatIdx})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid rgba(200,169,110,0.5);background:rgba(200,169,110,0.15);color:#c8a96e;font-size:8px;font-weight:900;cursor:pointer;width:100%">🎯 BTN</button>`:'')
    +(showRebuy?`
      <button onclick="event.stopPropagation();doSeatRebuy(${seat.seatIdx})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid rgba(95,196,122,0.6);background:rgba(95,196,122,0.2);color:#5fc47a;font-size:9px;font-weight:900;cursor:pointer;width:100%;z-index:10;position:relative">+ Rebuy</button>
      <button onclick="event.stopPropagation();setSittingOut(${seat.seatIdx},${!isSittingOut})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid ${isSittingOut?'rgba(91,155,213,0.6)':'rgba(255,200,50,0.5)'};background:${isSittingOut?'rgba(91,155,213,0.2)':'rgba(255,200,50,0.1)'};color:${isSittingOut?'#5b9bd5':'#FFB347'};font-size:9px;font-weight:900;cursor:pointer;width:100%;z-index:10;position:relative">${isSittingOut?'▶ חזור':'⏸ Sit Out'}</button>
      <button onclick="event.stopPropagation();rmSeat(${seat.seatIdx})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid rgba(224,123,106,0.5);background:rgba(224,123,106,0.15);color:#e07b6a;font-size:9px;font-weight:900;cursor:pointer;width:100%;z-index:10;position:relative">✕ יציאה</button>
    `:'')+(showUndo?`<button onclick="event.stopPropagation();undoLastAction(${seat.seatIdx})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid #e07b6a;background:#7a2020;color:#ffaaaa;font-size:8px;font-weight:900;cursor:pointer;width:100%;opacity:1!important;position:relative;z-index:5">↩ בטל</button>`:'');})()}
      `:`<div style="font-size:16px;color:rgba(255,255,255,0.12)">+</div>`}
    </div>`;
    // Add action buttons arc above occupied seats
    if(S.btnLocked && !S.bettingClosed && S.currentActor!==null && S.currentActor!==i && seat?.playerId && !seat?.folded && !seat?.allin){
      // Debug: log why this seat is not the actor
      // console.log('Seat',i,'not actor. currentActor=',S.currentActor);
    }
    if(seat?.playerId && !seat?.folded && !seat?.allin && isCurActor){
      const btns = document.createElement('div');
      btns.id = 'seat-actions-'+i;
      btns.style.cssText = 'position:absolute;top:50%;left:50%;width:0;height:0;pointer-events:all;z-index:20';
      // Place buttons in arc around the seat circle
      // F, CH = above seat | C, R, AI = below seat
      const sw=88, sh=68, bSize=26, gap=4;
      btns.style.cssText = 'position:absolute;top:0;left:0;width:'+sw+'px;height:'+sh+'px;pointer-events:none;z-index:20';
      // TOP: F, CH above seat
      const seatI=i;
      const canCheck = getCallAmount(seatI)===0;
      const topDefs=[];
      topDefs.push({lbl:'F', cb:function(){quickAction(seatI,'Fold');},  bg:'rgba(140,50,50,0.95)', help:'Fold'});
      if(canCheck) topDefs.push({lbl:'CH',cb:function(){quickAction(seatI,'Check');}, bg:'rgba(50,120,60,0.95)', help:'Check'});
      const topTW=topDefs.length*(bSize+gap)-gap, topSX=(sw-topTW)/2;
      topDefs.forEach((b,bi)=>{
        const btn=document.createElement('button');
        btn.style.cssText='position:absolute;width:'+bSize+'px;height:'+bSize+'px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.25);background:'+b.bg+';color:#fff;font-size:10px;font-weight:900;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.7);left:'+(topSX+bi*(bSize+gap))+'px;top:'+(-bSize-5)+'px;pointer-events:all';
        btn.textContent=b.lbl;
        (function(cb, helpTopic){
          let pressTimer = null;
          let didLongPress = false;
          function startPress(e){
            didLongPress = false;
            pressTimer = setTimeout(function(){
              didLongPress = true;
              pressTimer = null;
              if(helpTopic){ try{ showHelp(helpTopic); }catch(err){} }
            }, 500);
          }
          function endPress(e){
            if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; }
            if(!didLongPress){ e.stopPropagation(); try{ cb(); }catch(err){} }
            didLongPress = false;
          }
          function cancelPress(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } didLongPress=false; }
          // Touch (mobile)
          btn.addEventListener('touchstart', startPress, {passive:true});
          btn.addEventListener('touchend', endPress);
          btn.addEventListener('touchcancel', cancelPress);
          // Mouse (desktop)
          btn.addEventListener('mousedown', startPress);
          btn.addEventListener('mouseup', endPress);
          btn.addEventListener('mouseleave', cancelPress);
          btn.addEventListener('contextmenu', function(e){ e.preventDefault(); });
        })(b.cb, b.help||null);
        btns.appendChild(btn);

      });
      // BOTTOM: C, R, AI below seat
      const botDefs=[];
      const callAmt = getCallAmount(seatI);
      if(callAmt > 0) botDefs.push({lbl:'C', cb:function(){quickAction(seatI,'Call');}, bg:'rgba(40,80,160,0.95)', help:'Call'});
      if(canPlayerRaise(seatI)) botDefs.push({lbl:'R', cb:function(){showQuickInput(seatI,'Raise');},  bg:'rgba(160,110,30,0.95)', help:'Raise'});
      botDefs.push({lbl:'AI',cb:function(){showQuickInput(seatI,'All-in');},  bg:'rgba(160,40,40,0.95)', help:'All-in'});
      const botTW=botDefs.length*(bSize+gap)-gap, botSX=(sw-botTW)/2;
      botDefs.forEach((b,bi)=>{
        const btn=document.createElement('button');
        btn.style.cssText='position:absolute;width:'+bSize+'px;height:'+bSize+'px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.25);background:'+b.bg+';color:#fff;font-size:10px;font-weight:900;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.7);left:'+(botSX+bi*(bSize+gap))+'px;top:'+(sh+5)+'px;pointer-events:all';
        btn.textContent=b.lbl;
        (function(cb, helpTopic){
          let pressTimer = null;
          let didLongPress = false;
          function startPress(e){
            didLongPress = false;
            pressTimer = setTimeout(function(){
              didLongPress = true;
              pressTimer = null;
              if(helpTopic){ try{ showHelp(helpTopic); }catch(err){} }
            }, 500);
          }
          function endPress(e){
            if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; }
            if(!didLongPress){ e.stopPropagation(); try{ cb(); }catch(err){} }
            didLongPress = false;
          }
          function cancelPress(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } didLongPress=false; }
          // Touch (mobile)
          btn.addEventListener('touchstart', startPress, {passive:true});
          btn.addEventListener('touchend', endPress);
          btn.addEventListener('touchcancel', cancelPress);
          // Mouse (desktop)
          btn.addEventListener('mousedown', startPress);
          btn.addEventListener('mouseup', endPress);
          btn.addEventListener('mouseleave', cancelPress);
          btn.addEventListener('contextmenu', function(e){ e.preventDefault(); });
        })(b.cb, b.help||null);
        btns.appendChild(btn);
      });
      el.appendChild(btns);
    }
    // Long press on seat → HUD (mobile support)
    if(seat?.playerId){
      let lpTimer=null, lpFired=false;
      const seatIdx=i;
      el.addEventListener('touchstart',function(e){
        // בטל אם הלחיצה היא על כפתור פנימי (פעולה, rebuy, וכו')
        if(e.target.tagName==='BUTTON'||e.target.closest('button')) return;
        lpFired=false;
        lpTimer=setTimeout(function(){
          lpFired=true;
          try{ showPlayerHUD(seatIdx); }catch(err){}
        },600);
      },{passive:true});
      el.addEventListener('touchend',function(e){
        if(lpTimer){ clearTimeout(lpTimer); lpTimer=null; }
      });
      el.addEventListener('touchmove',function(e){
        if(lpTimer){ clearTimeout(lpTimer); lpTimer=null; }
      });
      // בטל long press כשפעולה מתבצעת (כפתורי פעולה מפעילים touchstart נפרד)
      el.addEventListener('touchstart',function(e){
        if(e.target.tagName==='BUTTON'||e.target.closest('button')){
          if(lpTimer){ clearTimeout(lpTimer); lpTimer=null; }
        }
      },{passive:true,capture:true});
    }
    // הדגש מנצח אוטומטי (גם בלי showdown mode — כגון אחרי awardPot)
    if(S._autoWinners && S._autoWinners.includes(i) && seat?.playerId){
      el.style.boxShadow = '0 0 24px rgba(95,196,122,0.9)';
      el.style.border = '2px solid #5fc47a';
    }
    // Showdown mode — כפתור הזנת קלפים על המושב
    if(S._showdownMode && seat?.playerId && !seat?.folded){
      const sdBtn = document.createElement('button');
      const hasCards = seat.cards && seat.cards[0] && seat.cards[1];
      sdBtn.textContent = hasCards
        ? (seat.cards[0].rank+seat.cards[0].suit+' '+seat.cards[1].rank+seat.cards[1].suit)
        : '🃏';
      sdBtn.style.cssText = 'position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);'
        +'background:'+(hasCards?'rgba(95,196,122,0.9)':'rgba(200,169,110,0.9)')
        +';color:'+(hasCards?'#0a0d14':'#0a0d14')
        +';border:none;border-radius:8px;padding:2px 8px;font-size:'+(hasCards?'10px':'13px')
        +';font-weight:900;cursor:pointer;white-space:nowrap;z-index:25;pointer-events:all';
      sdBtn.onclick = (e)=>{ e.stopPropagation(); showSDCardPicker(i); };
      el.style.overflow = 'visible';
      el.appendChild(sdBtn);
    }
    cont.appendChild(el);
  }

  // כיסא דילר קבוע — ימין אמצע
  const oldDealerSeat = document.getElementById('dealer-seat-fixed');
  if(oldDealerSeat) oldDealerSeat.remove();
  {
    const {x,y} = getDealerSeatXY();
    const dealerEl = document.createElement('div');
    dealerEl.id = 'dealer-seat-fixed';
    dealerEl.style.cssText = `position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);z-index:10;pointer-events:none`;
    dealerEl.innerHTML = `<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center"><span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.3)">DEAL</span></div>`;
    cont.appendChild(dealerEl);
  }

  // כפתור "💰 העבר קופה" על השולחן בזמן showdown
  const existingSDBar = document.getElementById('sd-action-bar');
  if(existingSDBar) existingSDBar.remove();
  if(S._showdownMode){
    const bar = document.createElement('div');
    bar.id = 'sd-action-bar';
    bar.style.cssText = 'display:flex;gap:10px;justify-content:center;padding:12px 16px;'
      +'pointer-events:all;direction:rtl';
    const potBtn = document.createElement('button');
    potBtn.textContent = '💰 העבר קופה';
    potBtn.style.cssText = 'flex:1;padding:14px 24px;border-radius:14px;border:none;'
      +'background:#c8a96e;color:#0a0d14;font-size:15px;font-weight:900;cursor:pointer;'
      +'box-shadow:0 4px 16px rgba(0,0,0,0.5)';
    potBtn.onclick = ()=>{ S._showdownMode=false; showShowdownPanel(); };
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'ביטול';
    cancelBtn.style.cssText = 'padding:14px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.15);'
      +'background:rgba(255,255,255,0.05);color:#e2ddd4;font-size:13px;cursor:pointer';
    cancelBtn.onclick = ()=>{ S._showdownMode=false; renderSeats(); };
    bar.appendChild(potBtn);
    bar.appendChild(cancelBtn);
    // הצג מתחת לשולחן — לא בתוכו
    const tableView = document.getElementById('table-view');
    if(tableView) tableView.appendChild(bar);
    else{ const sc=document.getElementById('seats-container'); if(sc) sc.appendChild(bar); }
  }

  // Render floating bet chips
  let betsContainer = document.getElementById('bet-chips-container');
  if(!betsContainer){
    betsContainer = document.createElement('div');
    betsContainer.id = 'bet-chips-container';
    betsContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:15;overflow:visible';
    const tableWrap = document.getElementById('table-wrap');
    if(tableWrap) tableWrap.appendChild(betsContainer);
    else cont.parentElement.appendChild(betsContainer);
  }
  betsContainer.innerHTML = '';
  swp.forEach(s=>{
    if(!s.playerId) return;
    const seat = S.seats.find(st=>st.seatIdx===s.seatIdx)||{};
    const actions = seat.actions||[];
    // Sum total invested in current street
    const boardCount2 = S.board.filter(Boolean).length;
    const curSt = boardCount2===0?'פרה-פלופ':boardCount2<=3?'פלופ':boardCount2===4?'טרן':'ריבר';
    const stActs = actions.filter(a=>a.street===curSt);
    const totalInvested = stActs.filter(a=>a.type!=='Fold'&&a.type!=='Check').reduce((sum,a)=>sum+(Number(a.amount)||0),0);
    if(totalInvested===0) return;
    const lastNonPass = stActs.filter(a=>a.type!=='Fold'&&a.type!=='Check').slice(-1)[0];
    // Get seat position using getSeatXY
    const {x:sx, y:sy} = getSeatXY(s.seatIdx, S.tableSize);
    const cx=50, cy=50;
    const dx = cx - sx, dy = cy - sy;
    const len = Math.sqrt(dx*dx+dy*dy)||1;
    const bx = sx + (dx/len)*20;
    const by = sy + (dy/len)*20;
    const col = lastNonPass?.type==='SB'?'#7b5cb8':lastNonPass?.type==='BB'?'#c05a4a':'#a07830';
    const chip = document.createElement('div');
    chip.style.cssText = 'position:absolute;left:'+bx+'%;top:'+by+'%;transform:translate(-50%,-50%);background:'+col+';border:1px solid rgba(255,255,255,0.25);border-radius:8px;padding:1px 5px;font-size:7.5px;font-weight:900;color:#fff;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.6)';
    chip.textContent = totalInvested.toLocaleString();
    betsContainer.appendChild(chip);
  });
}

function renderBoard(){
  const cont=document.getElementById('board-cards'); cont.innerHTML='';
  const labels=['F1','F2','F3','T','R'];
  const sw=Math.min(Math.max(28,Math.floor((document.getElementById('table-wrap').offsetWidth||300)*0.062)),36);
  S.board.forEach((card,i)=>{
    const wrap=document.createElement('div'); wrap.style='text-align:center';
    const btn=document.createElement('button');
    btn.className='board-card-btn'+(card?' has-card':'');
    btn.style=`width:${sw}px;height:${Math.round(sw*1.4)}px`;
    btn.onclick=()=>{
if(i===3&&!S.board[2]){notify('צריך פלופ קודם');return;}
      if(i===4&&!S.board[3]){notify('צריך טרן קודם');return;}
      // חסום רק אם יש שחקן שעדיין יכול לפעול (לא all-in)
      const activeNonAllin = S.seats.filter(s=>s.playerId&&!s.folded&&!s.allin&&(s.stack||0)>0);
      if(S.btnLocked && S.currentActor!==null && !S.bettingClosed && activeNonAllin.length>0){notify('סיים את סיבוב ההימורים קודם');return;}
      openCP(`board${i}`);
    };
    btn.innerHTML=card
      ?`<span style="font-size:${Math.round(sw*.38)}px;font-weight:900;color:${SC[card.suit]};line-height:1.1">${card.rank}</span><span style="font-size:${Math.round(sw*.28)}px;color:${SC[card.suit]};line-height:1">${card.suit}</span>`
      :`<span style="font-size:${Math.round(sw*.45)}px;color:rgba(255,255,255,0.12)">+</span>`;
    const lbl=document.createElement('div'); lbl.className='card-label'; lbl.textContent=labels[i];
    wrap.appendChild(btn); wrap.appendChild(lbl); cont.appendChild(wrap);
  });
  if(S.board.some(Boolean)){
    const clr=document.createElement('button');
    clr.style='background:none;border:none;color:rgba(255,255,255,0.2);font-size:9px;cursor:pointer;padding:2px';
    clr.textContent='✕ נקה'; clr.onclick=()=>{if(isAdmin()){S.board=[null,null,null,null,null];persist();renderBoard();}};
    cont.appendChild(clr);
  }
  // Pot
  const pot=calcPot();
  const pd=document.getElementById('pot-display');
  if(pot>0){ pd.style.display='block'; pd.textContent=`Pot: ₪${pot.toLocaleString()}`; }
  else pd.style.display='none';
}
function renderBlindsBtn(){
  const b=getBlinds();
  const fmt=n=>n>=1000?(n/1000)+'K':n;
  document.getElementById('blinds-btn').textContent=`${fmt(b.sb)}/${fmt(b.bb)}${b.ante?` ante ${fmt(b.ante)}`:''}`;
}

// When returning to app - recalculate blind timer from timestamp
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'visible' && S.blindTimer.running && S.blindTimer.startedAt){
    const elapsed = Math.floor((Date.now() - S.blindTimer.startedAt)/1000);
    if(isAdmin()){
      let timeLeft = elapsed;
      while(timeLeft > 0 && S.blindLevel < BLIND_LEVELS.length - 1){
        const dur = getLevelDuration(S.blindLevel);
        const levelRemaining = S.blindTimer.pausedAt || dur;
        if(timeLeft >= levelRemaining){
          timeLeft -= levelRemaining;
          S.blindLevel++;
          S.blindTimer.pausedAt = getLevelDuration(S.blindLevel);
          notify('עלית לרמה '+(S.blindLevel+1));
        } else { break; }
      }
      S.blindTimer.secondsLeft = Math.max(0, (S.blindTimer.pausedAt||getLevelDuration(S.blindLevel)) - timeLeft);
      S.blindTimer.startedAt = Date.now();
      S.blindTimer.pausedAt = S.blindTimer.secondsLeft;
      persist(); syncToSheets(true);
    }
    updateTimerDisplay();
    clearInterval(_timerInterval); _timerInterval = null;
    startBlindTimer();
  }
});
