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
// BLINDS PANEL
// ═══════════════════════════════════════════════════════
function openBlindsPanel(){
  renderBlindsBody();
  openPanel('blinds-panel');
}
function renderBlindsBody(){
  const b=getBlinds();
  const fmt=n=>n>=1000?(n/1000)+'K':String(n);
  const allLvl=[...DEF_BLINDS,...S.customBlindLevels];
  document.getElementById('blinds-body').innerHTML=`
    <div style="display:flex;gap:7px;margin-bottom:12px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="chgBlind(-1)">◀</button>
      <button class="btn btn-outline btn-sm" onclick="chgBlind(1)">▶</button>
      <span style="font-size:13px;font-weight:700;color:var(--gold)">${fmt(b.sb)}/${fmt(b.bb)}${b.ante?` ante ${fmt(b.ante)}`:''}</span>
    </div>
    <div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:10px;margin-bottom:12px">
      <div style="font-size:10px;color:var(--muted);margin-bottom:7px;font-weight:600">הוסף רמה מותאמת</div>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
        <input type="number" id="cbl-sb" placeholder="SB" style="width:68px;padding:6px;border-radius:7px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--gold);font-size:12px;outline:none;text-align:center;direction:ltr">
        <span style="color:var(--muted)">/</span>
        <input type="number" id="cbl-bb" placeholder="BB" style="width:68px;padding:6px;border-radius:7px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--gold);font-size:12px;outline:none;text-align:center;direction:ltr">
        <span style="font-size:10px;color:var(--muted)">ante</span>
        <input type="number" id="cbl-ante" placeholder="0" style="width:60px;padding:6px;border-radius:7px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--gold);font-size:12px;outline:none;text-align:center;direction:ltr">
        <button class="btn btn-gold btn-sm" onclick="saveCustomBL()">+ שמור</button>
      </div>
    </div>
    <div class="bl-grid">
      ${allLvl.map((l,i)=>{
        const isC=i>=DEF_BLINDS.length, isA=S.blindLevel===i&&!S.customBlinds;
        return`<button class="bl-btn${isA?' active':''}" onclick="setBlind(${i})" style="${isC?'border-color:rgba(200,169,110,0.3)':''}">
          <strong>${fmt(l.sb)}/${fmt(l.bb)}</strong>
          ${l.ante?`<span class="ante">ante ${fmt(l.ante)}</span>`:''}
          ${isC?`<span onclick="event.stopPropagation();delCustomBL(${i-DEF_BLINDS.length})" style="font-size:8px;color:rgba(200,80,80,0.6);cursor:pointer;display:block">✕</span>`:''}
        </button>`;
      }).join('')}
    </div>`;
}
function setBlind(i){if(isViewer()){notify('צופה בלבד');return;}S.blindLevel=i;S.customBlinds=null;persist();renderBlindsBtn();renderBlindsBody();}
function chgBlind(d){if(isViewer()){notify('צופה בלבד');return;}S.blindLevel=Math.max(0,Math.min(BLIND_LEVELS.length-1,S.blindLevel+d));S.customBlinds=null;persist();renderBlindsBtn();renderBlindsBody();}
function saveCustomBL(){
  const sb=parseInt(document.getElementById('cbl-sb')?.value)||0;
  const bb=parseInt(document.getElementById('cbl-bb')?.value)||0;
  const ante=parseInt(document.getElementById('cbl-ante')?.value)||0;
  if(!sb||!bb){notify('הכנס SB ו-BB');return;}
  S.customBlindLevels.push({sb,bb,ante});
  BLIND_LEVELS=[...DEF_BLINDS,...S.customBlindLevels];
  persist(); renderBlindsBody(); notify('רמה נשמרה ✓');
}
function delCustomBL(idx){
  S.customBlindLevels.splice(idx,1);
  BLIND_LEVELS=[...DEF_BLINDS,...S.customBlindLevels];
  if(S.blindLevel>=BLIND_LEVELS.length)S.blindLevel=BLIND_LEVELS.length-1;
  persist(); renderBlindsBody();
}

