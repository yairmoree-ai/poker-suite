// ── Monte Carlo Equity (מקומי, ללא שרת) ───────────────────
const _MC_RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const _MC_SUITS = ['♠','♥','♦','♣'];
const _MC_RANK_VAL = Object.fromEntries(_MC_RANKS.map((r,i)=>[r,i]));

function _fullDeck(){ const d=[]; _MC_RANKS.forEach(r=>_MC_SUITS.forEach(s=>d.push({rank:r,suit:s}))); return d; }
function _cardKey(c){ return c.rank+c.suit; }
// ממיר תו נוטציה בודד ('T' מתוך מחרוזות range כמו "ATs") לדרגת הקלף האמיתית ('10')
// שבה משתמשים evaluateHand ושאר האפליקציה. קריטי: בלעדיו, קלפי עשר שנוצרים בתוך
// סימולציות Monte Carlo (מטווחים) מוערכים כ"חסרי ערך" (rank 0) על ידי evaluateHand,
// כי היא לא מזהה 'T' — רק '10'.
function _notationRankToCard(r){ return r==='T' ? '10' : r; }
function _handRankMC(cards){
  // מחזיר ערך השוואה (מספר גדול = יד טובה יותר)
  // שימוש ב-evaluateHand שכבר קיים ב-game.js
  try {
    const h = evaluateHand(cards);
    return h.rank * 1e10 + (h.tb||[]).reduce((a,v,i)=>a+v*Math.pow(15,4-i),0);
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
  const baseBoard = boardCards.filter(Boolean);
  const boardNeeded = 5 - baseBoard.length;
  const need = boardNeeded + numOpponents*2; // כמה קלפים באמת נשלפים בכל איטרציה

  let wins=0, ties=0;

  for(let i=0; i<iterations; i++){
    // ערבוב חלקי — רק את הקלפים שנשלפים בפועל (מסוף החפיסה), במקום ערבוב מלא
    for(let j=deck.length-1; j>=deck.length-need; j--){
      const k=Math.floor(Math.random()*(j+1));
      [deck[j],deck[k]]=[deck[k],deck[j]];
    }
    let idx=deck.length-1;
    // השלמת בורד
    const runBoard = baseBoard.slice();
    for(let b=0;b<boardNeeded;b++) runBoard.push(deck[idx--]);

    // קלפים ליריבים
    const oppHands=[];
    for(let o=0;o<numOpponents;o++) oppHands.push([deck[idx--],deck[idx--]]);

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

// ── טווחי GTO/סולבר (_RANGES ופונקציות העזר) — עברו ל-ranges.js ──

// Monte Carlo מאוחד: כל יריב יכול להיות "ידוע" (קלפים קבועים) או "עם טווח"
// (מערך קומבינציות אפשריות; null = ללא הגבלה, קלף אקראי מהחפיסה). מטפל בהתנגשויות
// בין קלפי יריבים שונים באותה איטרציה.
// heroCombos (אופציונלי): אם holeCards ריק ו-heroCombos סופק — גם היד של השחקן
// הפועל נדגמת מתוך טווח בכל איטרציה (חישוב "טווח מול טווח").
function monteCarloEquityMulti(holeCards, boardCards, knownOppHands, oppCombosLists, iterations=8000, heroCombos=null){
  const heroFixed = holeCards && holeCards.filter(Boolean).length === 2;
  if(!heroFixed && !(heroCombos && heroCombos.length)) return null;
  const baseBoard = boardCards.filter(Boolean);
  const boardNeeded = 5 - baseBoard.length;
  const staticKnown = [...(heroFixed?holeCards:[]), ...baseBoard, ...knownOppHands.flat()].filter(Boolean);
  const staticKeys = new Set(staticKnown.map(_cardKey));
  const fullDeck = _fullDeck();

  let wins=0, ties=0, done=0, guard=0;
  while(done < iterations && guard < iterations*3){
    guard++;
    const usedKeys = new Set(staticKeys);

    // אם היד שלנו מגיעה מטווח — דוגמים אותה ראשונה בכל איטרציה
    let heroHand = heroFixed ? holeCards : null;
    if(!heroFixed){
      for(let attempt=0; attempt<25 && !heroHand; attempt++){
        const cand = heroCombos[Math.floor(Math.random()*heroCombos.length)];
        if(cand && !usedKeys.has(_cardKey(cand[0])) && !usedKeys.has(_cardKey(cand[1]))) heroHand=cand;
      }
      if(!heroHand) continue;
      usedKeys.add(_cardKey(heroHand[0])); usedKeys.add(_cardKey(heroHand[1]));
    }

    const rangedHands = [];
    let bail=false;
    for(const combos of oppCombosLists){
      let picked=null;
      if(combos===null || !combos.length){
        const avail = fullDeck.filter(c=>!usedKeys.has(_cardKey(c)));
        if(avail.length<2){ bail=true; break; }
        const i1=Math.floor(Math.random()*avail.length);
        const c1=avail[i1];
        const avail2=avail.filter((c,ci)=>ci!==i1);
        const c2=avail2[Math.floor(Math.random()*avail2.length)];
        picked=[c1,c2];
      } else {
        for(let attempt=0; attempt<25 && !picked; attempt++){
          const cand = combos[Math.floor(Math.random()*combos.length)];
          if(cand && !usedKeys.has(_cardKey(cand[0])) && !usedKeys.has(_cardKey(cand[1]))) picked=cand;
        }
        if(!picked){ bail=true; break; } // הטווח הזה "נחסם" לגמרי באיטרציה הזו — דלג ונסה שוב
      }
      rangedHands.push(picked);
      usedKeys.add(_cardKey(picked[0])); usedKeys.add(_cardKey(picked[1]));
    }
    if(bail) continue;

    const deck = fullDeck.filter(c=>!usedKeys.has(_cardKey(c)));
    for(let j=deck.length-1; j>=deck.length-boardNeeded && j>0; j--){
      const k=Math.floor(Math.random()*(j+1));
      [deck[j],deck[k]]=[deck[k],deck[j]];
    }
    const runBoard = baseBoard.slice();
    let idx=deck.length-1;
    for(let b=0;b<boardNeeded;b++) runBoard.push(deck[idx--]);

    const oppHands = [...knownOppHands, ...rangedHands];
    const myVal = _handRankMC([...heroHand,...runBoard]);
    let best=myVal, iWin=true, iTie=false;
    for(const oh of oppHands){
      const ov=_handRankMC([...oh,...runBoard]);
      if(ov>best){ iWin=false; iTie=false; break; }
      if(ov===best){ iWin=false; iTie=true; }
    }
    if(iWin) wins++;
    else if(iTie) ties++;
    done++;
  }
  if(done===0) return null;
  return ((wins + ties*0.5) / done * 100);
}

// Monte Carlo מול קלפי יריב/ים ידועים בפועל (שהוזנו על המושב) +
// יריבים נוספים ללא קלפים ידועים (מוחלפים בידיים אקראיות)
function monteCarloEquityVsKnown(holeCards, boardCards, knownOppHands, numRandomOpponents, iterations=8000){
  if(!holeCards || holeCards.filter(Boolean).length < 2) return null;

  const baseBoard = boardCards.filter(Boolean);
  const known = [...holeCards, ...baseBoard, ...knownOppHands.flat()].filter(Boolean);
  const knownKeys = new Set(known.map(_cardKey));
  const deck = _fullDeck().filter(c=>!knownKeys.has(_cardKey(c)));
  const boardNeeded = 5 - baseBoard.length;
  const need = boardNeeded + numRandomOpponents*2;

  let wins=0, ties=0;

  for(let i=0; i<iterations; i++){
    for(let j=deck.length-1; j>=deck.length-need; j--){
      const k=Math.floor(Math.random()*(j+1));
      [deck[j],deck[k]]=[deck[k],deck[j]];
    }
    let idx=deck.length-1;
    const runBoard = baseBoard.slice();
    for(let b=0;b<boardNeeded;b++) runBoard.push(deck[idx--]);

    const oppHands = knownOppHands.map(h=>h.slice());
    for(let o=0;o<numRandomOpponents;o++) oppHands.push([deck[idx--],deck[idx--]]);

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

// מחשב עבור יד היסטורית (שמורה) — לכל שחקן שקלפיו ידועים (הוזנו בפועל, לא משנה מי),
// ולכל סטריט שבו הוא עמד מול הימור בפועל — מה היה ה-pot, ה-call, ה-break-even וה-equity
// שלו באותו רגע. לא תלוי בכלל אם המנהל/ת המחובר/ת נכח/ה באותה יד או ישב/ה בשולחן.
// זו הערכה בדיעבד: טווח היריב מבוסס על העמדה+הפעולה שביצע ביד + התגית הנוכחית שלו
// (לא בהכרח זהה למה שהיה ידוע בזמן אמת), אלא אם קלפיו ידועים בפועל (showdown).
function computeHistoricalStreetOdds(h){
  const bbNum = parseFloat((h.blinds||'').split('/')[1]) || 0;
  const streetsOrder = ['פרה-פלופ','פלופ','טורן','ריבר'];
  const boardFull = (h.board||[]).filter(Boolean);
  const boardAtStreet = {
    'פרה-פלופ': [],
    'פלופ': boardFull.slice(0,3),
    'טורן': boardFull.slice(0,4),
    'ריבר': boardFull.slice(0,5)
  };

  const folded = new Set();
  const results = [];
  const tableSizeApprox = (h.seats||[]).length;

  streetsOrder.forEach(street=>{
    const acts = [];
    (h.seats||[]).forEach(s=>{
      (s.actions||[]).filter(a=>a.street===street && !(street==='פרה-פלופ' && (a.type==='SB'||a.type==='BB'))).forEach(a=>{
        acts.push({...a, seatIdx:s.seatIdx});
      });
    });
    acts.sort((a,b)=>(a.idx??999)-(b.idx??999));

    // הפוט לפני הסטריט הזה: בליינדים + כל מה שהושקע בסטריטים קודמים
    let potBefore = 0;
    (h.seats||[]).forEach(s=>{
      (s.actions||[]).forEach(a=>{
        const curIdx = streetsOrder.indexOf(street);
        const aIdx = streetsOrder.indexOf(a.street);
        if(a.street==='פרה-פלופ' && (a.type==='SB'||a.type==='BB')) potBefore += Number(a.amount)||0;
        else if(aIdx>=0 && aIdx<curIdx) potBefore += Number(a.amount)||0;
      });
    });

    const investedThisStreet = {};
    let lastBet = 0;
    const recordedSeatsThisStreet = new Set();
    const actedSeatsThisStreet = new Set(); // מי כבר פעל בפועל בסטריט הזה עד כה (לא כולל בליינדים)

    for(const a of acts){
      const already = investedThisStreet[a.seatIdx]||0;
      const actingSeat = (h.seats||[]).find(s=>s.seatIdx===a.seatIdx);
      const actingCards = actingSeat ? (actingSeat.cards||[]).filter(Boolean) : [];

      if(actingCards.length===2 && !recordedSeatsThisStreet.has(a.seatIdx)){
        const callAmt = lastBet - already;
        if(callAmt > 0 && ['Call','Raise','3bet','4bet','All-in','Fold'].includes(a.type)){
          recordedSeatsThisStreet.add(a.seatIdx);
          const potNow = potBefore + Object.values(investedThisStreet).reduce((s,v)=>s+v,0);
          // רק יריבים שכבר פעלו בפועל בסטריט הזה (לא כל מי שעדיין לא קיפל) —
          // מי שתורו טרם הגיע לא נחשב "יריב עם טווח" באותו רגע
          const oppSeatsH = (h.seats||[]).filter(s=>s.playerId && s.seatIdx!==a.seatIdx && !folded.has(s.seatIdx) && actedSeatsThisStreet.has(s.seatIdx));
          if(oppSeatsH.length){
            const knownOppHands = oppSeatsH.filter(s=>(s.cards||[]).filter(Boolean).length===2).map(s=>s.cards.filter(Boolean));
            const unknownOppSeatsH = oppSeatsH.filter(s=>(s.cards||[]).filter(Boolean).length!==2);
            const boardNow = boardAtStreet[street];
            const deadKeys = new Set([...actingCards, ...boardNow, ...knownOppHands.flat()].filter(Boolean).map(_cardKey));
            const myStack = actingSeat.stack||0;
            const minOppStack = Math.min(...oppSeatsH.map(s=>s.stack||0));
            const effBB = bbNum>0 ? Math.min(myStack, minOppStack)/bbNum : 100;
            const depth = _depthFromBB(effBB);
            const combosLists = unknownOppSeatsH.map(s=>{
              const actionCat = _inferPreflopActionCat(s, s.pos);
              const baseRangeStr = s.pos ? _getRangeStrForDepth(tableSizeApprox, s.pos, actionCat, depth) : '';
              const player = (S.playerLib||[]).find(p=>p.id===s.playerId);
              const playerType = player?.playerType||null;
              const adjRangeStr = _adjustRangeForType(baseRangeStr, playerType, actionCat);
              const combos = _rangeStrToCombos(adjRangeStr, deadKeys);
              return combos.length ? combos : null;
            });
            const equityPct = monteCarloEquityMulti(actingCards, boardNow, knownOppHands, combosLists, 8000);
            const totalPot = potNow + callAmt;
            const breakEven = totalPot>0 ? (callAmt/totalPot*100) : 0;
            const ratio = callAmt>0 ? potNow/callAmt : 0;
            results.push({
              seatIdx: a.seatIdx, street, pot: potNow, callAmt, breakEven, ratio, equityPct,
              hasKnownOpp: knownOppHands.length>0,
              myAction: a.type
            });
          }
        }
      }
      investedThisStreet[a.seatIdx] = already + (Number(a.amount)||0);
      if(investedThisStreet[a.seatIdx] > lastBet) lastBet = investedThisStreet[a.seatIdx];
      if(a.type==='Fold') folded.add(a.seatIdx);
      actedSeatsThisStreet.add(a.seatIdx);
    }
  });

  return results;
}

// ── עורך טווח ידני per-player (גריד 13×13) ─────────────────────
// נשמר ב-S.playerRanges[playerId], מתמיד עד שינוי ידני, דורס את הזיהוי האוטומטי
// לאותו שחקן בלבד. _rangeEditPid/_rangeEditSel הם מצב זמן-ריצה של העורך בלבד.
let _rangeEditPid = null;      // playerId שנערך כרגע (null = עורך סגור)
let _rangeEditSel = new Set(); // בחירת הידיים הנוכחית בעורך (טרם נשמרה)
// עוקב אחרי הערך האוטומטי האחרון שסונכרנו ממנו (מחרוזת), כדי לדעת אם מותר
// לרענן בשקט בלי למחוק עריכה ידנית שהמשתמש כבר התחיל. null = לא במעקב-רענון
// בכלל (יש טווח ידני שמור, או שאנחנו בתצוגת לימפים) — ראו _maybeRefreshAutoRangeEdit.
let _rangeEditLastAutoStr = null;
// אילו ידיים בבחירה הנוכחית הגיעו ספציפית מחלק ה-3bet/4bet (לא ה-call) של איחוד
// טווח-ההמשך — לצורך צביעה שונה בגריד בלבד (הבחנה חזותית), לא משפיע על מה נבחר
// בפועל. ריק כברירת מחדל, ותמיד ריק כשמקור הזרעה הוא טווח ידני (אין שם סיווג
// לפי-קטגוריה כזה בכלל — טווח ידני הוא רשימה שטוחה).
let _rangeEdit3betHands = new Set();
let _rangeEditOriginal3bet = new Set(); // גיבוי של _rangeEdit3betHands מרגע פתיחת העורך — כדי ש-'original' ישחזר נכון אחרי ביקור ב-'auto'/'limp'
// true כשהטווח הנוכחי הגיע מאיחוד call∪3bet/4bet ידוע (ולכן יודעים בוודאות שכל
// יד נבחרת שאינה ב-_rangeEdit3betHands היא ספציפית call, לא רק "לא ידוע") —
// UTG/RFI רגיל, טווח ידני, ותצוגת לימפים לא נחשבים "הקשר איחוד" ונופלים לצביעה
// לפי סוג-יד (זוג/סוטד) כברירת מחדל, כי שם אין בכלל הבחנה call-מול-3bet.
const _UNION_ACTION_CATS = new Set(['call','facing-open','facing-3bet']);
let _rangeEditUnionContext = false;
let _rangeEditOriginalUnionContext = false;
const _sortedHandsKey = str => (str? str.split(',').map(x=>x.trim()).filter(Boolean):[]).sort().join(',');

const _GRID_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

function _openRangeEditor(pid){
  _rangeEditPid = pid;
  // נקודת פתיחה: הטווח הידני השמור אם קיים; אחרת הטווח האוטומטי של המושב הפתוח
  // (עמדה/פעולה/עומק/סוג שחקן) — כך שהעריכה היא כוונון-עדין ולא בחירה מאפס.
  // _rangeEditOriginal מתעד את זה בדיוק (מחרוזת, לא Set) ולא משתנה כל עוד העורך
  // פתוח — זו נקודת "המקורי" שחוזרים אליה, גם אם הקצית טווח ידני מותאם-אישית
  // (לא רק הטווח התיאורטי הגנרי — ראו הבחנה מול 'auto' למטה).
  const existing = S.playerRanges?.[pid] || '';
  const auto = (typeof activeSeat==='number' && activeSeat!==null) ? _getAutoRangeForSeat(activeSeat) : {rangeStr:'', aggressiveHands:''};
  const seed = existing || auto.rangeStr;
  _rangeEditOriginal = seed;
  _rangeEditSel = new Set(seed ? seed.split(',').map(x=>x.trim()).filter(Boolean) : []);
  _rangeEdit3betHands = existing ? new Set() : _parseRangeToSet(auto.aggressiveHands||'');
  _rangeEditOriginal3bet = new Set(_rangeEdit3betHands);
  _rangeEditUnionContext = !existing && _UNION_ACTION_CATS.has(auto.actionCat);
  _rangeEditOriginalUnionContext = _rangeEditUnionContext;
  _rangeEditActiveView = 'original';
  // טווח ידני קיים → קפוא לגמרי בכוונה, לא עוקבים אחרי שינויי מצב-שולחן.
  _rangeEditLastAutoStr = existing ? null : seed;
  renderSeatPanel();
}
// קיצור: פותח את עורך הטווח ומיד מציג רק את הלימפים האמפיריים הידועים (במקום את
// הטווח האוטומטי/הידני הרגיל) — לכניסה מהירה מכפתור "🃏 X לימפים ידועים" בפאנל.
// גם מכאן אפשר לעבור חזרה ל"מקורי" בכל רגע דרך הטאב בעורך עצמו — לכן חייבים לחשב
// ולתעד את _rangeEditOriginal בדיוק כמו ב-_openRangeEditor, לא לדלג על זה.
function _openRangeEditorShowLimps(pid){
  _rangeEditPid = pid;
  const existing = S.playerRanges?.[pid] || '';
  _rangeEditOriginal = existing || (typeof activeSeat==='number' && activeSeat!==null ? _getAutoRangeForSeat(activeSeat).rangeStr : '');
  const limpTally = _getEmpiricalLimpHands(pid);
  _rangeEditSel = new Set(Object.keys(limpTally));
  _rangeEdit3betHands = new Set(); // תצוגת לימפים לא רלוונטית ל-3bet מעצם ההגדרה
  _rangeEditUnionContext = false;
  _rangeEditActiveView = 'limp';
  _rangeEditLastAutoStr = null; // תצוגת לימפים = דריסה מפורשת, לא עוקבים אחרי מצב-שולחן
  renderSeatPanel();
}
function _closeRangeEditor(){
  _rangeEditPid = null;
  _rangeEditSel = new Set();
  _rangeEdit3betHands = new Set();
  _rangeEditUnionContext = false;
  _rangeEditActiveView = null;
  _rangeEditOriginal = '';
  renderSeatPanel();
}
function _toggleRangeCell(hand){
  if(_rangeEditSel.has(hand)) _rangeEditSel.delete(hand);
  else _rangeEditSel.add(hand);
  _rangeEditActiveView = null; // עריכה ידנית של תא בודד = כבר לא "בסיס" טהור ולא "לימפים" טהור
  _rangeEditorRefresh(true);
}
function _rangeEditorApplyTopPct(pct){
  const rs = _topPercentRange(Number(pct));
  _rangeEditSel = new Set(rs ? rs.split(',') : []);
  _rangeEditActiveView = null; // סליידר = בחירה חדשה, לא "בסיס" ולא "לימפים"
  // בזמן גרירת הסליידר — עדכון ממוקד בלבד, בלי לבנות מחדש את הסליידר עצמו
  // (בנייה מחדש באמצע גרירה שוברת את המחווה וגורמת לתחושת "קפיצות")
  _rangeEditorRefresh(false);
}
// מעדכן רק את הגריד והמונה (ואופציונלית את מיקום הסליידר) בלי לבנות את כל הפאנל.
// updateSlider=false בזמן שהסליידר עצמו נגרר (אסור "להילחם" בגרירה של המשתמש).
function _rangeEditorRefresh(updateSlider){
  const grid = document.getElementById('range-editor-grid');
  const count = document.getElementById('range-editor-count');
  if(!grid || !count){ renderSeatPanel(); return; } // fallback אם הפאנל טרם צויר
  grid.innerHTML = _rangeEditorGridHtml();
  const c = _rangeEditorSelCombos();
  count.textContent = c + ' combos · ' + (c/1326*100).toFixed(1) + '%';
  if(updateSlider){
    const slider = document.getElementById('range-editor-slider');
    if(slider) slider.value = Math.round(c/1326*100);
  }
}
function _saveRangeEditor(){
  if(!_rangeEditPid) return;
  if(!S.playerRanges) S.playerRanges = {};
  const arr = [..._rangeEditSel];
  if(arr.length){
    // שומרים בסדר הדירוג הקבוע (קריא יותר מסדר הקלקה אקראי)
    const orderIdx = Object.fromEntries(_HAND_RANKING.map((h,i)=>[h,i]));
    arr.sort((a,b)=>(orderIdx[a]??999)-(orderIdx[b]??999));
    S.playerRanges[_rangeEditPid] = arr.join(',');
  } else {
    delete S.playerRanges[_rangeEditPid]; // בחירה ריקה = כמו "חזרה לאוטומטי"
  }
  persist();
  window._eqCache = null; // הטווח השתנה — חובה לחשב equity מחדש
  _closeRangeEditor();
}
function _clearPlayerRange(pid){
  if(S.playerRanges) delete S.playerRanges[pid];
  persist();
  window._eqCache = null;
  _closeRangeEditor();
}
function _rangeEditorSelCombos(){
  let n=0;
  _rangeEditSel.forEach(h=>{ n += h.length===2 ? 6 : (h.endsWith('s') ? 4 : 12); });
  return n;
}
// בונה את ה-HTML של הגריד 13×13: אלכסון=זוגות, מעל=סוטד, מתחת=אופסוט.
// אם לשחקן הנערך יש לימפים אמפיריים ידועים (S.handLog) — מסומנים במסגרת סגולה
// נוספת מעל כל צביעת בחירה/אי-בחירה רגילה (מידע בלבד, לא משפיע על הבחירה עצמה).
function _rangeEditorGridHtml(){
  const limpTally = _rangeEditPid ? _getEmpiricalLimpHands(_rangeEditPid) : {};
  let rows='';
  for(let i=0;i<13;i++){
    let cells='';
    for(let j=0;j<13;j++){
      const r1=_GRID_RANKS[i], r2=_GRID_RANKS[j];
      const hand = i===j ? r1+r2 : (i<j ? r1+r2+'s' : r2+r1+'o');
      const on = _rangeEditSel.has(hand);
      const isPair = i===j;
      const is3bet = on && _rangeEdit3betHands.has(hand);
      // כשידוע שהטווח בא מאיחוד call∪3bet/4bet (_rangeEditUnionContext), הצבע
      // לפי קטגוריה (call=כחול / 3bet=אדום) גובר תמיד על ההבחנה זוג-מול-סוטד —
      // גם AA שהוא ספציפית call יראה כחול, לא זהב, כי עכשיו יודעים בוודאות
      // מאיזה חלק של הטווח הוא הגיע. זהב לזוגות נשאר רק כברירת מחדל כשאין בכלל
      // מידע קטגוריה (RFI רגיל, טווח ידני, תצוגת לימפים).
      const bg = on
        ? (is3bet ? '#e07b6a' : (_rangeEditUnionContext ? '#5b9bd5' : (isPair?'#c8a96e':'#5b9bd5')))
        : 'rgba(255,255,255,0.04)';
      const fg = on ? '#0a0d14' : (isPair?'#8a8799':'#8a8799');
      const limpCount = limpTally[hand]||0;
      const border = limpCount ? '2px solid #b47eea' : '1px solid transparent';
      cells += `<div onclick="_toggleRangeCell('${hand}')" title="${limpCount?limpCount+' לימפ/ים ידועים':(is3bet?'3bet/4bet':'')}" style="flex:1;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:${bg};color:${fg};font-size:6.5px;font-weight:800;border-radius:2px;border:${border};box-sizing:border-box;cursor:pointer;user-select:none;min-width:0;overflow:hidden">${hand}</div>`;
    }
    rows += `<div style="display:flex;gap:1px">${cells}</div>`;
  }
  return `<div style="display:flex;flex-direction:column;gap:1px;direction:ltr">${rows}</div>`;
}

// מעבר בין שלוש תצוגות בעורך הטווח:
//  'original' — בדיוק מה שהיה שמור לשחקן ברגע פתיחת העורך (טווח ידני מותאם-אישית
//               שהקצית בעבר, אם היה כזה; אחרת הטווח האוטומטי). זו נקודת "חזרה
//               אחורה" האמיתית — לא מאבדים הקצאה ידנית קודמת.
//  'auto'     — הטווח התיאורטי הגנרי (עמדה/פעולה/עומק/סוג שחקן), מחושב תמיד מחדש,
//               לצורך השוואה בלבד — לא בהכרח זהה ל-'original' אם הוקצה טווח ידני.
//  'limp'     — הסט האמפירי שנצפה בהיסטוריית הידיים.
// כל מעבר מחליף את הבחירה הנוכחית בעורך לגמרי (לא משמר עריכות ידניות שנעשו על
// התצוגה הקודמת). שום דבר לא נשמר עד לחיצה על 💾 שמור.
let _rangeEditActiveView = null; // 'original' | 'auto' | 'limp' | null (null = נערך ידנית מאז המעבר האחרון)
let _rangeEditOriginal = ''; // מחרוזת טווח — מוקפא בפתיחת העורך, לא משתנה עד סגירה
function _setRangeEditorView(view){
  if(!_rangeEditPid) return;
  if(view==='original'){
    _rangeEditSel = new Set(_rangeEditOriginal ? _rangeEditOriginal.split(',').map(x=>x.trim()).filter(Boolean) : []);
    _rangeEdit3betHands = new Set(_rangeEditOriginal3bet);
    _rangeEditUnionContext = _rangeEditOriginalUnionContext;
    _rangeEditLastAutoStr = S.playerRanges?.[_rangeEditPid] ? null : _rangeEditOriginal;
  } else if(view==='auto'){
    const seatIdx = typeof activeSeat==='number' ? activeSeat : null;
    const auto = seatIdx!==null ? _getAutoRangeForSeat(seatIdx) : {rangeStr:'', aggressiveHands:'', actionCat:''};
    _rangeEditSel = new Set(auto.rangeStr ? auto.rangeStr.split(',').filter(Boolean) : []);
    _rangeEdit3betHands = _parseRangeToSet(auto.aggressiveHands||'');
    _rangeEditUnionContext = _UNION_ACTION_CATS.has(auto.actionCat);
    _rangeEditLastAutoStr = auto.rangeStr || '';
  } else if(view==='limp'){
    const limpTally = _getEmpiricalLimpHands(_rangeEditPid);
    _rangeEditSel = new Set(Object.keys(limpTally));
    _rangeEdit3betHands = new Set();
    _rangeEditUnionContext = false;
    _rangeEditLastAutoStr = null;
  }
  _rangeEditActiveView = view;
  _rangeEditorRefresh(true);
}
// נשמר לשם תאימות לאחור (נקרא גם מ-_openRangeEditorShowLimps) — alias ל-view='limp'
function _isolateLimpRange(){ _setRangeEditorView('limp'); }
// כפתור יחיד שמחליף בין 'original' ל-'limp' (במקום שתי כרטיסיות נפרדות) — הלייבל
// שלו משתנה לפי המצב הנוכחי: אם כרגע על לימפים, הכפתור מציע לחזור למקורי, ולהפך.
// אם אין בכלל נתוני לימפ לשחקן — הכפתור תמיד רק חוזר ל'original' (לא "מחליף" לריק).
function _toggleOriginalLimpView(){
  if(_rangeEditActiveView==='limp'){ _setRangeEditorView('original'); return; }
  const hasLimpData = _rangeEditPid && Object.keys(_getEmpiricalLimpHands(_rangeEditPid)).length>0;
  _setRangeEditorView(hasLimpData ? 'limp' : 'original');
}

// אם העורך פתוח במצב אוטומטי טהור (לא לימפים, לא נערך ידנית) ומצב השולחן
// השתנה מאז שנטען (למשל: מישהו פתח, או עשה 3bet, בזמן שהעורך כבר היה פתוח)
// — מרעננים בשקט, בלי לצאת ולהיכנס. לא נוגעים אם המשתמש כבר לחץ על תא בעצמו
// (או-אז _rangeEditActiveView כבר null, וגם ה-Set לא תואם ל-_rangeEditLastAutoStr
// כבדיקת ביטחון נוספת) — כך שלעולם לא נמחקת עריכה ידנית באמצע.
function _maybeRefreshAutoRangeEdit(){
  if(_rangeEditLastAutoStr===null) return; // טווח ידני שמור, או תצוגת לימפים — קפוא בכוונה
  if(_rangeEditActiveView!=='original' && _rangeEditActiveView!=='auto') return;
  if(typeof activeSeat!=='number' || activeSeat===null) return;
  if(_sortedHandsKey([..._rangeEditSel].join(',')) !== _sortedHandsKey(_rangeEditLastAutoStr)) return; // כבר נערך, לא נוגעים
  const fresh = _getAutoRangeForSeat(activeSeat);
  if(_sortedHandsKey(fresh.rangeStr||'') === _sortedHandsKey(_rangeEditLastAutoStr)) return; // לא השתנה בפועל
  _rangeEditOriginal = fresh.rangeStr||'';
  _rangeEditSel = new Set(fresh.rangeStr ? fresh.rangeStr.split(',').map(x=>x.trim()).filter(Boolean) : []);
  _rangeEdit3betHands = _parseRangeToSet(fresh.aggressiveHands||'');
  _rangeEditOriginal3bet = new Set(_rangeEdit3betHands);
  _rangeEditUnionContext = _UNION_ACTION_CATS.has(fresh.actionCat);
  _rangeEditOriginalUnionContext = _rangeEditUnionContext;
  _rangeEditLastAutoStr = fresh.rangeStr||'';
}

// מייצר את בלוק ה-HTML המלא של עורך הטווח (גריד+סליידר+כפתורים) — לשימוש בתוך
// פאנל המושב. _rangeEditPid חייב להיות מוגדר לפני הקריאה.
function _rangeEditorPanelHtml(){
  _maybeRefreshAutoRangeEdit();
  const limpTally = _rangeEditPid ? _getEmpiricalLimpHands(_rangeEditPid) : {};
  const limpHands = Object.keys(limpTally);
  const limpTotal = limpHands.reduce((n,h)=>n+limpTally[h],0);
  const tabBtn = (onclick,label,active)=>`<button onclick="${onclick}" style="flex:1;padding:6px 4px;border-radius:7px;border:1px solid ${active?'#c8a96e':'rgba(255,255,255,0.12)'};background:${active?'rgba(200,169,110,0.18)':'rgba(255,255,255,0.03)'};color:${active?'#c8a96e':'#8a8799'};font-weight:800;font-size:9px;cursor:pointer;white-space:nowrap">${label}</button>`;
  const toggleLabel = _rangeEditActiveView==='limp' ? '↩️ המקורי' : (limpHands.length ? `🃏 לימפים (${limpTotal})` : '↩️ המקורי');
  const toggleActive = _rangeEditActiveView==='original' || _rangeEditActiveView==='limp';
  return `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(200,169,110,0.25);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:7px;margin-top:8px">
    <div style="display:flex;gap:5px">
      ${tabBtn("_setRangeEditorView('auto')",'🎯 אוטומטי', _rangeEditActiveView==='auto')}
      ${tabBtn('_toggleOriginalLimpView()', toggleLabel, toggleActive)}
    </div>
    <div style="display:flex;justify-content:flex-end">
      <span id="range-editor-count" style="font-size:9px;color:#8a8799">${_rangeEditorSelCombos()} combos · ${(_rangeEditorSelCombos()/1326*100).toFixed(1)}%</span>
    </div>
    ${limpHands.length ? `
    <div style="background:rgba(180,126,234,0.08);border:1px solid rgba(180,126,234,0.3);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:5px">
      <div style="font-size:10px;color:#b47eea;font-weight:800">🃏 ${limpTotal} לימפ/ים ידועים (מסומן במסגרת סגולה בגריד) · ${limpHands.map(h=>h+(limpTally[h]>1?'×'+limpTally[h]:'')).join(', ')}</div>
      <div style="font-size:9px;color:#8a8799">מבוסס רק על ידיים שבהן הוזנו קלפים (בד"כ showdown) — ייתכן הטיה כלפי ידיים חזקות</div>
    </div>` : ''}
    <div id="range-editor-grid">${_rangeEditorGridHtml()}</div>
    <div style="display:flex;align-items:center;gap:7px;direction:ltr">
      <span style="font-size:10px;color:#8a8799;white-space:nowrap">Top %</span>
      <input id="range-editor-slider" type="range" min="0" max="100" step="1" value="${Math.round(_rangeEditorSelCombos()/1326*100)}"
        style="flex:1;accent-color:#c8a96e;direction:ltr" oninput="_rangeEditorApplyTopPct(this.value)">
    </div>
    <div style="display:flex;gap:6px">
      <button onclick="_saveRangeEditor()" style="flex:1;padding:7px;border-radius:8px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:11px;cursor:pointer">💾 שמור</button>
      <button onclick="_closeRangeEditor()" style="padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#8a8799;font-size:11px;cursor:pointer">ביטול</button>
    </div>
    <div style="font-size:9px;color:#3a3850;text-align:center">שינויים כאן זמניים עד ✕/ביטול — שום דבר לא נשמר עד 💾</div>
  </div>`;
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
          <span style="font-size:9px;color:#8a8799;white-space:nowrap;flex-shrink:0">VPIP <span style="color:#c8a96e;font-weight:800">${hud.vpip}%</span></span>
          <span style="font-size:9px;color:#8a8799;white-space:nowrap;flex-shrink:0">PFR <span style="color:#5b9bd5;font-weight:800">${hud.pfr}%</span></span>
          <span style="font-size:9px;color:#8a8799;white-space:nowrap;flex-shrink:0">3B <span style="color:#7eb8a4;font-weight:800">${hud.bet3}%</span></span>
          <span style="font-size:9px;color:#8a8799;white-space:nowrap;flex-shrink:0">AF <span style="color:#e07b6a;font-weight:800">${afStr}</span></span>
          <span style="font-size:9px;color:#8a8799;white-space:nowrap;flex-shrink:0">W <span style="color:#5fc47a;font-weight:800">${hud.won}%</span></span>
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
  const ratioStr = (ratio%1===0?ratio.toFixed(0):ratio.toFixed(1))+':1';

  const holeCards = (seat.cards||[]).filter(Boolean);
  const boardCards = (S.board||[]).filter(Boolean);
  const rs = S._rangeSelection;

  // שם הסטריט הנוכחי — אותו חישוב בדיוק כמו בשאר הקוד (game.js), לפי כמות קלפי הבורד
  const _curStreetName = boardCards.length===0?'פרה-פלופ':boardCards.length<=3?'פלופ':boardCards.length===4?'טורן':'ריבר';

  // יריבים פעילים: לא קיפלו, לא all-in, לא השחקן הפעיל, ורק מי שבאמת כבר פעל בסטריט הזה
  // (לא רק "עוד לא קיפל") — מי שתורו טרם הגיע לא נחשב "יריב עם טווח" עדיין
  const oppSeats = S.seats.filter(s=>{
    if(!s.playerId || s.folded || s.allin || s.seatIdx===actor) return false;
    return (s.actions||[]).some(a=>a.street===_curStreetName && a.type!=='SB' && a.type!=='BB');
  });
  const swpForEq = assignPos(); // עמדות מעודכנות, לשימוש בזיהוי טווח אוטומטי

  // "מצב פתיחה": אף יריב עדיין לא פעל בפועל (כולל אתה — זו ההחלטה הראשונה בסטריט,
  // ל-callAmt>0 רק כי יש BB לכסות). זה לא באמת "מול טווח" במובן הרגיל — זו שאלת RFI
  // קלאסית, ונבדקת מול טבלת הטווחים הסטטית (_RANGES)/הטווח הידני, לא equity-מול-יריב-
  // שכבר-פעל. שני תתי-מצבים: (1) קלפים ספציפיים מוזנים — בדיקת "בטווח?" + equity של
  // אותה יד מול טווחי-השדה. (2) אין קלפים אבל יש טווח (ידני/אוטומטי) — הטווח כולו
  // מדגם יד בכל איטרציה (heroCombos), בדיוק כמו "טווח מול טווח" הרגיל באפליקציה,
  // רק שהיריבים כאן הם טווחי-המשך היפותטיים במקום יריבים שכבר פעלו בפועל.
  const isOpeningSpot = _curStreetName==='פרה-פלופ' && oppSeats.length===0 && !rs && holeCards.length!==1;
  let openRangeInfo = null;
  if(isOpeningSpot){
    const mySwp = swpForEq.find(x=>x.seatIdx===actor);
    const myPos = mySwp?.pos || '';
    // עומק ה-stack להחלטת פתיחה נגזר מהמחסנית של הפותח עצמו, לא מהמחסנית
    // הכי קצרה בשולחן (_getStackDepth) — שחקן צדדי קצר-יד לא הופך פתיחה עם 124BB לפתיחת push/fold
    const bbNow = (getBlinds&&getBlinds()?.bb)||50;
    const myStackNow = seat?.stack||0;
    const myDepth = _depthFromBB(bbNow>0 ? myStackNow/bbNow : 100);
    // עדיפות: טווח ידני שמור לשחקן הזה (אם קיים) > הטבלה התיאורטית — בדיוק אותו
    // סדר עדיפויות שכבר חל בכל מקום אחר באפליקציה (עורך הטווח, equity חי וכו').
    // בלי זה, טווח ידני ששמרת לא היה משפיע בכלל על הבדיקה הזו הספציפית — באג אמיתי.
    const myManualRange = seat?.playerId ? S.playerRanges?.[seat.playerId] : null;
    const myRangeStr = myManualRange || (myPos ? _getRangeStrForDepth(S.tableSize, myPos, 'RFI', myDepth) : '');

    // equity מול השדה (מידע נוסף, לא מחליף את בדיקת "בטווח"): ה-equity של היד/הטווח
    // מול טווחי-ההמשך ההיפותטיים (call∪3bet, דרך _getContextualRangeInfo עם round=1
    // מדומה — לא נוגעים ב-S.raiseRound האמיתי) של כל שאר השחקנים שעדיין לא פעלו.
    // שונה מ-equity "רגיל": כאן אין יריב קונקרטי שכבר פעל — כולם עדיין "שדה" תיאורטי,
    // בהנחה שאני פותח עכשיו. יוזם השאלה: המשתמש, בעקבות דיון על equity-of-range.
    const allRemainingSeats = S.seats.filter(s=>s.playerId && !s.folded && !s.allin && s.seatIdx!==actor);
    // מיקוד על יריב ספציפי: לחיצה על אחד מהם (ראו UI למטה) מציגה equity מול הטווח שלו
    // *בלבד* במקום מול כל השדה. שונה בכוונה ממנגנון "🎯 Range" הישן (S._rangeSelection) —
    // כאן הבחירה מעוגנת למושב אמיתי בשולחן, ולכן "מרפאת את עצמה" אוטומטית: אם המושב
    // הממוקד כבר לא בין allRemainingSeats (קיפל/עזב/יד חדשה) — חוזרים ל"כל השדה" לבד,
    // בלי שום מצב-תקוע אפשרי (בניגוד לבאג שתוקן עכשיו ברכיב הישן).
    const focusSeatIdx = (typeof S._openingFocusSeat==='number' && allRemainingSeats.some(s=>s.seatIdx===S._openingFocusSeat)) ? S._openingFocusSeat : null;
    const remainingSeats = focusSeatIdx!==null ? allRemainingSeats.filter(s=>s.seatIdx===focusSeatIdx) : allRemainingSeats;
    const focusPlayerId = focusSeatIdx!==null ? S.seats.find(s=>s.seatIdx===focusSeatIdx)?.playerId : null;
    const focusName = focusSeatIdx!==null ? (pName(focusPlayerId)||'יריב') : null;
    // actionCatOverride: משמש רק במצב פוקוס-על-יריב-בודד, כדי לחשב equity מול
    // חלק ה-call או חלק ה-3bet בנפרד (במקום האיחוד call∪3bet הרגיל) — ההפרדה
    // בין הטבלאות עצמן לא משתנה, רק בוחרים כאן איזו מהן לקחת לחישוב הזה.
    const computeFieldCombos = (deadKeysField, actionCatOverride) => {
      if(!remainingSeats.length) return null;
      const fieldStacks = remainingSeats.map(s=>s.stack||0);
      const fieldMinStack = Math.min(myStackNow, ...fieldStacks);
      const fieldDepth = _depthFromBB(bbNow>0 ? fieldMinStack/bbNow : 100);
      let hasUnsplittableManual = false;
      const lists = remainingSeats.map(s=>{
        const pos2 = swpForEq.find(x=>x.seatIdx===s.seatIdx)?.pos || '';
        // rs לא נבדק כאן בכוונה: isOpeningSpot מוגדר תוך דרישה מפורשת ש-!rs
        // (ראו למעלה), כך שבהקשר הזה rs תמיד null ממילא — התלות בסדר העדיפויות
        // המשותף (_resolveOpponentRangeStr) מדלגת עליו אוטומטית באותו אופן.
        const {rangeStr: adjR} = _resolveOpponentRangeStr(s, {pos: pos2, tableSize: S.tableSize, depth: fieldDepth, round: 1, actionCatOverride, rs: null});
        if(adjR===null){ hasUnsplittableManual = true; return null; } // טווח ידני שלא ניתן לפיצול call/3bet
        const combos = _rangeStrToCombos(adjR, deadKeysField);
        return combos.length ? combos : null;
      });
      if(actionCatOverride && hasUnsplittableManual) return null;
      return lists.some(c=>c) ? lists : null;
    };
    // פיצול call/3bet רלוונטי רק כשמפוקסים על יריב בודד (לא "כל השדה") — עם כמה
    // יריבים ביחד אין דרך פשוטה להציג "מול ה-call של אחד ומול ה-3bet של השני".
    const wantSplit = focusSeatIdx!==null;

    if(holeCards.length===2){
      // תת-מצב 1: יד ספציפית מוזנת — בדיקת "בטווח?" + equity של היד הזו מול השדה/הממוקד
      const handNotation = _cardsToHandNotation(holeCards);
      const rangeSet = _parseRangeToSet(myRangeStr);
      openRangeInfo = { pos: myPos, hand: handNotation, inRange: rangeSet.has(handNotation), isManual: !!myManualRange };
      const deadKeysField = new Set([...holeCards, ...boardCards].filter(Boolean).map(_cardKey));
      const fieldCombosLists = computeFieldCombos(deadKeysField);
      if(fieldCombosLists){
        const fe = monteCarloEquityMulti(holeCards, boardCards, [], fieldCombosLists, 4000);
        if(fe!==null) openRangeInfo.fieldEquity = fe;
      }
      if(wantSplit){
        const callCombos = computeFieldCombos(deadKeysField, 'call');
        const bet3Combos = computeFieldCombos(deadKeysField, '3bet');
        if(callCombos){
          const feCall = monteCarloEquityMulti(holeCards, boardCards, [], callCombos, 4000);
          if(feCall!==null) openRangeInfo.fieldEquityCall = feCall;
        }
        if(bet3Combos){
          const fe3bet = monteCarloEquityMulti(holeCards, boardCards, [], bet3Combos, 4000);
          if(fe3bet!==null) openRangeInfo.fieldEquity3bet = fe3bet;
        }
      }
    } else if(myRangeStr){
      // תת-מצב 2: אין קלפים ספציפיים, אבל יש טווח (ידני/אוטומטי) — הטווח כולו מדגם
      // יד בכל איטרציה (heroCombos), מול אותם טווחי-שדה/הממוקד — "טווח מול טווח"
      const deadKeysField = new Set(boardCards.filter(Boolean).map(_cardKey));
      const heroCombosArr = _rangeStrToCombos(myRangeStr, deadKeysField);
      const fieldCombosLists = computeFieldCombos(deadKeysField);
      if(heroCombosArr.length && fieldCombosLists){
        const fe = monteCarloEquityMulti([], boardCards, [], fieldCombosLists, 4000, heroCombosArr);
        if(fe!==null){
          openRangeInfo = { pos: myPos, isManual: !!myManualRange, isRangeMode: true, fieldEquity: fe, combosCount: heroCombosArr.length };
          if(wantSplit){
            const callCombos = computeFieldCombos(deadKeysField, 'call');
            const bet3Combos = computeFieldCombos(deadKeysField, '3bet');
            if(callCombos){
              const feCall = monteCarloEquityMulti([], boardCards, [], callCombos, 4000, heroCombosArr);
              if(feCall!==null) openRangeInfo.fieldEquityCall = feCall;
            }
            if(bet3Combos){
              const fe3bet = monteCarloEquityMulti([], boardCards, [], bet3Combos, 4000, heroCombosArr);
              if(fe3bet!==null) openRangeInfo.fieldEquity3bet = fe3bet;
            }
          }
        }
      }
    }
    if(openRangeInfo){
      openRangeInfo.focusName = focusName;
      openRangeInfo.focusPlayerId = focusPlayerId;
      openRangeInfo.fieldSeats = allRemainingSeats.map(s=>({seatIdx:s.seatIdx, name: pName(s.playerId)||('מושב '+(s.seatIdx+1))}));
    }
  }

  // מתוכם — מי שקלפיו הוזנו בפועל (ידועים), לעומת מי שהם עדיין "יד סמויה"
  const knownOppSeats = oppSeats.filter(s=>(s.cards||[]).filter(Boolean).length===2);
  const knownOppHands = knownOppSeats.map(s=>s.cards.filter(Boolean));
  const unknownOppSeats = oppSeats.filter(s=>(s.cards||[]).filter(Boolean).length!==2);
  const hasKnownOpp = knownOppHands.length > 0;

  // לכל יריב "סמוי": אם נבחר range ידני — הוא חל על כולם; אחרת מזהים אוטומטית
  // עמדה + פעולה שביצע ביד הזאת + תגית שחקן (TAG/LAG/Nit/Station/Fish) כדי להרחיב/להצר
  // את טווח הסולבר בהתאם — בלי צורך לבחור range ידנית בכל פעם
  const deadKeysBase = new Set([...holeCards, ...boardCards, ...knownOppHands.flat()].filter(Boolean).map(_cardKey));
  // עומק ה-stack לחישוב הטווח האוטומטי — לפי היריבים הרלוונטיים בפועל (oppSeats, שכבר
  // מסונן ל"מי שבאמת פעל") ולא לפי כל שחקן פעיל בשולחן (אותו באג בדיוק כמו ב-RFI:
  // שחקן קצר-יד באיזשהו מושב אחר לא אמור להשפיע על העומק מול היריב שבאמת בפוט)
  const _bbNow = (getBlinds&&getBlinds()?.bb)||50;
  const _relevantStacks = oppSeats.map(s=>s.stack||0);
  const _minRelevantStack = _relevantStacks.length ? Math.min(seat?.stack||0, ..._relevantStacks) : (seat?.stack||0);
  const _eqDepth = _depthFromBB(_bbNow>0 ? _minRelevantStack/_bbNow : 100);
  const unknownOppRangeInfo = unknownOppSeats.map(s=>{
    const pos = swpForEq.find(x=>x.seatIdx===s.seatIdx)?.pos || '';
    return _resolveOpponentRangeStr(s, {pos, tableSize:S.tableSize, depth:_eqDepth, round:S.raiseRound, rs});
  });

  // חישוב equity — עם cache וחישוב נדחה (לא חוסם את ציור המסך). מדלגים לגמרי במצב פתיחה
  // (isOpeningSpot) — שם השאלה הנכונה היא "בטווח?" ולא "equity מול מה?"
  // מצב "טווח מול טווח": אם לשחקן הפועל אין קלפים מוזנים אבל יש לו טווח ידני שמור —
  // היד שלו נדגמת מהטווח בכל איטרציה (heroCombos), במקום לדרוש קלפים ספציפיים.
  // עדיפות טווח לפועל: קלפים מוזנים > טווח ידני שמור > אוטומטי (לפי מה שקרה בפועל
  // על השולחן — _getContextualRangeInfo, אותה פונקציה בדיוק כמו לכל שחקן/מושב אחר,
  // כדי שהניתוח יהיה עקבי בין כל השחקנים ולא רק "אני מול יריב מסוים").
  const heroManualRange = (holeCards.length!==2) ? (S.playerRanges?.[seat?.playerId] || null) : null;
  let heroAutoRange = null, heroAutoTag = '';
  if(holeCards.length!==2 && !heroManualRange && seat){
    const heroPos = swpForEq.find(x=>x.seatIdx===actor)?.pos || '';
    if(heroPos){
      // _detectVsPos (ranges.js) — מקור אמת יחיד לזיהוי מי בדיוק עשה 3bet
      // אחרון (דרך S.lastRaiser), משותף עם _getAutoRangeForSeat כדי לא לחזור
      // על הבאג שכבר קרה: זוהה כאן אבל נשכח בעורך הטווח.
      const vsPos = _detectVsPos(swpForEq);
      const {rangeStr: hRangeStr, actionCat: hCat} = _getContextualRangeInfo(seat, heroPos, S.tableSize, _eqDepth, S.raiseRound, vsPos);
      heroAutoRange = hRangeStr || null;
      heroAutoTag = 'hauto:'+heroPos+':'+hCat+':'+_eqDepth+':'+(vsPos||'-');
    }
  }
  const heroRangeStr = heroManualRange || heroAutoRange;
  const heroRangeIsAuto = !heroManualRange && !!heroAutoRange;
  // מצב טווח-מול-טווח דורש לפחות יריב אחד בחישוב (ידוע או עם טווח). בלי אף יריב
  // שפעל, "equity" הוא 100% חסר משמעות (אין מול מי להפסיד) — אז לא מחשבים.
  const heroRangeMode = !!heroRangeStr && (knownOppHands.length + unknownOppSeats.length) > 0;
  let equityPct = null;
  let equityComputing = false;
  const _hasOppInCalc = (knownOppHands.length + unknownOppSeats.length) > 0;
  if((holeCards.length===2 || heroRangeMode) && !isOpeningSpot && _hasOppInCalc){
    const knownOppKey = knownOppHands.map(h=>h.map(c=>c.rank+c.suit).sort().join('')).sort().join(',');
    const rangeKey = unknownOppRangeInfo.map(r=>r.tag).sort().join(',');
    const heroKey = heroRangeMode
      ? (heroManualRange ? 'hr:'+seat.playerId+':'+heroManualRange.length+':'+_countCombos(heroManualRange) : heroAutoTag)
      : holeCards.map(c=>c.rank+c.suit).join('');
    const eqKey = heroKey+'|'+boardCards.map(c=>c.rank+c.suit).join('')
      +'|k:'+knownOppKey+'|u:'+rangeKey;
    if(window._eqCache?.key === eqKey){
      equityPct = window._eqCache.val; // אותם קלפים/תנאים — אין צורך לחשב שוב
    } else {
      equityComputing = true;
      const jobId = (window._eqJob = (window._eqJob||0)+1);
      setTimeout(()=>{
        if(jobId !== window._eqJob) return; // בינתיים נכנסה בקשה עדכנית יותר
        const oppCombosLists = unknownOppRangeInfo.map(r=>{
          const combos = _rangeStrToCombos(r.rangeStr, deadKeysBase);
          return combos.length ? combos : null; // טווח שיצא ריק → נופל חזרה לאקראי מלא
        });
        const heroCombos = heroRangeMode ? _rangeStrToCombos(heroRangeStr, deadKeysBase) : null;
        const val = monteCarloEquityMulti(heroRangeMode?[]:holeCards, boardCards, knownOppHands, oppCombosLists, 8000, heroCombos);
        window._eqCache = {key: eqKey, val};
        if(jobId === window._eqJob) renderPotOdds(); // רינדור חוזר — הפעם מה-cache
      }, 30);
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
    ...(openRangeInfo ? {openRange:{...openRangeInfo}} : {}),
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
    : `padding:4px 9px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#8a8799;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap`;

  bar.style.display = 'block';
  bar.innerHTML = `
  <div style="background:rgba(91,155,213,0.08);border:1px solid rgba(91,155,213,0.22);border-radius:12px;padding:6px 10px;direction:rtl">

    <!-- שורה ראשית — כווץ מ-3 שורות לכרטיס ל-2. גם: תוויות קוצרו כדי שלא יתעגלו
         לשורה שנייה ויתנגשו עם שורת הערך מתחתן (זה מה שקרה עם "UTG טווח (אוטומטי)" —
         ארוך מדי לרוחב העמודה) — אינדיקטור ידני/אוטומטי עבר לשורת הערך במקום
         להיות חלק מהתווית. -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:2px;overflow-x:auto;-webkit-overflow-scrolling:touch">
      <div style="display:flex;flex-direction:column;align-items:center;gap:0px;padding:0 4px">
        <span style="font-size:8px;color:#8a8799;font-weight:700;letter-spacing:.2px;white-space:nowrap">POT ODDS</span>
        <span style="font-size:12px;font-weight:900;color:#5b9bd5;line-height:1.3;white-space:nowrap">${ratioStr} <span style="font-size:8px;font-weight:700;color:#8a8799">· ${fmt(callAmt)}</span></span>
      </div>
      <div style="width:2px;align-self:stretch;background:rgba(255,255,255,0.16);border-radius:1px;flex-shrink:0"></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:0px;padding:0 4px">
        <span style="font-size:8px;color:#8a8799;font-weight:700;letter-spacing:.2px;white-space:nowrap">BREAK-EVEN</span>
        <span style="font-size:12px;font-weight:900;color:#c8a96e;line-height:1.3;white-space:nowrap">${breakEven}%</span>
      </div>
      <div style="width:2px;align-self:stretch;background:rgba(255,255,255,0.16);border-radius:1px;flex-shrink:0"></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:0px;padding:0 4px">
        <span style="font-size:8px;color:#8a8799;font-weight:700;letter-spacing:.2px;white-space:nowrap">${openRangeInfo?(openRangeInfo.isRangeMode?'טווח '+openRangeInfo.pos:'RFI '+openRangeInfo.pos):'EQUITY'}</span>
        ${openRangeInfo
          ? (openRangeInfo.isRangeMode
              ? `<span style="font-size:12px;font-weight:900;color:#7eb8a4;line-height:1.3;white-space:nowrap">${openRangeInfo.combosCount} <span style="font-size:8px;font-weight:700;color:#8a8799">combos · ${(openRangeInfo.combosCount/1326*100).toFixed(1)}%${openRangeInfo.isManual?' · ידני':''}</span></span>`
              : `<span style="font-size:12px;font-weight:900;color:${openRangeInfo.inRange?'#5fc47a':'#e07b6a'};line-height:1.3;white-space:nowrap">${openRangeInfo.inRange?'✓ בטווח':'✗ מחוץ'} <span style="font-size:8px;font-weight:700;color:#8a8799">${openRangeInfo.hand}${openRangeInfo.isManual?' · ידני':''}</span></span>`)
          : equityPct!==null
            ? `<span style="font-size:12px;font-weight:900;color:#7eb8a4;line-height:1.3;white-space:nowrap">${equityPct.toFixed(1)}%${evHtml}${hasKnownOpp?` <span style="font-size:8px;color:#e0a030;font-weight:800">vs ידועה</span>`:''}${heroRangeMode?` <span style="font-size:8px;color:#5b9bd5;font-weight:800">${heroRangeIsAuto?'אוטו׳':'טווח'}</span>`:''}</span>`
            : equityComputing
              ? `<span style="font-size:9px;color:#8a8799">מחשב…</span>`
              : `<span style="font-size:9px;color:#3a3850">${(_curStreetName==='פרה-פלופ' && oppSeats.length===0 && holeCards.length<2)?'פתיחה — הזן קלפים':!_hasOppInCalc?'ממתין ליריב':holeCards.length<2?'הזן קלפים':'בחר range'}</span>`}
      </div>
      ${openRangeInfo && openRangeInfo.fieldEquity!==undefined ? `
      <div style="width:2px;align-self:stretch;background:rgba(255,255,255,0.16);border-radius:1px;flex-shrink:0"></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:0px;padding:0 4px">
        <span style="font-size:8px;color:#8a8799;font-weight:700;letter-spacing:.2px;white-space:nowrap">מול ${openRangeInfo.focusName?openRangeInfo.focusName:'השדה'}</span>
        <span style="font-size:12px;font-weight:900;color:#7eb8a4;line-height:1.3;white-space:nowrap">${openRangeInfo.fieldEquity.toFixed(1)}% <span style="font-size:8px;font-weight:700;color:#8a8799">${openRangeInfo.focusName?'(היפותטי)':'(כולם, היפותטי)'}</span></span>
      </div>` : ''}
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        <button onclick="S.showPotOdds=false;persist();renderPotOdds()" style="background:none;border:none;color:#3a3850;font-size:13px;cursor:pointer;padding:0;line-height:1">✕</button>
        <div style="display:flex;align-items:center;gap:3px">
          <button onclick="S._showRangeSelector=!S._showRangeSelector;renderPotOdds()"
            style="background:${showRange?'rgba(200,169,110,0.15)':'rgba(255,255,255,0.04)'};border:1px solid ${showRange?'rgba(200,169,110,0.5)':'rgba(255,255,255,0.1)'};border-radius:7px;color:${showRange?'#c8a96e':'#8a8799'};font-size:10px;font-weight:800;cursor:pointer;padding:3px 7px;white-space:nowrap">
            Range${rs?' ✓':''}
          </button>
          ${rs ? `<button onclick="S._rangeSelection=null;renderPotOdds()" title="נקה בחירת טווח גלובלית (חוסמת את מצב הפתיחה)" style="background:rgba(224,123,106,0.12);border:1px solid rgba(224,123,106,0.4);border-radius:7px;color:#e07b6a;font-size:10px;font-weight:800;cursor:pointer;padding:3px 6px;line-height:1">✕</button>` : ''}
        </div>
      </div>
    </div>

    <!-- בחירת יריב ממוקד ל"EQUITY מול השדה" — לחיצה על שם = מולו בלבד, "כולם" = ברירת מחדל.
         שורה אחת עם גלילה אופקית (לא flex-wrap) — ראו renderPotOdds להמשך: שומר את
         מיקום הגלילה על הצ'יפ הנבחר בכל רינדור, בדיוק כמו שתוקן קודם ברשימת השחקנים
         בסטטיסטיקה, כדי שלא תתאפס בחזרה להתחלה בכל לחיצה. -->
    ${openRangeInfo && openRangeInfo.fieldSeats && openRangeInfo.fieldSeats.length ? `
    <div id="focus-seat-row" style="display:flex;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:5px;margin-top:6px;padding-top:6px;padding-bottom:2px;border-top:1px solid rgba(255,255,255,0.06)">
      <button ${!openRangeInfo.focusName?'id="focus-seat-selected"':''} onclick="S._openingFocusSeat=null;renderPotOdds()" style="${chipStyle(!openRangeInfo.focusName,'#7eb8a4')};flex-shrink:0">🌐 כולם</button>
      ${openRangeInfo.fieldSeats.map(fs=>`<button ${openRangeInfo.focusName===fs.name?'id="focus-seat-selected"':''} onclick="S._openingFocusSeat=${fs.seatIdx};renderPotOdds()" style="${chipStyle(openRangeInfo.focusName===fs.name,'#5b9bd5')};flex-shrink:0">${fs.name}</button>`).join('')}
    </div>` : ''}

    <!-- פיצול equity מול טווח ה-call בלבד / טווח ה-3bet בלבד של היריב הממוקד —
         רק כשמפוקסים על יריב בודד ושני החישובים הצליחו (יש combos בכל אחד) -->
    ${openRangeInfo && openRangeInfo.focusName && (openRangeInfo.fieldEquityCall!==undefined || openRangeInfo.fieldEquity3bet!==undefined) ? `
    <div style="display:flex;gap:6px;justify-content:center;margin-top:5px">
      ${openRangeInfo.fieldEquityCall!==undefined ? `
      <div style="flex:1;max-width:130px;background:rgba(91,155,213,0.08);border:1px solid rgba(91,155,213,0.3);border-radius:8px;padding:4px 8px;text-align:center">
        <div style="font-size:9px;color:#8a8799;font-weight:700">CALL בלבד</div>
        <div style="font-size:13px;font-weight:900;color:#5b9bd5">${openRangeInfo.fieldEquityCall.toFixed(1)}%</div>
      </div>` : ''}
      ${openRangeInfo.fieldEquity3bet!==undefined ? `
      <div style="flex:1;max-width:130px;background:rgba(224,123,106,0.08);border:1px solid rgba(224,123,106,0.3);border-radius:8px;padding:4px 8px;text-align:center">
        <div style="font-size:9px;color:#8a8799;font-weight:700">3BET בלבד</div>
        <div style="font-size:13px;font-weight:900;color:#e07b6a">${openRangeInfo.fieldEquity3bet.toFixed(1)}%</div>
      </div>` : ''}
    </div>` : ''}

    <!-- סטטיסטיקות אמיתיות (VPIP/LIMP/PFR/3B) של היריב הממוקד — נגזר מ-S.handLog
         דרך calcPlayerHUD הקיים, לא חישוב נפרד. אותו שומר-סף (n>=3 ידיים) כמו כל
         שימוש אחר ב-HUD הזה באפליקציה, כדי לא להציג סטטיסטיקה לא-אמינה ממדגם זעיר. -->
    ${(() => {
      if(!openRangeInfo || !openRangeInfo.focusName || !openRangeInfo.focusPlayerId) return '';
      const hud = calcPlayerHUD(openRangeInfo.focusPlayerId);
      if(!hud) return '';
      return `
    <div style="display:flex;justify-content:center;gap:10px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)">
      <span style="font-size:9px;color:#8a8799;white-space:nowrap">VPIP <span style="color:#c8a96e;font-weight:800">${hud.vpip}%</span></span>
      <span style="font-size:9px;color:#8a8799;white-space:nowrap">LIMP <span style="color:#b47eea;font-weight:800">${hud.limp}%</span></span>
      <span style="font-size:9px;color:#8a8799;white-space:nowrap">PFR <span style="color:#5b9bd5;font-weight:800">${hud.pfr}%</span></span>
      <span style="font-size:9px;color:#8a8799;white-space:nowrap">3B <span style="color:#7eb8a4;font-weight:800">${hud.bet3}%</span></span>
      <span style="font-size:9px;color:#3a3850;white-space:nowrap">(${hud.n} ידיים)</span>
    </div>`;
    })()}

    <!-- Range selector (מתרחב) -->
    ${showRange ? `
    <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;display:flex;flex-direction:column;gap:8px">

      <div style="font-size:9px;color:#8a8799;text-align:center;padding:2px 0">
        💡 לעריכת טווח ידני לשחקן — לחץ על המושב שלו בשולחן
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:9px;color:#8a8799;font-weight:700;letter-spacing:.4px">EFFECTIVE STACK</span>
        <span style="font-size:10px;color:#c8a96e;font-weight:800">${({deep:'75BB+ עמוק',mid:'35-74BB בינוני',short:'20-34BB קצר',push:'<20BB Push/Fold'})[_eqDepth]||_eqDepth}</span>
      </div>

      <div>
        <div style="font-size:10px;color:#8a8799;font-weight:700;letter-spacing:.5px;margin-bottom:5px">עמדת היריב</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${positions.map(p=>`<button style="${chipStyle(p===selPos,'#5b9bd5')}" onclick="S._rangeSelection={pos:'${p}',action:'${selAction}'};renderPotOdds()">${p}</button>`).join('')}
        </div>
      </div>

      <div>
        <div style="font-size:10px;color:#8a8799;font-weight:700;letter-spacing:.5px;margin-bottom:5px">פעולתו</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${Object.entries(_ACTIONS_LABELS).map(([a,lbl])=>`<button style="${chipStyle(a===selAction,'#7eb8a4')}" onclick="S._rangeSelection={pos:'${selPos}',action:'${a}'};renderPotOdds()">${lbl}</button>`).join('')}
        </div>
      </div>

      ${rangeStr ? `
      <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:6px 10px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:10px;color:#8a8799">${selPos} ${_ACTIONS_LABELS[selAction]||selAction}</span>
        <span style="font-size:10px;color:#c8a96e;font-weight:800">${combos} combos · ${pct}%</span>
        ${holeCards.length===2
          ? `<span style="font-size:10px;font-weight:800;color:${equityPct!==null?(ev>=0?'#5fc47a':'#e07b6a'):'#8a8799'}">${equityPct!==null?equityPct.toFixed(1)+'%':'...'}</span>`
          : `<span style="font-size:9px;color:#3a3850">הזן קלפים</span>`}
      </div>` : `
      <div style="font-size:10px;color:#3a3850;text-align:center;padding:4px">אין range לבחירה זו</div>`}

      <button onclick="S._rangeSelection=null;S._showRangeSelector=false;renderPotOdds()"
        style="font-size:10px;color:#8a8799;background:none;border:none;cursor:pointer;text-align:right;padding:0">
        ✕ נקה range
      </button>
    </div>` : ''}
  </div>`;
  // בלי זה, כל לחיצה על יריב ממוקד (בונה מחדש את כל ה-HTML) הייתה מאפסת את
  // גלילת שורת הצ'יפים בחזרה להתחלה — בדיוק אותו דפוס באג שתוקן קודם היום
  // במעבר בין שחקנים במסך הסטטיסטיקה.
  const focusSeatSelected = document.getElementById('focus-seat-selected');
  if(focusSeatSelected) focusSeatSelected.scrollIntoView({inline:'center', block:'nearest'});
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
        <span style="font-size:10px;font-weight:800;color:${posCol};white-space:nowrap">${item.pos||''}</span>
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
    if(!h.seats?.length){ rows.push([h.date,h.blinds,board,'','','','']); return; }
    h.seats.forEach(s=>{
      const acts = (s.actions||[]).map(a=>a.type+(a.amount?'('+a.amount+')':'')).join(', ');
      // תוצאה פר-שחקן (לא פר-יד — כל שחקן באותה יד יכול היה להרוויח/להפסיד סכום שונה):
      // סה"כ הושקע (סכימת actions[].amount, כולל בליינדים) מול מה שהתקבל בפועל אם ניצח
      // (winners[].amount — נוסף כרגע ל-awardPot, קודם היה תמיד חסר). ליריב שהפסיד:
      // amount=0 ממילא, אז התוצאה היא פשוט מינוס ההשקעה.
      const totalInvested = (s.actions||[]).reduce((sum,a)=>sum+(Number(a.amount)||0),0);
      const won = (h.winners||[]).find(w=>w.playerId===s.playerId);
      const net = (won?.amount||0) - totalInvested;
      rows.push([h.date, h.blinds, board, s.playerName||s.playerId, s.pos, acts, net>0?'+'+net:String(net)]);
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
  S.customBlinds = null; // אחרת הרמה מתקדמת ויזואלית אבל הבליינד שמוצג בפועל נשאר תקוע על הערך הידני הישן (customBlinds גובר תמיד ב-getBlinds())
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
  closeBtn2.style.cssText = 'width:100%;padding:10px;border-radius:9px;border:none;background:rgba(255,255,255,0.08);color:#8a8799;cursor:pointer';
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
  closeX.style.cssText = 'background:none;border:none;color:#8a8799;font-size:18px;cursor:pointer';
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
        '<span style="font-size:11px;color:#8a8799;text-align:center">'+(idx+1)+'</span>'+
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
  hdr.innerHTML = '<span></span><span style="font-size:10px;color:#8a8799;text-align:center">SB</span><span style="font-size:10px;color:#8a8799;text-align:center">BB</span><span style="font-size:10px;color:#8a8799;text-align:center">Ante</span><span style="font-size:10px;color:#c8a96e;text-align:center">דק׳</span><span></span>';
  
  // Add level button
  const addBtn = document.createElement('button');
  addBtn.style.cssText = 'width:100%;padding:8px;border-radius:8px;border:1px dashed rgba(255,255,255,0.15);background:transparent;color:#8a8799;font-size:13px;cursor:pointer;margin-top:6px';
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
  resetBtn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#8a8799;font-size:13px;cursor:pointer;margin-top:6px';
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
  
  let vpip=0, pfr=0, limp=0, raises=0, calls=0, checks=0, bet3=0, wtsd=0, won=0;
  
  playerHands.forEach(h=>{
    const seat = (h.seats||[]).find(s=>s.playerId===playerId);
    if(!seat) return;
    const acts = seat.actions||[];
    
    // VPIP: entered pot preflop (call or raise)
    const preflopActs = acts.filter(a=>a.street==='פרה-פלופ'&&a.type!=='SB'&&a.type!=='BB');
    if(preflopActs.some(a=>['Call','Raise','Open','3bet','4bet','All-in'].includes(a.type))) vpip++;
    
    // PFR: raised preflop
    if(preflopActs.some(a=>['Raise','Open','3bet','4bet','All-in'].includes(a.type))) pfr++;
    
    // LIMP: הפעולה הראשונה בפרה-פלופ היא Call כש-raiseRound===0 (אף אחד עוד לא
    // העלה) — אותה הגדרה בדיוק כמו _getEmpiricalLimpHands (ranges.js), לא
    // המצאה נפרדת, כדי ששני המקומות תמיד יסכימו על מה נחשב "לימפ".
    const firstPF = preflopActs[0];
    if(firstPF && firstPF.type==='Call' && (firstPF.raiseRound||0)===0) limp++;
    
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
    limp: Math.round(limp/n*100),
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
    '<button onclick="closeAnalyze()" style="background:none;border:none;color:#8a8799;font-size:20px;cursor:pointer">✕</button></div>';
  
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
    '<div style="font-size:10px;color:#8a8799">'+hud.n+' ידיים · Trend '+hud.trend+'</div></div>'+
    '<button onclick="closeHUD()" style="background:none;border:none;color:#8a8799;font-size:20px;cursor:pointer">✕</button></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'+
    hudStat('VPIP', hud.vpip+'%', statColor(hud.vpip,20,40), 'נכנס לקופה')+
    hudStat('LIMP', hud.limp+'%', statColor(100-hud.limp,60,80), 'נכנס בקריאה')+
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
    box.innerHTML='<div style="text-align:center;padding:20px"><div style="font-size:15px;font-weight:800;color:#c8a96e;margin-bottom:8px">📊 '+name+'</div><div style="color:#8a8799;font-size:12px">נדרשות לפחות 3 ידיים לחישוב HUD</div></div>';
    overlay.appendChild(box); document.body.appendChild(overlay); return;
  }
  _renderHUDOverlay(name, hud);
}

function hudStat(label, value, color, desc){
  return '<div style="background:#0d1120;border-radius:10px;padding:10px;text-align:center">'+
    '<div style="font-size:10px;color:#8a8799;margin-bottom:4px">'+label+'</div>'+
    '<div style="font-size:20px;font-weight:900;color:'+color+'">'+value+'</div>'+
    '<div style="font-size:9px;color:#8a8799;margin-top:2px">'+desc+'</div>'+
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
          document.getElementById('card-picker').classList.remove('open');
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
  closeBtn.style.cssText = 'background:none;border:none;color:#8a8799;font-size:22px;cursor:pointer';
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
  const tl = document.createElement('span'); tl.style.cssText='font-size:11px;color:#8a8799'; tl.textContent='ציפים בטורניר:';
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
    '<div style="font-size:11px;color:#8a8799">קופה: ₪'+pp.toLocaleString()+'</div></div>'+
    '<button onclick="closeICM()" style="background:none;border:none;color:#8a8799;font-size:22px;cursor:pointer">✕</button></div>';
  
  // Prizes row
  const prizesRow = document.createElement('div');
  prizesRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px';
  prizes.forEach((p,i)=>{
    prizesRow.innerHTML += '<div style="flex:1;background:#0d1120;border-radius:8px;padding:6px;text-align:center">'+
      '<div style="font-size:10px;color:#8a8799">מקום '+(i+1)+'</div>'+
      '<div style="font-size:13px;font-weight:700;color:#c8a96e">₪'+p.toLocaleString()+'</div></div>';
  });
  box.appendChild(prizesRow);
  
  // Table
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px';
  table.innerHTML = '<thead><tr style="border-bottom:1px solid rgba(255,255,255,0.08)">'+
    '<th style="padding:6px 8px;text-align:right;color:#8a8799;font-weight:600">שחקן</th>'+
    '<th style="padding:6px 8px;text-align:center;color:#8a8799;font-weight:600">ערימה</th>'+
    '<th style="padding:6px 8px;text-align:center;color:#8a8799;font-weight:600">% צ יפים</th>'+
    '<th style="padding:6px 8px;text-align:center;color:#8a8799;font-weight:600">שווי ICM</th>'+
    '<th style="padding:6px 8px;text-align:center;color:#8a8799;font-weight:600">% פרסים</th>'+
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
    const diffColor = diff>0?'#5fc47a':diff<0?'#e07b6a':'#8a8799';
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
  S.customBlinds = null; // אותה סיבה כמו ב-nextBlindLevel — אחרת האיפוס נראה כאילו קרה אבל הבליינד בפועל נשאר תקוע
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

  // Lovable: max-w-[420px] aspect-[3/4] (portrait) / aspect-[4/3] (landscape)
  // מדידת שטח זמין אמיתי (במקום הנחת "topBarH=175" קבועה) —
  // כך זה מתאים את עצמו לכל דפדפן/מכשיר: ספארי עם/בלי סרגלים, כרום, דסקטופ, PWA
  const vw = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  // מזהים אוריינטציה אמיתית של המסך (לא רק דחיסה של אותה צורה אנכית) —
  // כשהמכשיר מוטה לרוחב, השולחן עצמו הופך לאליפסה רחבה, לא רק מוקטן
  _tableLandscape = vw > vh;

  let usedTop = 0;
  ['viewer-banner','topbar','live-actions-bar','table-size-bar'].forEach(id=>{
    const el = document.getElementById(id);
    // offsetParent===null means the element is display:none ולא תופס מקום בפועל
    if(el && el.offsetParent !== null){
      usedTop += el.getBoundingClientRect().height;
    }
  });

  const seatOverflowMargin = _tableLandscape ? 60 : 110; // בלרוחב הגובה הזמין מוגבל מלכתחילה, אז שומרים פחות מרווח
  const maxW = Math.min(vw - 40, _tableLandscape ? 640 : 360);
  const maxH = Math.max(vh - usedTop - seatOverflowMargin, 180); // 180 = רצפת ביטחון שהשולחן לא ייעלם
  let w, h;
  if(_tableLandscape){
    // בלרוחב הגובה הוא המשאב המוגבל — ממלאים אותו במלואו, אבל בלי למתוח את הרוחב
    // ליחס לא-טבעי (אליפסה שטוחה מדי) — מגבילים יחס מקסימלי סביר לשולחן פוקר
    w = maxW; h = maxH;
    const maxRatio = 1.55;
    if(w / h > maxRatio) w = h * maxRatio;
  } else {
    w = maxW; h = w * 4/3;
    if(h > maxH){ h = maxH; w = h * 3/4; }
  }
  w = Math.round(w); h = Math.round(h);
  // גורם הקטנה למושבים כששטח השולחן קומפקטי (בעיקר בלרוחב) — מונע חפיפה בין כרטיסי מושב
  _seatScale = Math.max(0.62, Math.min(1, h / 420));

  wrap.style.width = w + 'px';
  wrap.style.height = h + 'px';
  wrap.style.borderRadius = '50%';
  wrap.style.overflow = 'visible';

  // viewBox ופרמטרי האליפסה — מוחלפים (rx<->ry, מרכז) בין אנכי לאופקי
  const vbW = _tableLandscape ? 400 : 300;
  const vbH = _tableLandscape ? 300 : 400;
  const cx = vbW/2, cy = vbH/2;
  const railR = _tableLandscape ? {rx:184,ry:138} : {rx:138,ry:184};
  const feltR = _tableLandscape ? {rx:170,ry:124} : {rx:124,ry:170};
  const hiR   = _tableLandscape ? {rx:162,ry:116} : {rx:116,ry:162};
  const goldR = _tableLandscape ? {rx:154,ry:108} : {rx:108,ry:154};
  svg.setAttribute('viewBox',`0 0 ${vbW} ${vbH}`);
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
  <ellipse cx="${cx}" cy="${cy}" rx="${railR.rx}" ry="${railR.ry}" fill="url(#gRail)" filter="drop-shadow(0 20px 40px rgba(0,0,0,0.7))"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${railR.rx}" ry="${railR.ry}" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
  <!-- felt: inset 13% -->
  <ellipse cx="${cx}" cy="${cy}" rx="${feltR.rx}" ry="${feltR.ry}" fill="url(#gFelt)" filter="drop-shadow(inset 0 0 40px rgba(0,0,0,0.5))"/>
  <!-- inner highlight -->
  <ellipse cx="${cx}" cy="${cy}" rx="${hiR.rx}" ry="${hiR.ry}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
  <!-- gold ring -->
  <ellipse cx="${cx}" cy="${cy}" rx="${goldR.rx}" ry="${goldR.ry}" fill="none" stroke="rgba(200,169,110,0.08)" stroke-width="0.8"/>`;

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
  // הערה: sbox-tablesize הוסר מרשימה זו בכוונה — הנראות שלו נקבעת אך ורק ע"י showView()
  // לפי הטאב הפעיל. קודם היה כאן, וכל render() (כולל סנכרון תקופתי) היה מאפס אותו
  // בחזרה ל-display:'' עבור אדמין, "מחייה" אותו מחדש בטאבים שבהם הוא אמור להיות מוסתר.
  ['btn-settings','btn-newhand','btn-savehand','btn-resethand','sbox-buyincost','btn-export','btn-restore','btn-addplayer','add-player-row','btn-save-tourn','btn-reset-tourn'].forEach(id=>{
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
  renderStats(); renderSeats(); renderBoard(); renderBlindsBtn(); renderPotOdds();
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
  // "הפתעות" מצטבר: סכום מכל הטורנירים השמורים בהיסטוריה + הטורניר הנוכחי
  // (עוד לפני שנשמר) — לא רק הערך הבודד של הטורניר הפעיל.
  const surprisesTotal = (S.tournLog||[]).reduce((s,t)=>s+(t.surprisesAmount||0), 0) + (S.surprisesAmount||0);
  const sboxSurprises = document.getElementById('sbox-surprises');
  if(sboxSurprises){
    sboxSurprises.style.display = surprisesTotal>0 ? '' : 'none';
    if(surprisesTotal>0) document.getElementById('stat-surprises').textContent=`₪${surprisesTotal.toLocaleString()}`;
  }
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
    const isAct=activeSeat===i, isFold=seat?.folded, isAlin=seat?.allin;
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
    el.style.transform=`translate(-50%,-50%) scale(${_seatScale})`;
    if(isCurActor){
      el.classList.add('is-actor');
      el.style.transform=`translate(-50%,-50%) scale(${_seatScale*1.35})`;
      el.style.zIndex='30';
    }
    el.innerHTML=`<div class="${cls}" style="width:88px;min-height:64px;box-sizing:border-box" onclick="if(event.target.closest('button'))return;clickSeat(${i})" oncontextmenu="event.preventDefault();showPlayerHUD(${i})">
      ${seat?.playerId?`
        <div style="display:flex;gap:2px;align-items:center;flex-wrap:wrap;justify-content:center;margin-bottom:1px">
          ${seat.pos&&S.btnLocked?`<span class="seat-pos" style="background:${PC[seat.pos]||'#c8a96e'}35;color:${PC[seat.pos]||'#c8a96e'};font-size:9px;font-weight:900;padding:2px 6px;border:1px solid ${PC[seat.pos]||'#c8a96e'}50">${seat.pos}</span>`:''}
        </div>
        <div class="seat-name">${name||'?'}</div>
        ${(seat.stack>=0&&seat.playerId)?`<div class="seat-stack" id="stack-div-${seat.seatIdx}" onclick="event.stopPropagation();inlineEditStack(${seat.seatIdx},this)" style="cursor:pointer;user-select:none">${sbb?`<span style="color:#5a6a54;font-size:10px">(${sbb}) </span>`:''}<span style="font-size:9px">${seat.stack.toLocaleString()}</span></div>`:''}
        ${seat.playerId&&(S.btnLocked||S._showdownMode)&&!seat.folded?`<div class="seat-cards-mini" style="display:flex;gap:3px;margin-top:3px;justify-content:center">${[0,1].map(i2=>{const c=(seat.cards||[])[i2];return c?`<button onclick="openSeatCardPicker(${seat.seatIdx},${i2})" style="width:20px;height:28px;border-radius:3px;background:#fff;border:1px solid #ddd;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:2px;cursor:pointer;box-sizing:border-box"><span style="font-size:15px;font-weight:900;color:${SC[c.suit]};line-height:1">${c.rank}</span><span style="font-size:12px;color:${SC[c.suit]};line-height:1">${c.suit}</span></button>`:`<button onclick="openSeatCardPicker(${seat.seatIdx},${i2})" style="width:20px;height:28px;border-radius:3px;background:rgba(255,255,255,0.08);border:1px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0"><span style="font-size:10px;color:rgba(255,255,255,0.25)">+</span></button>`;}).join('')}</div>`:''}
        ${(()=>{const bCnt=S.board.filter(Boolean).length;const cSt=bCnt===0?'פרה-פלופ':bCnt<=3?'פלופ':bCnt===4?'טרן':'ריבר';const cSa=(seat.actions||[]).filter(a=>a.street===cSt&&a.type!=='SB'&&a.type!=='BB');const showUndo=!isViewer()&&cSa.length>0&&(()=>{const allSt=['פרה-פלופ','פלופ','טרן','ריבר'];const stIdx=allSt.indexOf(cSt);const nextDealt=stIdx===0?S.board[0]!=null:stIdx===1?S.board[3]!=null:stIdx===2?S.board[4]!=null:false;return !nextDealt;})();const showBtn=!isViewer()&&!S.btnLocked&&seat.playerId&&(seat.stack||0)>0;
    const showRebuy=!isViewer()&&seat.playerId&&(seat.stack||0)===0&&(seat.folded||seat.sittingOut||!S.btnLocked);
    const isSittingOut = seat.sittingOut||false;
    return(showBtn?`<button onclick="event.stopPropagation();setBTN(${seat.seatIdx})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid rgba(200,169,110,0.5);background:rgba(200,169,110,0.15);color:#c8a96e;font-size:10px;font-weight:900;cursor:pointer;width:100%">🎯 BTN</button>`:'')
    +(showRebuy?`
      <button onclick="event.stopPropagation();doSeatRebuy(${seat.seatIdx})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid rgba(95,196,122,0.6);background:rgba(95,196,122,0.2);color:#5fc47a;font-size:9px;font-weight:900;cursor:pointer;width:100%;z-index:10;position:relative">+ Rebuy</button>
      <button onclick="event.stopPropagation();setSittingOut(${seat.seatIdx},${!isSittingOut})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid ${isSittingOut?'rgba(91,155,213,0.6)':'rgba(255,200,50,0.5)'};background:${isSittingOut?'rgba(91,155,213,0.2)':'rgba(255,200,50,0.1)'};color:${isSittingOut?'#5b9bd5':'#FFB347'};font-size:9px;font-weight:900;cursor:pointer;width:100%;z-index:10;position:relative">${isSittingOut?'▶ חזור':'⏸ Sit Out'}</button>
      <button onclick="event.stopPropagation();rmSeat(${seat.seatIdx})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid rgba(224,123,106,0.5);background:rgba(224,123,106,0.15);color:#e07b6a;font-size:9px;font-weight:900;cursor:pointer;width:100%;z-index:10;position:relative">✕ יציאה</button>
    `:'')+(showUndo?`<button onclick="event.stopPropagation();undoLastAction(${seat.seatIdx})" style="margin-top:2px;padding:2px 6px;border-radius:4px;border:1px solid #e07b6a;background:#7a2020;color:#ffaaaa;font-size:10px;font-weight:900;cursor:pointer;width:100%;opacity:1!important;position:relative;z-index:5">↩ בטל</button>`:'');})()}
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
  const sdBanner = document.getElementById('showdown-banner');
  if(sdBanner) sdBanner.style.display = S._showdownMode ? 'block' : 'none';
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
    chip.textContent = totalInvested>=1000 ? (totalInvested/1000).toFixed(totalInvested%1000===0?0:1)+'K' : totalInvested.toLocaleString();
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
      // חסום רק כשמנסים לחשוף קלף *חדש* (המשבצת ריקה) לפני שסיבוב ההימורים
      // הסתיים — לא כשמתקנים טעות בקלף שכבר קיים שם. תיקון קלף קיים לא "מדלג"
      // על שום סיבוב הימורים, אז אין סיבה לחסום אותו באותו תנאי בכלל.
      if(!card){
        const activeNonAllin = S.seats.filter(s=>s.playerId&&!s.folded&&!s.allin&&(s.stack||0)>0);
        if(S.btnLocked && S.currentActor!==null && !S.bettingClosed && activeNonAllin.length>0){notify('סיים את סיבוב ההימורים קודם');return;}
      }
      openCP(`board${i}`);
    };
    btn.innerHTML=card
      ?`<span style="font-size:${Math.round(sw*.6)}px;font-weight:900;color:${SC[card.suit]};line-height:1">${card.rank}</span><span style="font-size:${Math.round(sw*.46)}px;color:${SC[card.suit]};line-height:1">${card.suit}</span>`
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

// רספונסיביות אמיתית: לחשב מחדש את גודל/מיקום השולחן בכל שינוי גובה/רוחב זמין בפועל —
// מכסה: הופעה/היעלמות סרגלי ספארי, סיבוב מכשיר, שינוי גודל חלון בדסקטופ, כניסה/יציאה מ-PWA
let _resizeRaf = null;
function _handleViewportResize(){
  // אם יש שדה קלט פעיל (המשתמש עורך ערך כרגע) — לא לרנדר מחדש.
  // באייפון, פתיחת המקלדת הווירטואלית משנה את visualViewport.height בדיוק כמו שינוי מסך אמיתי,
  // ובלי השורה הזו הרינדור מוחק את שדה העריכה הרגעי (כמו עריכת ערימה) לפני שהמשתמש מספיק להקליד.
  const ae = document.activeElement;
  if(ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA')) return;

  if(_resizeRaf) cancelAnimationFrame(_resizeRaf);
  _resizeRaf = requestAnimationFrame(()=>{
    renderTableShape();
    renderSeats();
    _resizeRaf = null;
  });
}
window.addEventListener('resize', _handleViewportResize);
window.addEventListener('orientationchange', _handleViewportResize);
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', _handleViewportResize);
}
