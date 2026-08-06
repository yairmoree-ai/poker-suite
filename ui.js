// ═══════════════════════════════════════════════════════
// ACTIVE PLAYERS POPUP
// ═══════════════════════════════════════════════════════
function showActivePlayers(){
  const pp=document.getElementById('players-popup');
  const cont=document.getElementById('pp-content');
  // Active = have buyin AND not KO'd
  const activePids = Object.keys(S.buyins).filter(pid=>S.buyins[pid]?.buyin>0&&!S.koOrder.includes(pid));
  const winner = activePids.length===1?activePids[0]:null;
  // Get seat data for active players
  const swpActive = assignPos();
  const ko=[...S.koOrder].reverse(); // last KO first in list
  let html='';
  if(!activePids.length&&!ko.length){html='<div style="color:var(--muted);font-size:13px;padding:10px">אין שחקנים פעילים</div>';}
  else{
    if(activePids.length){
      html+=`<div style="font-size:11px;font-weight:700;margin-bottom:7px;color:${activePids.length===1?'#FFD700':'var(--muted)'}">${activePids.length===1?'🏆 Winner!':'פעילים ('+activePids.length+')'}</div>`;
      activePids.forEach(pid=>{
        const s=swpActive.find(s=>s.playerId===pid)||{playerId:pid,pos:'',stack:0};
        const isW=winner===pid;
        const playerName = pName(pid)||'?';
        const rb = (S.buyins[pid]||{}).rebuy||0;
        html+=`<div style="display:flex;align-items:center;gap:8px;padding:7px 6px;border-bottom:1px solid rgba(255,255,255,0.05);border-radius:${isW?'8px':'0'};background:${isW?'rgba(255,215,0,0.06)':'transparent'}">
          ${isW?`<span style="font-size:18px">🥇</span>`:`<span style="font-size:10px;font-weight:700;color:${PC[s.pos]||'var(--gold)'};background:${PC[s.pos]||'var(--gold)'}18;border-radius:4px;padding:1px 6px;min-width:36px;text-align:center">${s.pos||'-'}</span>`}
          <span style="font-size:${isW?'15':'13'}px;font-weight:${isW?'800':'700'};flex:1;color:${isW?'#FFD700':'#e2ddd4'}">${playerName}${isW?' 🏆':''}</span>
          ${rb>0?`<span style="font-size:10px;color:var(--muted)">R:${rb}</span>`:''}
          ${s.stack?`<span style="font-size:11px;color:var(--muted)">${s.stack.toLocaleString()}</span>`:''}
        </div>`;
      });
    }
    if(ko.length){
      html+=`<div style="font-size:11px;color:var(--muted);font-weight:600;margin:12px 0 7px">הודחו</div>`;
      // ko[0]=first eliminated=last place, ko[last]=last eliminated=2nd place
      const activeCnt = activePids.length;
      ko.forEach((pid,i)=>{
        // i=0 is last KO (2nd place), i=last is first KO (last place)
        const place = activeCnt + i + 1;
        const medal = place===2?'🥈':place===3?'🥉':'';
        html+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <span style="font-size:14px;width:20px">${medal}</span>
          <span style="font-size:11px;color:var(--muted);min-width:52px">מקום ${place}</span>
          <span style="font-size:13px;font-weight:700">${pName(pid)||pid}</span>
        </div>`;
      });
    }
  }
  cont.innerHTML=html;
  pp.classList.add('open');
}

// ═══════════════════════════════════════════════════════
// BLINDS PANEL (שולחן) — אותה שיטת עריכה (טבלה) כמו בטורנירים,
// אך על נתונים נפרדים לגמרי (BLIND_LEVELS/S.customBlindLevels).
// אין כאן שום קריאה או כתיבה ל-S.blindStructure (זה של הטורניר בלבד).
// ═══════════════════════════════════════════════════════
function openBlindsPanel(){
  window._blTableWorking = null; // מתחיל עותק עבודה טרי בכל פתיחה
  renderBlindsBody();
  openPanel('blinds-panel');
}
function _blInputStyle(gold){
  return 'width:100%;padding:6px 4px;border-radius:7px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:'+(gold?'var(--gold)':'#e2ddd4')+';font-size:12px;outline:none;text-align:center;direction:ltr;box-sizing:border-box';
}
function renderBlindsBody(){
  const b=getBlinds();
  const fmt=n=>n>=1000?(n/1000)+'K':String(n);
  if(!window._blTableWorking){
    window._blTableWorking = [...DEF_BLINDS.map(l=>({...l})), ...S.customBlindLevels.map(l=>({...l}))];
  }
  const working = window._blTableWorking;

  const rowsHtml = working.map((l,i)=>{
    const isActive = S.blindLevel===i && !S.customBlinds;
    return `<div style="display:grid;grid-template-columns:20px 1fr 1fr 1fr 52px 24px;gap:4px;align-items:center;margin-bottom:5px;${isActive?'background:rgba(200,169,110,0.1);border-radius:8px;padding:3px 2px':''}">
      <span style="font-size:10px;color:var(--muted);text-align:center">${i+1}</span>
      <input type="number" value="${l.sb}" data-field="sb" data-idx="${i}" style="${_blInputStyle(false)}">
      <input type="number" value="${l.bb}" data-field="bb" data-idx="${i}" style="${_blInputStyle(false)}">
      <input type="number" value="${l.ante||0}" data-field="ante" data-idx="${i}" style="${_blInputStyle(true)}">
      <button onclick="activateTableBlind(${i})" style="padding:5px 2px;border-radius:7px;border:1px solid ${isActive?'rgba(95,196,122,0.5)':'rgba(200,169,110,0.35)'};background:${isActive?'rgba(95,196,122,0.15)':'rgba(200,169,110,0.1)'};color:${isActive?'#5fc47a':'#c8a96e'};font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap">${isActive?'✓ פעיל':'▶ הפעל'}</button>
      <button onclick="delTableBlindRow(${i})" style="padding:5px 2px;border-radius:7px;border:none;background:rgba(224,123,106,0.15);color:#e07b6a;font-size:12px;cursor:pointer">✕</button>
    </div>`;
  }).join('');

  document.getElementById('blinds-body').innerHTML=`
    <div style="margin-bottom:10px"><span style="font-size:12px;font-weight:700;color:var(--gold)">בליינדים כרגע: ${fmt(b.sb)}/${fmt(b.bb)}${b.ante?` ante ${fmt(b.ante)}`:''}</span>${S.customBlinds?'<span style="font-size:10px;color:#5b9bd5;margin-right:8px">(נקבע ידנית)</span>':''}</div>

    <!-- קביעה ידנית ומיידית — לא קשורה לרשימת הרמות למטה בכלל. מקלידים,
         לוחצים, זהו: לא צריך לשמור רמה, לא צריך להפעיל אותה בנפרד. -->
    <div style="background:rgba(91,155,213,0.08);border:1px solid rgba(91,155,213,0.25);border-radius:10px;padding:8px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:#5b9bd5;margin-bottom:6px">✏️ קביעה ידנית מיידית</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">
        <input type="number" id="manual-bl-sb" value="${b.sb}" placeholder="SB" style="${_blInputStyle(false)}">
        <input type="number" id="manual-bl-bb" value="${b.bb}" placeholder="BB" style="${_blInputStyle(false)}">
        <input type="number" id="manual-bl-ante" value="${b.ante||0}" placeholder="Ante" style="${_blInputStyle(true)}">
      </div>
      <button onclick="setManualBlinds()" style="width:100%;padding:8px;border-radius:8px;border:none;background:#5b9bd5;color:#0a0d14;font-weight:800;font-size:12px;cursor:pointer">✓ קבע בליינדים אלו עכשיו</button>
    </div>

    <div style="font-size:10px;color:var(--muted);margin-bottom:6px">— או בחר/ערוך רמה מוגדרת מראש: —</div>
    <div style="display:grid;grid-template-columns:20px 1fr 1fr 1fr 52px 24px;gap:4px;margin-bottom:4px">
      <span></span><span style="font-size:9px;color:var(--muted);text-align:center">SB</span><span style="font-size:9px;color:var(--muted);text-align:center">BB</span><span style="font-size:9px;color:var(--muted);text-align:center">Ante</span><span></span><span></span>
    </div>
    <div id="table-bl-rows">${rowsHtml}</div>
    <button onclick="addTableBlindRow()" style="width:100%;padding:8px;border-radius:8px;border:1px dashed rgba(255,255,255,0.15);background:transparent;color:var(--muted);font-size:12px;cursor:pointer;margin-top:6px">+ הוסף רמה</button>
    <button onclick="saveTableBlindLevels()" style="width:100%;padding:11px;border-radius:10px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:13px;cursor:pointer;margin-top:10px">💾 שמור רמות</button>
    <button onclick="resetTableBlindLevels()" style="width:100%;padding:9px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--muted);font-size:12px;cursor:pointer;margin-top:6px">איפוס לברירת מחדל</button>`;

  document.querySelectorAll('#table-bl-rows input').forEach(inp=>{
    inp.oninput = ()=>{ const i=+inp.dataset.idx, f=inp.dataset.field; working[i][f]=+inp.value||0; };
  });
}
function setManualBlinds(){
  if(isViewer()){notify('צופה בלבד');return;}
  const sb = +document.getElementById('manual-bl-sb').value||0;
  const bb = +document.getElementById('manual-bl-bb').value||0;
  const ante = +document.getElementById('manual-bl-ante').value||0;
  if(bb<=0){ notify('BB חייב להיות גדול מ-0'); return; }
  // customBlinds הוא כבר עדיפות-על ב-getBlinds() (קיים במודל הנתונים מזמן) —
  // פשוט לא היה לזה בעבר שום ממשק שקובע אותו בפועל. זו בדיוק הנקודה.
  S.customBlinds = {sb, bb, ante};
  persist(); renderBlindsBtn(); renderBlindsBody();
  notify('✓ בליינדים נקבעו: '+sb+'/'+bb+(ante?' ante '+ante:''));
}
function addTableBlindRow(){
  if(isViewer()){notify('צופה בלבד');return;}
  const w=window._blTableWorking;
  const last=w[w.length-1]||{sb:500,bb:1000,ante:0};
  w.push({sb:last.sb*2,bb:last.bb*2,ante:last.ante||0});
  renderBlindsBody();
}
function delTableBlindRow(i){
  if(isViewer()){notify('צופה בלבד');return;}
  const w=window._blTableWorking;
  w.splice(i,1);
  renderBlindsBody();
}
function activateTableBlind(i){
  if(isViewer()){notify('צופה בלבד');return;}
  S.blindLevel=i; S.customBlinds=null; persist(); renderBlindsBtn(); renderBlindsBody();
}
function saveTableBlindLevels(){
  if(isViewer()){notify('צופה בלבד');return;}
  const w=window._blTableWorking;
  if(!w.length){notify('חייבת להישאר לפחות רמה אחת');return;}
  S.customBlindLevels = w.slice(1); // השורה הראשונה נשארת "ברירת מחדל" רעיונית; שאר השורות נשמרות
  BLIND_LEVELS = w.slice();
  if(S.blindLevel>=BLIND_LEVELS.length) S.blindLevel=BLIND_LEVELS.length-1;
  persist(); renderBlindsBtn(); renderBlindsBody();
  notify('רמות הבליינדים נשמרו ✓');
}
function resetTableBlindLevels(){
  if(isViewer()){notify('צופה בלבד');return;}
  window._blTableWorking = [...DEF_BLINDS.map(l=>({...l}))];
  S.customBlindLevels = [];
  BLIND_LEVELS = [...DEF_BLINDS];
  if(S.blindLevel>=BLIND_LEVELS.length) S.blindLevel=0;
  persist(); renderBlindsBtn(); renderBlindsBody();
  notify('אופס לברירת מחדל');
}


// ═══════════════════════════════════════════════════════
// HAND LIST
// ═══════════════════════════════════════════════════════
// סדר קנוני של עמדות סביב השולחן (עם כיוון השעון, החל מ-BTN) — לשימוש בכל
// מקום שמצייר מיני-שולחן ממידע יד שמור. h.seats שמור בסדר seatIdx הפיזי (איזה
// מושב פיזי כל שחקן תפס), לא בסדר התורות ההגיוני — בלי המיון הזה, השולחן
// המצויר נראה "מפוזר" ולא עוקב אחרי סדר העמדות האמיתי (SB→BB→...→CO→BTN).
const _POS_ORDER = ['BTN','SB','BB','UTG','UTG+1','LJ','MP','MP+1','HJ','CO'];

// מיון פעולות בתוך רחוב: idx (מספר סידורי גלובלי, קיים בכל פעולה חדשה שנרשמת)
// הוא מקור האמת העיקרי — אבל ידיים ישנות שנשמרו *לפני* התיקון הזה עדיין חסרות
// idx ל-SB/BB ספציפית (הבאג שגרם ל"BB לפני SB" ברנדום). fallback מפורש: אם
// אין idx לאף אחת מהשתיים, SB תמיד לפני BB, לא משנה סדר המערך המקורי.
function _actionSortKey(a){
  if(typeof a.idx === 'number') return a.idx;
  if(a.type==='SB') return -2;
  if(a.type==='BB') return -1;
  return 0;
}
function _sortSeatsByPos(seats){
  return [...seats].sort((a,b)=>{
    const ia = _POS_ORDER.indexOf(a.pos), ib = _POS_ORDER.indexOf(b.pos);
    return (ia===-1?99:ia) - (ib===-1?99:ib);
  });
}

// ===== Replayer ליד: צעד-אחר-צעד עם שליטה בהפעלה =====
// בונה רשימת "צעדים" כרונולוגית (הימורי חובה → כל פעולה → כל קלף בורד נחשף)
// מהנתונים הגולמיים של היד, ואז מרנדר "פריים" (מצב שולחן) לכל צעד — בלי לגעת
// ב-S החי בשום שלב, הכל מבודד לתוך אובייקט snapshot נפרד.
function _handToSteps(h){
  const seats = (h.seats||[]).filter(s=>s.playerName);
  if(!seats.length) return [];

  // שחזור הערימה ההתחלתית: seat.stack השמור הוא הערימה *אחרי* כל ההימורים של
  // היד הזו (persist קורה תוך כדי משחק, לא רק בסוף) — אז מוסיפים בחזרה את סכום
  // כל הפעולות כדי לקבל את נקודת ההתחלה האמיתית, ובונים קדימה משם. ככה זה נכון
  // בלי תלות בשאלה אם הערימה השמורה כן/לא כוללת כבר את חלוקת הזכייה.
  const startStack = {};
  seats.forEach(s=>{
    const totalActed = (s.actions||[]).reduce((sum,a)=>sum+(parseFloat(a.amount)||0), 0);
    startStack[s.playerName] = (s.stack||0) + totalActed;
  });

  const steps = [];
  const curStack = {...startStack};
  let pot = 0;
  steps.push({boardCount:0, pot:0, stacks:{...curStack}, text:'תחילת היד', actorSeat:null, streetChips:{}});

  const board = (h.board||[]).filter(Boolean);
  const streetOrder = ['פרה-פלופ','פלופ','טורן','ריבר'];
  const streetLabel = {'פרה-פלופ':'פרה-פלופ','פלופ':'FLOP','טורן':'TURN','ריבר':'RIVER'};
  const streetBoardCount = {'פרה-פלופ':0,'פלופ':3,'טורן':4,'ריבר':5};

  streetOrder.forEach(street=>{
    let acts = [];
    seats.forEach(s=>{
      (s.actions||[]).forEach(a=>{ if(a.street===street) acts.push({...a, playerName:s.playerName, seatIdx:s.seatIdx}); });
    });
    acts.sort((a,b)=>_actionSortKey(a)-_actionSortKey(b));

    // חשוב: קודם מציגים את כותרת/חשיפת הרחוב (אם הבורד תומך בזה), *לפני*
    // שבודקים אם יש בכלל פעולות רשומות. אם רחוב שלם (למשל טורן, כשכולם צ'קו)
    // חסר פעולות רשומות מכל סיבה, אסור שזה "יבלע" גם את קלף הרחוב עצמו —
    // בדיוק זה מה שגרם לדילוג "פלופ→ריבר" שדולג על הטורן לגמרי.
    const streetChips = {};
    if(street!=='פרה-פלופ'){
      const need = streetBoardCount[street];
      if(board.length<need) return;
      steps.push({boardCount:need, pot, stacks:{...curStack}, text:`*** ${streetLabel[street]} ***`, actorSeat:null, streetChips:{}});
    }
    if(!acts.length) return; // אין פעולות רשומות ברחוב הזה — הכותרת כבר הוצגה למעלה, פשוט אין מה להוסיף אחריה

    acts.forEach(a=>{
      const amt = parseFloat(a.amount)||0;
      let text = '', actionLabel = a.displayType||a.type;
      switch(a.type){
        case 'SB': text = `${a.playerName} מניח SB ${amt.toLocaleString()}`; actionLabel='SB'; break;
        case 'BB': text = `${a.playerName} מניח BB ${amt.toLocaleString()}`; actionLabel='BB'; break;
        case 'Ante': text = `${a.playerName} מניח Ante ${amt.toLocaleString()}`; actionLabel='Ante'; break;
        case 'Fold': text = `${a.playerName}: Fold`; actionLabel='Fold'; break;
        case 'Check': text = `${a.playerName}: Check`; actionLabel='Check'; break;
        case 'Call': text = `${a.playerName}: Call ${amt.toLocaleString()}`; actionLabel='Call'; break;
        case 'All-in': text = `${a.playerName}: All-in ${amt.toLocaleString()}`; actionLabel='All-in'; break;
        default: text = `${a.playerName}: ${a.displayType||a.type} ${amt.toLocaleString()}`;
      }
      if(a.type!=='Fold' && a.type!=='Check'){
        curStack[a.playerName] = Math.max(0,(curStack[a.playerName]||0)-amt);
        pot += amt;
        streetChips[a.playerName] = (streetChips[a.playerName]||0) + amt;
      }
      steps.push({boardCount:streetBoardCount[street], pot, stacks:{...curStack}, text, actorSeat:a.seatIdx, streetChips:{...streetChips}, actionLabel});
    });
  });

  if((h.winners||[]).length){
    const names = h.winners.map(w=>w.name||w.playerName).join(' + ');
    const finalStacks = {...curStack};
    h.winners.forEach(w=>{
      const wName = w.name||w.playerName;
      if(wName && finalStacks[wName]!==undefined){
        finalStacks[wName] += (w.amount!=null ? w.amount : (h.finalPot||pot));
      }
    });
    steps.push({boardCount:board.length, pot:h.finalPot||pot, stacks:finalStacks, text:`🏆 ${names} זוכה ב-${(h.finalPot||pot).toLocaleString()}`, actorSeat:null, isWin:true, streetChips:{}, showCards:true});
  }
  return steps;
}

let _replayerHand = null;
let _replayerSteps = [];
let _replayerIdx = 0;
let _replayerTimer = null;

// שיתוף ה-replayer כ"סרטון" (בפועל: GIF מונפש) — לא MediaRecorder+captureStream
// למרות שזה יותר "וידאו אמיתי", כי יש לזה תקלות תיעודיות וידועות ב-Safari
// ל-iOS ספציפית עם קנבס (לא מצלמה) — לפעמים נתקע לגמרי ב-stop(). GIF הוא
// המסלול הבטוח והמוכח לפלטפורמה הזו. ה-worker script של gif.js נטען דרך fetch
// והופך ל-blob URL (לא מצביע ישירות ל-CDN) — כי חלק מהדפדפנים חוסמים בניית
// Worker מ-script שמקורו cross-origin.
// שיתוף ה-replayer כ**לינק** לגרסה האינטראקטיבית האמיתית (עם כל כפתורי השליטה),
// לא כמדיה סטטית — משתמש באותו Firebase שכבר משמש לסנכרון ידיים (FIREBASE_URL,
// אותו דפוס קריאה פתוחה בלי auth header שכבר מוכח עובד), רק בנתיב ציבורי חדש
// ונפרד (/users/_shared_replays_/) כדי לא לערבב עם נתוני המשתמשים הפרטיים.
// חשוב: מקוננים תחת /users/ (לא צומת עליון חדש) בכוונה — חוקי האבטחה של
// Firebase כאן מתירים כתיבה פתוחה רק מתחת ל-/users/*, כמו שכבר מוכח עובד עם
// סנכרון הידיים הרגיל. צומת עליון חדש (כמו /shared_replays/ שנוסה קודם) נחסם
// ב-401 כי אין לו כלל הרשאה מוגדר — ולא ניתן לי לערוך את חוקי ה-Firebase
// עצמם מכאן, אז הפתרון הוא לנצל מבנה שכבר פתוח, לא לבקש הרשאה חדשה.
// "זמני": אין מחיקה אוטומטית אמיתית בצד השרת (Realtime Database לא תומך TTL
// מובנה בלי Cloud Functions, שאין לי דרך להגדיר כאן) — אבל מיישמים תפוגה
// "רכה" בצד הלקוח: לינק ישן מ-30 יום מוצג כ"פג תוקף" גם אם הרשומה עדיין קיימת
// בפועל בענן. מוזכר בבירור למשתמש, לא מוסתר כאילו זו תפוגה אמיתית.
async function shareReplayerAsLink(){
  if(!_replayerHand){ notify('אין יד לשיתוף'); return; }
  const btn = document.getElementById('replayer-share-link-btn');
  const origText = btn?.textContent;
  try{
    if(btn){ btn.disabled=true; btn.textContent='יוצר לינק…'; }
    const id = 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
    const payload = { hand: _replayerHand, createdAt: Date.now() };
    const resp = await fetch(FIREBASE_URL+'/users/_shared_replays_/'+id+'.json', {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);

    const link = location.origin + location.pathname + '?replay=' + id;
    if(navigator.share){
      try{ await navigator.share({ title:'יד פוקר', text:_replayerHand.date||'', url: link }); }
      catch(shareErr){ if(shareErr?.name!=='AbortError') console.error('share error:', shareErr); }
    } else if(navigator.clipboard){
      await navigator.clipboard.writeText(link);
      notify('הלינק הועתק ללוח 📋');
    } else {
      prompt('העתק את הלינק:', link);
    }
  }catch(err){
    console.error('shareReplayerAsLink error:', err);
    alert('שגיאה ביצירת הלינק: '+(err?.message||err));
    notify('שגיאה ביצירת הלינק — נסה שוב');
  }finally{
    if(btn){ btn.disabled=false; btn.textContent=origText; }
  }
}

let _gifWorkerBlobUrl = null;
// טוען את gif.js דינמית אם היא לא זמינה — ה-<script> הרגיל בטעינת הדף יכול
// להיכשל על חיבור לא יציב, בלי שהמשתמש בהכרח שם לב (וגם בלי סימן ברור בקונסול
// שהוא רואה). לפני שמוותרים לגמרי, מנסים לטעון פעם נוספת בדיוק ברגע הלחיצה.
function _ensureGifLoaded(){
  if(typeof GIF !== 'undefined') return Promise.resolve(true);
  return new Promise(resolve=>{
    const existing = document.querySelector('script[data-gifjs-retry]');
    if(existing){ existing.remove(); } // ניסיון קודם שנכשל — מסירים לפני שמנסים שוב
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
    s.setAttribute('data-gifjs-retry','1');
    s.onload = ()=>resolve(typeof GIF !== 'undefined');
    s.onerror = ()=>resolve(false);
    document.head.appendChild(s);
    setTimeout(()=>resolve(typeof GIF !== 'undefined'), 6000); // לא נתקעים לנצח אם זה תלוי
  });
}
async function shareReplayerAsGif(){
  if(!_replayerHand || !_replayerSteps.length){ notify('אין יד לשיתוף'); return; }
  if(typeof html2canvas === 'undefined'){
    alert('כלי צילום המסך (html2canvas) לא נטען — בדוק חיבור לאינטרנט ורענן את הדף');
    notify('כלי הצילום לא נטען');
    return;
  }
  if(typeof GIF === 'undefined'){
    const btnPre = document.getElementById('replayer-share-vid-btn');
    if(btnPre){ btnPre.disabled=true; btnPre.textContent='טוען ספריית GIF…'; }
    const loaded = await _ensureGifLoaded();
    if(btnPre){ btnPre.disabled=false; btnPre.textContent='🎬 שתף כ-GIF'; }
    if(!loaded){
      alert('טעינת ספריית ה-GIF נכשלה (גם בניסיון חוזר) — בדוק חיבור לאינטרנט ונסה שוב עוד כמה שניות');
      notify('טעינת כלי היצירה נכשלה');
      return;
    }
  }
  const btn = document.getElementById('replayer-share-vid-btn');
  const origBtnText = btn?.textContent;
  const wasPlaying = !!_replayerTimer;
  if(_replayerTimer){ clearInterval(_replayerTimer); _replayerTimer=null; _updatePlayBtn(); }
  const savedIdx = _replayerIdx;

  try{
    if(btn){ btn.disabled=true; btn.textContent = 'טוען…'; }
    if(!_gifWorkerBlobUrl){
      const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
      if(!resp.ok) throw new Error('worker fetch failed');
      const blob = await resp.blob();
      _gifWorkerBlobUrl = URL.createObjectURL(blob);
    }

    const frameEl = document.getElementById('replayer-frame');
    if(!frameEl) throw new Error('no frame element');
    const firstCanvas = await html2canvas(frameEl, {backgroundColor:'#0a0d14', scale:1.5, useCORS:true});

    const gif = new GIF({ workers:2, quality:10, workerScript:_gifWorkerBlobUrl, width:firstCanvas.width, height:firstCanvas.height, background:'#0a0d14' });

    for(let i=0;i<_replayerSteps.length;i++){
      _replayerIdx = i;
      _renderReplayerFrame();
      if(btn) btn.textContent = `מייצר… ${i+1}/${_replayerSteps.length}`;
      // עיכוב קצר כדי לתת ל-DOM לצייר את הפריים החדש לפני הצילום
      await new Promise(r=>setTimeout(r,30));
      const canvas = await html2canvas(frameEl, {backgroundColor:'#0a0d14', scale:1.5, useCORS:true});
      const delay = i===_replayerSteps.length-1 ? 2000 : 900; // עצירה ארוכה יותר על הפריים האחרון
      gif.addFrame(canvas, {delay, copy:true});
    }

    if(btn) btn.textContent = 'מקודד GIF…';
    const blob = await new Promise((resolve,reject)=>{
      gif.on('finished', b=>resolve(b));
      gif.on('abort', ()=>reject(new Error('gif aborted')));
      gif.render();
    });

    const fileName = 'poker-hand-'+(_replayerHand.id||Date.now())+'.gif';
    const file = new File([blob], fileName, {type:'image/gif'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({ files:[file], title:'יד פוקר', text:_replayerHand.date||'' });
      }catch(shareErr){
        if(shareErr?.name!=='AbortError') console.error('share error:', shareErr);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download=fileName;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      notify('הסרטון הורד 📥');
    }
  }catch(err){
    console.error('shareReplayerAsGif error:', err);
    alert('שגיאה ביצירת הסרטון: '+(err?.message||err));
    notify('שגיאה ביצירת הסרטון — נסה שוב');
  }finally{
    _replayerIdx = savedIdx;
    _renderReplayerFrame();
    if(btn){ btn.disabled=false; btn.textContent = origBtnText; }
  }
}

function showHandReplayer(hid){
  const h = (S.handLog||[]).find(x=>x.id===hid);
  if(!h) return;
  _replayerHand = h;
  _replayerSteps = _handToSteps(h);
  _replayerIdx = 0;
  if(_replayerTimer){ clearInterval(_replayerTimer); _replayerTimer=null; }
  document.getElementById('replayer-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'replayer-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:450;background:rgba(0,0,0,0.94);overflow-y:auto;direction:rtl';
  const box = document.createElement('div');
  box.style.cssText = 'max-width:480px;margin:0 auto;padding:12px';
  box.id = 'replayer-box';
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const hdrTop = document.createElement('div');
  hdrTop.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px';
  hdrTop.innerHTML = `<div style="font-size:14px;font-weight:800;color:#c8a96e">▶️ Replayer — ${h.date}</div>`;
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none;border:none;color:#8a8799;font-size:22px;cursor:pointer;padding:4px';
  closeBtn.textContent = '✕';
  closeBtn.onclick = ()=>{
    if(_replayerTimer) clearInterval(_replayerTimer);
    if(window._isSharedReplayView){
      // מציגים את ההודעה *לפני* הסגירה, לא ביחד — אחרת ב-דפדפנים שבהם
      // window.close() כן מצליח (מסתבר שכן, לא תמיד נחסם כמו שחשבתי), הטאב
      // נסגר כמעט מיידית ואף אחד לא מספיק לראות את ההודעה בכלל.
      document.body.innerHTML = '<div style="position:fixed;inset:0;background:#0a0d14;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#e2ddd4;font-size:15px;font-weight:700;direction:rtl;text-align:center;padding:20px"><div>היד תועדה באמצעות <span style="color:#c8a96e">Poker-Suite</span></div><div style="color:#8a8799;font-size:13px;font-weight:400">תודה שצפית</div></div>';
      setTimeout(()=>{ window.close(); }, 2000);
      return;
    }
    overlay.remove();
  };
  hdrTop.appendChild(closeBtn);
  box.appendChild(hdrTop);

  // כפתורי השיתוף לא מוצגים כלל בתצוגת-שיתוף (מישהו שפתח לינק ששותף אליו) —
  // אין טעם לשתף-מחדש מתוך תצוגה ששותפה, וגם לא הגיוני שלצופה כזה יהיה בכלל
  // גישה לפעולת כתיבה ל-Firebase.
  if(!window._isSharedReplayView){
    const hdrRow2 = document.createElement('div');
    hdrRow2.style.cssText = 'display:flex;gap:8px;margin-bottom:10px';
    const shareVidBtn = document.createElement('button');
    shareVidBtn.id = 'replayer-share-vid-btn';
    shareVidBtn.style.cssText = 'flex:1;background:rgba(91,155,213,0.12);border:1px solid rgba(91,155,213,0.4);color:#5b9bd5;font-size:12px;font-weight:700;border-radius:8px;padding:6px 10px;cursor:pointer';
    shareVidBtn.textContent = '🎬 שתף כ-GIF';
    shareVidBtn.onclick = shareReplayerAsGif;
    const shareLinkBtn = document.createElement('button');
    shareLinkBtn.id = 'replayer-share-link-btn';
    shareLinkBtn.style.cssText = 'flex:1;background:rgba(200,169,110,0.12);border:1px solid rgba(200,169,110,0.4);color:#c8a96e;font-size:12px;font-weight:700;border-radius:8px;padding:6px 10px;cursor:pointer';
    shareLinkBtn.textContent = '🔗 שתף כלינק';
    shareLinkBtn.onclick = shareReplayerAsLink;
    hdrRow2.appendChild(shareVidBtn);
    hdrRow2.appendChild(shareLinkBtn);
    box.appendChild(hdrRow2);
  }

  const frameDiv = document.createElement('div');
  frameDiv.id = 'replayer-frame';
  // padding-top (לא margin-top על wrap!) — margin על ילד ראשון של קונטיינר בלי
  // padding/border משלו יכול "להתמוטט" (CSS margin collapsing) לתוך גבול ההורה
  // במקום להרחיב אותו בפועל, מה שהיה בדיוק הסיבה שהניסיון הקודם (margin-top על
  // wrap) לא פתר את זה לגמרי. padding לעולם לא מתמוטט ככה — זה מבטיח שהמרחב
  // באמת בתוך התיבה ש-html2canvas תופס.
  frameDiv.style.cssText = 'padding-top:40px';
  box.appendChild(frameDiv);

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;direction:ltr';
  controls.innerHTML = `
    <button onclick="_replayerGo(0)" style="background:rgba(255,255,255,0.06);border:none;color:#e2ddd4;font-size:16px;border-radius:8px;padding:8px 10px;cursor:pointer">⏮</button>
    <button onclick="_replayerStep(-1)" style="background:rgba(255,255,255,0.06);border:none;color:#e2ddd4;font-size:16px;border-radius:8px;padding:8px 10px;cursor:pointer">◀</button>
    <button id="replayer-play-btn" onclick="_replayerTogglePlay()" style="background:rgba(200,169,110,0.15);border:1px solid rgba(200,169,110,0.4);color:#c8a96e;font-size:16px;border-radius:8px;padding:8px 16px;cursor:pointer;min-width:52px">▶️</button>
    <button onclick="_replayerStep(1)" style="background:rgba(255,255,255,0.06);border:none;color:#e2ddd4;font-size:16px;border-radius:8px;padding:8px 10px;cursor:pointer">▶</button>
    <button onclick="_replayerGo(${_replayerSteps.length-1})" style="background:rgba(255,255,255,0.06);border:none;color:#e2ddd4;font-size:16px;border-radius:8px;padding:8px 10px;cursor:pointer">⏭</button>
  `;
  box.appendChild(controls);

  const stepLbl = document.createElement('div');
  stepLbl.id = 'replayer-step-lbl';
  stepLbl.style.cssText = 'text-align:center;font-size:10px;color:#5a5870;margin-top:6px';
  box.appendChild(stepLbl);

  _renderReplayerFrame();
}

function _replayerStep(delta){
  _replayerGo(_replayerIdx + delta);
}
function _replayerGo(idx){
  _replayerIdx = Math.max(0, Math.min(_replayerSteps.length-1, idx));
  _renderReplayerFrame();
  if(_replayerIdx===_replayerSteps.length-1 && _replayerTimer){ clearInterval(_replayerTimer); _replayerTimer=null; _updatePlayBtn(); }
}
function _replayerTogglePlay(){
  if(_replayerTimer){ clearInterval(_replayerTimer); _replayerTimer=null; _updatePlayBtn(); return; }
  if(_replayerIdx>=_replayerSteps.length-1) _replayerIdx=0;
  _replayerTimer = setInterval(()=>{
    _replayerIdx++;
    if(_replayerIdx>=_replayerSteps.length-1){ _replayerIdx=_replayerSteps.length-1; clearInterval(_replayerTimer); _replayerTimer=null; _updatePlayBtn(); }
    _renderReplayerFrame();
  }, 1800);
  _updatePlayBtn();
}
function _updatePlayBtn(){
  const btn = document.getElementById('replayer-play-btn');
  if(btn) btn.textContent = _replayerTimer ? '⏸' : '▶️';
}

function _renderReplayerFrame(){
  const h = _replayerHand;
  const step = _replayerSteps[_replayerIdx];
  if(!h || !step) return;
  _updatePlayBtn();
  const lbl = document.getElementById('replayer-step-lbl');
  if(lbl) lbl.textContent = `${_replayerIdx+1} / ${_replayerSteps.length}`;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:100%;padding-bottom:75%;margin-bottom:6px';
  const felt = document.createElement('div');
  felt.style.cssText = 'position:absolute;inset:8% 4%;border-radius:50%;background:radial-gradient(ellipse at 40% 35%,#1a4a2a 0%,#0d2e18 60%,#091f10 100%);border:4px solid #2a1a08;box-shadow:inset 0 0 20px rgba(0,0,0,0.6),0 0 0 2px #1a0f05';
  wrap.appendChild(felt);

  const board = (h.board||[]).filter(Boolean).slice(0, step.boardCount);
  const center = document.createElement('div');
  center.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:5px';
  const brow = document.createElement('div');
  brow.style.cssText = 'display:flex;gap:5px;direction:ltr;min-height:48px';
  board.forEach(c=>{
    const isRed = c.suit==='♥'||c.suit==='♦';
    const cd = document.createElement('div');
    cd.style.cssText = 'width:34px;height:48px;border-radius:5px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;line-height:1;box-shadow:0 3px 8px rgba(0,0,0,0.6)';
    cd.innerHTML = `<span style="font-size:20px;color:${isRed?'#d42020':'#111'}">${c.rank}</span><span style="font-size:15px;color:${isRed?'#e05555':'#111'}">${c.suit}</span>`;
    brow.appendChild(cd);
  });
  center.appendChild(brow);
  const potLbl = document.createElement('div');
  potLbl.style.cssText = 'font-size:11px;font-weight:800;color:#c8a96e;background:rgba(0,0,0,0.55);padding:3px 9px;border-radius:7px';
  potLbl.textContent = 'Pot: '+step.pot.toLocaleString();
  center.appendChild(potLbl);
  wrap.appendChild(center);

  const seats = _sortSeatsByPos((h.seats||[]).filter(s=>s.playerName));
  const cx=50, cy=50, rx=46, ry=40; // ry הוקטן מ-46 ל-40 — יותר מרווח מהקצה העליון/תחתון, כדי שהקלפים לא ייחתכו
  seats.forEach((s,si)=>{
    const angle = (2*Math.PI*si/seats.length) + Math.PI/2;
    const px = cx + rx*Math.cos(angle);
    const py = cy + ry*Math.sin(angle);
    const isActing = step.actorSeat===s.seatIdx;
    const isWinner = step.isWin && (h.winners||[]).some(w=>(w.seatIdx===s.seatIdx)||(w.name===s.playerName)||(w.playerName===s.playerName));

    const seatEl = document.createElement('div');
    seatEl.style.cssText = `position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;left:${px}%;top:${py}%;z-index:5`;

    // קלפי השחקן — מוצגים רק בסיום היד (showCards), לא לאורך כל ה-replay,
    // כמו showdown אמיתי. רק למי שבאמת יש 2 קלפים רשומים.
    const cards = (s.cards||[]).filter(Boolean);
    if(step.showCards && cards.length===2){
      const cardsRow = document.createElement('div');
      cardsRow.style.cssText = `display:flex;gap:2px;direction:ltr;opacity:${s.folded?0.4:1}`;
      cards.forEach(c=>{
        const isRed = c.suit==='♥'||c.suit==='♦';
        const cd = document.createElement('div');
        cd.style.cssText = 'width:20px;height:28px;border-radius:3px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;line-height:1;box-shadow:0 2px 4px rgba(0,0,0,0.5)';
        cd.innerHTML = `<span style="font-size:12px;color:${isRed?'#d42020':'#111'}">${c.rank}</span><span style="font-size:9px;color:${isRed?'#d42020':'#111'}">${c.suit}</span>`;
        cardsRow.appendChild(cd);
      });
      seatEl.appendChild(cardsRow);
    }

    const box2 = document.createElement('div');
    box2.style.cssText = `background:#121824;border:1.5px solid ${isWinner?'#5fc47a':isActing?'#c8a96e':'rgba(255,255,255,0.12)'};border-radius:8px;padding:4px 7px;text-align:center;min-width:58px;${isWinner?'box-shadow:0 0 8px rgba(95,196,122,0.5)':isActing?'box-shadow:0 0 8px rgba(200,169,110,0.5)':''}`;
    const stackVal = step.stacks[s.playerName]!==undefined ? step.stacks[s.playerName] : (s.stack||0);
    box2.innerHTML = `<div style="font-size:9px;font-weight:800;color:${s.pos==='BTN'?'#c8a96e':s.pos==='SB'?'#8b7cb8':s.pos==='BB'?'#e07b6a':'#6a8090'}">${s.pos||''}</div>
      <div style="font-size:10px;font-weight:700;color:#e2ddd4;white-space:nowrap">${(s.playerName||'').slice(0,9)}</div>
      <div style="font-size:9px;color:#8a8799">${stackVal.toLocaleString()}${isWinner?' 🏆':''}</div>`;
    seatEl.appendChild(box2);

    // תג הפעולה עצמה (לא רק הסכום) — Check/Fold/Call/Raise וכו', צמוד למושב
    // שפועל כרגע, לא רק בבאנר הטקסט למטה. צבע לפי סוג: אדום=Fold, ירוק=
    // Check/Call (פסיבי), זהב=הכל השאר (הימור/ריי/all-in/בליינד).
    if(isActing && step.actionLabel){
      const actColor = step.actionLabel==='Fold' ? '#e07b6a' : (step.actionLabel==='Check'||step.actionLabel==='Call') ? '#5fc47a' : '#c8a96e';
      const actBadge = document.createElement('div');
      actBadge.style.cssText = `background:${actColor};color:#0a0d14;font-size:9px;font-weight:900;padding:2px 7px;border-radius:8px;margin-top:2px;white-space:nowrap`;
      actBadge.textContent = step.actionLabel;
      seatEl.appendChild(actBadge);
    }

    wrap.appendChild(seatEl);

    // צ'יפי ההימור — badge קטן בין המושב למרכז השולחן (לכיוון הקופה), רק כשיש
    // סכום בפועל "על השולחן" ליד המושב הזה ברחוב הנוכחי (streetChips).
    const chipAmt = (step.streetChips||{})[s.playerName];
    if(chipAmt>0){
      const chipPx = cx + (px-cx)*0.55;
      const chipPy = cy + (py-cy)*0.55;
      const chipEl = document.createElement('div');
      chipEl.style.cssText = `position:absolute;left:${chipPx}%;top:${chipPy}%;transform:translate(-50%,-50%);background:rgba(200,169,110,0.9);color:#0a0d14;font-size:10px;font-weight:900;padding:3px 8px;border-radius:11px;box-shadow:0 2px 5px rgba(0,0,0,0.5);white-space:nowrap;z-index:6`;
      chipEl.textContent = chipAmt.toLocaleString();
      wrap.appendChild(chipEl);
    }
  });

  const frame = document.getElementById('replayer-frame');
  if(frame){
    frame.innerHTML = '';
    frame.appendChild(wrap);
    const actionBox = document.createElement('div');
    actionBox.style.cssText = 'text-align:center;font-size:13px;font-weight:700;color:'+(step.isWin?'#5fc47a':'#e2ddd4')+';background:rgba(255,255,255,0.04);border-radius:8px;padding:8px;margin-top:4px';
    actionBox.textContent = step.text;
    frame.appendChild(actionBox);
  }
}

function showHandDetail(hid){
  const h = (S.handLog||[]).find(x=>x.id===hid);
  if(!h) return;
  document.getElementById('hand-detail-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hand-detail-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.92);overflow-y:auto;direction:rtl';
  
  const box = document.createElement('div');
  box.style.cssText = 'max-width:480px;margin:0 auto;padding:12px';

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px';
  const winnerNames = (h.winners||[]).map(w=>w.name).join(' + ');
  hdr.innerHTML = '<div><div style="font-size:14px;font-weight:800;color:#c8a96e">'+h.date+'</div><div style="font-size:11px;color:#8a8799">'+h.blinds+(h.anteStr?' · '+h.anteStr:'')+(h.label?' · '+h.label:'')+'</div>'+(winnerNames?'<div style="font-size:12px;font-weight:700;color:#5fc47a;margin-top:3px">🏆 '+winnerNames+'</div>':'')+'</div>';
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none;border:none;color:#8a8799;font-size:22px;cursor:pointer;padding:4px';
  closeBtn.textContent = '✕';
  closeBtn.onclick = ()=>overlay.remove();
  
  // Analyze button
  const analyzeBtn = document.createElement('button');
  analyzeBtn.className = 'share-hide';
  analyzeBtn.style.cssText = 'padding:6px 12px;border-radius:8px;border:1px solid rgba(200,169,110,0.4);background:rgba(200,169,110,0.1);color:#c8a96e;font-size:12px;font-weight:700;cursor:pointer;margin-left:6px';
  analyzeBtn.textContent = '🔍 נתח יד';
  analyzeBtn.onclick = ()=>analyzeHand(h);

  // Share button
  const shareBtn = document.createElement('button');
  shareBtn.className = 'share-hide';
  shareBtn.style.cssText = 'padding:6px 12px;border-radius:8px;border:1px solid rgba(91,155,213,0.4);background:rgba(91,155,213,0.1);color:#5b9bd5;font-size:12px;font-weight:700;cursor:pointer;margin-left:6px';
  shareBtn.textContent = '📤 שתף יד';
  shareBtn.onclick = ()=>shareHandImage(h, box);

  // Replay button
  const replayBtn = document.createElement('button');
  replayBtn.className = 'share-hide';
  replayBtn.style.cssText = 'padding:6px 12px;border-radius:8px;border:1px solid rgba(200,169,110,0.4);background:rgba(200,169,110,0.1);color:#c8a96e;font-size:12px;font-weight:700;cursor:pointer;margin-left:6px';
  replayBtn.textContent = '▶️ Replay';
  replayBtn.onclick = ()=>showHandReplayer(h.id);

  closeBtn.className = 'share-hide';
  hdr.appendChild(analyzeBtn);
  hdr.appendChild(replayBtn);
  hdr.appendChild(shareBtn);
  hdr.appendChild(closeBtn);
  box.appendChild(hdr);

  // Mini table display
  const tableDiv = document.createElement('div');
  tableDiv.style.cssText = 'position:relative;width:100%;padding-bottom:75%;margin-bottom:12px;flex-shrink:0';
  
  const felt = document.createElement('div');
  felt.style.cssText = 'position:absolute;inset:8% 4%;border-radius:50%;background:radial-gradient(ellipse at 40% 35%,#1a4a2a 0%,#0d2e18 60%,#091f10 100%);border:4px solid #2a1a08;box-shadow:inset 0 0 20px rgba(0,0,0,0.6),0 0 0 2px #1a0f05';
  tableDiv.appendChild(felt);
  
  // Board cards in center
  const boardCards2 = (h.board||[]).filter(Boolean);
  if(boardCards2.length){
    const bc = document.createElement('div');
    bc.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px';
    const brow = document.createElement('div');
    brow.style.cssText = 'display:flex;gap:5px;direction:ltr';
    boardCards2.forEach(c=>{
      const isRed=c.suit==='♥'||c.suit==='♦';
      const bc2=document.createElement('div');
      bc2.style.cssText = 'width:34px;height:48px;border-radius:5px;background:#fff;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;line-height:1;box-shadow:0 3px 8px rgba(0,0,0,0.6);opacity:1';
      bc2.innerHTML='<span style="font-size:20px;color:'+(isRed?'#d42020':'#111')+'">'+c.rank+'</span><span style="font-size:15px;color:'+(isRed?'#e05555':'#111')+'">'+c.suit+'</span>';
      brow.appendChild(bc2);
    });
    const potLbl = document.createElement('div');
    potLbl.style.cssText = 'font-size:10px;font-weight:700;color:#5fc47a;background:rgba(0,0,0,0.5);padding:2px 7px;border-radius:6px';
    potLbl.textContent = 'Pot: '+(h.finalPot||calcPot()||0).toLocaleString();
    bc.appendChild(brow); bc.appendChild(potLbl);
    tableDiv.appendChild(bc);
  }
  
  // Seats on ellipse
  const myNameDet2 = currentUser?.name||'';
  const winners2 = (h.seats||[]).filter(s=>h.result==='win'&&(s.playerName===myNameDet2));
  const seatCount = (h.seats||[]).length;
  
  // Position seats on ellipse orbit
  // cx=50%, cy=50% of wrapper, rx=48%, ry=46%
  const cx=50, cy=50, rx=48, ry=46;
  _sortSeatsByPos(h.seats||[]).forEach((s,si)=>{
    const angle = (2*Math.PI*si/seatCount) + Math.PI/2; // start from bottom (BTN) — matches the replayer's layout
    const px = cx + rx*Math.cos(angle);
    const py = cy + ry*Math.sin(angle);
    
    const seatEl = document.createElement('div');
    seatEl.style.cssText = 'position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;left:'+px+'%;top:'+py+'%;z-index:5';
    
    const isMe = s.playerName===myNameDet2||(s.playerId&&pName(s.playerId)===myNameDet2);
    const hasWon = (h.winners||[]).some(w=>w.seatIdx===s.seatIdx||w.playerId===s.playerId);
    const posColor = s.pos==='BTN'?'#c8a96e':s.pos==='SB'?'#8b7cb8':s.pos==='BB'?'#e07b6a':'#6a8090';
    const seatCards = (s.cards||[]).filter(Boolean);
    const hasCards = seatCards.length>0;

    // Position tag
    const posEl=document.createElement('div');
    posEl.style.cssText='font-size:10px;font-weight:800;color:'+posColor+';line-height:1;background:rgba(0,0,0,0.5);padding:1px 5px;border-radius:5px';
    posEl.textContent=s.pos||'';
    seatEl.appendChild(posEl);

    if(hasCards){
      // קלפים על המושב עצמו, השם מוצג מתחתיהם
      const cardsRow = document.createElement('div');
      cardsRow.style.cssText = 'display:flex;gap:4px;direction:ltr;opacity:'+(s.folded?0.4:1);
      seatCards.forEach(c=>{
        const isRed=c.suit==='♥'||c.suit==='♦';
        const cd=document.createElement('div');
        cd.style.cssText = 'width:26px;height:36px;border-radius:3px;background:#fff;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;line-height:1;box-shadow:0 2px 4px rgba(0,0,0,0.6);'+(hasWon?'box-shadow:0 0 6px rgba(95,196,122,0.6),0 2px 4px rgba(0,0,0,0.6)':'');
        cd.innerHTML='<span style="font-size:16px;color:'+(isRed?'#d42020':'#111')+'">'+c.rank+'</span><span style="font-size:12px;color:'+(isRed?'#d42020':'#111')+'">'+c.suit+'</span>';
        cardsRow.appendChild(cd);
      });
      seatEl.appendChild(cardsRow);

      const nameEl=document.createElement('div');
      nameEl.style.cssText='font-size:9px;font-weight:700;color:'+(isMe?'#c8a96e':'#e2ddd4')+';line-height:1.1;background:rgba(0,0,0,0.5);padding:1px 5px;border-radius:5px;white-space:nowrap';
      nameEl.textContent=(s.playerName||'').slice(0,8);
      seatEl.appendChild(nameEl);
    } else {
      // אין קלפים גלויים — תיבה קומפקטית עם עמדה+שם בלבד
      const circle = document.createElement('div');
      const sz = 50;
      circle.style.cssText = 'width:'+sz+'px;min-height:'+sz+'px;border-radius:8px;background:#121824;border:1.5px solid '+(s.folded?'rgba(255,255,255,0.06)':hasWon?'#5fc47a':'rgba(255,255,255,0.12)')+';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:3px 2px;opacity:'+(s.folded?0.4:1)+';'+(hasWon?'box-shadow:0 0 6px rgba(95,196,122,0.4)':'');
      const nameEl=document.createElement('div');
      nameEl.style.cssText='font-size:9px;font-weight:700;color:'+(isMe?'#c8a96e':'#e2ddd4')+';line-height:1.1';
      nameEl.textContent=(s.playerName||'').slice(0,5);
      circle.appendChild(nameEl);
      seatEl.appendChild(circle);
    }
    
    // Win chip
    if(hasWon && h.finalPot){
      const chip=document.createElement('div');
      chip.style.cssText='background:#5fc47a;color:#0a0d14;font-size:10px;font-weight:900;padding:1px 5px;border-radius:5px;white-space:nowrap';
      chip.textContent='+'+h.finalPot.toLocaleString();
      seatEl.appendChild(chip);
    }
    tableDiv.appendChild(seatEl);
  });
  
  box.appendChild(tableDiv);

  // Pot Odds & Equity — מחושב מראש, ישולב בהמשך ישירות בתוך שורת הפעולה שלי בטבלה
  const streetOdds = computeHistoricalStreetOdds(h);
  const oddsByKey = {};
  streetOdds.forEach(o=>{ oddsByKey[o.street+'|'+o.seatIdx]=o; });
  const _usedOddsKeys = new Set(); // מוודא שנצמיד את הנתון לשורה אחת בלבד לכל שחקן/סטריט

  // Streets - column layout like poker client
  const streets = ['פרה-פלופ','פלופ','טורן','ריבר'];
  const streetLabels = {'פרה-פלופ':'Pre','פלופ':'Flop','טורן':'Turn','ריבר':'River'};
  const actionColors = {Fold:'#666',Check:'#5fc47a',Call:'#5b9bd5',Raise:'#c8a96e','3bet':'#e0a030','4bet':'#e07b6a','All-in':'#e05555',BB:'#e07b6a',SB:'#8b7cb8',Bet:'#c8a96e',Open:'#c8a96e'};



  // Build columns grid
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#0a0d14;border-radius:10px;overflow:hidden;margin-bottom:10px;direction:ltr';

  // Check which streets have actions
  const activeStreets = streets.filter(street=>
    (h.seats||[]).some(s=>(s.actions||[]).some(a=>a.street===street))
  );
  if(!activeStreets.length){ box.appendChild(grid); }
  else {
    // Check if there are SB/BB actions to show in Blinds column
    const blindActs = [];
    (h.seats||[]).forEach(s=>{
      (s.actions||[]).filter(a=>a.street==='פרה-פלופ'&&(a.type==='SB'||a.type==='BB')).forEach(a=>{
        blindActs.push({...a, playerName:s.playerName||s.playerId, pos:s.pos});
      });
    });
    blindActs.sort((a,b)=>a.type==='SB'?-1:1);
    const hasBlinds = blindActs.length > 0;
    const extraCol = hasBlinds ? 1 : 0;
    const colCount = activeStreets.length + extraCol;
    grid.style.gridTemplateColumns = 'repeat('+colCount+',1fr)';

    // Build Blinds column
    if(hasBlinds){
      const blindsCol = document.createElement('div');
      blindsCol.style.cssText = 'background:#0d1120;min-width:0';
      const blindsHdr = document.createElement('div');
      blindsHdr.style.cssText = 'padding:5px 6px;background:#141824;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)';
      blindsHdr.innerHTML = '<div style="font-size:10px;font-weight:800;color:#8b7cb8">Blinds</div>';
      blindsCol.appendChild(blindsHdr);
      blindActs.forEach(a=>{
        const row = document.createElement('div');
        row.style.cssText = 'padding:5px 6px;border-bottom:1px solid rgba(255,255,255,0.04);text-align:center';
        const c = a.type==='SB'?'#8b7cb8':'#e07b6a';
        row.innerHTML =
          '<div style="font-size:9px;color:#8a8799">'+(a.pos||a.type)+'</div>'+
          '<div style="font-size:10px;font-weight:700;color:#e2ddd4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+a.playerName+'</div>'+
          '<div style="display:inline-block;margin-top:2px;padding:1px 6px;border-radius:5px;background:'+c+'22;color:'+c+';font-size:9px;font-weight:800">'+a.type+'</div>'+
          (a.amount?'<div style="font-size:10px;font-weight:700;color:#e2ddd4">'+Number(a.amount).toLocaleString()+'</div>':'');
        blindsCol.appendChild(row);
      });
      grid.appendChild(blindsCol);
    }

    activeStreets.forEach(street=>{
      const col = document.createElement('div');
      col.style.cssText = 'background:#0d1120;min-width:0';

      // Street header with pot
      const potAtStreet = (()=>{
        const allStreets = ['פרה-פלופ','פלופ','טורן','ריבר'];
        const streetIdx = allStreets.indexOf(street);
        if(streetIdx === 0){
          // Pre-flop: show SB + BB + Ante only
          let sum=0;
          (h.seats||[]).forEach(s=>{
            (s.actions||[]).filter(a=>a.street==='פרה-פלופ'&&(a.type==='SB'||a.type==='BB'||a.type==='Ante')).forEach(a=>sum+=(Number(a.amount)||0));
          });
          return sum;
        }
        // Other streets: sum all previous streets
        const prevStreets = allStreets.slice(0, streetIdx);
        let sum=0;
        (h.seats||[]).forEach(s=>{
          (s.actions||[]).filter(a=>prevStreets.includes(a.street)).forEach(a=>sum+=(Number(a.amount)||0));
        });
        return sum;
      })();

      const hdr = document.createElement('div');
      hdr.style.cssText = 'padding:5px 6px;background:#141824;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)';
      hdr.innerHTML = '<div style="font-size:10px;font-weight:800;color:#c8a96e">'+streetLabels[street]+'</div>'+
        (potAtStreet?'<div style="font-size:9px;color:#5fc47a">₪'+potAtStreet.toLocaleString()+'</div>':'');
      col.appendChild(hdr);

      // Actions in this street
      const allActs = [];
      (h.seats||[]).forEach(s=>{
        (s.actions||[]).filter(a=>a.street===street&&!(street==='פרה-פלופ'&&(a.type==='SB'||a.type==='BB'))).forEach(a=>{
          allActs.push({...a, seatIdx:s.seatIdx, playerName:s.playerName||s.playerId, pos:s.pos, folded:s.folded});
        });
      });
      // Sort: SB first, BB second, then by action index ascending
      allActs.sort((a,b)=>{
        const order = t=>t==='SB'?-2:t==='BB'?-1:(a.idx??999);
        const oa = a.type==='SB'?-2:a.type==='BB'?-1:(a.idx??999);
        const ob = b.type==='SB'?-2:b.type==='BB'?-1:(b.idx??999);
        return oa-ob;
      });

      allActs.forEach(a=>{
        const row = document.createElement('div');
        row.style.cssText = 'padding:5px 6px;border-bottom:1px solid rgba(255,255,255,0.04);text-align:center';
        const c = actionColors[a.type]||'#e2ddd4';
        const isFold = a.type==='Fold';
        const myOdds = oddsByKey[street+'|'+a.seatIdx];
        const oddsKey = street+'|'+a.seatIdx;
        const isMyOddsRow = myOdds && !_usedOddsKeys.has(oddsKey) && a.type===myOdds.myAction;
        if(isMyOddsRow) _usedOddsKeys.add(oddsKey);
        const ev = isMyOddsRow && myOdds.equityPct!==null ? (myOdds.equityPct - myOdds.breakEven) : null;
        row.innerHTML =
          '<div style="font-size:9px;color:#8a8799;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(a.pos||'')+'</div>'+
          '<div style="font-size:10px;font-weight:700;color:'+(isFold?'#555':'#e2ddd4')+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+a.playerName+'</div>'+
          '<div style="display:inline-block;margin-top:2px;padding:1px 6px;border-radius:5px;background:'+c+'22;color:'+c+';font-size:9px;font-weight:800">'+a.type+'</div>'+
          (a.amount&&!isFold?'<div style="font-size:10px;font-weight:700;color:#e2ddd4">₪'+Number(a.amount).toLocaleString()+'</div>':'')+
          (isMyOddsRow?
            '<div style="margin-top:3px;padding-top:3px;border-top:1px dashed rgba(255,255,255,0.08)">'+
            '<div style="font-size:10px;color:#8a8799">BE '+myOdds.breakEven.toFixed(0)+'%</div>'+
            (myOdds.equityPct!==null
              ? '<div style="font-size:12px;font-weight:900;color:#7eb8a4">'+myOdds.equityPct.toFixed(1)+'%</div>'+
                '<div style="font-size:10px;font-weight:800;color:'+(ev>=0?'#5fc47a':'#e07b6a')+'">'+(ev>=0?'✅ +EV':'❌ -EV')+'</div>'
              : '<div style="font-size:9px;color:#3a3850">אין נתונים</div>')+
            '</div>'
            :'');
        col.appendChild(row);
      });
      // Add player cards at bottom of this column
      const allStreetsList2 = ['פרה-פלופ','פלופ','טורן','ריבר'];
      const seatsWithCards = (h.seats||[]).filter(s=>(s.cards||[]).some(Boolean)).filter(s=>{
        let lastSt = 'פרה-פלופ';
        allStreetsList2.forEach(st=>{ if((s.actions||[]).some(a=>a.street===st)) lastSt=st; });
        return lastSt === street;
      });
      if(seatsWithCards.length){
        const sep = document.createElement('div');
        sep.style.cssText = 'border-top:1px solid rgba(255,255,255,0.15);margin:4px 0';
        col.appendChild(sep);
        seatsWithCards.forEach(s=>{
          const cardRow = document.createElement('div');
          cardRow.style.cssText = 'padding:4px 6px;text-align:center';
          const cardHtml = (s.cards||[]).filter(Boolean).map(c=>{
            const isRed=c.suit==='♥'||c.suit==='♦';
            return '<div style="width:22px;height:30px;border-radius:4px;background:#fff;display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:1px;box-sizing:border-box;box-shadow:0 2px 4px rgba(0,0,0,0.6);margin:0 1px"><span style="font-size:15px;font-weight:900;color:'+(isRed?'#d42020':'#111')+';line-height:1">'+c.rank+'</span><span style="font-size:12px;color:'+(isRed?'#d42020':'#111')+';line-height:1">'+c.suit+'</span></div>';
          }).join('');
          cardRow.innerHTML =
            '<div style="font-size:9px;color:'+(s.folded?'#555':'#aaa')+';margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+s.playerName+'</div>'+
            '<div style="display:flex;gap:1px;justify-content:center;direction:ltr">'+cardHtml+'</div>';
          col.appendChild(cardRow);
        });
      }

      grid.appendChild(col);
    });
    box.appendChild(grid);
  }



  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// מצלם את תצוגת היד (שולחן + טבלת פעולות) כתמונת PNG ומשתף אותה,
// או מוריד אותה אם השיתוף לא נתמך בדפדפן.
async function shareHandImage(h, box){
  if(typeof html2canvas === 'undefined'){
    notify('טעינת כלי השיתוף נכשלה — בדוק חיבור לאינטרנט');
    return;
  }
  const hideEls = box.querySelectorAll('.share-hide');
  hideEls.forEach(el=>el.style.visibility = 'hidden');
  try{
    const canvas = await html2canvas(box, {
      backgroundColor: '#0a0d14',
      scale: 2,
      useCORS: true
    });
    hideEls.forEach(el=>el.style.visibility = '');

    canvas.toBlob(async (blob)=>{
      if(!blob){ notify('שגיאה ביצירת התמונה'); return; }
      const fileName = 'poker-hand-'+(h.id||Date.now())+'.png';
      const file = new File([blob], fileName, {type:'image/png'});

      if(navigator.canShare && navigator.canShare({files:[file]})){
        try{
          await navigator.share({
            files: [file],
            title: 'יד פוקר',
            text: (h.date||'')+' · '+(h.blinds||'')
          });
        }catch(shareErr){
          // המשתמש ביטל את השיתוף — לא צריך הודעת שגיאה
          if(shareErr?.name !== 'AbortError') console.error('share error:', shareErr);
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        notify('התמונה הורדה 📥');
      }
    }, 'image/png');
  }catch(err){
    hideEls.forEach(el=>el.style.visibility = '');
    console.error('shareHandImage error:', err);
    notify('שגיאה בשיתוף היד');
  }
}

async function shareTournamentImage(ti){
  const t = S.tournLog[ti];
  if(!t){ notify('טורניר לא נמצא'); return; }
  const box = document.getElementById('tourn-card-'+ti);
  if(!box){ notify('שגיאה — הכרטיס לא נמצא'); return; }
  if(typeof html2canvas === 'undefined'){
    notify('טעינת כלי השיתוף נכשלה — בדוק חיבור לאינטרנט');
    return;
  }
  const hideEls = box.querySelectorAll('.share-hide');
  hideEls.forEach(el=>el.style.visibility = 'hidden');
  try{
    const canvas = await html2canvas(box, {
      backgroundColor: '#0a0d14',
      scale: 2,
      useCORS: true
    });
    hideEls.forEach(el=>el.style.visibility = '');

    canvas.toBlob(async (blob)=>{
      if(!blob){ notify('שגיאה ביצירת התמונה'); return; }
      const fileName = 'poker-tourn-'+(t.id||Date.now())+'.png';
      const file = new File([blob], fileName, {type:'image/png'});

      if(navigator.canShare && navigator.canShare({files:[file]})){
        try{
          await navigator.share({
            files: [file],
            title: t.name || 'תוצאות טורניר',
            text: (t.date||'')+(t.name?' · '+t.name:'')
          });
        }catch(shareErr){
          if(shareErr?.name !== 'AbortError') console.error('share error:', shareErr);
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        notify('התמונה הורדה 📥');
      }
    }, 'image/png');
  }catch(err){
    hideEls.forEach(el=>el.style.visibility = '');
    console.error('shareTournamentImage error:', err);
    notify('שגיאה בשיתוף הטורניר');
  }
}

function renderHandList(){
  const cont=document.getElementById('hand-list');
  
  // Update player filter options
  const playerSel = document.getElementById('hand-filter-player');
  if(playerSel){
    const allPlayers = [...new Set((S.handLog||[]).flatMap(h=>(h.seats||[]).map(s=>s.playerName||'')).filter(Boolean))].sort();
    const curVal = playerSel.value;
    playerSel.innerHTML = '<option value="">כל השחקנים</option>' + allPlayers.map(p=>`<option value="${p}" ${p===curVal?'selected':''}>${p}</option>`).join('');
  }

  // Filter
  const search = (document.getElementById('hand-search')?.value||'').toLowerCase();
  const filterPlayer = document.getElementById('hand-filter-player')?.value||'';
  let hands = S.handLog||[];
  hands = [...hands].sort((a,b)=>handTs(b)-handTs(a));
  if(search) hands = hands.filter(h=>(h.label||'').toLowerCase().includes(search)||(h.seats||[]).some(s=>(s.playerName||'').toLowerCase().includes(search)));
  if(filterPlayer) hands = hands.filter(h=>(h.seats||[]).some(s=>s.playerName===filterPlayer));

  // Stats for filtered hands
  const statsBar = document.getElementById('hands-stats-bar');
  if(statsBar && filterPlayer){
    const wins = hands.filter(h=>(h.winners||[]).some(w=>w.name===filterPlayer)).length;
    const total = hands.length;
    const pct = total>0?Math.round(wins/total*100):0;
    const avgPot = total>0?Math.round(hands.reduce((s,h)=>s+(h.finalPot||0),0)/total):0;
    // Calculate advanced stats
    const allActions = hands.flatMap(h=>(h.seats||[])
      .filter(s=>s.playerName===filterPlayer)
      .flatMap(s=>(s.actions||[]).map(a=>({...a, handId:h.id}))));
    
    const streets = ['פרה-פלופ','פלופ','טורן','ריבר'];
    const vpip = hands.filter(h=>(h.seats||[]).some(s=>s.playerName===filterPlayer&&(s.actions||[]).some(a=>a.type==='Call'||a.type==='Raise'||a.type==='Open'||a.type==='3bet'||a.type==='4bet'))).length;
    const pfr = hands.filter(h=>(h.seats||[]).some(s=>s.playerName===filterPlayer&&(s.actions||[]).some(a=>a.street==='פרה-פלופ'&&(a.type==='Raise'||a.type==='Open'||a.type==='3bet'||a.type==='4bet')))).length;
    const raises = allActions.filter(a=>a.type==='Raise'||a.type==='Open'||a.type==='3bet'||a.type==='4bet'||a.type==='All-in');
    const calls  = allActions.filter(a=>a.type==='Call');
    const af = calls.length>0 ? (raises.length/calls.length).toFixed(1) : raises.length>0?'∞':'0';
    
    const raisesByStreet = streets.map(st=>allActions.filter(a=>a.street===st&&(a.type==='Raise'||a.type==='Open'||a.type==='3bet'||a.type==='4bet'||a.type==='All-in')).length);

    const statCell = (label,val,color='#e2ddd4',sub='')=>
      `<div style="flex:1;padding:6px 8px;text-align:center;border-left:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:9px;color:#8a8799;margin-bottom:2px">${label}</div>
        <div style="font-size:15px;font-weight:800;color:${color}">${val}</div>
        ${sub?`<div style="font-size:9px;color:#8a8799">${sub}</div>`:''}
      </div>`;

    statsBar.innerHTML =
      statCell('ידיים', total)+
      statCell('ניצחונות', wins, '#5fc47a', pct+'%')+
      statCell('VPIP', total>0?Math.round(vpip/total*100)+'%':'–', '#c8a96e')+
      statCell('PFR', total>0?Math.round(pfr/total*100)+'%':'–', '#5b9bd5')+
      statCell('AF', af, '#FFB347');

    // Street raises breakdown
    const streetBar = document.createElement('div');
    streetBar.style.cssText = 'display:flex;background:#080b12;border-bottom:1px solid rgba(255,255,255,0.06)';
    streetBar.innerHTML = streets.map((st,i)=>
      `<div style="flex:1;padding:5px 8px;text-align:center;border-left:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:9px;color:#8a8799">${st.slice(0,2)} רייז</div>
        <div style="font-size:13px;font-weight:700;color:#e2ddd4">${raisesByStreet[i]}</div>
      </div>`
    ).join('');
    statsBar.style.display='flex';
    // Remove old street bar if exists
    document.getElementById('hands-street-bar')?.remove();
    statsBar.insertAdjacentElement('afterend', streetBar);
    streetBar.id = 'hands-street-bar';
  } else if(statsBar) {
    statsBar.style.display = 'none';
    document.getElementById('hands-street-bar')?.remove();
  }

  document.getElementById('hands-count').textContent=`${hands.length} מתוך ${S.handLog.length} ידיים`;
  if(!hands.length){cont.innerHTML='<div class="empty-state"><div class="empty-icon">🃏</div>לא נמצאו ידיים</div>';return;}
  const allHands = hands; // use filtered list below
  const _hlCard = (c, big)=>`<div style="width:${big?24:20}px;height:${big?34:28}px;border-radius:${big?4:3}px;background:#fff;border:1px solid #ddd;display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:${big?2:1}px;box-sizing:border-box;${big?'box-shadow:0 1px 4px rgba(0,0,0,0.5);':''}margin-left:3px"><span style="font-size:${big?17:14}px;font-weight:900;color:${SC[c.suit]};line-height:1">${c.rank}</span><span style="font-size:${big?13:11}px;color:${SC[c.suit]};line-height:1">${c.suit}</span></div>`;
  cont.innerHTML=allHands.map((h,hi)=>{
    const boardCards=(h.board||[]).filter(Boolean);
    // Find my cards (current user) — "שלי" זה תמיד המושב של המנהל/ת המחוברת
    const myName = currentUser?.name||'';
    const mySeat = (h.seats||[]).find(s=>s.playerName===myName||(s.playerId&&pName(s.playerId)===myName));
    const myCards = mySeat?(mySeat.cards||[]).filter(Boolean):[];
    const myCardsHtml = myCards.map(c=>_hlCard(c,true)).join('');
    // קלפי היד/ות המנצחת/ות (לתמיכה בחלוקת פוט — כמה מנצחים)
    const winnerSeats = (h.winners||[]).map(w=>(h.seats||[]).find(s=>s.seatIdx===w.seatIdx||(w.playerId&&s.playerId===w.playerId))).filter(Boolean);
    const winnerGroupsHtml = winnerSeats.map(s=>{
      const cards=(s.cards||[]).filter(Boolean);
      return cards.length ? `<div style="display:flex;direction:ltr">${cards.map(c=>_hlCard(c,true)).join('')}</div>` : '';
    }).filter(Boolean).join('<span style="color:#3a3850;font-size:11px;align-self:center;margin:0 2px">+</span>');
    return`<div class="card-item" onclick="showHandDetail('${h.id}')" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div>
          <div style="font-size:11px;font-weight:700;color:#e2ddd4">${h.label||h.blinds}</div>
          ${(h.winners||[]).length?`<div style="font-size:10px;color:#5fc47a">🏆 ${h.winners.map(w=>w.name).join(' + ')}</div>`:'' }
          <div style="font-size:10px;color:var(--muted)">${h.date} · ${h.blinds}</div>
        </div>
        <button class="btn btn-red btn-xs" onclick="event.stopPropagation();deleteHand(${hi})">✕</button>
      </div>
      ${(winnerGroupsHtml||myCardsHtml)?`<div style="display:flex;gap:12px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        ${winnerGroupsHtml?`<div style="display:flex;align-items:center;gap:4px"><span style="font-size:9px;color:#8a8799">🏆</span>${winnerGroupsHtml}</div>`:''}
        ${myCardsHtml?`<div style="display:flex;align-items:center;gap:4px"><span style="font-size:9px;color:#8a8799">שלי</span><div style="display:flex;direction:ltr">${myCardsHtml}</div></div>`:''}
      </div>`:''}
      ${boardCards.length?`<div style="display:flex;gap:3px;direction:ltr">${boardCards.map(c=>_hlCard(c,false)).join('')}</div>`:``}
    </div>`;
  }).join('');
}
function deleteHand(hi){
  const hand = S.handLog[hi];
  markDeleted('hands',hand?.id);
  S.handLog.splice(hi,1); persist(); renderHandList();
  // מחק גם מ-Firebase — אחרת syncFromSheets ימזג את היד חזרה תוך 10 שניות
  if(hand?.id && !isViewer() && !isLocal() && currentUser?.username){
    const uname = encodeURIComponent(currentUser.username);
    fetch(FIREBASE_URL+'/users/'+uname+'/hands/'+hand.id+'.json',{method:'DELETE'})
      .catch(e=>console.log('[deleteHand] cloud delete failed:', e.message));
  }
}

// ═══════════════════════════════════════════════════════
// TOURNAMENT
// ═══════════════════════════════════════════════════════
function calcPrizes(){
  const pool=prizePool();
  const house=S.houseRake||0;
  const surprises=S.surprisesAmount||0;
  const p4=parseFloat(S.place4)||0;
  const p3=parseFloat(S.place3)||0;
  const rem=Math.max(0,pool-house-surprises-p4-p3);
  const p1auto=rem*0.7, p2auto=rem*0.3;
  const p1=S.place1Override!=null?S.place1Override:p1auto;
  const p2=S.place2Override!=null?S.place2Override:p2auto;
  return{pool,house,surprises,p4,p3,p2,p1,rem,p1auto,p2auto};
}
function confirmSaveTournament(){
  const name = document.getElementById('tourn-name-inp')?.value?.trim()||'';
  document.getElementById('save-tourn-box').style.display='none';
  saveTournament(name);
}

function showSaveTournDialog(){
  if(isViewer()){notify('צופה בלבד');return;}
  document.getElementById('save-tourn-box').style.display='flex';
  document.getElementById('tourn-name-inp').value='';
  setTimeout(()=>document.getElementById('tourn-name-inp')?.focus(),100);
}

function saveTournament(tournName){if(isViewer()){notify('צופה בלבד');return;}
  const pr=calcPrizes();
  // Determine places: koOrder = [first KO, second KO, ...]
  // Reverse for placing: last KO = 4th place, second-to-last = 3rd, etc.
  const ko=[...S.koOrder];
  const allSeatedPids=S.seats.filter(s=>s.playerId).map(s=>s.playerId);
  // Active players = have buyin AND not KO'd (regardless of seat)
  const activePids=Object.keys(S.buyins).filter(pid=>S.buyins[pid]?.buyin>0&&!S.koOrder.includes(pid));
  // Build a name map for all known pids
  const nameMap={};
  S.playerLib.forEach(p=>{nameMap[p.id]=p.name;});
  const activeSorted = [...activePids].sort((a,b)=>{
    const sa = S.seats.find(s=>s.playerId===a)?.stack||0;
    const sb2 = S.seats.find(s=>s.playerId===b)?.stack||0;
    return sb2-sa;
  });
  const t={
    id:uid(), date:new Date().toLocaleDateString('he-IL'), name:tournName||'',
    buyinCost:S.buyinCost, totalBuyins:totalBuyins(), totalRebuys:totalRebuys(),
    totalEntries:totalEntries(), paidEntries:calcPaidEntries(), freeRebuys:calcFreeRebuys(), prizePool:pr.pool,
    houseRake:pr.house, surprisesAmount:S.surprisesAmount||0, place4:pr.p4, place3:pr.p3, place2:pr.p2, place1:pr.p1,
    koOrder:[...S.koOrder],
    finishOrder:[...activeSorted, ...[...S.koOrder].reverse()].map((pid,i)=>({place:i+1,pid,name:pName(pid),rebuy:(S.buyins[pid]||{}).rebuy||0})),
    activePlayers:activePids.map(pid=>({pid,name:pName(pid)})),
    playerNames:nameMap,
    blinds:`${getBlinds().sb}/${getBlinds().bb}`
  };
  S.tournLog=[t,...S.tournLog];
  persist(); renderTournList(); notify('טורניר נשמר ✓');
}
function resetTournament(){if(isViewer()){notify('צופה בלבד');return;}
  // Show inline confirm inside the app
  const cont = document.getElementById('tourn-list');
  const prev = cont.innerHTML;
  cont.insertAdjacentHTML('afterbegin', `
    <div id="reset-confirm" style="background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.4);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-size:14px;font-weight:700;color:#e07b6a;margin-bottom:6px;text-align:center">לאפס את כל נתוני הטורניר?</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:12px;text-align:center">פעולה זו תמחק BuyIn, Rebuy, סדר הדחה וכל נתוני השולחן</div>
      <input id="reset-tourn-name" type="text" placeholder="שם הטורניר לשמירה (אופציונלי)..."
        style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:13px;outline:none;direction:rtl;box-sizing:border-box;margin-bottom:10px">
      <div style="display:flex;gap:8px">
        <button class="btn btn-gold" style="flex:2" onclick="doSaveAndReset()">💾 שמור ואפס</button>
        <button class="btn btn-red" style="flex:1" onclick="doResetTournament()">אפס בלבד</button>
        <button class="btn btn-gray" style="flex:1" onclick="document.getElementById('reset-confirm')?.remove()">ביטול</button>
      </div>
    </div>`);
}
function doSaveAndReset(){
  const name = document.getElementById('reset-tourn-name')?.value?.trim()||'';
  saveTournament(name);
  doResetTournament();
}

function doResetTournament(){
  // Reset blind timer
  S.blindLevel = 0;
  S.blindTimer.running = false;
  S.blindTimer.secondsLeft = getLevelDuration(0);
  const btn = document.getElementById('btn-timer-toggle');
  if(btn) btn.textContent = '▶';
  updateTimerDisplay();
  document.getElementById('reset-confirm')?.remove();
  S.buyins={}; S.koOrder=[];
  S.seats=S.seats.map(s=>({...s,playerId:'',stack:0,cards:[null,null],actions:[],folded:false,allin:false}));
  S.board=[null,null,null,null,null];
  persist(); render(); renderTournList(); notify('טורניר אופס ✓');
}
function editTournName(ti){
  const t = S.tournLog[ti];
  if(!t) return;
  const existing = document.getElementById('edit-tourn-name-'+ti);
  if(existing){ existing.remove(); return; }
  const card = document.querySelectorAll('#tourn-list .card-item')[ti+1]; // +1 because current tourn is first
  // Find the name span
  const nameSpan = document.querySelector('[onclick="editTournName('+ti+')"]');
  if(!nameSpan) return;
  const inp = document.createElement('input');
  inp.id = 'edit-tourn-name-'+ti;
  inp.value = t.name||'';
  inp.placeholder = 'שם הטורניר...';
  inp.style.cssText = 'padding:4px 8px;border-radius:7px;border:1px solid rgba(200,169,110,0.5);background:#0a0e18;color:#e2ddd4;font-size:13px;outline:none;direction:rtl;width:140px';
  inp.onkeydown = (e)=>{
    if(e.key==='Enter'){ saveTournName(ti, inp.value); inp.remove(); renderTournList(); }
    if(e.key==='Escape'){ inp.remove(); }
  };
  inp.onblur = ()=>{ saveTournName(ti, inp.value); inp.remove(); renderTournList(); };
  nameSpan.replaceWith(inp);
  inp.focus(); inp.select();
}

function saveTournName(ti, name){
  if(S.tournLog[ti]) S.tournLog[ti].name = name.trim();
  persist();
}

function deleteTournament(ti){
  markDeleted('tourns',S.tournLog[ti]?.id);
  S.tournLog.splice(ti,1); persist(); renderTournList();
}
function renderTournList(){
  const cont = document.getElementById('tourn-list');
  const pr = calcPrizes();

  // Build finish order - only show placements if game has started (someone KO'd or only 1 left)
  const winners = Object.keys(S.buyins).filter(pid=>S.buyins[pid]?.buyin>0&&!S.koOrder.includes(pid));
  const finishRows = [];
  const gameStarted = S.koOrder.length > 0 || winners.length === 1;
  if(gameStarted){
    // מיין שחקנים פעילים לפי stack יורד
    const winnersSorted = [...winners].sort((a,b)=>{
      const sa = S.seats.find(s=>s.playerId===a)?.stack||0;
      const sb2 = S.seats.find(s=>s.playerId===b)?.stack||0;
      return sb2-sa;
    });
    winnersSorted.forEach((pid,i)=>finishRows.push({place:i+1,pid}));
    [...S.koOrder].reverse().forEach((pid,i)=>finishRows.push({place:winners.length+i+1,pid}));
  }

  // Prize per place
  const prizeByPlace = {1:Math.round(pr.p1), 2:Math.round(pr.p2), 3:pr.p3||0, 4:pr.p4||0};

  // Rebuy per player
  const rebuyByPid = pid => (S.buyins[pid]||{}).rebuy||0;

  // Active players count
  const activeCnt2 = Object.keys(S.buyins).filter(pid=>S.buyins[pid]?.buyin>0&&!S.koOrder.includes(pid)).length;
  const showWinners = activeCnt2 <= 1;

  let html = `<div class="card-item" style="border-color:rgba(200,169,110,0.3);margin-bottom:14px">
    <div style="font-size:13px;font-weight:800;color:var(--gold);margin-bottom:10px">טורניר נוכחי</div>

    <!-- BUYIN + REBUY BAR CHART - shown whenever there are players with buyin -->
    ${Object.values(S.buyins).some(b=>b.buyin>0)?`
    <div style="margin-bottom:12px">
      <div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:6px">📊 כניסות ו-Rebuy</div>
      <div style="overflow-x:auto;padding-bottom:4px">
        <div style="display:flex;align-items:flex-end;gap:4px;padding:0 2px;min-width:min-content">
          ${(()=>{
            const entries = Object.entries(S.buyins).filter(([pid,b])=>b.buyin>0).sort((a,b)=>(b[1].rebuy||0)-(a[1].rebuy||0));
            const maxRebuy = Math.max(...entries.map(([pid,b])=>b.rebuy||0), 1);
            const BAR_MAX = 72; // px available for rebuy portion
            const BUYIN_H = 12; // px — fixed green height for everyone
            return entries.map(([pid,b])=>{
              const rebuyH = b.rebuy>0 ? Math.max(Math.round((b.rebuy/maxRebuy)*BAR_MAX), 6) : 0;
              const hasFree16 = b.rebuy>=16;
              const hasFree10 = b.rebuy>=10;
              const rebuyColor = hasFree16?'#e07b6a':hasFree10?'#5b9bd5':'rgba(200,169,110,0.85)';
              const badge = hasFree16?'16✓':hasFree10?'10✓':'';
              const name = pName(pid)||'?';
              const isKO = S.koOrder.includes(pid);
              return `<div style="display:flex;flex-direction:column;align-items:center;width:32px;flex-shrink:0;opacity:${isKO?0.45:1}">
                <div style="font-size:11px;font-weight:900;color:${b.rebuy>0?rebuyColor:'transparent'};margin-bottom:3px;white-space:nowrap;min-height:14px">${b.rebuy>0?b.rebuy+(badge?`<span style='font-size:10px'>${badge}</span>`:''):''}</div>
                <div style="width:26px;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-end">
                  ${rebuyH>0?`<div style="width:100%;height:${rebuyH}px;background:${rebuyColor};border-radius:3px 3px 0 0;margin-bottom:1px"></div>`:''}
                  <div style="width:100%;height:${BUYIN_H}px;background:rgba(95,196,122,0.75);border-radius:${rebuyH>0?'0':'3px 3px 0 0'}"></div>
                </div>
                <div style="height:52px;display:flex;align-items:flex-start;justify-content:center;margin-top:3px">
                  <span style="font-size:13px;font-weight:700;color:${isKO?'var(--muted)':'#e2ddd4'};writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);white-space:nowrap;line-height:1;letter-spacing:2px">${name}</span>
                </div>
              </div>`;
            }).join('');
          })()}
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <span style="font-size:9px;color:rgba(95,196,122,0.8)">■ כניסה</span>
        ${Object.values(S.buyins).some(b=>b.rebuy>0)?`<span style="font-size:9px;color:rgba(200,169,110,0.8)">■ Rebuy</span>`:''}
      </div>
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:10px"></div>
    `:''}

    <!-- TOP 4 PLACES - only when 1 or 0 active players remain -->
    ${showWinners && finishRows.filter(r=>r.place<=4).length ? `
    <div style="margin-bottom:14px">
      ${finishRows.filter(r=>r.place<=4).map(r=>{
        const name = pName(r.pid)||'?';
        const rb = rebuyByPid(r.pid);
        const prize = prizeByPlace[r.place]||0;
        if(r.place <= 3){
          const medals = {1:{e:'🏆',c:'#FFD700',s:'24px'},2:{e:'🥈',c:'#C0C0C0',s:'20px'},3:{e:'🥉',c:'#CD7F32',s:'18px'}};
          const m = medals[r.place];
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:7px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid ${m.c}30">
            <div style="text-align:center;min-width:44px">
              <div style="font-size:${m.s}">${m.e}</div>
              <div style="font-size:9px;font-weight:800;color:${m.c}">מקום ${r.place}</div>
            </div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:800;color:#e2ddd4">${name}</div>
              ${rb>0?`<div style="font-size:11px;color:var(--muted)">Rebuy: ${rb}</div>`:'<div style="font-size:11px;color:var(--muted2)">ללא Rebuy</div>'}
            </div>
            ${prize?`<div style="font-size:15px;font-weight:900;color:${r.place===1?'#5fc47a':'var(--gold)'}">₪${prize.toLocaleString()}</div>`:''}
          </div>`;
        } else {
          return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:7px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07)">
            <div style="text-align:center;min-width:44px">
              <div style="font-size:13px;color:var(--muted);font-weight:700">מקום 4</div>
            </div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700;color:#e2ddd4">${name}</div>
              ${rb>0?`<div style="font-size:11px;color:var(--muted)">Rebuy: ${rb}</div>`:'<div style="font-size:11px;color:var(--muted2)">ללא Rebuy</div>'}
            </div>
            ${prize?`<div style="font-size:13px;font-weight:800;color:var(--gold)">₪${prize.toLocaleString()}</div>`:''}
          </div>`;
        }
      }).join('')}
    </div>` : ''}

    <div style="height:1px;background:rgba(255,255,255,0.06);margin:10px 0"></div>
    <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:8px">📊 נתוני טורניר</div>
    <div class="prize-row"><span class="prize-lbl">שחקנים</span><span class="prize-val">${totalBuyins()}</span></div>
    <div class="prize-row">
      <span class="prize-lbl">Rebuy כולל</span>
      <span class="prize-val">${totalRebuys()}${calcFreeRebuys()>0?` <span style="font-size:10px;color:#5b9bd5;font-weight:600">(${calcFreeRebuys()} חינם)</span>`:''}</span>
    </div>
    <div class="prize-row"><span class="prize-lbl">כניסות בתשלום</span><span class="prize-val">${calcPaidEntries()}</span></div>
    ${isAdmin()?`<div class="prize-row"><span class="prize-lbl" style="color:#7fd47f">🃏 צ׳יפים כולל</span><span class="prize-val" style="color:#7fd47f">${totalChips().toLocaleString()}</span></div>`:''}
    <div class="prize-row"><span class="prize-lbl">קופת פרסים</span><span class="prize-val">₪${pr.pool.toLocaleString()}</span></div>



    <div style="height:1px;background:rgba(255,255,255,0.06);margin:10px 0"></div>
    <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:8px">💰 חישוב וחלוקת פרסים</div>
    <div class="prize-row">
      <span class="prize-lbl" style="color:var(--gold);font-weight:700">מקום 1 ${S.place1Override!=null&&pr.rem?`(${Math.round(S.place1Override/pr.rem*100)}%)`:'(70%)'}</span>
      ${isViewer()?
        `<span class="prize-val" style="color:var(--green);font-size:16px">₪${Math.round(S.place1Override!=null?S.place1Override:pr.p1).toLocaleString()}</span>`
       :`<div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;color:var(--muted)">₪${Math.round(pr.p1).toLocaleString()}</span>
          <input class="prize-inp" type="number" placeholder="עקוף" value="${S.place1Override!=null?S.place1Override:''}"
            onchange="S.place1Override=this.value?+this.value:null;persist();renderTournList()"
            style="width:80px" title="השאר ריק לחישוב אוטומטי 70%">
        </div>`}
    </div>
    <div class="prize-row">
      <span class="prize-lbl" style="color:var(--text)">מקום 2 ${S.place2Override!=null&&pr.rem?`(${Math.round(S.place2Override/pr.rem*100)}%)`:'(30%)'}</span>
      ${isViewer()?
        `<span class="prize-val">₪${Math.round(S.place2Override!=null?S.place2Override:pr.p2).toLocaleString()}</span>`
       :`<div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;color:var(--muted)">₪${Math.round(pr.p2).toLocaleString()}</span>
          <input class="prize-inp" type="number" placeholder="עקוף" value="${S.place2Override!=null?S.place2Override:''}"
            onchange="S.place2Override=this.value?+this.value:null;persist();renderTournList()"
            style="width:80px" title="השאר ריק לחישוב אוטומטי 30%">
        </div>`}
    </div>
    <div class="prize-row" style="justify-content:space-between">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="prize-lbl" style="min-width:auto">מקום 3</span>
        ${isViewer()?`<span class="prize-val">${S.place3?'₪'+S.place3.toLocaleString():'-'}</span>`:`<input class="prize-inp" type="number" value="${S.place3||0}" placeholder="0" onchange="S.place3=+this.value;persist();renderTournList()">`}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="prize-lbl" style="min-width:auto">בית</span>
        ${isViewer()?`<span class="prize-val">₪${S.houseRake.toLocaleString()}</span>`:`<input class="prize-inp" type="number" value="${S.houseRake}" onchange="S.houseRake=+this.value;persist();renderTournList()">`}
      </div>
    </div>
    <div class="prize-row" style="justify-content:space-between">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="prize-lbl" style="min-width:auto">מקום 4</span>
        ${isViewer()?`<span class="prize-val">${S.place4?'₪'+S.place4.toLocaleString():'-'}</span>`:`<input class="prize-inp" type="number" value="${S.place4||0}" placeholder="0" onchange="S.place4=+this.value;persist();renderTournList()">`}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="prize-lbl" style="min-width:auto">הפתעות</span>
        ${isViewer()?`<span class="prize-val">₪${(S.surprisesAmount||0).toLocaleString()}</span>`:`<input class="prize-inp" type="number" value="${S.surprisesAmount||0}" placeholder="0" onchange="S.surprisesAmount=+this.value;persist();renderTournList()">`}
      </div>
    </div>
    ${isAdmin()?`
    <div style="display:flex;gap:6px;margin-top:12px">
      <button onclick="openSaveTournBox()" style="flex:1;padding:9px 6px;border-radius:9px;border:1px solid rgba(200,169,110,0.4);background:rgba(200,169,110,0.1);color:#c8a96e;font-size:11px;font-weight:800;cursor:pointer">💾 שמור</button>
      <button onclick="if(confirm('לאפס את הטורניר?'))resetTournament()" style="flex:1;padding:9px 6px;border-radius:9px;border:1px solid rgba(224,123,106,0.4);background:rgba(224,123,106,0.08);color:#e07b6a;font-size:11px;font-weight:800;cursor:pointer">🗑 אפס</button>
    </div>`:''}
  </div>`;

  // Tournament history
  if(S.tournLog.length){
    html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:12px;font-weight:700;color:var(--gold)">היסטוריה (${S.tournLog.length})</div>
      ${isAdmin()?`<div style="display:flex;gap:6px">
        <button onclick="exportToExcel()" style="font-size:10px;color:#8a8799;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:3px 8px;cursor:pointer">📊 Excel</button>
        <button onclick="fixTournFinishOrders()" style="font-size:10px;color:#8a8799;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:3px 8px;cursor:pointer">🔧 תקן סדר</button>
      </div>`:''}
    </div>`;
    html += S.tournLog.map((t,ti)=>{
      const prizeByPlaceT = {1:Math.round(t.place1||0),2:Math.round(t.place2||0),3:t.place3||0,4:t.place4||0};
      const finishT = (t.finishOrder||[]).slice().sort((a,b)=>a.place-b.place);
      const rebuyT = pid => finishT.find(f=>f.pid===pid)?.rebuy||0;
      return `<div class="card-item" id="tourn-card-${ti}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-size:13px;color:#b0a8a0">${t.date}</span>
              ${isAdmin()?`<span style="font-size:15px;font-weight:800;color:#f0ece4;cursor:pointer;border-bottom:1px dashed rgba(200,169,110,0.4)" 
              onclick="editTournName(${ti})" title="לחץ לעריכת שם">${t.name||'+ הוסף שם'}</span>`
              :t.name?`<span style="font-size:15px;font-weight:800;color:#f0ece4">${t.name}</span>`:''}
            </div>
            <div style="font-size:20px;font-weight:900;color:var(--gold)">₪${(t.prizePool||0).toLocaleString()}</div>
          </div>
          <div class="share-hide" style="display:flex;gap:6px">
            <button class="btn btn-xs" style="background:rgba(91,155,213,0.15);border:1px solid rgba(91,155,213,0.4);color:#5b9bd5" onclick="shareTournamentImage(${ti})" title="שתף כתמונה">📤</button>
            <button class="btn btn-red btn-xs" onclick="deleteTournament(${ti})">✕</button>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:6px;margin-bottom:8px">
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:5px 10px;text-align:center;flex-shrink:0">
            <div style="font-size:10px;color:#8a8090;margin-bottom:1px">שחקנים</div>
            <div style="font-size:18px;font-weight:900;color:#f0ece4">${t.totalBuyins}</div>
          </div>
          <div style="background:rgba(90,58,138,0.2);border:1px solid rgba(155,111,212,0.3);border-radius:10px;padding:5px 10px;text-align:center;flex-shrink:0">
            <div style="font-size:10px;color:#9b6fd4;margin-bottom:1px">Rebuy</div>
            <div style="font-size:18px;font-weight:900;color:#e2c4ff">${t.totalRebuys}</div>
          </div>
          <div style="background:rgba(200,169,110,0.1);border:1px solid rgba(200,169,110,0.25);border-radius:10px;padding:5px 10px;text-align:center;flex-shrink:0">
            <div style="font-size:10px;color:#c8a96e;margin-bottom:1px">כניסות${t.freeRebuys?` <span style="color:#5b9bd5">(${t.freeRebuys}🎁)</span>`:''}</div>
            <div style="font-size:18px;font-weight:900;color:#f0ece4">${t.paidEntries||t.totalEntries}</div>
          </div>
          ${t.surprisesAmount?`
          <div style="background:rgba(224,123,106,0.1);border:1px solid rgba(224,123,106,0.3);border-radius:10px;padding:5px 10px;text-align:center;flex-shrink:0">
            <div style="font-size:10px;color:#e07b6a;margin-bottom:1px">🎉 הפתעות</div>
            <div style="font-size:16px;font-weight:900;color:#e07b6a">₪${t.surprisesAmount.toLocaleString()}</div>
          </div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <!-- Places column -->
          <div>
            ${finishT.filter(f=>f.place<=4).map(f=>{
              const rb = f.rebuy||0;
              const prize = prizeByPlaceT[f.place]||0;
              const medals={1:'🏆',2:'🥈',3:'🥉'};
              const colors={1:'#FFD700',2:'#C0C0C0',3:'#CD7F32'};
              const medal = medals[f.place]||'';
              const color = colors[f.place]||'var(--gold)';
              return `<div style="display:flex;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                <span style="font-size:${f.place<=3?'14':'12'}px;flex-shrink:0;margin-left:4px">${medal||f.place+'.'}</span>
                <span style="font-size:13px;font-weight:700;color:#e2ddd4;flex:1">${f.name||'?'}${rb>0?` <span style="font-size:12px;font-weight:900;color:var(--gold)">(${rb})</span>`:''}</span>
                ${prize?`<span style="font-size:13px;font-weight:800;color:${color};flex-shrink:0">₪${prize.toLocaleString()}</span>`:''}
              </div>`;
            }).join('')}
          </div>
          <!-- Buyin + Rebuy vertical bar chart - always shown when players exist -->
          ${(t.finishOrder||[]).length>0?`
          <div>
            <div style="display:flex;align-items:flex-end;gap:3px;padding:0 2px;overflow-x:auto">
              ${(()=>{
                const maxRebuy=Math.max(...(t.finishOrder||[]).map(f=>f.rebuy||0),1);
                const BAR_MAX=56; const BUYIN_H=10;
                return (t.finishOrder||[]).sort((a,b)=>(b.rebuy||0)-(a.rebuy||0)).map(f=>{
                  const rebuyH=f.rebuy>0?Math.max(Math.round((f.rebuy/maxRebuy)*BAR_MAX),5):0;
                  const hasFree16=f.rebuy>=16, hasFree10=f.rebuy>=10;
                  const rebuyColor=hasFree16?'#e07b6a':hasFree10?'#5b9bd5':'rgba(200,169,110,0.85)';
                  const badge=hasFree16?'16✓':hasFree10?'10✓':'';
                  return `<div style="display:flex;flex-direction:column;align-items:center;width:22px;flex-shrink:0">
                    <div style="font-size:9px;font-weight:900;color:${f.rebuy>0?rebuyColor:'transparent'};margin-bottom:2px;white-space:nowrap;min-height:12px">${f.rebuy>0?f.rebuy+(badge?`<span style='font-size:9px'>${badge}</span>`:''):''}</div>
                    <div style="width:16px;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-end">
                      ${rebuyH>0?`<div style="width:100%;height:${rebuyH}px;background:${rebuyColor};border-radius:2px 2px 0 0;margin-bottom:1px"></div>`:''}
                      <div style="width:100%;height:${BUYIN_H}px;background:rgba(95,196,122,0.75);border-radius:${rebuyH>0?'0':'2px 2px 0 0'}"></div>
                    </div>
                    <div style="height:36px;display:flex;align-items:flex-start;justify-content:center;margin-top:2px">
                      <span style="font-size:12px;font-weight:700;color:#e2ddd4;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);white-space:nowrap;letter-spacing:2px">${f.name}</span>
                    </div>
                  </div>`;
                }).join('');
              })()}
            </div>
            <div style="display:flex;gap:8px;margin-top:3px">
              <span style="font-size:10px;color:rgba(95,196,122,0.8)">■ כניסה</span>
              ${(t.finishOrder||[]).some(f=>f.rebuy>0)?`<span style="font-size:10px;color:rgba(200,169,110,0.8)">■ Rebuy</span>`:''}
            </div>
          </div>`:''}
        </div>
        ${t.totalRebuys>0&&t.finishOrder?.some(f=>f.rebuy>0)?`
        <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.05)">

        </div>`:''}
      </div>`;
    }).join('');
  }

  cont.innerHTML = html;
}

// ═══════════════════════════════════════════════════════
// PLAYERS
// ═══════════════════════════════════════════════════════
const PLAYER_TYPES = {
  TAG:  {label:'TAG',  color:'#5b9bd5', desc:'Tight Aggressive'},
  LAG:  {label:'LAG',  color:'#c8a96e', desc:'Loose Aggressive'},
  Nit:  {label:'Nit',  color:'#7eb8a4', desc:'Tight Passive'},
  Station:{label:'Station',color:'#e07b6a',desc:'Calling Station'},
  Fish: {label:'Fish', color:'#9b7eb8', desc:'Unpredictable'},
};

let _expandedPlayer = null;

function togglePlayerProfile(pid){
  _expandedPlayer = _expandedPlayer===pid ? null : pid;
  renderPlayerList();
}

function savePlayerProfile(pid){
  const p = S.playerLib.find(x=>x.id===pid);
  if(!p) return;
  const nameEl = document.getElementById('edit-name-'+pid);
  const notesEl = document.getElementById('edit-notes-'+pid);
  const typeEl = document.querySelector(`[data-ptype="${pid}"].ptype-active`);
  if(nameEl && nameEl.value.trim()) p.name = nameEl.value.trim();
  if(notesEl){
    if(!S.playerNotes) S.playerNotes={};
    S.playerNotes[pid] = notesEl.value.trim();
  }
  if(typeEl) p.playerType = typeEl.dataset.ptypeVal;
  _expandedPlayer = null;
  persist(); renderPlayerList();
  notify('✓ פרופיל עודכן');
}

function setPlayerType(pid, type){
  document.querySelectorAll(`[data-ptype="${pid}"]`).forEach(el=>{
    el.classList.toggle('ptype-active', el.dataset.ptypeVal===type);
    const t = PLAYER_TYPES[el.dataset.ptypeVal];
    if(t){
      el.style.background = el.dataset.ptypeVal===type ? t.color+'33' : 'rgba(255,255,255,0.04)';
      el.style.borderColor = el.dataset.ptypeVal===type ? t.color+'88' : 'rgba(255,255,255,0.1)';
      el.style.color = el.dataset.ptypeVal===type ? t.color : '#8a8799';
    }
  });
}

function openSaveTournBox(){ showSaveTournDialog(); }

function exportToExcel(){ exportTournsToCSV(); }

// ===== ייצוא ידיים לפורמט PokerStars (לייבוא ל-PokerTracker 4/5) =====
// שני הפורמטים (PT4/PT5) קוראים בדיוק את אותו טקסט hand-history של PokerStars —
// אין צורך בשני יצואים נפרדים.
//
// הגבלות ידועות, לא מוסתרות: side-pots במצבי all-in מרובי-שחקנים בסכומים
// שונים לא מטופלים בדיוק לפי החישוב המלא של PokerStars (וגם "Uncalled bet"
// מטפל רק במקרה הפשוט של שחקן יחיד שנשאר). מומלץ לבדוק ייבוא עם 2-3 ידיים
// לפני ייצוא גדול.
function _cardToPS(c){
  if(!c || !c.rank) return '';
  const suitMap = {'♠':'s','♥':'h','♦':'d','♣':'c'};
  const rank = c.rank==='10' ? 'T' : c.rank;
  return rank + (suitMap[c.suit]||'');
}

function _handToPSFormat(hand, handNumber){
  const seats = (hand.seats||[]).filter(s=>s.playerName);
  if(!seats.length) return '';
  const [sbAmt,bbAmt] = (hand.blinds||'0/0').split('/').map(s=>(s||'0').trim());
  const dateObj = new Date(hand.ts || Date.now());
  const pad = n=>String(n).padStart(2,'0');
  const dateStr = `${dateObj.getFullYear()}/${pad(dateObj.getMonth()+1)}/${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
  const lines = [];

  // מספור מושבים: 1..N לפי סדר-שולחן אמיתי (יחסית לכפתור), לא לפי seatIdx
  // הפיזי הגולמי — PokerTracker מחשב את העמדה של כל שחקן (UTG/MP/CO וכו')
  // על ידי הליכה סביב השולחן ממספר-המושב של הכפתור, לא מטקסט מפורש. רק
  // SB/BB מקבלים את העמדה שלהם "בחינם" משורות ה-posts blind — לכל שאר
  // השחקנים, אם מספור המושבים לא באמת עוקב אחרי סדר השולחן, PT מחשב עמדה
  // שגויה. בדיוק זה מה שגרם לבאג שדווח: רק SB/BB יצאו עם עמדה נכונה.
  const sortedSeats = _sortSeatsByPos(seats);
  const seatNum = new Map();
  sortedSeats.forEach((s,i)=>seatNum.set(s.seatIdx, i+1));
  const btnSeat = seats.find(s=>s.pos==='BTN');
  const btnNum = btnSeat ? seatNum.get(btnSeat.seatIdx) : 1;

  // "Hero": שתי הדוגמאות האמיתיות שסופקו (7XL, GG Rush&Cash) מראות ששחקן-
  // הבית תמיד נקרא בטקסט הייצוא בשם הליטרלי "Hero" — לא שם אמיתי — וזה כנראה
  // איך PT4 מזהה איזה שחקן זה "אתה" (ולא רק תיוג קוסמטי). אצלנו לא היה שום
  // סימון כזה עד עכשיו. currentUser.name (מ-auth.js) כבר קיים בקוד בשביל
  // בדיוק הזיהוי הזה (ראו isMe ב-renderSeats) — פשוט לא נוצל כאן. הפונקציה
  // הזו רק מחליפה את השם *בטקסט המוצג*; כל הלוגיקה הפנימית (streetTotal/
  // totalPaid/foldedNames וכו') ממשיכה להשתמש ב-playerName האמיתי כמפתח,
  // כדי לא לשבור שום התאמה.
  const heroRealName = (typeof currentUser!=='undefined' && currentUser?.name) || '';
  const _disp = name => (heroRealName && name===heroRealName) ? 'Hero' : name;

  // "Poker Hand" — לא "PokerStars Hand"! זה היה השורש האמיתי לכל הבעיה
  // (ראו CHANGELOG 72) — "PokerStars" מפעיל ב-PT4 את הפרסר הרשמי המחמיר
  // של PokerStars האמיתי, שדוחה את גוף היד שלנו (שבנוי לפי מוסכמות אתרים
  // אחרים). שתי הדוגמאות האמיתיות (7XL, GG Rush&Cash) גם הן פותחות ב-
  // "Poker Hand", לא "PokerStars Hand" — לא במקרה.
  lines.push(`Poker Hand #HG${handNumber}: Tournament #1, Home Game Hold'em No Limit - Level I (${sbAmt}/${bbAmt}) - ${dateStr} ET`);
  lines.push(`Table 'HomeGame' ${seats.length}-max Seat #${btnNum} is the button`);
  sortedSeats.forEach(s=>{
    lines.push(`Seat ${seatNum.get(s.seatIdx)}: ${_disp(s.playerName)} (${s.stack||0} in chips)`);
  });

  // הימורי חובה — קריטי: כל בלוק ה-ante חייב להופיע *במלואו* לפני שורות
  // ה-blind, לא מעורבב per-seat. בפורמט PokerStars אמיתי (ואומת מול דוגמה
  // עובדת מ-7XL) הסדר הוא תמיד: כל ה-antes (לפי סדר מושבים כלשהו) → SB →
  // BB → *** HOLE CARDS ***. הבאג שנתפס: מכיוון ש-Ante נדחף ל-actions של
  // כל מושב *אחרי* SB/BB (בלולאה נפרדת ב-game.js), לולאה יחידה שעוברת
  // מושב-מושב ומדפיסה "מה שנמצא" הייתה מפיקה SB/BB מעורבבים בתוך בלוק ה-
  // antes (למשל "SB posts small blind" ואז מיד "SB posts the ante") —
  // זה שובר את הפרסר של PT4 בדיוק במעבר "antes→blinds→hole cards", ולכן
  // הידיים נקלטו (כותרת/מושבים) אבל בלי תוכן בכלל. לכן: 3 לולאות נפרדות,
  // לא אחת — antes קודם (בלוק שלם), אח"כ SB, אח"כ BB.
  sortedSeats.forEach(s=>{
    (s.actions||[]).forEach(a=>{
      if(a.type==='Ante') lines.push(`${_disp(s.playerName)}: posts the ante ${a.amount||0}`);
    });
  });
  sortedSeats.forEach(s=>{
    (s.actions||[]).forEach(a=>{
      if(a.type==='SB') lines.push(`${_disp(s.playerName)}: posts small blind ${a.amount||0}`);
    });
  });
  sortedSeats.forEach(s=>{
    (s.actions||[]).forEach(a=>{
      if(a.type==='BB') lines.push(`${_disp(s.playerName)}: posts big blind ${a.amount||0}`);
    });
  });

  lines.push('*** HOLE CARDS ***');
  // תואם לשתי הדוגמאות שאומתו: כל שחקן מקבל שורת "Dealt to X", גם בלי קלפים
  // ידועים (ריקה, בלי סוגריים) — לא רק מי שיש לו שני קלפים. שינוי קטן אבל
  // תואם למבנה שנצפה בפועל בשני הפורמטים העובדים.
  seats.forEach(s=>{
    const c0 = s.cards?.[0], c1 = s.cards?.[1];
    lines.push((c0 && c1) ? `Dealt to ${_disp(s.playerName)} [${_cardToPS(c0)} ${_cardToPS(c1)}]` : `Dealt to ${_disp(s.playerName)} `);
  });

  const board = (hand.board||[]).filter(Boolean);
  const streetOrder = ['פרה-פלופ','פלופ','טורן','ריבר'];
  const streetHeader = {'פלופ':'FLOP','טורן':'TURN','ריבר':'RIVER'};
  const streetBoardCount = {'פלופ':3,'טורן':4,'ריבר':5};

  streetOrder.forEach(street=>{
    let acts = [];
    seats.forEach(s=>{
      (s.actions||[]).forEach(a=>{
        // 'Ante' חייב להיות מוחרג כאן בדיוק כמו SB/BB — הוא כבר מטופל בנפרד
        // בבלוק ה-antes/blinds למעלה. באג שנתפס רק על ידי הרצת סימולציה בפועל
        // (לא נראה מקריאת הקוד): בלי ההחרגה הזו, כל שורת "posts the ante" הייתה
        // גם נכנסת ללולאת הפעולות הרגילה, נופלת ל-default (raise/bet) כי אין לה
        // case תואם, ומייצרת שורות "raises ### to ###" מפוברקות/שליליות לגמרי.
        if(a.street===street && a.type!=='SB' && a.type!=='BB' && a.type!=='Ante') acts.push({...a, playerName:s.playerName});
      });
    });
    acts.sort((a,b)=>_actionSortKey(a)-_actionSortKey(b));

    // כמו ב-_handToSteps: מציגים קודם את חשיפת קלפי הרחוב (אם הבורד תומך בזה),
    // *לפני* שבודקים אם יש פעולות רשומות — אחרת רחוב עם 0 פעולות (למשל כולם
    // צ'קו והפעולות מכל סיבה לא נרשמו כמצופה) היה "בולע" גם את קלף הרחוב עצמו.
    if(street!=='פרה-פלופ'){
      const need = streetBoardCount[street];
      if(board.length < need) return; // היד הסתיימה לפני שהגיעו לרחוב הזה
      if(street==='פלופ'){
        lines.push(`*** FLOP *** [${board.slice(0,3).map(_cardToPS).join(' ')}]`);
      } else {
        const prevCount = need-1;
        lines.push(`*** ${streetHeader[street]} *** [${board.slice(0,prevCount).map(_cardToPS).join(' ')}] [${_cardToPS(board[prevCount])}]`);
      }
    }
    if(!acts.length) return; // אין פעולות רשומות ברחוב הזה — הכותרת כבר הודפסה למעלה

    // עוקבים אחרי (א) הסכום המצטבר שכל שחקן כבר הכניס ברחוב הזה (streetTotal,
    // ל-"to Y"), ו-(ב) ההימור הגבוה ביותר על השולחן כרגע ברחוב הזה (highBet,
    // ל-"raises X" — X הוא כמה מעל ההימור הקיים, לא הדלתא האישית של השחקן.
    // לדוגמה: BB=2000, שחקן מעלה ל-4000 → a.amount (הדלתא שלו) הוא 4000 כי הוא
    // עוד לא הכניס כלום ברחוב הזה — אבל הראייז ב-PokerStars הוא "raises 2000 to
    // 4000", לא "raises 4000 to 4000". highBet מתחיל מה-BB בפרה-פלופ, 0 בכל
    // רחוב אחר.
    const streetTotal = {};
    let highBet = 0;
    if(street==='פרה-פלופ'){
      seats.forEach(s=>{
        (s.actions||[]).forEach(a=>{
          if(a.type==='SB'||a.type==='BB'){
            const amt = parseFloat(a.amount)||0;
            streetTotal[s.playerName] = (streetTotal[s.playerName]||0) + amt;
            highBet = Math.max(highBet, streetTotal[s.playerName]);
          }
        });
      });
    }
    acts.forEach(a=>{
      const delta = parseFloat(a.amount)||0;
      const prevTotal = streetTotal[a.playerName]||0;
      const newTotal = prevTotal + (a.type==='Call'||a.type==='Check'||a.type==='Fold' ? 0 : delta);
      const raiseBy = newTotal - highBet; // כמה מעל ההימור הגבוה הקיים
      switch(a.type){
        case 'Fold': lines.push(`${_disp(a.playerName)}: folds`); break;
        case 'Check': lines.push(`${_disp(a.playerName)}: checks`); break;
        case 'Call': lines.push(`${_disp(a.playerName)}: calls ${delta||0}`); streetTotal[a.playerName]=prevTotal+delta; break;
        case 'All-in':
          lines.push(`${_disp(a.playerName)}: ${highBet>0?'raises '+raiseBy+' to '+newTotal:'bets '+delta} and is all-in`);
          streetTotal[a.playerName]=newTotal; highBet=Math.max(highBet,newTotal); break;
        default: // Raise, Open, 3bet, 4bet
          if(highBet>0){
            lines.push(`${_disp(a.playerName)}: raises ${raiseBy} to ${newTotal}`);
          } else {
            lines.push(`${_disp(a.playerName)}: bets ${delta}`);
          }
          streetTotal[a.playerName]=newTotal;
          highBet=Math.max(highBet,newTotal);
      }
    });
  });

  // *** SHOWDOWN/SUMMARY — נבנה מחדש לגמרי, ראה CHANGELOG (69): הגרסה
  // הקודמת (רק "*** SUMMARY ***" + שורת "collected" שטוחה) הייתה חסרה
  // לחלוטין את הבלוק הזה בהשוואה לשתי דוגמאות עובדות אמיתיות שהמשתמש
  // סיפק (יד עם ante מ-7XL, יד קאש בלי ante מ-GG Rush&Cash) — וזה קרה
  // בכל יד, לא רק ביד עם/בלי ante, מה שמסביר למה התיקון הקודם (סדר
  // antes/blinds) לא שינה כלום בפועל: הבעיה האמיתית הייתה כאן, לא שם.

  // סכום כולל ששולם על ידי כל שחקן על פני היד כולה (בליינד+אנטה+כל
  // הרחובות) — a.amount כבר מייצג את העלות המצטברת של כל פעולה בפני עצמה
  // (אומת ישירות מול הדוגמה: הראייז של הבאטן ל-$0.05 נשמר כ-a.amount=0.05,
  // לא כדלתא-מעל-ההימור-הקודם), אז סכימה פשוטה נכונה.
  const totalPaid = {};
  seats.forEach(s=>{
    let paid = 0;
    (s.actions||[]).forEach(a=>{
      if(['SB','BB','Ante','Call','Raise','Open','3bet','4bet','All-in'].includes(a.type)){
        paid += parseFloat(a.amount)||0;
      }
    });
    totalPaid[s.playerName] = paid;
  });

  const foldedNames = new Set(seats.filter(s=>(s.actions||[]).some(a=>a.type==='Fold')).map(s=>s.playerName));
  const stillActive = seats.filter(s=>!foldedNames.has(s.playerName));

  // "Uncalled bet" — מטפל רק במקרה הפשוט/הנפוץ: כולם קיפלו מול השחקן
  // האחרון שנשאר (לא מטפל ב-side-pots של all-in מרובה-שחקנים בסכומים
  // שונים — הגבלה ידועה, מסומנת).
  if(stillActive.length===1){
    const w = stillActive[0];
    const wPaid = totalPaid[w.playerName]||0;
    const others = seats.filter(s=>s!==w).map(s=>totalPaid[s.playerName]||0);
    const maxOther = others.length ? Math.max(...others) : 0;
    const uncalled = wPaid - maxOther;
    if(uncalled > 0.0000001){
      lines.push(`Uncalled bet (${uncalled}) returned to ${_disp(w.playerName)}`);
      totalPaid[w.playerName] = wPaid - uncalled;
    }
  }

  const winners = hand.winners||[];
  const winnerNames = new Set(winners.map(w=>w.name||w.playerName));
  const realShowdown = board.length===5 && stillActive.length>1; // הגיע לריבר עם יותר משחקן אחד שלא קיפל

  lines.push('*** SHOWDOWN ***');
  if(winners.length){
    winners.forEach(w=>{
      lines.push(`${_disp(w.name||w.playerName)||'?'} collected ${w.amount||hand.finalPot||0} from pot`);
    });
  } else if(stillActive.length===1){
    // אין winners רשום אבל רק שחקן אחד לא קיפל — בטוח להסיק שהוא לקח את הקופה
    const potTotal = Object.values(totalPaid).reduce((a,b)=>a+b,0);
    lines.push(`${_disp(stillActive[0].playerName)} collected ${hand.finalPot||potTotal} from pot`);
    winnerNames.add(stillActive[0].playerName);
  }

  lines.push('*** SUMMARY ***');
  // הערה: הדוגמה מ-7XL (טורניר, כמו הכותרת שלנו) הראתה "Total pot X | Rake 0"
  // בלבד; הדוגמה השנייה (GG Rush&Cash, קאש) הראתה שדות נוספים (Jackpot/Bingo/
  // Fortune/Tax) — כנראה מוסכמה שונה בין אתרים/עולמות (טורניר מול קאש), לא
  // סתירה. מכיוון שהכותרת שלנו תמיד בסגנון "Tournament" (כמו דוגמה #1), הולכים
  // לפי הפורמט הפשוט שלה.
  lines.push(`Total pot ${hand.finalPot||0} | Rake 0`);
  if(board.length) lines.push(`Board [${board.map(_cardToPS).join(' ')}]`);

  sortedSeats.forEach(s=>{
    const num = seatNum.get(s.seatIdx);
    const posTag = s.pos==='BTN' ? ' (button)' : s.pos==='SB' ? ' (small blind)' : s.pos==='BB' ? ' (big blind)' : '';
    const isWinner = winnerNames.has(s.playerName);
    const folded = foldedNames.has(s.playerName);
    const paid = totalPaid[s.playerName]||0;
    let desc;
    if(isWinner){
      const wRec = winners.find(w=>(w.name||w.playerName)===s.playerName);
      const amt = wRec ? (wRec.amount||hand.finalPot||0) : (hand.finalPot||0);
      if(realShowdown && s.cards?.[0] && s.cards?.[1]){
        const score = evaluateHand([...s.cards.filter(Boolean), ...board]);
        desc = `showed [${_cardToPS(s.cards[0])} ${_cardToPS(s.cards[1])}] and won (${amt}) with ${_describeHandScore(score)}`;
      } else {
        desc = `collected (${amt})`;
      }
    } else if(folded){
      // "folded before/on X" — לפי הרחוב שבו נרשמה פעולת ה-Fold עצמה (לא
      // לפי איפה שהם "נכחו" בכלל). "(didn't bet)" כשהתרומה הכוללת שלהם
      // ליד היא אפס (לא שילמו אנטה/בליינד ולא הכניסו כלום לפני שקיפלו).
      const foldAction = (s.actions||[]).find(a=>a.type==='Fold');
      let label = 'before Flop';
      if(foldAction){
        if(foldAction.street==='ריבר') label = 'on the River';
        else if(foldAction.street==='טורן') label = 'on the Turn';
        else if(foldAction.street==='פלופ') label = 'on the Flop';
      }
      desc = `folded ${label}${paid<=0.0000001 ? " (didn't bet)" : ''}`;
    } else if(realShowdown && s.cards?.[0] && s.cards?.[1]){
      const score = evaluateHand([...s.cards.filter(Boolean), ...board]);
      desc = `showed [${_cardToPS(s.cards[0])} ${_cardToPS(s.cards[1])}] and lost with ${_describeHandScore(score)}`;
    } else {
      desc = 'mucked';
    }
    lines.push(`Seat ${num}: ${_disp(s.playerName)}${posTag} ${desc}`);
  });

  return lines.join('\n');
}

// שמות-יד קריאים לבני-אדם לשלב showdown ("a pair of Aces" וכו') — בנוי מעל
// ה-evaluateHand הקיים ב-game.js (rank 0-8 + tiebreak array), לא נבנה evaluator
// חדש. הבהרה: הניסוח המדויק של straight/straight-flush "Ace to Five" (wheel)
// לא אומת מול דוגמה אמיתית — שאר הידיים (pair/two-pair/trips/flush/full-house/
// quads) כן אומתו ישירות מול הדוגמה שהמשתמש סיפק ("a pair of Aces", "three of
// a kind, Kings").
const _RANK_SING = {2:'Two',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight',9:'Nine',10:'Ten',11:'Jack',12:'Queen',13:'King',14:'Ace'};
const _RANK_PLUR = {2:'Twos',3:'Threes',4:'Fours',5:'Fives',6:'Sixes',7:'Sevens',8:'Eights',9:'Nines',10:'Tens',11:'Jacks',12:'Queens',13:'Kings',14:'Aces'};
function _describeHandScore(score){
  if(!score) return 'high card';
  const {rank, tb} = score;
  switch(rank){
    case 0: return `high card ${_RANK_SING[tb[0]]}`;
    case 1: return `a pair of ${_RANK_PLUR[tb[0]]}`;
    case 2: return `two pair, ${_RANK_PLUR[tb[0]]} and ${_RANK_PLUR[tb[1]]}`;
    case 3: return `three of a kind, ${_RANK_PLUR[tb[0]]}`;
    case 4: return tb[0]===5 ? `a straight, Ace to Five` : `a straight, ${_RANK_SING[tb[0]-4]} to ${_RANK_SING[tb[0]]}`;
    case 5: return `a flush, ${_RANK_SING[tb[0]]} high`;
    case 6: return `a full house, ${_RANK_PLUR[tb[0]]} full of ${_RANK_PLUR[tb[1]]}`;
    case 7: return `four of a kind, ${_RANK_PLUR[tb[0]]}`;
    case 8: return tb[0]===5 ? `a straight flush, Ace to Five` : `a straight flush, ${_RANK_SING[tb[0]-4]} to ${_RANK_SING[tb[0]]}`;
    default: return '';
  }
}

function exportHandsToPokerTracker(handIds){
  const all = S.handLog||[];
  const selected = handIds && handIds.length ? all.filter(h=>handIds.includes(h.id)) : all;
  if(!selected.length){ notify('לא נבחרו ידיים לייצוא'); return; }
  const sorted = [...selected].sort((a,b)=>handTs(a)-handTs(b));
  const formatted = sorted.map((h,i)=>({hand:h, text:_handToPSFormat(h, i+1)}));
  const failed = formatted.filter(f=>!f.text);
  const succeeded = formatted.filter(f=>f.text);
  const text = succeeded.map(f=>f.text).join('\n\n\n');
  if(!succeeded.length){
    alert('הייצוא נכשל — אף אחת מהידיים שנבחרו לא הכילה נתוני מושבים תקינים (אולי ידיים ישנות/חלקיות). לא נוצר קובץ.');
    notify('הייצוא נכשל — 0 ידיים תקינות');
    return;
  }
  const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fname = 'poker-hands-'+new Date().toISOString().slice(0,10)+'.txt';
  a.href = url; a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  if(failed.length){
    // מדווחים במפורש כשידיים נופלות בשקט — כדי שהמשתמש ידע שיש בעיה בנתונים,
    // לא רק יראה קובץ עם פחות תוכן ממה שציפה בלי שום הסבר. זה בדיוק מה שקרה
    // כשחבר קיבל "2 ידיים" בהודעה אבל בלי תוכן בפועל.
    alert(`יוצאו ${succeeded.length} מתוך ${sorted.length} ידיים — ${failed.length} ידיים דולגו כי לא הכילו נתוני מושבים תקינים (seats חסרים). בדוק את הידיים האלה בהיסטוריה.`);
    notify(`יוצאו ${succeeded.length}/${sorted.length} ידיים ⚠️ (${fname})`);
  } else {
    notify(`יוצאו ${succeeded.length} ידיים 📥 (${fname})`);
  }
}

// מצב הבחירה הנוכחי בדיאלוג הייצוא: 'manual' (בחירת ידיים ספציפיות בצ'קבוקס) או
// 'daterange' (טווח תאריכים) — נבחר מחדש בכל פתיחה, ברירת מחדל 'manual'.
let _ptExportMode = 'manual';
let _ptExportSelectedIds = new Set();

function showPTExportModal(){
  _ptExportMode = 'manual';
  _ptExportSelectedIds = new Set();
  document.getElementById('pt-export-modal').style.display = 'flex';
  _renderPTExportModal();
}

function _renderPTExportModal(){
  const hands = [...(S.handLog||[])].sort((a,b)=>handTs(b)-handTs(a));
  const tabBtn = (mode, label) => `<button onclick="_ptExportMode='${mode}';_renderPTExportModal()" style="flex:1;padding:7px;border-radius:8px;border:1px solid ${_ptExportMode===mode?'rgba(200,169,110,0.5)':'rgba(255,255,255,0.1)'};background:${_ptExportMode===mode?'rgba(200,169,110,0.15)':'rgba(255,255,255,0.04)'};color:${_ptExportMode===mode?'#c8a96e':'#8a8799'};font-size:12px;font-weight:700;cursor:pointer">${label}</button>`;

  let bodyHtml = '';
  if(_ptExportMode==='manual'){
    bodyHtml = `
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <button onclick="_ptExportSelectedIds=new Set(${JSON.stringify(hands.map(h=>h.id))});_renderPTExportModal()" style="font-size:10px;color:#5b9bd5;background:none;border:1px solid rgba(91,155,213,0.3);border-radius:6px;padding:3px 8px;cursor:pointer">בחר הכל</button>
        <button onclick="_ptExportSelectedIds=new Set();_renderPTExportModal()" style="font-size:10px;color:#8a8799;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:3px 8px;cursor:pointer">נקה הכל</button>
      </div>
      <div style="max-height:320px;overflow-y:auto;border:1px solid rgba(255,255,255,0.06);border-radius:8px">
        ${hands.length ? hands.map(h=>{
          const checked = _ptExportSelectedIds.has(h.id);
          return `<div onclick="_ptToggleHand('${h.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;background:${checked?'rgba(200,169,110,0.08)':'transparent'}">
            <span style="font-size:14px">${checked?'☑️':'⬜'}</span>
            <span style="font-size:11px;color:#8a8799;flex-shrink:0">${h.date||''}</span>
            <span style="font-size:12px;color:#e2ddd4;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.label||'יד'}</span>
            <span style="font-size:11px;color:#c8a96e;flex-shrink:0">₪${(h.finalPot||0).toLocaleString()}</span>
          </div>`;
        }).join('') : '<div style="padding:20px;text-align:center;color:#5a5870;font-size:12px">אין ידיים בהיסטוריה</div>'}
      </div>
      <div style="font-size:11px;color:#8a8799;margin-top:8px;text-align:center">${_ptExportSelectedIds.size} ידיים נבחרו</div>`;
  } else {
    bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div>
          <label style="font-size:11px;color:#8a8799;display:block;margin-bottom:4px">מתאריך</label>
          <input type="date" id="pt-export-date-from" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#141824;color:#e2ddd4;font-size:13px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:11px;color:#8a8799;display:block;margin-bottom:4px">עד תאריך</label>
          <input type="date" id="pt-export-date-to" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#141824;color:#e2ddd4;font-size:13px;box-sizing:border-box">
        </div>
      </div>`;
  }

  document.getElementById('pt-export-modal-content').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:12px">
      ${tabBtn('manual','בחירת ידיים')}
      ${tabBtn('daterange','טווח תאריכים')}
    </div>
    ${bodyHtml}
    <div style="font-size:10px;color:#5a5870;margin-top:10px;line-height:1.5">
      פורמט טקסט של PokerStars (תואם ייבוא ל-PT4/PT5). מומלץ לבדוק עם כמה ידיים לפני ייצוא גדול —
      אין תיאור-יד מילולי ב-showdown, ופיצול pot במצבי all-in מרובים מפושט.
    </div>
    <button onclick="_confirmPTExport()" style="width:100%;margin-top:12px;padding:10px;border-radius:9px;border:none;background:linear-gradient(135deg,#c8a96e,#a68a50);color:#0a0d14;font-size:13px;font-weight:800;cursor:pointer">📥 ייצא</button>`;
}

function _ptToggleHand(id){
  if(_ptExportSelectedIds.has(id)) _ptExportSelectedIds.delete(id);
  else _ptExportSelectedIds.add(id);
  _renderPTExportModal();
}

function _confirmPTExport(){
  if(_ptExportMode==='manual'){
    if(!_ptExportSelectedIds.size){ notify('בחר לפחות יד אחת'); return; }
    exportHandsToPokerTracker([..._ptExportSelectedIds]);
  } else {
    const fromStr = document.getElementById('pt-export-date-from')?.value;
    const toStr = document.getElementById('pt-export-date-to')?.value;
    if(!fromStr || !toStr){ notify('בחר טווח תאריכים מלא'); return; }
    const from = new Date(fromStr).getTime();
    const to = new Date(toStr).getTime() + 24*60*60*1000 - 1; // כולל את כל יום ה"עד"
    const ids = (S.handLog||[]).filter(h=>{ const ts = handTs(h); return ts>=from && ts<=to; }).map(h=>h.id);
    if(!ids.length){ notify('אין ידיים בטווח התאריכים שנבחר'); return; }
    exportHandsToPokerTracker(ids);
  }
  document.getElementById('pt-export-modal').style.display = 'none';
}

function fixTournFinishOrders(){
  // מתקן finishOrder לפי koOrder לכל הטורנירים
  let fixed=0;
  (S.tournLog||[]).forEach(t=>{
    if(!t.koOrder||!t.koOrder.length) return;
    const nameMap = t.playerNames||{};
    const allPids = [...new Set([...(t.finishOrder||[]).map(f=>f.pid), ...t.koOrder])];
    const activePidsT = allPids.filter(pid=>!t.koOrder.includes(pid));
    const rebuyMap = {};
    (t.finishOrder||[]).forEach(f=>{ rebuyMap[f.pid]=f.rebuy||0; });
    t.finishOrder = [
      ...activePidsT.map((pid,i)=>({place:i+1, pid, name:nameMap[pid]||pid, rebuy:rebuyMap[pid]||0})),
      ...[...t.koOrder].reverse().map((pid,i)=>({place:activePidsT.length+i+1, pid, name:nameMap[pid]||pid, rebuy:rebuyMap[pid]||0}))
    ];
    fixed++;
  });
  persist(); renderTournList();
  notify(`✓ תוקנו ${fixed} טורנירים`);
}

function renderPlayerList(){
  const cont=document.getElementById('player-list');
  if(!S.playerLib.length){cont.innerHTML='<div class="empty-state"><div class="empty-icon">👥</div>אין שחקנים</div>';return;}
  const swp=assignPos();
  cont.innerHTML=sortedLib().map(p=>{
    const b=S.buyins[p.id]||{buyin:0,rebuy:0};
    const inGame=S.seats.some(s=>s.playerId===p.id);
    const hands=S.handLog.filter(h=>(h.seats||[]).some(s=>s.playerId===p.id));
    const activeTP=activeTournPlayers();
    const isWinner=activeTP.length===1&&activeTP[0]===p.id;
    const isExpanded=_expandedPlayer===p.id;
    const pt = p.playerType ? PLAYER_TYPES[p.playerType] : null;

    // חישוב HUD מהיר
    let hudHtml='';
    if(hands.length>0){
      const hud=calcPlayerHUD(p.id);
      if(hud&&hud.n>0){
        const afNum=parseFloat(hud.af)||0;
        const afStr=!isFinite(afNum)||afNum>9?'∞':afNum.toFixed(1);
        hudHtml=`<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          <span style="font-size:9px;color:#8a8799">VPIP <b style="color:#c8a96e">${hud.vpip}%</b></span>
          <span style="font-size:9px;color:#8a8799">LIMP <b style="color:#b47eea">${hud.limp}%</b></span>
          <span style="font-size:9px;color:#8a8799">PFR <b style="color:#5b9bd5">${hud.pfr}%</b></span>
          <span style="font-size:9px;color:#8a8799">3B <b style="color:#7eb8a4">${hud.bet3}%</b></span>
          <span style="font-size:9px;color:#8a8799">AF <b style="color:#e07b6a">${afStr}</b></span>
          <span style="font-size:9px;color:#8a8799">W <b style="color:#5fc47a">${hud.won}%</b></span>
          <span style="font-size:9px;color:#3a3850">${hud.n} ידיים</span>
        </div>`;
      }
    }

    // פרופיל מורחב
    const profileHtml = isExpanded ? `
    <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;display:flex;flex-direction:column;gap:10px">
      <div>
        <div style="font-size:9px;color:#8a8799;font-weight:700;margin-bottom:4px">שם</div>
        <input id="edit-name-${p.id}" value="${p.name}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 10px;color:#e2ddd4;font-size:13px;direction:rtl">
      </div>
      <div>
        <div style="font-size:9px;color:#8a8799;font-weight:700;margin-bottom:4px">סוג שחקן</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${Object.entries(PLAYER_TYPES).map(([key,t])=>{
            const isActive=p.playerType===key;
            return`<button data-ptype="${p.id}" data-ptype-val="${key}"
              class="ptype-btn${isActive?' ptype-active':''}"
              onclick="setPlayerType('${p.id}','${key}')"
              style="padding:4px 10px;border-radius:14px;border:1px solid ${isActive?t.color+'88':'rgba(255,255,255,0.1)'};background:${isActive?t.color+'33':'rgba(255,255,255,0.04)'};color:${isActive?t.color:'#8a8799'};font-size:10px;font-weight:700;cursor:pointer"
              title="${t.desc}">${t.label}</button>`;
          }).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:9px;color:#8a8799;font-weight:700;margin-bottom:4px">הערות</div>
        <textarea id="edit-notes-${p.id}" rows="2" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 10px;color:#e2ddd4;font-size:12px;direction:rtl;resize:none">${(S.playerNotes||{})[p.id]||''}</textarea>
      </div>
      ${hudHtml}
      <div style="display:flex;gap:6px">
        <button onclick="savePlayerProfile('${p.id}')" style="flex:1;padding:8px;border-radius:8px;border:none;background:rgba(95,196,122,0.2);color:#5fc47a;font-size:12px;font-weight:800;cursor:pointer">✓ שמור</button>
        <button onclick="togglePlayerProfile('${p.id}')" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#8a8799;font-size:12px;cursor:pointer">סגור</button>
      </div>
    </div>` : '';

    return`<div class="card-item" style="${inGame?'border-color:rgba(95,196,122,0.25)':''}">
      <div style="display:flex;align-items:center;gap:9px" onclick="togglePlayerProfile('${p.id}')" style="cursor:pointer">
        <div style="width:34px;height:34px;border-radius:17px;background:rgba(200,169,110,0.18);border:1px solid rgba(200,169,110,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--gold);flex-shrink:0;cursor:pointer">${p.name[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0;cursor:pointer">
          <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${isWinner?'🥇 ':''}
            <span>${p.name}</span>
            ${pt?`<span style="font-size:9px;color:${pt.color};background:${pt.color}22;border-radius:8px;padding:1px 6px">${pt.label}</span>`:''}
            ${b.rebuy>0?`<span style="font-size:13px;font-weight:900;color:var(--gold)">(${b.rebuy})</span>`:''}
            ${isWinner?`<span style="font-size:9px;color:#FFD700;background:rgba(255,215,0,0.12);border-radius:10px;padding:1px 8px">מקום 1</span>`:''}
            ${b.buyin>0&&!S.koOrder.includes(p.id)&&!isWinner?`<span style="font-size:9px;color:var(--green);background:rgba(95,196,122,0.12);border-radius:10px;padding:1px 6px">● פעיל</span>`:''}
            ${S.koOrder.includes(p.id)?`<span style="font-size:9px;color:#e07b6a;background:rgba(224,85,85,0.12);border-radius:10px;padding:1px 6px">💀 הודח</span>`:''}
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:1px">
            ${(()=>{ const n=(S.playerNotes||{})[p.id]||''; return n?`<span style="color:#8a8799">${n.slice(0,30)}${n.length>30?'...':''}</span>`:b.buyin?'BuyIn':'לא נרשם'; })()}
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end" onclick="event.stopPropagation()">
          ${isViewer()?`
            ${S.koOrder.includes(p.id)?`<span style="font-size:9px;color:#e07b6a;background:rgba(224,85,85,0.12);border-radius:10px;padding:2px 7px">💀 הודח</span>`:''}
          `:`
            ${!b.buyin?`<button class="btn btn-green btn-xs" onclick="doBuyin('${p.id}')">BuyIn</button>`:`<button class="btn btn-gray btn-xs" onclick="cancelBuyin('${p.id}')">ביטול BuyIn</button>`}
            <button class="btn btn-outline btn-xs" onclick="doRebuy('${p.id}',1)">+R</button>
            <button class="btn btn-gray btn-xs" onclick="doRebuy('${p.id}',-1)">-R</button>
            ${!S.koOrder.includes(p.id)&&b.buyin>0?`<button class="btn btn-red btn-xs" onclick="koPlayerFromList('${p.id}')">KO 💀</button>`:''}
            ${S.koOrder.includes(p.id)?`<span style="font-size:9px;color:#e07b6a;background:rgba(224,85,85,0.12);border-radius:10px;padding:2px 7px">💀 הודח</span>`:''}
            <button class="btn btn-red btn-xs" onclick="deletePlayer('${p.id}')">✕</button>
          `}
        </div>
      </div>
      ${profileHtml}
    </div>`;
  }).join('');
}
// ═══════════════════════════════
// ═══════════════════════════════════════════════════════
// CARD PICKER
// ═══════════════════════════════════════════════════════
function openCP(target){if(isViewer()){notify('צופה בלבד');return;}cpTarget=target;cpRank=null;renderCP();const camBtn=document.getElementById('cp-camera-btn');if(camBtn)camBtn.setAttribute('onclick',"openCameraForCards('board')");document.getElementById('card-picker').classList.add('open');}
function renderCP(){
  const used=allUsedCards();
  document.getElementById('cp-title').textContent=cpRank?`חליפה עבור ${cpRank}`:'בחר דרגה';
  // Show full deck: 4 rows by suit
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const rows = suits.map(suit=>{
    const btns = ranks.map(rank=>{
      const u = used.some(c=>c&&c.rank===rank&&c.suit===suit);
      const isRed = suit==='♥'||suit==='♦';
      const bg = u?'rgba(255,255,255,0.06)':'#fff';
      const rankCol = u?'#666':(isRed?'#d42020':'#111');
      const suitCol = u?'#888':(isRed?'#d42020':'#111');
      return `<button style="width:34px;height:46px;border-radius:6px;border:1.5px solid ${u?'rgba(255,255,255,0.08)':'#ddd'};background:${bg};cursor:${u?'not-allowed':'pointer'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1px;box-shadow:${u?'none':'0 1px 3px rgba(0,0,0,0.4)'};opacity:${u?'0.35':'1'}" ${u?'disabled onclick="return false"':`onclick="cpRank='${rank}';pickCard('${suit}')"`}>
        <span style="font-size:14px;font-weight:900;color:${rankCol};line-height:1">${rank}</span>
        <span style="font-size:12px;color:${suitCol};line-height:1">${suit}</span>
      </button>`;
    }).join('');
    return `<div style="display:flex;gap:2px;margin-bottom:2px;direction:ltr">${btns}</div>`;
  }).join('');
  document.getElementById('cp-content').innerHTML=`<div style="padding:4px;direction:ltr">${rows}</div>`;
}
function pickCard(s){
  if(!cpRank){ console.log('pickCard: no cpRank'); return; }
  const card={rank:cpRank,suit:s};
  // ── ולידציה: בדוק שהקלף לא כבר בשימוש ──
  const t=cpTarget;
  const used = allUsedCards();
  // אפשר לבחור קלף שכבר בסלוט הזה (החלפה)
  let currentCardInSlot = null;
  if(t?.startsWith('board')){
    currentCardInSlot = S.board[+t.replace('board','')];
  } else if(t?.startsWith('seat')){
    const m=t.match(/seat(\d+)_c(\d+)/);
    if(m) currentCardInSlot = S.seats.find(s=>s.seatIdx===+m[1])?.cards?.[+m[2]];
  }
  const isDuplicate = used.some(c=>c&&c.rank===card.rank&&c.suit===card.suit
    &&!(currentCardInSlot&&currentCardInSlot.rank===c.rank&&currentCardInSlot.suit===c.suit));
  if(isDuplicate){
    cpRank=null;
    notify('⚠️ '+card.rank+card.suit+' כבר בשימוש!');
    return;
  }
  cpRank=null; // reset for next pick
  document.getElementById('card-picker').classList.remove('open');
  if(t?.startsWith('board')){
    const boardIdx = +t.replace('board','');
    S.board[boardIdx]=card;
    console.log('[pickCard board] idx='+boardIdx+' card='+JSON.stringify(card)+' board='+JSON.stringify(S.board));
    // Auto-advance to next flop card
    if(boardIdx===0&&!S.board[1]) setTimeout(()=>openCP('board1'),80);
    else if(boardIdx===1&&!S.board[2]) setTimeout(()=>openCP('board2'),80);
    // Clear bet chips when new betting round starts: after 3rd flop card, turn, river
    if(boardIdx===2||boardIdx===3||boardIdx===4){
      const newStreet = boardIdx===2?'פלופ':boardIdx===3?'טורן':'ריבר';
      // Check if all-in situation – no betting needed
      const activeAfter = S.seats.filter(s=>s.playerId&&!s.folded);
      const canActAfter = activeAfter.filter(s=>!s.allin);
      const isAllinSituation = canActAfter.length <= 1 && activeAfter.some(s=>s.allin);
      
      if(isAllinSituation){
        // Skip betting – auto open next card or showdown
        S.currentActor = null;
        S.bettingClosed = true;
        S.lastBet = 0;
        setTimeout(()=>{
          const bCnt = S.board.filter(Boolean).length;
          console.log('[ui.js pickCard allin] bCnt='+bCnt+' _showdownMode='+S._showdownMode);
          if(bCnt===5) enterShowdown();
          else autoOpenNextCard();
        }, 150);
      } else {
        // Normal street – reset for new betting round
        const newOrder = getActingOrder(newStreet);
        S.currentActor = newOrder.length>0 ? newOrder[0] : null;
        console.log('[pickCard] newStreet='+newStreet+' newOrder='+JSON.stringify(newOrder)+' currentActor='+S.currentActor);
        S.bettingClosed = false;
        S.lastRaiser = null;
        S.actionCount = 0;
        S.raiseRound = 0;
        S.lastRaiseSize = 0;
        S.lastBet = 0;
        S.lastRaiseWasFull = true;
        // Clear only the bet amounts (SB/BB stay, only last non-blind action cleared)
        S.seats.forEach(seat=>{
          if(seat.actions&&seat.actions.length>0){
            seat._streetCleared = (seat._streetCleared||0)+1;
          }
        });
        // Clear bet chips container
        const bc=document.getElementById('bet-chips-container');
        if(bc) bc.innerHTML='';
        renderLiveActions();
      }
  }
  else if(t?.startsWith('seat')){
    const m=t.match(/seat(\d+)_c(\d+)/);
    if(m){const seat=S.seats.find(s=>s.seatIdx===+m[1]);if(seat){if(!seat.cards)seat.cards=[null,null];seat.cards[+m[2]]=card;}}
    persist(); renderBoard();
    setTimeout(()=>renderSeats(), 50);
    return;
  }
  persist(); renderSeats(); renderBoard();
  if(activeSeat!==null)renderSeatPanel();
}
} // close missing brace
try{document.getElementById('card-picker').addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});}catch(e){}

// ═══════════════════════════════════════════════════════
// PANELS & VIEWS
// ═══════════════════════════════════════════════════════
function openPanel(id){
  document.getElementById(id)?.classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closePanel(id){
  document.getElementById(id)?.classList.remove('open');
  if(!document.querySelector('.panel.open'))document.getElementById('overlay').classList.remove('open');
}
function closeAllPanels(){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('players-popup').classList.remove('open');
  activeSeat=null; renderSeats();
}
function closeSeatPanel(){activeSeat=null;_rangeEditPid=null;_rangeEditSel=new Set();_rangeEditActiveView=null;closePanel('seat-panel');renderSeats();}
function showView(v){
  // Viewers can only see players and tournaments
  if(isViewer() && (v==='table'||v==='hands')){
    notify('אין הרשאה לטאב זה');
    return;
  }
  ['table','hands','tourn','players'].forEach(vv=>{
    document.getElementById(`${vv}-view`).style.display=vv===v?(vv==='table'?'flex':'block'):'none';
    document.getElementById(`tab-${vv}`)?.classList.toggle('active',vv===v);
  });
  // Hide table size selector in players/tournaments tabs
  const tblSize = document.getElementById('sbox-tablesize');
  if(tblSize) tblSize.style.display = (v==='tourn'||v==='players') ? 'none' : '';
  // Hide active players button in table and hands tabs, and for viewers
  const activeBtn = document.getElementById('btn-active');
  if(activeBtn) activeBtn.style.display = (v==='table'||v==='hands'||isViewer()) ? 'none' : '';
  // Stats bar: hide in table and hands tabs
  const statsBar = document.getElementById('statsbar');
  if(statsBar) statsBar.style.display = (v==='table'||v==='hands') ? 'none' : '';
  // Show live actions bar only in table tab
  const liveBar = document.getElementById('live-actions-bar');
  if(liveBar) liveBar.style.display = v==='table' ? 'block' : 'none';
  // table-size-bar: only in table tab
  const tableSizeBar = document.getElementById('table-size-bar');
  if(tableSizeBar) tableSizeBar.style.display = v==='table' ? 'flex' : 'none';
  if(v==='table') try{ renderLiveActions(); }catch(e){ console.error('renderLiveActions error:',e); }
  if(v==='hands'){ renderHandList(); }
  if(v==='tourn')renderTournList();
  if(v==='players')renderPlayerList();
}
function generateExplosionImage(name, rebuyNum, callback){
  const canvas = document.createElement('canvas');
  canvas.width=600; canvas.height=500;
  const ctx=canvas.getContext('2d');

  // Dark background with radial glow
  ctx.fillStyle='#0a0510'; ctx.fillRect(0,0,600,500);
  const glow=ctx.createRadialGradient(300,280,20,300,280,220);
  glow.addColorStop(0,'rgba(255,180,0,0.25)');
  glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow; ctx.fillRect(0,0,600,500);

  // Explosion rays
  ctx.save();
  ctx.translate(300,280);
  for(let i=0;i<16;i++){
    const angle = (i/16)*Math.PI*2;
    const len = 120+Math.random()*80;
    const grad=ctx.createLinearGradient(0,0,Math.cos(angle)*len,Math.sin(angle)*len);
    grad.addColorStop(0,'rgba(255,200,0,0.8)');
    grad.addColorStop(1,'transparent');
    ctx.strokeStyle=grad; ctx.lineWidth=3+Math.random()*4;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(angle)*len, Math.sin(angle)*len);
    ctx.stroke();
  }
  ctx.restore();

  // Explosion center flash
  const flash=ctx.createRadialGradient(300,280,0,300,280,90);
  flash.addColorStop(0,'rgba(255,255,200,0.9)');
  flash.addColorStop(0.4,'rgba(255,160,0,0.7)');
  flash.addColorStop(1,'transparent');
  ctx.fillStyle=flash; ctx.beginPath(); ctx.arc(300,280,90,0,Math.PI*2); ctx.fill();

  // Draw 10 flying poker chips
  function drawChip(cx,cy,r,angle,scale){
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(angle);
    ctx.scale(scale,scale*0.35); // flattened = perspective

    // Chip body
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
    const chipGrad=ctx.createRadialGradient(-r*0.3,-r*0.3,2,0,0,r);
    chipGrad.addColorStop(0,'#4a4a4a');
    chipGrad.addColorStop(0.5,'#1a1a1a');
    chipGrad.addColorStop(1,'#0a0a0a');
    ctx.fillStyle=chipGrad; ctx.fill();
    ctx.strokeStyle='#888'; ctx.lineWidth=2; ctx.stroke();

    // Edge stripes
    for(let s=0;s<8;s++){
      const sa=(s/8)*Math.PI*2;
      const ea=sa+Math.PI/8;
      ctx.beginPath();
      ctx.arc(0,0,r,sa,ea);
      ctx.arc(0,0,r*0.72,ea,sa,true);
      ctx.closePath();
      ctx.fillStyle=s%2===0?'#FFD700':'#1a1a1a';
      ctx.fill();
    }

    // Inner circle
    ctx.beginPath(); ctx.arc(0,0,r*0.58,0,Math.PI*2);
    ctx.fillStyle='#111'; ctx.fill();
    ctx.strokeStyle='#FFD700'; ctx.lineWidth=1.5; ctx.stroke();

    // Center dot
    ctx.beginPath(); ctx.arc(0,0,r*0.2,0,Math.PI*2);
    ctx.fillStyle='#FFD700'; ctx.fill();

    ctx.restore();
  }

  // 10 chips flying in different directions from center
  const chips=[
    {x:160,y:100,r:34,a:0.8,s:1.1},{x:300,y:60,r:30,a:-0.5,s:0.9},
    {x:440,y:90,r:36,a:1.2,s:1.0},{x:500,y:230,r:32,a:-1.0,s:1.2},
    {x:460,y:380,r:35,a:0.3,s:0.95},{x:310,y:430,r:33,a:-0.8,s:1.05},
    {x:150,y:390,r:37,a:1.5,s:1.1},{x:80,y:240,r:31,a:-0.2,s:0.9},
    {x:200,y:190,r:29,a:0.6,s:0.85},{x:390,y:170,r:33,a:-1.3,s:1.0}
  ];
  chips.forEach(c=>drawChip(c.x,c.y,c.r,c.a,c.s));

  // Motion lines for flying chips
  ctx.strokeStyle='rgba(255,215,0,0.3)'; ctx.lineWidth=1.5;
  chips.forEach(c=>{
    const dx=c.x-300, dy=c.y-280;
    const len=0.3;
    ctx.beginPath();
    ctx.moveTo(c.x-dx*len-10,c.y-dy*len-5);
    ctx.lineTo(c.x,c.y);
    ctx.stroke();
  });

  // Player name - large gold
  ctx.save();
  ctx.shadowColor='#FF8800'; ctx.shadowBlur=25;
  ctx.fillStyle='#FFD700';
  ctx.font='bold 44px Arial';
  ctx.textAlign='center';
  ctx.fillText(name, 300, 345);
  ctx.restore();

  // Rebuy number badge
  ctx.save();
  ctx.shadowColor='#FF4400'; ctx.shadowBlur=20;
  ctx.fillStyle='#FF4400';
  ctx.beginPath(); ctx.arc(490,55,38,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#FFD700'; ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle='#FFD700';
  ctx.font='bold 32px Arial'; ctx.textAlign='center';
  ctx.fillText(String(rebuyNum),490,65);
  ctx.font='bold 11px Arial';
  ctx.fillText('REBUY',490,82);
  ctx.restore();

  // "חינם!" text
  ctx.save();
  ctx.shadowColor='#FFD700'; ctx.shadowBlur=20;
  ctx.fillStyle='#fff';
  ctx.font='bold 32px Arial'; ctx.textAlign='center';
  ctx.fillText('חינם!  🎉',300,395);
  ctx.restore();

  callback(canvas.toDataURL('image/png'));
}

function showWhatsAppFreeRebuy(name, rebuyNum){
  document.getElementById('wa-free-btn')?.remove();
  const btn=document.createElement('div');
  btn.id='wa-free-btn';
  btn.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:1000;display:flex;gap:8px;flex-direction:column;align-items:center;background:rgba(0,0,0,0.85);border-radius:16px;padding:12px;border:1px solid rgba(255,150,0,0.4)';
  generateExplosionImage(name, rebuyNum, (dataUrl)=>{
    const prev=document.createElement('img');
    prev.src=dataUrl; prev.style.cssText='width:180px;border-radius:10px;box-shadow:0 4px 20px rgba(255,150,0,0.5)';
    btn.appendChild(prev);
    const row=document.createElement('div'); row.style.cssText='display:flex;gap:8px';
    const dlBtn=document.createElement('button');
    dlBtn.style.cssText='padding:10px 16px;border-radius:22px;border:none;background:#25D366;color:#fff;font-weight:900;font-size:13px;cursor:pointer';
    dlBtn.innerHTML='📥 שמור ושלח';
    dlBtn.onclick=()=>{
      const a=document.createElement('a'); a.href=dataUrl; a.download='rebuy-free.png'; a.click();
      setTimeout(()=>{
        const msg=encodeURIComponent('💣 BOOM! '+name+' קיבל Rebuy חינם! Rebuy '+rebuyNum+' - חינם!');
        window.open('https://wa.me/?text='+msg,'_blank');
      },600);
    };
    const sk=document.createElement('button');
    sk.style.cssText='padding:10px 14px;border-radius:22px;border:none;background:rgba(255,255,255,0.1);color:#aaa;font-size:13px;cursor:pointer';
    sk.textContent='דלג'; sk.onclick=()=>btn.remove();
    row.appendChild(dlBtn); row.appendChild(sk); btn.appendChild(row);
  });
  document.body.appendChild(btn);
  setTimeout(()=>btn.remove(),15000);
}

function showExplosion(name, rebuyNum){
  const overlay = document.getElementById('explosion-overlay');
  const bomb    = document.getElementById('exp-bomb');
  const cloud   = document.getElementById('exp-cloud');
  const free    = document.getElementById('exp-free');
  const numEl   = document.getElementById('exp-bomb-num');
  const x = window.innerWidth/2;
  const y = window.innerHeight/2;
  [bomb,cloud,free].forEach(el=>{
    el.style.left=x+'px'; el.style.top=y+'px';
  });
  if(numEl) numEl.textContent = rebuyNum||'10';
  free.textContent = '🎉 ' + name + ' - חינם!';
  // Reset all animations
  [bomb,cloud,free].forEach(el=>{
    el.style.animation='none';
    el.offsetHeight;
  });
  overlay.style.display='block';
  setTimeout(()=>{
    bomb.style.animation='bombShake 0.9s ease-in-out forwards';
    cloud.style.animation='cloudExplode 4.5s ease-out 0.7s forwards';
    free.style.animation='freePopup 5s ease-out 1s forwards';
  },10);
  setTimeout(()=>{ overlay.style.display='none'; }, 6500);
}

function notify(msg){
  const el=document.getElementById('notif'); el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2200);
}