// ═══════════════════════════════════════════════════════
// HAND RECORDING
// ═══════════════════════════════════════════════════════
function newHand(){
  const swp=assignPos();
  const b=getBlinds();
  curHand={
    id:uid(), date:new Date().toLocaleDateString('he-IL'),
    blinds:`${b.sb}/${b.bb}`, anteStr:b.ante?`ante ${b.ante}`:'',
    board:[...S.board],
    seats:swp.filter(s=>s.playerId).map(s=>({
      seatIdx:s.seatIdx, playerId:s.playerId, playerName:pName(s.playerId),
      pos:s.pos, stack:s.stack, cards:[...(s.cards||[null,null])],
      actions:[], folded:s.folded||false, allin:s.allin||false
    })),
    result:null, amount:'', notes:'', potLog:[]
  };
  recStreet='פרה-פלופ'; recActor='0';
  renderRecordPanel(); openPanel('record-panel');
}
function renderRecordPanel(){
  if(!curHand)return;
  const h=curHand;
  const streets=['פרה-פלופ','פלופ','טרן','ריבר'];
  let potSoFar=0;
  // Calculate pot from all recorded actions
  h.seats.forEach(s=>(s.actions||[]).forEach(a=>{if(parseFloat(a.amount)>0)potSoFar+=parseFloat(a.amount);}));
  let html=``;
  // Board
  html+=`<div style="margin-bottom:10px"><span class="sec-lbl">לוח</span>
    <div style="display:flex;gap:4px;direction:ltr">
      ${h.board.map((c,i)=>{const lbl=['F1','F2','F3','T','R'][i];return`<div style="text-align:center">
        <button class="board-card-btn${c?' has-card':''}" style="width:30px;height:42px" onclick="openCPR('rb${i}')">
          ${c?`<span style="font-size:11px;font-weight:900;color:${SC[c.suit]};line-height:1.1">${c.rank}</span><span style="font-size:9px;color:${SC[c.suit]};line-height:1">${c.suit}</span>`:`<span style="font-size:14px;color:rgba(255,255,255,0.12)">+</span>`}
        </button><div class="card-label">${lbl}</div></div>`;}).join('')}
    </div></div>`;
  // Street tabs
  html+=`<div style="display:flex;gap:5px;margin-bottom:8px;overflow-x:auto">
    ${streets.map(s=>`<button style="padding:5px 9px;border-radius:7px;border:1.5px solid ${recStreet===s?'rgba(200,169,110,0.5)':'rgba(255,255,255,0.1)'};background:${recStreet===s?'rgba(200,169,110,0.12)':'transparent'};color:${recStreet===s?'var(--gold)':'var(--muted)'};font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0" onclick="recStreet='${s}';renderRecordPanel()">${s}</button>`).join('')}
  </div>`;
  // Player selector
  html+=`<div style="display:flex;gap:5px;margin-bottom:8px;overflow-x:auto;flex-wrap:wrap">
    ${h.seats.map((s,si)=>`<button style="padding:5px 9px;border-radius:7px;border:1.5px solid ${recActor===String(si)?'rgba(200,169,110,0.5)':'rgba(255,255,255,0.1)'};background:${recActor===String(si)?'rgba(200,169,110,0.12)':'transparent'};color:${recActor===String(si)?'var(--gold)':'var(--muted)'};font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap" onclick="recActor='${si}';renderRecordPanel()">
      ${s.playerName||'?'}${s.pos?` (${s.pos})`:''}</button>`).join('')}
  </div>`;
  // Action buttons
  html+=`<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:9px;margin-bottom:10px">
    <div style="font-size:10px;color:var(--muted);margin-bottom:6px">פועל: <strong style="color:var(--gold)">${h.seats[+recActor]?.playerName||'?'}</strong> | Pot: <strong style="color:var(--gold)">₪${potSoFar.toLocaleString()}</strong></div>
    ${ACTIONS.map(a=>`<div class="action-row">
      <span class="action-lbl" style="color:${a.c}">${a.k}</span>
      ${a.amt?`<input class="action-amt" type="number" id="ra-${a.k}" placeholder="סכום" min="0" onkeydown="if(event.key==='Enter')addRecAct('${a.k}',this.value)">`:'<span style="flex:1"></span>'}
      <button class="action-go" style="background:${a.c}22;border:1px solid ${a.c}55;color:${a.c}" onclick="addRecAct('${a.k}',${a.amt?`document.getElementById('ra-${a.k}')?.value||''`:`''`})">✓</button>
    </div>`).join('')}
  </div>`;
  // Actions by street
  const allActs=h.seats.flatMap((s,si)=>(s.actions||[]).map(a=>({...a,si,pn:s.playerName,pos:s.pos})));
  ['פרה-פלופ','פלופ','טרן','ריבר'].forEach(st=>{
    const sa=allActs.filter(a=>a.street===st);
    if(!sa.length)return;
    let runPot=0;
    h.seats.forEach(s=>(s.actions||[]).filter(a=>a.street===st).forEach(a=>{if(parseFloat(a.amount)>0)runPot+=parseFloat(a.amount);}));
    html+=`<div style="margin-bottom:8px"><div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:4px">${st}</div>
      ${sa.map(a=>{const def=ACTIONS.find(x=>x.k===a.type)||ACTIONS[0];const isH=a.si===0;return`<div style="display:flex;align-items:center;gap:7px;padding:5px 7px;background:rgba(0,0,0,0.18);border-radius:7px;margin-bottom:3px">
        <span style="font-size:10px;color:${isH?'var(--gold)':'#e07b6a'};font-weight:700;min-width:55px">${a.pos?`[${a.pos}] `:''}${a.pn}</span>
        <span style="font-size:11px;font-weight:700;color:${def.c}">${a.type}</span>
        ${a.amount?`<span style="font-size:11px;color:var(--gold);font-weight:700">₪${Number(a.amount).toLocaleString()}</span>`:''}
        ${a.stackAfter!==undefined?`<span style="font-size:9px;color:var(--muted)">→ ₪${Number(a.stackAfter).toLocaleString()}</span>`:''}
      </div>`;}).join('')}
    </div>`;
  });
  // Showdown cards
  html+=`<div style="margin-bottom:10px"><span class="sec-lbl">קלפי שחקנים</span>
    ${h.seats.map((s,si)=>`<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
      <div style="font-size:10px;color:${si===0?'var(--gold)':'#e07b6a'};font-weight:700;min-width:60px">${s.playerName||'?'}</div>
      ${[0,1].map(ci=>{const c=s.cards?.[ci];return`<button class="board-card-btn${c?' has-card':''}" style="width:30px;height:42px" onclick="openCPR('rs${si}_c${ci}')">
        ${c?`<span style="font-size:10px;font-weight:900;color:${SC[c.suit]};line-height:1.1">${c.rank}</span><span style="font-size:8px;color:${SC[c.suit]};line-height:1">${c.suit}</span>`:`<span style="font-size:13px;color:rgba(255,255,255,0.12)">+</span>`}
      </button>`;}).join('')}
    </div>`).join('')}</div>`;
  // Result
  html+=`<div style="margin-bottom:10px"><span class="sec-lbl">תוצאה</span>
    <div class="res-grid">${RESULTS.map(r=>`<button class="res-btn${h.result===r.k?' active':''}" style="${h.result===r.k?`background:${r.c}18;border-color:${r.c}55;color:${r.c}`:''}" onclick="curHand.result='${r.k}';renderRecordPanel()">
      <div style="font-size:15px;margin-bottom:1px">${r.e}</div>${r.l}
    </button>`).join('')}</div>
    ${h.result?`<input type="number" value="${h.amount||''}" placeholder="סכום" style="margin-top:7px;width:100%;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--gold);font-size:13px;outline:none;text-align:center;direction:ltr" onchange="curHand.amount=this.value">`:``}
  </div>`;
  // Notes
  html+=`<div><span class="sec-lbl">הערות</span>
    <textarea rows="2" style="width:100%;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--text);font-size:12px;outline:none;resize:none;direction:rtl;line-height:1.6" placeholder="תיאור, קריאות..." onchange="curHand.notes=this.value">${h.notes||''}</textarea>
  </div>`;
  document.getElementById('record-body').innerHTML=html;
}
function addRecAct(type,amount){
  if(!curHand)return;
  const si=+recActor;
  const amt=parseFloat(amount)||0;
  const seat=curHand.seats[si]; if(!seat)return;
  if(!seat.actions)seat.actions=[];
  const stackBefore=seat.stack||0;
  const stackAfter=amt>0?Math.max(0,stackBefore-amt):stackBefore;
  seat.actions.push({street:recStreet,type,amount:amt?String(amt):'',stackAfter});
  if(amt>0)seat.stack=stackAfter;
  if(type==='Fold')seat.folded=true;
  if(type==='All-in')seat.allin=true;
  const inp=document.getElementById(`ra-${type}`); if(inp)inp.value='';
  renderRecordPanel();
}
function openCPR(t){cpTarget='__r__'+t;openCP(cpTarget);}
function saveHandRecord(){
  if(!curHand)return;
  // Calculate final pot
  let pot=0;
  curHand.seats.forEach(s=>(s.actions||[]).forEach(a=>{if(parseFloat(a.amount)>0)pot+=parseFloat(a.amount);}));
  curHand.finalPot=pot;
  S.handLog=[curHand,...S.handLog];
  // Reset table
  S.board=[null,null,null,null,null];
  S.seats=S.seats.map(s=>({...s,cards:[null,null],actions:[],folded:false,allin:false}));
  persist(); closePanel('record-panel'); curHand=null;
  render(); notify('יד נשמרה ✓');
}

// ═══════════════════════════════════════════════════════
// HAND LIST
// ═══════════════════════════════════════════════════════
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
  hdr.innerHTML = '<div><div style="font-size:14px;font-weight:800;color:#c8a96e">'+h.date+'</div><div style="font-size:11px;color:#5a5870">'+h.blinds+(h.anteStr?' · '+h.anteStr:'')+(h.label?' · '+h.label:'')+'</div>'+(winnerNames?'<div style="font-size:12px;font-weight:700;color:#5fc47a;margin-top:3px">🏆 '+winnerNames+'</div>':'')+'</div>';
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none;border:none;color:#5a5870;font-size:22px;cursor:pointer;padding:4px';
  closeBtn.textContent = '✕';
  closeBtn.onclick = ()=>overlay.remove();
  
  // Analyze button
  const analyzeBtn = document.createElement('button');
  analyzeBtn.style.cssText = 'padding:6px 12px;border-radius:8px;border:1px solid rgba(200,169,110,0.4);background:rgba(200,169,110,0.1);color:#c8a96e;font-size:12px;font-weight:700;cursor:pointer;margin-left:6px';
  analyzeBtn.textContent = '🔍 נתח יד';
  analyzeBtn.onclick = ()=>analyzeHand(h);

  hdr.appendChild(analyzeBtn);
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
    brow.style.cssText = 'display:flex;gap:2px;direction:ltr';
    boardCards2.forEach(c=>{
      const isRed=c.suit==='♥'||c.suit==='♦';
      const bc2=document.createElement('div');
      bc2.style.cssText = 'width:32px;height:46px;border-radius:5px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:14px;font-weight:900;line-height:1;box-shadow:0 3px 8px rgba(0,0,0,0.6);opacity:1';
      bc2.innerHTML='<span style="color:'+(isRed?'#d42020':'#111')+'">'+c.rank+'</span><span style="font-size:10px;color:'+(isRed?'#e05555':'#111')+'">'+c.suit+'</span>';
      brow.appendChild(bc2);
    });
    const potLbl = document.createElement('div');
    potLbl.style.cssText = 'font-size:8px;font-weight:700;color:#5fc47a;background:rgba(0,0,0,0.5);padding:1px 6px;border-radius:6px';
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
  (h.seats||[]).forEach((s,si)=>{
    const angle = (2*Math.PI*si/seatCount) - Math.PI/2; // start from top
    const px = cx + rx*Math.cos(angle);
    const py = cy + ry*Math.sin(angle);
    
    const seatEl = document.createElement('div');
    seatEl.style.cssText = 'position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:1px;left:'+px+'%;top:'+py+'%';
    
    const isMe = s.playerName===myNameDet2||(s.playerId&&pName(s.playerId)===myNameDet2);
    const hasWon = (h.winners||[]).some(w=>w.seatIdx===s.seatIdx||w.playerId===s.playerId);
    const posColor = s.pos==='BTN'?'#c8a96e':s.pos==='SB'?'#8b7cb8':s.pos==='BB'?'#e07b6a':'#6a8090';
    
    const circle = document.createElement('div');
    const sz = 46; // will auto-height
    const hasCards = (s.cards||[]).filter(Boolean).length>0;
    circle.style.cssText = 'width:'+sz+'px;min-height:'+sz+'px;border-radius:8px;background:#121824;border:1.5px solid '+(s.folded?'rgba(255,255,255,0.06)':hasWon?'#5fc47a':'rgba(255,255,255,0.12)')+';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:3px 2px;opacity:'+(s.folded?0.4:1)+';'+(hasWon?'box-shadow:0 0 6px rgba(95,196,122,0.4)':'');
    
    const seatCards = (s.cards||[]).filter(Boolean);
    // Always show pos+name
    const posEl=document.createElement('div');
    posEl.style.cssText='font-size:6px;font-weight:800;color:'+posColor+';line-height:1';
    posEl.textContent=s.pos||'';
    const nameEl=document.createElement('div');
    nameEl.style.cssText='font-size:7px;font-weight:700;color:'+(isMe?'#c8a96e':'#e2ddd4')+';line-height:1.1';
    nameEl.textContent=(s.playerName||'').slice(0,5);
    circle.appendChild(posEl); circle.appendChild(nameEl);
    // Cards shown outside circle, on the table, positioned toward center
    if(seatCards.length){
      // Calculate direction toward center
      const dx = 50 - px; const dy = 50 - py;
      const len = Math.sqrt(dx*dx+dy*dy)||1;
      const cardOffX = (dx/len)*18; // offset toward center
      const cardOffY = (dy/len)*18;
      const cContainer = document.createElement('div');
      cContainer.style.cssText = 'position:absolute;left:'+(px+cardOffX)+'%;top:'+(py+cardOffY)+'%;transform:translate(-50%,-50%);display:flex;gap:2px;direction:ltr;z-index:5';
      seatCards.forEach(c=>{
        const isRed=c.suit==='♥'||c.suit==='♦';
        const cd=document.createElement('div');
        cd.style.cssText = 'width:20px;height:28px;border-radius:3px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;font-weight:900;line-height:1;box-shadow:0 2px 4px rgba(0,0,0,0.6);opacity:1';
        cd.innerHTML='<span style="color:'+(isRed?'#d42020':'#111')+'">'+c.rank+'</span><span style="font-size:6px;color:'+(isRed?'#d42020':'#111')+'">'+c.suit+'</span>';
        cContainer.appendChild(cd);
      });
      tableDiv.appendChild(cContainer);
    }
    seatEl.appendChild(circle);
    
    // Win chip
    if(hasWon && h.finalPot){
      const chip=document.createElement('div');
      chip.style.cssText='background:#5fc47a;color:#0a0d14;font-size:6px;font-weight:900;padding:1px 4px;border-radius:5px;white-space:nowrap';
      chip.textContent='+'+h.finalPot.toLocaleString();
      seatEl.appendChild(chip);
    }
    tableDiv.appendChild(seatEl);
  });
  
  box.appendChild(tableDiv);



  // Streets - column layout like poker client
  const streets = ['פרה-פלופ','פלופ','טרן','ריבר'];
  const streetLabels = {'פרה-פלופ':'Pre','פלופ':'Flop','טרן':'Turn','ריבר':'River'};
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
          '<div style="font-size:9px;color:#5a5870">'+(a.pos||a.type)+'</div>'+
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
        const allStreets = ['פרה-פלופ','פלופ','טרן','ריבר'];
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
          allActs.push({...a, playerName:s.playerName||s.playerId, pos:s.pos, folded:s.folded});
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
        row.innerHTML =
          '<div style="font-size:9px;color:#5a5870;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(a.pos||'')+'</div>'+
          '<div style="font-size:10px;font-weight:700;color:'+(isFold?'#555':'#e2ddd4')+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+a.playerName+'</div>'+
          '<div style="display:inline-block;margin-top:2px;padding:1px 6px;border-radius:5px;background:'+c+'22;color:'+c+';font-size:9px;font-weight:800">'+a.type+'</div>'+
          (a.amount&&!isFold?'<div style="font-size:10px;font-weight:700;color:#e2ddd4">₪'+Number(a.amount).toLocaleString()+'</div>':'');
        col.appendChild(row);
      });
      // Add player cards at bottom of this column
      const allStreetsList2 = ['פרה-פלופ','פלופ','טרן','ריבר'];
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
            return '<div style="width:22px;height:30px;border-radius:4px;background:#fff;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.6);margin:0 1px"><span style="font-size:9px;font-weight:900;color:'+(isRed?'#d42020':'#111')+';line-height:1">'+c.rank+'</span><span style="font-size:7px;color:'+(isRed?'#d42020':'#111')+';line-height:1">'+c.suit+'</span></div>';
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
    
    const streets = ['פרה-פלופ','פלופ','טרן','ריבר'];
    const vpip = hands.filter(h=>(h.seats||[]).some(s=>s.playerName===filterPlayer&&(s.actions||[]).some(a=>a.type==='Call'||a.type==='Raise'||a.type==='Open'||a.type==='3bet'||a.type==='4bet'))).length;
    const pfr = hands.filter(h=>(h.seats||[]).some(s=>s.playerName===filterPlayer&&(s.actions||[]).some(a=>a.street==='פרה-פלופ'&&(a.type==='Raise'||a.type==='Open'||a.type==='3bet'||a.type==='4bet')))).length;
    const raises = allActions.filter(a=>a.type==='Raise'||a.type==='Open'||a.type==='3bet'||a.type==='4bet'||a.type==='All-in');
    const calls  = allActions.filter(a=>a.type==='Call');
    const af = calls.length>0 ? (raises.length/calls.length).toFixed(1) : raises.length>0?'∞':'0';
    
    const raisesByStreet = streets.map(st=>allActions.filter(a=>a.street===st&&(a.type==='Raise'||a.type==='Open'||a.type==='3bet'||a.type==='4bet'||a.type==='All-in')).length);

    const statCell = (label,val,color='#e2ddd4',sub='')=>
      `<div style="flex:1;padding:6px 8px;text-align:center;border-left:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:9px;color:#5a5870;margin-bottom:2px">${label}</div>
        <div style="font-size:15px;font-weight:800;color:${color}">${val}</div>
        ${sub?`<div style="font-size:9px;color:#5a5870">${sub}</div>`:''}
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
        <div style="font-size:9px;color:#5a5870">${st.slice(0,2)} רייז</div>
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
  cont.innerHTML=allHands.map((h,hi)=>{
    const boardCards=(h.board||[]).filter(Boolean);
    // Find my cards (current user)
    const myName = currentUser?.name||'';
    const mySeat = (h.seats||[]).find(s=>s.playerName===myName||(s.playerId&&pName(s.playerId)===myName));
    const myCards = mySeat?(mySeat.cards||[]).filter(Boolean):[];
    const myCardsHtml = myCards.map(c=>`<div style="width:24px;height:34px;border-radius:4px;background:#fff;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.5);margin-left:3px"><span style="font-size:10px;font-weight:900;color:${SC[c.suit]};line-height:1">${c.rank}</span><span style="font-size:8px;color:${SC[c.suit]};line-height:1">${c.suit}</span></div>`).join('');
    return`<div class="card-item" onclick="showHandDetail('${h.id}')" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div>
          <div style="font-size:11px;font-weight:700;color:#e2ddd4">${h.label||h.blinds}</div>
          ${(h.winners||[]).length?`<div style="font-size:10px;color:#5fc47a">🏆 ${h.winners.map(w=>w.name).join(' + ')}</div>`:'' }
          <div style="font-size:10px;color:var(--muted)">${h.date} · ${h.blinds}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${myCardsHtml?`<div style="display:flex;direction:ltr">${myCardsHtml}</div>`:''}
          <button class="btn btn-red btn-xs" onclick="event.stopPropagation();deleteHand(${hi})">✕</button>
        </div>
      </div>
      ${boardCards.length?`<div style="display:flex;gap:3px;direction:ltr">${boardCards.map(c=>`<div style="width:20px;height:28px;border-radius:3px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);display:flex;flex-direction:column;align-items:center;justify-content:center"><span style="font-size:8px;font-weight:900;color:${SC[c.suit]};line-height:1">${c.rank}</span><span style="font-size:6px;color:${SC[c.suit]};line-height:1">${c.suit}</span></div>`).join('')}</div>`:``}
    </div>`;
  }).join('');
}
function deleteHand(hi){
  S.handLog.splice(hi,1); persist(); renderHandList();
}

// ═══════════════════════════════════════════════════════
// TOURNAMENT
// ═══════════════════════════════════════════════════════
function calcPrizes(){
  const pool=prizePool();
  const house=S.houseRake||0;
  const p4=parseFloat(S.place4)||0;
  const p3=parseFloat(S.place3)||0;
  const rem=Math.max(0,pool-house-p4-p3);
  const p1auto=rem*0.7, p2auto=rem*0.3;
  const p1=S.place1Override!=null?S.place1Override:p1auto;
  const p2=S.place2Override!=null?S.place2Override:p2auto;
  return{pool,house,p4,p3,p2,p1,rem,p1auto,p2auto};
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
  const t={
    id:uid(), date:new Date().toLocaleDateString('he-IL'),
    buyinCost:S.buyinCost, totalBuyins:totalBuyins(), totalRebuys:totalRebuys(),
    totalEntries:totalEntries(), paidEntries:calcPaidEntries(), freeRebuys:calcFreeRebuys(), prizePool:pr.pool,
    houseRake:pr.house, place4:pr.p4, place3:pr.p3, place2:pr.p2, place1:pr.p1,
    koOrder:[...S.koOrder],
    // Sorted by finish: 1st=winner(not KO'd), 2nd=last KO, 3rd=second-to-last KO, etc.
    finishOrder:[...activePids, ...[...S.koOrder].reverse()].map((pid,i)=>({place:i+1,pid,name:pName(pid),rebuy:(S.buyins[pid]||{}).rebuy||0})),
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
    winners.forEach(pid=>finishRows.push({place:1,pid}));
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

    <!-- REBUY BAR CHART - always on top -->
    ${totalRebuys()>0?`
    <div style="margin-bottom:12px">
      <div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:6px">🔄 התפלגות Rebuy</div>
      <div style="overflow-x:auto;padding-bottom:4px">
        <div style="display:flex;align-items:flex-end;gap:4px;padding:0 2px;min-width:min-content">
          ${Object.entries(S.buyins)
            .filter(([pid,b])=>b.rebuy>0)
            .sort((a,b)=>b[1].rebuy-a[1].rebuy)
            .map(([pid,b])=>{
              const maxR=Math.max(...Object.values(S.buyins).map(x=>x.rebuy||0),1);
              const pct=Math.max(Math.round((b.rebuy/maxR)*100),5);
              const hasFree16 = b.rebuy>=16;
              const hasFree10 = b.rebuy>=10;
              const color = hasFree16?'#e07b6a':hasFree10?'#5b9bd5':'rgba(200,169,110,0.85)';
              const badge = hasFree16?'16✓':hasFree10?'10✓':'';
              const name = pName(pid)||'?';
              return `<div style="display:flex;flex-direction:column;align-items:center;width:32px;flex-shrink:0">
                <div style="font-size:12px;font-weight:900;color:${color};margin-bottom:3px;white-space:nowrap">${b.rebuy}${badge?` <span style="font-size:9px">${badge}</span>`:''}</div>
                <div style="width:26px;background:rgba(255,255,255,0.07);border-radius:3px 3px 0 0;height:80px;display:flex;align-items:flex-end;position:relative;overflow:hidden">
                  <div style="width:100%;height:${pct}%;background:${color};border-radius:3px 3px 0 0;min-height:3px"></div>
                </div>
                <div style="height:52px;display:flex;align-items:flex-start;justify-content:center;margin-top:3px">
                  <span style="font-size:13px;font-weight:700;color:#e2ddd4;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);white-space:nowrap;line-height:1;letter-spacing:2px">${name}</span>
                </div>

              </div>`;
            }).join('')}
        </div>
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
    <div class="prize-row">
      <span class="prize-lbl">מקום 3</span>
      ${isViewer()?`<span class="prize-val">${S.place3?'₪'+S.place3.toLocaleString():'-'}</span>`:`<input class="prize-inp" type="number" value="${S.place3||0}" placeholder="0" onchange="S.place3=+this.value;persist();renderTournList()">`}
    </div>
    <div class="prize-row">
      <span class="prize-lbl">מקום 4</span>
      ${isViewer()?`<span class="prize-val">${S.place4?'₪'+S.place4.toLocaleString():'-'}</span>`:`<input class="prize-inp" type="number" value="${S.place4||0}" placeholder="0" onchange="S.place4=+this.value;persist();renderTournList()">`}
    </div>
    <div class="prize-row">
      <span class="prize-lbl">בית</span>
      ${isViewer()?`<span class="prize-val">₪${S.houseRake.toLocaleString()}</span>`:`<input class="prize-inp" type="number" value="${S.houseRake}" onchange="S.houseRake=+this.value;persist();renderTournList()">`}
    </div>
  </div>`;

  // Tournament history
  if(S.tournLog.length){
    html += `<div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:8px">היסטוריה (${S.tournLog.length})</div>`;
    html += S.tournLog.map((t,ti)=>{
      const prizeByPlaceT = {1:Math.round(t.place1||0),2:Math.round(t.place2||0),3:t.place3||0,4:t.place4||0};
      const finishT = t.finishOrder||[];
      // Rebuy per player from saved data
      const rebuyT = pid => {
        const found = t.finishOrder?.find(f=>f.pid===pid);
        return found?.rebuy||0;
      };
      return `<div class="card-item">
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
          <button class="btn btn-red btn-xs" onclick="deleteTournament(${ti})">✕</button>
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
          ${isAdmin()?`
          <div style="background:rgba(26,58,26,0.3);border:1px solid rgba(74,138,74,0.3);border-radius:10px;padding:5px 10px;text-align:center;flex-shrink:0">
            <div style="font-size:10px;color:#4a8a4a;margin-bottom:1px">🃏 צ׳יפים</div>
            <div style="font-size:16px;font-weight:900;color:#7fd47f">${((t.totalEntries||0)*50/1000).toFixed(1)}M</div>
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
          <!-- Rebuy vertical bar chart -->
          ${t.finishOrder?.some(f=>f.rebuy>0)?`
          <div>
            <div style="display:flex;align-items:flex-end;gap:3px;padding:0 2px">
              ${(()=>{
                const maxR=Math.max(...(t.finishOrder||[]).map(f=>f.rebuy||0),1);
                return (t.finishOrder||[]).filter(f=>f.rebuy>0).sort((a,b)=>b.rebuy-a.rebuy).map(f=>{
                  const pct=Math.max(Math.round((f.rebuy/maxR)*100),5);
                  const hasFree16=f.rebuy>=16, hasFree10=f.rebuy>=10;
                  const color=hasFree16?'#e07b6a':hasFree10?'#5b9bd5':'rgba(200,169,110,0.85)';
                  const badge=hasFree16?'16✓':hasFree10?'10✓':'';
                  return `<div style="display:flex;flex-direction:column;align-items:center;width:22px;flex-shrink:0">
                    <div style="font-size:9px;font-weight:900;color:${color};margin-bottom:2px;white-space:nowrap">${f.rebuy}${badge?`<span style="font-size:7px">${badge}</span>`:''}</div>
                    <div style="width:16px;background:rgba(255,255,255,0.07);border-radius:2px 2px 0 0;height:70px;display:flex;align-items:flex-end">
                      <div style="width:100%;height:${pct}%;background:${color};border-radius:2px 2px 0 0;min-height:2px"></div>
                    </div>
                    <div style="height:36px;display:flex;align-items:flex-start;justify-content:center;margin-top:2px">
                      <span style="font-size:12px;font-weight:700;color:#e2ddd4;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);white-space:nowrap;letter-spacing:2px">${f.name}</span>
                    </div>
                  </div>`;
                }).join('');
              })()}
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
    return`<div class="card-item" style="display:flex;align-items:center;gap:9px;${inGame?'border-color:rgba(95,196,122,0.25)':''}">
      <div style="width:34px;height:34px;border-radius:17px;background:rgba(200,169,110,0.18);border:1px solid rgba(200,169,110,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--gold);flex-shrink:0">${p.name[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${isWinner?'🥇 ':''}
          <span>${p.name}</span>
          ${b.rebuy>0?`<span style="font-size:13px;font-weight:900;color:var(--gold)">(${b.rebuy})</span>`:''}
          ${isWinner?`<span style="font-size:9px;color:#FFD700;background:rgba(255,215,0,0.12);border-radius:10px;padding:1px 8px">מקום 1</span>`:''}
          ${b.buyin>0&&!S.koOrder.includes(p.id)&&!isWinner?`<span style="font-size:9px;color:var(--green);background:rgba(95,196,122,0.12);border-radius:10px;padding:1px 6px">● פעיל</span>`:''}
          ${S.koOrder.includes(p.id)?`<span style="font-size:9px;color:#e07b6a;background:rgba(224,85,85,0.12);border-radius:10px;padding:1px 6px">💀 הודח</span>`:''}
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:1px">
          ${b.buyin?'BuyIn':'לא נרשם'}
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">
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
    </div>`;
  }).join('');
}
// ═══════════════════════════════
// ═══════════════════════════════════════════════════════
// CARD PICKER
// ═══════════════════════════════════════════════════════
function openCP(target){if(isViewer()){notify('צופה בלבד');return;}cpTarget=target;cpRank=null;renderCP();document.getElementById('card-picker').classList.add('open');}
function renderCP(){
  const used=cpTarget?.startsWith('__r__')
    ?(curHand?.board||[]).concat(curHand?.seats?.flatMap(s=>s.cards||[])||[]).filter(Boolean)
    :allUsedCards();
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
      return `<button style="width:36px;height:48px;border-radius:6px;border:1.5px solid ${u?'rgba(255,255,255,0.08)':'#ddd'};background:${bg};cursor:${u?'default':'pointer'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1px;box-shadow:${u?'none':'0 1px 3px rgba(0,0,0,0.4)'}" ${u?'disabled':''} onclick="cpRank='${rank}';pickCard('${suit}')">
        <span style="font-size:13px;font-weight:900;color:${rankCol};line-height:1">${rank}</span>
        <span style="font-size:11px;color:${suitCol};line-height:1">${suit}</span>
      </button>`;
    }).join('');
    return `<div style="display:flex;gap:3px;margin-bottom:3px;direction:ltr">${btns}</div>`;
  }).join('');
  document.getElementById('cp-content').innerHTML=`<div style="padding:4px;direction:ltr">${rows}</div>`;
}
function pickCard(s){
  if(!cpRank){ console.log('pickCard: no cpRank'); return; }
  const card={rank:cpRank,suit:s};
  cpRank=null; // reset for next pick
  const t=cpTarget; document.getElementById('card-picker').classList.remove('open');
  if(t?.startsWith('__r__')){
    const rt=t.replace('__r__','');
    if(rt.startsWith('rb')){curHand.board[+rt.replace('rb','')]=card;}
    else{const m=rt.match(/rs(\d+)_c(\d+)/);if(m)curHand.seats[+m[1]].cards[+m[2]]=card;}
    renderRecordPanel(); return;
  }
  if(t?.startsWith('board')){
    const boardIdx = +t.replace('board','');
    S.board[boardIdx]=card;
    // Auto-advance to next flop card
    if(boardIdx===0&&!S.board[1]) setTimeout(()=>openCP('board1'),80);
    else if(boardIdx===1&&!S.board[2]) setTimeout(()=>openCP('board2'),80);
    // Clear bet chips when new betting round starts: after 3rd flop card, turn, river
    if(boardIdx===2||boardIdx===3||boardIdx===4){
      const newStreet = boardIdx===2?'פלופ':boardIdx===3?'טרן':'ריבר';
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
          if(bCnt===5) showShowdownPanel();
          else autoOpenNextCard();
        }, 150);
      } else {
        // Normal street – reset for new betting round
        const newOrder = getActingOrder(newStreet);
        S.currentActor = newOrder[0]||null;
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
          // Keep cards and position info but clear bet actions for new street display
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
    if(m){
      const seatObj=S.seats.find(s=>s.seatIdx===+m[1]);
      if(seatObj){
        if(!seatObj.cards)seatObj.cards=[null,null];
        seatObj.cards[+m[2]]=card;
        const fromSD = S._sdAfterCards!==undefined;
        if(+m[2]===0 && fromSD){
          // קלף ראשון מ-showdown — פתח קלף שני אוטומטית
          setTimeout(()=>{
            cpTarget='seat'+m[1]+'_c1';
            renderCP();
            document.getElementById('card-picker').classList.add('open');
          },120);
        } else if(+m[2]===1 && fromSD){
          // קלף שני מ-showdown — חזור למסך showdown
          S._sdAfterCards=undefined;
          setTimeout(()=>showShowdownPanel(),150);
        }
      }
    }
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
function closeSeatPanel(){activeSeat=null;closePanel('seat-panel');renderSeats();}
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
