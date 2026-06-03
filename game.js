// ═══════════════════════════════════════════════════════
// SEAT PANEL
// ═══════════════════════════════════════════════════════
function getPlayerNote(playerId){
  if(!playerId) return '';
  return (S.playerNotes||{})[playerId]||'';
}

function savePlayerNote(seatIdx, note){
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat?.playerId) return;
  if(!S.playerNotes) S.playerNotes={};
  S.playerNotes[seat.playerId] = note;
  persist();
}

function pickSeatCard(seatIdx, rank, suit, forceSlot){
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat) return;
  if(!seat.cards) seat.cards=[null,null];
  
  if(rank===null){ // clear slot
    seat.cards[forceSlot]=null;
    persist(); renderSeats(); renderSeatPanel(); return;
  }
  
  // Find which slot to fill
  const slot = forceSlot!==undefined ? forceSlot : (!seat.cards[0] ? 0 : !seat.cards[1] ? 1 : 0);
  seat.cards[slot]={rank,suit};
  persist(); renderSeats();
  
  // Auto-advance to second card
  if(slot===0 && !seat.cards[1]){
    renderSeatPanel(); // re-render to show second slot active
  } else {
    renderSeatPanel();
  }
}

function renderSeatPanel(){
  const i=activeSeat; if(i===null)return;
  const swp=assignPos();
  const seat=swp.find(s=>s.seatIdx===i)||{seatIdx:i,playerId:'',stack:50000,pos:'',cards:[null,null],actions:[],folded:false,allin:false};
  const has=!!seat.playerId, pos=seat.pos, bb=getBB();
  const titleName = seat.playerId ? pName(seat.playerId) : `מושב ${i+1}`;
  document.getElementById('spt').innerHTML=`<span style="font-size:14px;font-weight:800">${titleName}</span>${pos?` <span style="font-size:11px;font-weight:800;color:${PC[pos]||'var(--gold)'};background:${PC[pos]||'var(--gold)'}25;border-radius:6px;padding:2px 8px;margin-right:6px">${pos}</span>`:''}`;
  const rmBtn = document.getElementById('btn-remove-seat');
  if(rmBtn) rmBtn.style.display = seat.playerId ? '' : 'none';
  // Player + stack
  const takenPids=S.seats.filter(s=>s.seatIdx!==i&&s.playerId).map(s=>s.playerId);
  let html=`<div class="form-row">
    <div class="form-group"><label>שחקן</label>
      <select onchange="setSeatPlayer(${i},this.value)">
        <option value="">-- ריק --</option>
        ${sortedLib().map(p=>`<option value="${p.id}"${seat.playerId===p.id?' selected':''}${takenPids.includes(p.id)?' disabled style="color:#555"':''}>${p.name}${takenPids.includes(p.id)?' ✗':''}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>ערימה${seat.stack&&bb?` <span style="color:var(--muted2);font-weight:400">(${(seat.stack/bb).toFixed(1)}bb)</span>`:''}</label>
      <input type="number" value="${seat.stack??0}" placeholder="0" onchange="updSeat(${i},{stack:+this.value||0})">
    </div>
    <div class="form-group"><label style="font-size:11px">📝 הערות</label>
      <textarea rows="2" placeholder="הערות על השחקן..." style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:12px;resize:none;outline:none;box-sizing:border-box;direction:rtl" onchange="savePlayerNote(${i},this.value)">${getPlayerNote(seat.playerId)}</textarea>
    </div>
  </div>`;
  // BTN
  const btnLabel = S.btnLocked ? '🔒 BTN נעול' : S.btnSeat===i ? '✓ BTN מסומן' : '🎯 סמן כ-BTN והתחל יד';
  const btnStyle = S.btnLocked ? 'background:rgba(90,80,96,0.1);border:1px solid #5a506050;color:#5a5060' : S.btnSeat===i ? 'background:rgba(200,169,110,0.2);border:1px solid rgba(200,169,110,0.5);color:var(--gold)' : 'background:rgba(91,155,213,0.15);border:1px solid rgba(91,155,213,0.5);color:#5b9bd5';
  html+=`<div style="margin-bottom:7px"><span class="sec-lbl" style="margin-bottom:3px">עמדת דילר (BTN)</span>
    <button class="btn btn-sm" style="${btnStyle}" onclick="if(!S.btnLocked){S.btnSeat=${i};postBlinds(${i});persist();renderSeats();renderSeatPanel();}">
      ${btnLabel}
    </button></div>`;

  // Inline card picker
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const usedCards = [...(S.board||[]), ...(S.seats.filter(s=>s.seatIdx!==i).flatMap(s=>s.cards||[]))].filter(Boolean);
  let cardPickingSlot = (seat.cards?.[0]&&seat.cards?.[1]) ? null : !seat.cards?.[0] ? 0 : 1;
  
  const rows = suits.map(suit=>{
    const btns = ranks.map(rank=>{
      const used = usedCards.some(c=>c&&c.rank===rank&&c.suit===suit);
      const isSelected = (seat.cards?.[0]?.rank===rank&&seat.cards?.[0]?.suit===suit)||(seat.cards?.[1]?.rank===rank&&seat.cards?.[1]?.suit===suit);
      const isRed = suit==='♥'||suit==='♦';
      const bg = isSelected?'#c8a96e':used?'rgba(255,255,255,0.08)':'#fff';
      const border = isSelected?'#c8a96e':used?'rgba(255,255,255,0.08)':'#ddd';
      const rankCol = used?'#999':isSelected?'#0a0d14':(isRed?'#d42020':'#111');
      const suitCol = used?'#aaa':isSelected?'#0a0d14':(isRed?'#d42020':'#111');
      return `<button style="width:34px;height:46px;border-radius:5px;border:1.5px solid ${border};background:${bg};cursor:${used?'default':'pointer'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1px;box-shadow:${used?'none':'0 1px 3px rgba(0,0,0,0.4)'}" ${used&&!isSelected?'disabled':''} onclick="pickSeatCard(${i},'${rank}','${suit}')">
        <span style="font-size:12px;font-weight:900;color:${rankCol};line-height:1">${rank}</span>
        <span style="font-size:11px;color:${suitCol};line-height:1">${suit}</span>
      </button>`;
    }).join('');
    return `<div style="display:flex;gap:2px;margin-bottom:2px;direction:ltr">${btns}</div>`;
  }).join('');
  
  html+=`<div style="margin-bottom:8px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <span class="sec-lbl">קלפי שחקן</span>
      <button onclick="openCameraForCards('${i}')" style="background:none;border:1px solid rgba(200,169,110,0.3);border-radius:8px;color:#c8a96e;font-size:14px;cursor:pointer;padding:3px 8px">📷</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
      ${[0,1].map(ci=>{
        const c=seat.cards?.[ci];
        const isRed=c&&(c.suit==='♥'||c.suit==='♦');
        return`<div style="width:44px;height:60px;border-radius:7px;border:2px solid ${c?'#c8a96e':'rgba(255,255,255,0.2)'};background:${c?'#fff':'rgba(255,255,255,0.06)'};display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;box-shadow:${c?'0 2px 8px rgba(0,0,0,0.4)':'none'}" onclick="pickSeatCard(${i},null,null,${ci})">
          ${c
            ?`<span style="font-size:18px;font-weight:900;color:${isRed?'#d42020':'#111'};line-height:1">${c.rank}</span><span style="font-size:14px;color:${isRed?'#d42020':'#111'};line-height:1">${c.suit}</span>`
            :`<span style="color:rgba(255,255,255,0.2);font-size:22px;line-height:1">+</span>`
          }
        </div>`;
      }).join('')}
      ${(seat.cards||[]).some(Boolean)?`<button class="btn btn-gray btn-xs" style="margin-right:4px" onclick="updSeat(${i},{cards:[null,null]})">✕</button>`:''}
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;direction:ltr">${rows}</div>
  </div>`;
  html+=`</div>`;
  document.getElementById('spb').innerHTML=html;
}

function undoLastAction(seatIdx){
  if(isViewer()){notify('צופה בלבד');return;}
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat||!seat.actions?.length) return;

  const boardCount = S.board.filter(Boolean).length;
  const street = boardCount===0?'פרה-פלופ':boardCount<=3?'פלופ':boardCount===4?'טרן':'ריבר';
  const streetActs = seat.actions.filter(a=>a.street===street);
  if(!streetActs.length) return;

  const last = streetActs[streetActs.length-1];
  // Don't undo SB/BB blinds
  if(last.type==='SB'||last.type==='BB'){ notify('לא ניתן לבטל בליינד'); return; }
  // Don't undo if next street cards have been dealt (TDA rule)
  const allStreets = ['פרה-פלופ','פלופ','טרן','ריבר'];
  const streetIdx = allStreets.indexOf(street);
  const nextStreetDealt = streetIdx===0 ? S.board[0]!=null :
                          streetIdx===1 ? S.board[3]!=null :
                          streetIdx===2 ? S.board[4]!=null : false;
  if(nextStreetDealt){ notify('לא ניתן לבטל לאחר חלוקת הקלפים'); return; }

  // Restore stack
  const amt = Number(last.amount)||0;
  seat.stack = (seat.stack||0) + amt;

  // Remove last action
  const idx = seat.actions.lastIndexOf(last);
  seat.actions.splice(idx, 1);

  // Restore folded/allin state
  if(last.type==='Fold') seat.folded = false;
  if(last.type==='All-in') seat.allin = false;

  // Restore lastBet - recalculate from remaining actions
  const raiseTypes = ['Open','Raise','3bet','4bet','5bet','All-in','Bet'];
  let maxBet = S.buyins ? (getBlinds()?.bb||0) : 0;
  S.seats.forEach(s=>{
    (s.actions||[]).filter(a=>a.street===street&&raiseTypes.includes(a.type)).forEach(a=>{
      const total = getStreetInvested(s.seatIdx);
      if(total > maxBet) maxBet = total;
    });
  });
  S.lastBet = maxBet;

  // Restore raiseRound if needed
  if(raiseTypes.includes(last.type)){
    S.raiseRound = Math.max(0, (S.raiseRound||0)-1);
    // Recalculate lastRaiser
    let lastRaiserSeat = null, lastRaiseRound = 0;
    S.seats.forEach(s=>{
      (s.actions||[]).filter(a=>a.street===street&&raiseTypes.includes(a.type)).forEach((a,i)=>{
        if((a.raiseRound||0) >= lastRaiseRound){
          lastRaiseRound = a.raiseRound||0;
          lastRaiserSeat = s.seatIdx;
        }
      });
    });
    S.lastRaiser = lastRaiserSeat!==null ? {seat:lastRaiserSeat, round:lastRaiseRound} : null;
  }

  // Return turn to this player
  S.currentActor = seatIdx;
  S.bettingClosed = false;

  persist(); renderSeats(); renderBoard(); renderLiveActions();
  notify('פעולה בוטלה ↩');
}

function inlineEditStack(seatIdx, el){
  if(!isAdmin()) return;
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat) return;
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.inputMode = 'numeric';
  inp.value = seat.stack;
  inp.style.cssText = 'width:100%;font-size:11px;font-weight:700;color:#e2ddd4;background:#0a0e18;border:1px solid #c8a96e;border-radius:4px;text-align:center;outline:none;padding:2px;box-sizing:border-box;-webkit-appearance:none';
  inp.onblur = ()=>{
    const n=parseInt(inp.value);
    if(!isNaN(n)&&n>=0){ seat.stack=n; persist(); renderSeats(); }
    else renderSeats();
  };
  inp.onkeydown = e=>{
    if(e.key==='Enter'){ inp.blur(); }
    if(e.key==='Escape'){ renderSeats(); }
  };
  el.replaceWith(inp);
  inp.focus();
  inp.select();
}

function applyStackEdit(seatIdx){
  const n=parseInt(document.getElementById('stack-edit-inp')?.value);
  document.getElementById('quick-input-overlay')?.remove();
  if(!isNaN(n)&&n>=0){
    const seat=S.seats.find(s=>s.seatIdx===seatIdx);
    if(seat){ seat.stack=n; persist(); renderSeats(); renderBoard(); }
  }
}
function editStack(seatIdx){
  if(!isAdmin()) return;
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat) return;
  document.getElementById('quick-input-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'quick-input-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.6)';
  overlay.onclick = ()=>overlay.remove();
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:14px;padding:16px;width:220px;text-align:center';
  box.onclick = e=>e.stopPropagation();
  const inp = document.createElement('input');
  inp.id = 'stack-edit-inp';
  inp.type = 'number';
  inp.inputMode = 'numeric';
  inp.value = seat.stack;
  inp.style.cssText = 'width:100%;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#0a0e18;color:#e2ddd4;font-size:18px;text-align:center;outline:none;box-sizing:border-box;margin-bottom:10px;-webkit-appearance:none';
  inp.onkeydown = e=>{ if(e.key==='Enter') applyStackEdit(seatIdx); };
  const title = document.createElement('div');
  title.style.cssText = 'font-size:13px;font-weight:700;color:#c8a96e;margin-bottom:10px';
  title.textContent = 'ערימה – '+(pName(seat.playerId)||'שחקן');
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px';
  const ok = document.createElement('button');
  ok.style.cssText = 'flex:1;padding:10px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:14px;cursor:pointer';
  ok.textContent = '✓';
  ok.onclick = ()=>applyStackEdit(seatIdx);
  const cancel = document.createElement('button');
  cancel.style.cssText = 'flex:1;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:14px;cursor:pointer';
  cancel.textContent = '✕';
  cancel.onclick = ()=>overlay.remove();
  btns.appendChild(ok); btns.appendChild(cancel);
  box.appendChild(title); box.appendChild(inp); box.appendChild(btns);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(()=>{inp.focus();inp.select();inp.click();},200);
}

function autoOpenNextCard(){
  if(!isAdmin()) return;
  if(S._suppressAutoCard) return;
  const boardCount = S.board.filter(Boolean).length;
  let slotIdx = -1;
  if(boardCount===0) slotIdx=0;
  else if(boardCount===3) slotIdx=3;
  else if(boardCount===4) slotIdx=4;
  else if(boardCount===1) slotIdx=1;
  else if(boardCount===2) slotIdx=2;
  if(slotIdx===-1) return;
  // Check if blocked by active betting
  if(S.btnLocked && !S.bettingClosed && S.currentActor!==null){
    notify('סיים את סיבוב ההימורים קודם'); return;
  }
  openCP('board'+slotIdx);
}

function getStreetInvested(seatIdx){
  // How much has this player already put in during current street
  const boardCount = S.board.filter(Boolean).length;
  const street = boardCount===0?'פרה-פלופ':boardCount<=3?'פלופ':boardCount===4?'טרן':'ריבר';
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  return (seat?.actions||[])
    .filter(a=>a.street===street)
    .reduce((sum,a)=>sum+(Number(a.amount)||0), 0);
}

function showQuickPlayerPicker(seatIdx){
  document.getElementById('quick-player-picker')?.remove();
  const taken = S.seats.filter(s=>s.seatIdx!==seatIdx&&s.playerId).map(s=>s.playerId);
  const avail = sortedLib().filter(p=>!taken.includes(p.id));
  if(!avail.length){
    // No players available - show add new player directly
    document.getElementById('quick-player-picker')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'quick-player-picker';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:16px';
    overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
    const box = document.createElement('div');
    box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:14px;padding:14px;width:100%;max-width:320px';
    box.onclick = e=>e.stopPropagation();
    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;font-weight:800;color:#c8a96e;margin-bottom:10px;text-align:center';
    title.textContent = '+ הוסף שחקן חדש';
    const addRow = document.createElement('div');
    addRow.style.cssText = 'display:flex;gap:6px';
    const newInp = document.createElement('input');
    newInp.type = 'text';
    newInp.placeholder = 'שם השחקן...';
    newInp.style.cssText = 'flex:1;padding:9px 12px;border-radius:9px;border:1px solid rgba(200,169,110,0.3);background:#0a0e18;color:#e2ddd4;font-size:14px;outline:none;text-align:right';
    const addBtn = document.createElement('button');
    addBtn.style.cssText = 'padding:9px 14px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:13px;cursor:pointer';
    addBtn.textContent = '✓';
    addBtn.onclick = ()=>{
      const name = newInp.value.trim();
      if(!name){ notify('הכנס שם'); return; }
      if(S.playerLib.some(p=>p.name===name)){ notify('שחקן קיים'); return; }
      const id = uid();
      S.playerLib.push({id, name});
      persist();
      setSeatPlayer(seatIdx, id);
      overlay.remove();
    };
    newInp.onkeydown = e=>{ if(e.key==='Enter') addBtn.click(); };
    addRow.appendChild(newInp); addRow.appendChild(addBtn);
    box.appendChild(title); box.appendChild(addRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(()=>newInp.focus(), 150);
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'quick-player-picker';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };

  const box = document.createElement('div');
  box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:14px;padding:14px;width:100%;max-width:320px;max-height:70vh;overflow-y:auto';
  box.onclick = e=>e.stopPropagation();

  const title = document.createElement('div');
  title.style.cssText = 'font-size:13px;font-weight:800;color:#c8a96e;margin-bottom:10px;text-align:center';
  title.textContent = 'בחר שחקן למושב';
  box.appendChild(title);

  // Add new player input
  const addRow = document.createElement('div');
  addRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px';
  const newInp = document.createElement('input');
  newInp.type = 'text';
  newInp.placeholder = '+ שחקן חדש...';
  newInp.style.cssText = 'flex:1;padding:9px 12px;border-radius:9px;border:1px solid rgba(200,169,110,0.3);background:#0a0e18;color:#e2ddd4;font-size:14px;outline:none;text-align:right';
  const addBtn = document.createElement('button');
  addBtn.style.cssText = 'padding:9px 14px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:13px;cursor:pointer';
  addBtn.textContent = '✓';
  addBtn.onclick = ()=>{
    const name = newInp.value.trim();
    if(!name){ notify('הכנס שם'); return; }
    if(S.playerLib.some(p=>p.name===name)){ notify('שחקן קיים'); return; }
    const id = uid();
    S.playerLib.push({id, name});
    persist();
    setSeatPlayer(seatIdx, id);
    overlay.remove();
  };
  newInp.onkeydown = e=>{ if(e.key==='Enter') addBtn.click(); };
  addRow.appendChild(newInp); addRow.appendChild(addBtn);
  box.appendChild(addRow);

  avail.forEach(p=>{
    const btn = document.createElement('button');
    btn.style.cssText = 'width:100%;padding:10px 14px;border-radius:9px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:#e2ddd4;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:6px;text-align:right';
    btn.textContent = p.name;
    btn.onclick = ()=>{ setSeatPlayer(seatIdx, p.id); overlay.remove(); };
    box.appendChild(btn);
  });

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function rmSeat(seatIdx){
  if(!isAdmin()) return;
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(seat){ seat.playerId=''; seat.stack=50000; seat.cards=[null,null]; seat.actions=[]; seat.folded=false; seat.allin=false; }
  persist(); renderSeats();
  notify('שחקן הוסר ✓');
}

function doSeatRebuy(seatIdx){
  if(!isAdmin()) return;
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat) return;
  const defaultRebuy = S.defaultRebuyAmount||50000;
  // Show inline edit overlay
  document.getElementById('quick-input-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'quick-input-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7)';
  overlay.onclick = ()=>overlay.remove();
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#121824;border:1px solid rgba(95,196,122,0.4);border-radius:14px;padding:16px;width:240px;text-align:center';
  box.onclick = e=>e.stopPropagation();
  const name = pName(seat.playerId)||'שחקן';
  const inp = document.createElement('input');
  inp.id = 'rebuy-inp';
  inp.type = 'number';
  inp.inputMode = 'numeric';
  inp.value = defaultRebuy;
  inp.style.cssText = 'width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#0a0e18;color:#e2ddd4;font-size:20px;text-align:center;outline:none;box-sizing:border-box;margin-bottom:10px;-webkit-appearance:none';
  const title = document.createElement('div');
  title.style.cssText = 'font-size:13px;font-weight:700;color:#5fc47a;margin-bottom:10px';
  title.textContent = '+ Rebuy – '+name;
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px';
  const ok = document.createElement('button');
  ok.style.cssText = 'flex:1;padding:10px;border-radius:9px;border:none;background:#5fc47a;color:#0a0d14;font-weight:800;font-size:14px;cursor:pointer';
  ok.textContent = '✓ Rebuy';
  ok.onclick = ()=>{
    const n = parseInt(inp.value)||defaultRebuy;
    // Update directly in S.seats
    const seatRef = S.seats.find(s=>s.seatIdx===seatIdx);
    if(seatRef){
      seatRef.stack = n;
      seatRef.sittingOut = false; // back in game after rebuy
      // Only reset allin/folded if no active hand
      if(!S.btnLocked){
        seatRef.allin = false;
        seatRef.folded = false;
      }
    }
    if(!S.buyins[seat.playerId]) S.buyins[seat.playerId]={buyin:0,rebuy:0};
    S.buyins[seat.playerId].rebuy = (S.buyins[seat.playerId].rebuy||0)+1;
    persist(); renderSeats(); overlay.remove();
    notify('Rebuy ✓ '+name+' – ₪'+n.toLocaleString());
    // If no active hand - show start next hand prompt
    if(!S.btnLocked){
      setTimeout(()=>showPostRebuyPrompt(), 300);
    }
  };
  inp.onkeydown = e=>{ if(e.key==='Enter') ok.click(); };
  const cancel = document.createElement('button');
  cancel.style.cssText = 'flex:1;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:14px;cursor:pointer';
  cancel.textContent = '✕';
  cancel.onclick = ()=>overlay.remove();
  btns.appendChild(ok); btns.appendChild(cancel);
  box.appendChild(title); box.appendChild(inp); box.appendChild(btns);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(()=>{inp.focus();inp.select();},150);
}

function showPostRebuyPrompt(){
  // Check if all players have chips now
  const broke = S.seats.filter(s=>s.playerId&&(s.stack||0)===0&&!s.sittingOut);
  if(broke.length) return; // still players with 0 chips

  document.getElementById('post-rebuy-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'post-rebuy-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl';

  const box = document.createElement('div');
  box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:16px;padding:20px;width:100%;max-width:300px;text-align:center';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:800;color:#c8a96e;margin-bottom:14px';
  title.textContent = '🃏 להתחיל יד חדשה?';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px';

  const yesBtn = document.createElement('button');
  yesBtn.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:none;background:#5fc47a;color:#0a0d14;font-weight:800;font-size:15px;cursor:pointer';
  yesBtn.textContent = 'כן';
  yesBtn.onclick = ()=>{
    overlay.remove();
    const nextBtn = getNextBtnSeat(S.btnSeat||S.seats.find(s=>s.playerId)?.seatIdx||0);
    setBTN(nextBtn);
  };

  const noBtn = document.createElement('button');
  noBtn.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#e2ddd4;font-size:15px;cursor:pointer';
  noBtn.textContent = 'לא';
  noBtn.onclick = ()=>overlay.remove();

  btnRow.appendChild(yesBtn); btnRow.appendChild(noBtn);
  box.appendChild(title); box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function setSittingOut(seatIdx, val){
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat) return;
  seat.sittingOut = val;
  persist(); renderSeats();
  notify(val ? '⏸ Sitting Out' : '▶ חזר לשולחן');
}

function setBTN(seatIdx){
  if(!isAdmin()) return;
  // Check for players with 0 chips
  const broke = S.seats.filter(s=>s.playerId&&(s.stack||0)===0&&!s.sittingOut);
  if(broke.length){
    const names = broke.map(s=>pName(s.playerId)).join(', ');
    notify('⚠️ '+names+' חסרי ציפים – Rebuy או Sit Out נדרש');
    return;
  }
  S.btnSeat = seatIdx;
  S._suppressAutoCard = true;
  postBlinds(seatIdx);
  setTimeout(()=>{ S._suppressAutoCard = false; }, 500);
}

function getCallAmount(seatIdx){
  // How much more does this player need to call
  const invested = getStreetInvested(seatIdx);
  return Math.max(0, (S.lastBet||0) - invested);
}

function quickAction(seatIdx, type){
  if(isViewer()){notify('צופה בלבד');return;}
  let amount = '';
  if(type==='Call') amount = String(getCallAmount(seatIdx));
  doAction(seatIdx, type, amount);
}

function showQuickInput(seatIdx, type){
  if(isViewer()){notify('צופה בלבד');return;}
  // Remove existing quick input
  document.getElementById('quick-input-overlay')?.remove();
  const seatEl = document.querySelector('.seat-el[data-seat="'+seatIdx+'"]') || 
                 document.querySelectorAll('.seat-el')[seatIdx];
  const overlay = document.createElement('div');
  overlay.id = 'quick-input-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.5)';
  overlay.onclick = ()=>overlay.remove();
  const box = document.createElement('div');
  const bb2 = getBlinds()?.bb||0;
  const minRaise = S.lastBet + Math.max(S.lastRaiseSize||0, bb2);
  const seat4Allin = S.seats.find(s=>s.seatIdx===seatIdx);
  const allinTotal = (seat4Allin?.stack||0) + getStreetInvested(seatIdx);
  const defaultAmt = type==='Call'?getCallAmount(seatIdx):type==='All-in'?allinTotal:type==='Raise'?minRaise:'';
  box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:14px;padding:16px;width:220px;text-align:center';
  box.onclick = e=>e.stopPropagation();
  box.innerHTML = '<div style="font-size:13px;font-weight:700;color:#c8a96e;margin-bottom:10px">'+type+'</div>' +
    '<input id="quick-amt-inp" type="number" inputmode="numeric" value="'+defaultAmt+'" placeholder="סכום..."' +
    ' style="width:100%;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#0a0e18;color:#e2ddd4;font-size:16px;text-align:center;outline:none;box-sizing:border-box;margin-bottom:10px;-webkit-appearance:none"' +
    ' onkeydown="if(event.key===\'Enter\'){doAction('+seatIdx+',\''+type+'\',this.value);document.getElementById(\'quick-input-overlay\')?.remove();}">' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="doAction('+seatIdx+',\''+type+'\',document.getElementById(\'quick-amt-inp\').value);document.getElementById(\'quick-input-overlay\')?.remove()"' +
    ' style="flex:1;padding:10px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:14px;cursor:pointer">✓</button>' +
    '<button onclick="document.getElementById(\'quick-input-overlay\')?.remove()"' +
    ' style="flex:1;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:14px;cursor:pointer">✕</button>' +
    '</div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  // Focus immediately - must be in same call stack as user gesture
  const inp=document.getElementById('quick-amt-inp');
  if(inp){
    inp.setAttribute('inputmode','numeric');
    inp.focus();
    inp.select();
  }
}

function doAction(seatIdx, type, amount){if(isViewer()){notify('צופה בלבד');return;}
  // Cancel any pending long-press HUD timer
  if(_longPressTimer){ clearTimeout(_longPressTimer); _longPressTimer=null; }
  const seat=S.seats.find(s=>s.seatIdx===seatIdx); if(!seat)return;
  const amt=parseFloat(amount)||0;
  if(!seat.actions)seat.actions=[];
  // Determine current street from board
  const boardCards = S.board.filter(Boolean).length;
  const street = boardCards===0?'פרה-פלופ':boardCards<=3?'פלופ':boardCards===4?'טרן':'ריבר';
  const isRaise = ['Open','Raise','3bet','4bet','All-in'].includes(type);
  if(isRaise) S.raiseRound = (S.raiseRound||0)+1;
  const currentRound = S.raiseRound||0;
  // Determine display label based on street and raise count
  const isPreflop = street==='פרה-פלופ';
  let displayType = type;
  if(type==='Raise'||type==='Open'){
    if(isPreflop){
      // Preflop: first raise=R, then 3b,4b,5b...
      displayType = currentRound===1?'R':currentRound===2?'3b':currentRound===3?'4b':(currentRound+1)+'b';
    } else {
      // Postflop: first=B, then R, 2R, 3R...
      const streetRaises = S.seats.flatMap(s=>(s.actions||[]).filter(a=>a.street===street&&['Raise','Open','Bet'].includes(a.type))).length;
      displayType = streetRaises===0?'B':streetRaises===1?'R':(streetRaises)+'R';
    }
  } else if(type==='3bet') displayType='3b';
  else if(type==='4bet') displayType='4b';
  // For raises: user enters TOTAL, store DELTA for correct pot calculation
  const isRaiseType2 = ['Open','Raise','3bet','4bet','5bet','All-in','Bet'].includes(type);
  const alreadyInvested = isRaiseType2 ? getStreetInvested(seatIdx) : 0;
  const deltaAmt = isRaiseType2 ? Math.max(0, amt - alreadyInvested) : amt;
  // Validate raise: min = lastBet + lastRaiseSize (or lastBet + BB if first raise)
  if(isRaiseType2 && type!=='All-in'){
    const bb = getBlinds()?.bb||0;
    const minRaise = S.lastBet + Math.max(S.lastRaiseSize||0, bb);
    if(amt < minRaise){
      notify('מינימום רייז: '+minRaise.toLocaleString());
      return;
    }
  }
  // Give each action a global index for ordering
  const allActCount = S.seats.reduce((n,s)=>(s.actions||[]).length+n, 0);
  seat.actions.push({street,type,displayType,amount:deltaAmt?String(deltaAmt):'',raiseRound:currentRound,idx:allActCount});
  if(isRaise){
    S.lastRaiser = {seat:seatIdx, round:currentRound};
    // After a raise, next actor starts from player AFTER the raiser
    // advanceTurn will handle this naturally since afterSeatIdx=seatIdx (the raiser)
  }
  if(type==='Fold')seat.folded=true;
  if(type==='All-in')seat.allin=true;
  if(amt>0){
    seat.stack=Math.max(0,(seat.stack||0)-deltaAmt);
    // Auto-mark allin if stack reached 0 (e.g. called all chips)
    if(seat.stack===0 && !seat.folded) seat.allin=true;
    // Track last bet for Call default
    if(['Open','Raise','3bet','4bet','5bet','All-in','Bet'].includes(type)){
      const raiseIncrement = amt - S.lastBet;
      const bb3 = getBlinds()?.bb||0;
      const prevRaiseSize = S.lastRaiseSize||bb3;
      // Full raise = increment >= previous raise size (or BB if first raise)
      S.lastRaiseWasFull = raiseIncrement >= Math.max(prevRaiseSize, bb3);
      S.lastRaiseSize = S.lastRaiseWasFull ? raiseIncrement : prevRaiseSize; // keep previous if not full
      S.lastBet = amt;
    }
  }
  const inp=document.getElementById(`aamt-${seatIdx}-${type}`);
  if(inp)inp.value='';
  // After fold, recompute order with folded player excluded
  if(type==='Fold'){
    const boardCount2 = S.board.filter(Boolean).length;
    const street2 = boardCount2===0?'פרה-פלופ':boardCount2<=3?'פלופ':boardCount2===4?'טרן':'ריבר';
    const newOrder = getActingOrder(street2); // now excludes folded player
    const curIdx = newOrder.indexOf(seatIdx);
    // Find next after this seat in the NEW order
    const nextAfterFold = newOrder[curIdx>=0?curIdx:0]||newOrder[0]||null;
    // But we want the NEXT one, not the current
    // Actually just advance normally - getActingOrder already excludes folded
    if(!checkAutoWin()) advanceTurn(seatIdx);
  } else {
    if(!checkAutoWin()) advanceTurn(seatIdx);
  }
  persist(); renderSeats(); renderBoard(); renderSeatPanel(); renderLiveActions();
}
function rmSeatAction(seatIdx,ai){
  const seat=S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat?.actions)return;
  const a=seat.actions[ai];
  // Restore stack if amount was deducted
  if(a&&parseFloat(a.amount)>0)seat.stack=(seat.stack||0)+parseFloat(a.amount);
  seat.actions.splice(ai,1);
  persist(); renderSeats(); renderBoard(); renderSeatPanel();
}

// ═══════════════════════════════════════════════════════
// SEAT ACTIONS
// ═══════════════════════════════════════════════════════
function clickSeat(i){
  if(isViewer()){notify('צופה בלבד – אין הרשאת עריכה');return;}
  if(activeSeat===i){activeSeat=null;closePanel('seat-panel');return;}
  if(!S.seats.find(s=>s.seatIdx===i))
    S.seats.push({id:uid(),seatIdx:i,playerId:'',stack:(S.defaultRebuyAmount||50000),pos:'',cards:[null,null],actions:[],folded:false,allin:false});
  const seat = S.seats.find(s=>s.seatIdx===i);
  if(!seat?.playerId){
    showQuickPlayerPicker(i);
  } else {
    activeSeat=i; renderSeatPanel(); openPanel('seat-panel'); renderSeats();
  }
}

// Long press on seat → HUD
let _longPressTimer = null; // global — cancelled on any action or render

function initSeatLongPress(el, seatIdx){
  let didLong=false, startX=0, startY=0;
  function cancelTimer(){ if(_longPressTimer){ clearTimeout(_longPressTimer); _longPressTimer=null; } didLong=false; }
  function onTouchStart(e){
    if(e.target.closest('button,input,select,a')) return;
    cancelTimer(); didLong=false;
    startX=e.touches[0].clientX; startY=e.touches[0].clientY;
    _longPressTimer=setTimeout(()=>{ didLong=true; _longPressTimer=null; showPlayerHUD(seatIdx); },700);
  }
  function onTouchMove(e){
    if(!_longPressTimer) return;
    const dx=e.touches[0].clientX-startX, dy=e.touches[0].clientY-startY;
    if(Math.sqrt(dx*dx+dy*dy)>10) cancelTimer();
  }
  function onTouchEnd(e){
    const wasLong=didLong; cancelTimer();
    if(wasLong){ e.preventDefault(); e.stopPropagation(); }
  }
  el.addEventListener('touchstart', onTouchStart, {passive:true});
  el.addEventListener('touchmove',  onTouchMove,  {passive:true});
  el.addEventListener('touchend',   onTouchEnd,   {passive:false});
  el.addEventListener('touchcancel',cancelTimer);
}
function closeSeatPanel(){activeSeat=null;closePanel('seat-panel');renderSeats();}
function setSeatPlayer(i,pid){
  const existing = S.seats.find(s=>s.seatIdx===i);
  const stack = existing?.stack||(S.defaultRebuyAmount||50000);
  updSeat(i,{playerId:pid, stack:stack});
  // Close panel and return to table view
  closeSeatPanel();
  setTimeout(()=>showView('table'), 100);
}
function updSeat(i,upd){
  const idx=S.seats.findIndex(s=>s.seatIdx===i);
  if(idx>=0)Object.assign(S.seats[idx],upd);
  persist(); renderSeats(); renderBoard(); renderSeatPanel();
}
function removeSeat(i){
  S.seats=S.seats.filter(s=>s.seatIdx!==i);
  activeSeat=null; closePanel('seat-panel');
  persist(); render();
}
// ═══════════════════════════════
// TURN ORDER MANAGEMENT
// ═══════════════════════════════
function getActingOrder(street){
  const swp = assignPos();
  const posOrder = street==='פרה-פלופ'
    ? ['UTG','UTG+1','UTG+2','LJ','MP','MP+1','HJ','CO','BTN','BTN/SB','SB','BB']
    : ['SB','BB','UTG','UTG+1','UTG+2','LJ','MP','MP+1','HJ','CO','BTN','BTN/SB'];
  return swp
    .filter(s=>{
      if(!s.playerId) return false;
      const seat = S.seats.find(st=>st.seatIdx===s.seatIdx);
      return !seat?.folded && !seat?.allin && (seat?.stack||0)>0 && !seat?.sittingOut;
    })
    .sort((a,b)=>(posOrder.indexOf(a.pos)===-1?99:posOrder.indexOf(a.pos))-(posOrder.indexOf(b.pos)===-1?99:posOrder.indexOf(b.pos)))
    .map(s=>s.seatIdx);
}

function canPlayerRaise(seatIdx){
  // If last all-in was not a full raise, only players who haven't voluntarily acted can raise
  if(S.lastRaiseWasFull!==false) return true; // full raise or no raise = everyone can raise
  const boardCount = S.board.filter(Boolean).length;
  const street = boardCount===0?'פרה-פלופ':boardCount<=3?'פלופ':boardCount===4?'טרן':'ריבר';
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  const volActs = (seat?.actions||[]).filter(a=>a.street===street&&a.type!=='SB'&&a.type!=='BB');
  // If player has already acted voluntarily this street before the all-in, they cannot raise
  return volActs.length === 0;
}

function getNextActor(afterSeatIdx){
  const boardCount = S.board.filter(Boolean).length;
  const street = boardCount===0?'פרה-פלופ':boardCount<=3?'פלופ':boardCount===4?'טרן':'ריבר';
  const order = getActingOrder(street);
  if(!order.length) return null;

  const raiseTypes = ['Open','Raise','3bet','4bet','All-in'];
  const lastRaiserSeat = S.lastRaiser?.seat ?? null;
  const lastRaiseRound = S.lastRaiser?.round ?? 0;

  // Find position of afterSeatIdx in order (may not be there if folded)
  let startIdx = 0;
  const afterIdx = order.indexOf(afterSeatIdx);
  if(afterIdx !== -1) startIdx = (afterIdx + 1) % order.length;
  else {
    // afterSeatIdx was removed (folded) – find next seat by seatIdx value
    const allIdxs = S.seats.map(s=>s.seatIdx).sort((a,b)=>a-b);
    const pos = allIdxs.indexOf(afterSeatIdx);
    for(let k=1;k<=allIdxs.length;k++){
      const cand = allIdxs[(pos+k)%allIdxs.length];
      const ci = order.indexOf(cand);
      if(ci !== -1){ startIdx = ci; break; }
    }
  }

  // If lastRaiser is all-in (not in order), check if all active players acted this round
  const lastRaiserAllin = lastRaiserSeat !== null && !order.includes(lastRaiserSeat);
  
  for(let i=0;i<order.length;i++){
    const cand = order[(startIdx+i)%order.length];

    // If we've gone all the way back to the last raiser – betting is closed
    if(!lastRaiserAllin && lastRaiserSeat !== null && cand === lastRaiserSeat) return null;

    const cSeat = S.seats.find(s=>s.seatIdx===cand);
    const myVolActs = (cSeat?.actions||[]).filter(a=>
      a.street===street && a.type!=='SB' && a.type!=='BB'
    );

    if(lastRaiserSeat === null){
      if(myVolActs.length === 0) return cand;
    } else {
      const actsThisRound = myVolActs.filter(a=>(a.raiseRound||0) === lastRaiseRound);
      if(actsThisRound.length === 0) return cand;
    }
  }
  return null;
}


function setCurrentActor(seatIdx){
  S.currentActor = seatIdx;
  renderSeats(); // re-render to show highlight
  renderLiveActions();
}

function getNextBtnSeat(currentBtnSeat){
  // Get all occupied seats sorted by seatIdx
  const occupied = S.seats.filter(s=>s.playerId&&(s.stack||0)>0).map(s=>s.seatIdx).sort((a,b)=>a-b);
  if(!occupied.length) return currentBtnSeat;
  const curIdx = occupied.indexOf(currentBtnSeat);
  // Next in clockwise order (ascending seatIdx, wrap around)
  return occupied[(curIdx+1)%occupied.length];
}

function autoSaveAndPromptReset(winnerSeatIdxs){
  // Auto-save with winner name
  const winnerNames = (winnerSeatIdxs||[]).map(i=>pName(S.seats.find(s=>s.seatIdx===i)?.playerId)||'?').join(' + ');
  const label = winnerNames || 'יד';
  
  const swp = assignPos();
  const b = getBlinds();
  const hand = {
    id:uid(), date:new Date().toLocaleDateString('he-IL'),
    blinds:`${b.sb}/${b.bb}`, anteStr:b.ante?`ante ${b.ante}`:'',
    label, board:[...S.board],
    seats: swp.filter(s=>s.playerId).map(s=>({
      seatIdx:s.seatIdx, playerId:s.playerId, playerName:pName(s.playerId),
      pos:s.pos, stack:s.stack, cards:[...(s.cards||[null,null])],
      actions:[...(s.actions||[])], folded:s.folded||false, allin:s.allin||false
    })),
    result:null, amount:'', notes:'',
    finalPot: S._winPot||calcPot(),
    winners: (S._lastWinners||[]).map(w=>({...w}))
  };
  S.handLog=[hand,...S.handLog];
  persist();
  syncToSheets(false);
  notify('💾 יד נשמרה – '+label);

  // Show reset prompt
  setTimeout(()=>{
    document.getElementById('reset-prompt-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'reset-prompt-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl';
    
    const box = document.createElement('div');
    box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:16px;padding:20px;width:100%;max-width:320px;text-align:center';
    
    const title = document.createElement('div');
    title.style.cssText = 'font-size:16px;font-weight:800;color:#c8a96e;margin-bottom:6px';
    title.textContent = '🃏 האם לאפס את היד?';
    
    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;color:#5a5870;margin-bottom:16px';
    sub.textContent = 'היד נשמרה – '+label;
    
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center';
    
    const yesBtn = document.createElement('button');
    yesBtn.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:none;background:#5fc47a;color:#0a0d14;font-weight:800;font-size:15px;cursor:pointer';
    yesBtn.textContent = 'כן ↺';
    yesBtn.onclick = ()=>{
      overlay.remove();
      resetHand();
    };
    
    const noBtn = document.createElement('button');
    noBtn.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#e2ddd4;font-size:15px;cursor:pointer';
    noBtn.textContent = 'לא';
    noBtn.onclick = ()=>overlay.remove();
    
    btnRow.appendChild(yesBtn); btnRow.appendChild(noBtn);
    box.appendChild(title); box.appendChild(sub); box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }, 800);
}

function undoAward(){
  if(!S._preAwardState){ notify('אין מה לבטל'); return; }
  const { seats, pot } = S._preAwardState;
  S.seats = seats.map(s=>({...s, actions:[...(s.actions||[])], cards:[...(s.cards||[null,null])]}));
  S._lastWinners = null;
  S._winners = null;
  S._preAwardState = null;
  S.bettingClosed = true;
  S.currentActor = null;
  persist(); renderSeats(); renderBoard(); renderLiveActions();
  notify('↩ הכרזה בוטלה');
  // Re-show showdown panel
  setTimeout(()=>showShowdownPanel(), 300);
}

// ═══════════════════════════════════════════════════════
// SIDE POT CALCULATION
// ═══════════════════════════════════════════════════════
function calcSidePots(){
  // Returns array of {amount, eligible:[seatIdx,...]}
  const activePlayers = S.seats.filter(s=>s.playerId&&!s.folded);
  const contributions = activePlayers.map(s=>({
    seatIdx: s.seatIdx,
    total: (s.actions||[]).reduce((sum,a)=>sum+(Number(a.amount)||0), 0),
    allin: s.allin||false
  }));
  const allinLevels = [...new Set(
    contributions.filter(c=>c.allin).map(c=>c.total)
  )].sort((a,b)=>a-b);

  if(!allinLevels.length) return [{amount: calcPot(), eligible: contributions.map(c=>c.seatIdx)}];

  const sidePots = [];
  let prevLevel = 0;
  for(const level of allinLevels){
    const potSlice = level - prevLevel;
    const eligible = contributions.filter(c=>c.total >= level).map(c=>c.seatIdx);
    sidePots.push({amount: potSlice * eligible.length, eligible});
    prevLevel = level;
  }
  // Remaining above all all-in levels → only non-allin players eligible
  const nonAllinAbove = contributions.filter(c=>c.total > prevLevel && !c.allin);
  if(nonAllinAbove.length > 0){
    const extraAmt = nonAllinAbove.reduce((sum,c)=>sum+(c.total - prevLevel), 0);
    const eligible = nonAllinAbove.map(c=>c.seatIdx);
    sidePots.push({amount: extraAmt, eligible});
  }
  return sidePots;
}

function checkAutoWin(){
  // All folded except one (including all-in players)
  const active = S.seats.filter(s=>s.playerId&&!s.folded);
  if(active.length===1){
    awardPot([active[0].seatIdx], false);
    return true;
  }
  // All remaining players are all-in (no one can act) → deal cards then showdown
  const canAct = active.filter(s=>!s.allin);
  if(canAct.length===0 && active.length>1){
    const bCnt = S.board.filter(Boolean).length;
    S.bettingClosed = true; // סגור סיבוב לפני פתיחת קלפים
    S.currentActor = null;
    setTimeout(()=>{
      if(bCnt>=5) showShowdownPanel();
      else autoOpenNextCard();
    }, 300);
    return true;
  }
  return false;
}

function awardPot(winnerSeatIdxs, showAnim=true){
  const totalPot = calcPot();
  if(!totalPot) return;

  // Calculate per-winner awards respecting side pots
  const sidePots = calcSidePots();
  const awards = {}; // seatIdx -> total amount won
  sidePots.forEach(sp=>{
    const potWinners = winnerSeatIdxs.filter(w=>sp.eligible.includes(w));
    if(!potWinners.length){
      // No eligible winner selected — return to eligible players (e.g. all-in loser gets uncallable back)
      // This handles: loser was all-in, nobody won that slice — shouldn't happen in normal play
      // Give to first eligible non-winner as return
      const ret = sp.eligible.find(e=>!winnerSeatIdxs.includes(e));
      if(ret) awards[ret] = (awards[ret]||0) + sp.amount;
    } else {
      const share = Math.floor(sp.amount / potWinners.length);
      potWinners.forEach(w=>{ awards[w]=(awards[w]||0)+share; });
    }
  });
  // Rounding remainder to first winner
  const totalAwarded = Object.values(awards).reduce((s,v)=>s+v,0);
  const remainder = totalPot - totalAwarded;
  if(remainder>0 && winnerSeatIdxs.length>0) awards[winnerSeatIdxs[0]]=(awards[winnerSeatIdxs[0]]||0)+remainder;

  const pot = totalPot;
  S._preAwardState = {
    seats: S.seats.map(s=>({...s, actions:[...(s.actions||[])], cards:[...(s.cards||[null,null])]})),
    lastWinners: winnerSeatIdxs, pot
  };
  S._winners = winnerSeatIdxs;
  S._lastWinners = winnerSeatIdxs.map(idx=>({
    seatIdx:idx,
    playerId:S.seats.find(s=>s.seatIdx===idx)?.playerId,
    name:pName(S.seats.find(s=>s.seatIdx===idx)?.playerId)||'?'
  }));
  renderSeats();

  // Animate
  const tableWrap = document.getElementById('table-wrap');
  const potEl = document.getElementById('pot-display');
  if(tableWrap && showAnim){
    Object.entries(awards).forEach(([sIdx, amt])=>{
      if(!amt) return;
      const seatEl = document.querySelector('.seat-el[data-seat="'+sIdx+'"]');
      if(!seatEl||!potEl) return;
      const twRect = tableWrap.getBoundingClientRect();
      const potRect = potEl.getBoundingClientRect();
      const seatRect = seatEl.getBoundingClientRect();
      const startX = potRect.left+potRect.width/2-twRect.left;
      const startY = potRect.top+potRect.height/2-twRect.top;
      const endX = seatRect.left+seatRect.width/2-twRect.left;
      const endY = seatRect.top+seatRect.height/2-twRect.top;
      const chip = document.createElement('div');
      chip.style.cssText = 'position:absolute;left:'+startX+'px;top:'+startY+'px;background:#5fc47a;color:#0a0d14;font-size:13px;font-weight:900;padding:4px 12px;border-radius:12px;pointer-events:none;z-index:100;white-space:nowrap;--tx:'+(endX-startX)+'px;--ty:'+(endY-startY)+'px;animation:potFly 0.7s ease-in forwards';
      chip.textContent = '₪'+amt.toLocaleString();
      tableWrap.appendChild(chip);
      setTimeout(()=>chip.remove(), 750);
    });
  }

  setTimeout(()=>{
    // Apply awards to all recipients (winners + any returned amounts)
    Object.entries(awards).forEach(([sIdx,amt])=>{
      const seat = S.seats.find(s=>s.seatIdx===+sIdx);
      if(seat) seat.stack=(seat.stack||0)+amt;
    });
    const bc=document.getElementById('bet-chips-container');
    if(bc) bc.innerHTML='';
    S._winPot=pot;
    persist(); renderSeats(); renderBoard();
    const names=winnerSeatIdxs.map(i=>pName(S.seats.find(s=>s.seatIdx===i)?.playerId)||'?').join(' + ');
    const winAmt=winnerSeatIdxs.reduce((s,i)=>s+(awards[i]||0),0);
    // Show side pot info if relevant
    const hasReturn = Object.keys(awards).some(k=>!winnerSeatIdxs.includes(+k)&&awards[k]>0);
    const returnStr = hasReturn ? ' · ' + Object.entries(awards)
      .filter(([k])=>!winnerSeatIdxs.includes(+k))
      .map(([k,v])=>'↩₪'+v.toLocaleString()+' ל-'+(pName(S.seats.find(s=>s.seatIdx===+k)?.playerId)||'?'))
      .join(' ') : '';
    notify('🏆 '+names+' זכה ₪'+winAmt.toLocaleString()+returnStr);
    setTimeout(()=>{
      const nb=document.createElement('button');
      nb.id='undo-award-btn';
      nb.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:12px;border:1px solid rgba(224,123,106,0.5);background:rgba(224,123,106,0.15);color:#e07b6a;font-size:13px;font-weight:800;cursor:pointer;z-index:200';
      nb.textContent='↩ בטל הכרזה';
      nb.onclick=()=>{ undoAward(); nb.remove(); clearTimeout(nb._saveTimer); };
      document.body.appendChild(nb);
      nb._saveTimer=setTimeout(()=>{ nb.remove(); autoSaveAndPromptReset(winnerSeatIdxs); },8000);
    },800);
  },400);
}

// ═══════════════════════════════════════════════════════
// HAND EVALUATOR
// ═══════════════════════════════════════════════════════
function compareTb(a, b){
  // השוואה מספרית של tiebreak arrays (לא אלפביתית)
  for(let i=0;i<Math.max(a.length,b.length);i++){
    const diff=(a[i]||0)-(b[i]||0);
    if(diff!==0) return diff;
  }
  return 0;
}

function evaluateHand(cards){
  // cards = array of {rank, suit}, 5-7 cards
  // Returns {rank: 0-8, name: string, tiebreak: [...]}
  if(!cards||cards.length<2) return null;
  const RANKS={'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
  const toNum = c=>RANKS[c.rank]||0;

  // Generate all 5-card combinations from 5-7 cards
  function combos(arr, k){
    if(k===arr.length) return [arr];
    if(k===1) return arr.map(x=>[x]);
    const res=[];
    for(let i=0;i<=arr.length-k;i++){
      combos(arr.slice(i+1),k-1).forEach(c=>res.push([arr[i],...c]));
    }
    return res;
  }

  function score5(hand){
    const vals = hand.map(toNum).sort((a,b)=>b-a);
    const suits = hand.map(c=>c.suit);
    const flush = suits.every(s=>s===suits[0]);
    const counts = {};
    vals.forEach(v=>counts[v]=(counts[v]||0)+1);
    const groups = Object.entries(counts).map(([v,c])=>({v:+v,c})).sort((a,b)=>b.c-a.c||b.v-a.v);
    const straight = (()=>{
      const u=[...new Set(vals)];
      if(u.length<5) return false;
      if(u[0]-u[4]===4) return u[0];
      // Wheel: A-2-3-4-5
      if(u[0]===14&&u[1]===5&&u[2]===4&&u[3]===3&&u[4]===2) return 5;
      return false;
    })();
    const sf = straight && flush;
    if(sf) return {rank:8, tb:[straight]};
    if(groups[0].c===4) return {rank:7, tb:[groups[0].v, groups[1].v]};
    if(groups[0].c===3&&groups[1].c===2) return {rank:6, tb:[groups[0].v, groups[1].v]};
    if(flush) return {rank:5, tb:vals};
    if(straight) return {rank:4, tb:[straight]};
    if(groups[0].c===3) return {rank:3, tb:[groups[0].v,...groups.slice(1).map(g=>g.v)]};
    if(groups[0].c===2&&groups[1].c===2) return {rank:2, tb:[groups[0].v, groups[1].v, groups[2].v]};
    if(groups[0].c===2) return {rank:1, tb:[groups[0].v,...groups.slice(1).map(g=>g.v)]};
    return {rank:0, tb:vals};
  }

  const HAND_NAMES=['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];
  const fiveCombos = cards.length===5 ? [cards] : combos(cards, 5);
  let best = null;
  fiveCombos.forEach(combo=>{
    const s = score5(combo);
    if(!best||s.rank>best.rank||(s.rank===best.rank&&compareTb(s.tb,best.tb)>0)) best=s;
  });
  return best ? {...best, name:HAND_NAMES[best.rank]} : null;
}

function detectShowdownWinner(eligible, board){
  // eligible = array of seat objects with .cards
  // board = array of card objects
  const boardCards = (board||[]).filter(Boolean);
  const results = eligible.map(seat=>{
    const holeCards = (seat.cards||[]).filter(Boolean);
    if(!holeCards.length) return {seatIdx:seat.seatIdx, score:null};
    const allCards = [...holeCards, ...boardCards];
    const score = evaluateHand(allCards);
    return {seatIdx:seat.seatIdx, score, name:pName(seat.playerId)};
  }).filter(r=>r.score);

  if(!results.length) return null;

  // Find best rank
  const bestRank = Math.max(...results.map(r=>r.score.rank));
  const bestHands = results.filter(r=>r.score.rank===bestRank);

  if(bestHands.length===1) return {winners:[bestHands[0].seatIdx], handName:bestHands[0].score.name, isTie:false};

  // Tiebreak
  const tb = bestHands[0].score.tb.length;
  let remaining = [...bestHands];
  for(let i=0;i<tb;i++){
    const maxVal = Math.max(...remaining.map(r=>r.score.tb[i]||0));
    remaining = remaining.filter(r=>(r.score.tb[i]||0)===maxVal);
    if(remaining.length===1) break;
  }
  return {
    winners: remaining.map(r=>r.seatIdx),
    handName: remaining[0].score.name,
    isTie: remaining.length>1
  };
}

function showShowdownPanel(){
  document.getElementById('showdown-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'showdown-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
  const box = document.createElement('div');
  box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:16px;padding:18px;width:100%;max-width:340px';
  box.onclick = e=>e.stopPropagation();
  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:800;color:#c8a96e;margin-bottom:6px;text-align:center';
  title.textContent = '🏆 מי ניצח?';
  const pot = document.createElement('div');
  pot.style.cssText = 'font-size:13px;color:#5fc47a;text-align:center;margin-bottom:14px';
  // Show side pot breakdown if any player is all-in
  const hasAllin = S.seats.some(s=>s.playerId&&s.allin&&!s.folded);
  if(hasAllin){
    const sp = calcSidePots();
    if(sp.length > 1){
      pot.innerHTML = sp.map((p,i)=>
        '<div>'+( i===0?'Main pot':'Side pot '+(i))+': ₪'+p.amount.toLocaleString()+
        ' <span style="font-size:10px;color:#5a5870">('+p.eligible.map(e=>pName(S.seats.find(s=>s.seatIdx===e)?.playerId)||'?').join(', ')+')</span></div>'
      ).join('');
    } else {
      pot.textContent = 'Pot: ₪'+calcPot().toLocaleString();
    }
  } else {
    pot.textContent = 'Pot: ₪'+calcPot().toLocaleString();
  }
  box.appendChild(title); box.appendChild(pot);

  // Players still in (not folded)
  const eligible = S.seats.filter(s=>s.playerId&&!s.folded);
  let selected = [];

  // Auto-detect winner if all players have cards
  const allHaveCards = eligible.every(s=>(s.cards||[]).filter(Boolean).length>=2);
  const autoResult = allHaveCards ? detectShowdownWinner(eligible, S.board) : null;
  if(autoResult){
    selected = [...autoResult.winners];
  }

  // Helper to visually select a row
  function selectRow(seatIdx, isSelected){
    const row = document.getElementById('sd-seat-'+seatIdx);
    const chk = document.getElementById('sd-check-'+seatIdx);
    if(!row||!chk) return;
    if(isSelected){
      row.style.background='rgba(200,169,110,0.15)'; row.style.borderColor='#c8a96e';
      chk.innerHTML='✓'; chk.style.cssText='width:20px;height:20px;border-radius:50%;border:2px solid #c8a96e;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#c8a96e;font-size:12px;font-weight:900';
    } else {
      row.style.background='rgba(255,255,255,0.04)'; row.style.borderColor='rgba(255,255,255,0.08)';
      chk.innerHTML=''; chk.style.borderColor='rgba(255,255,255,0.2)';
    }
  }

  // Auto-detect status label
  if(autoResult){
    const autoLbl = document.createElement('div');
    autoLbl.style.cssText = 'font-size:11px;text-align:center;margin-bottom:10px;padding:5px 10px;border-radius:8px;background:rgba(95,196,122,0.1);color:#5fc47a;border:1px solid rgba(95,196,122,0.2)';
    autoLbl.textContent = (autoResult.isTie?'🤝 תיקו — ':'🤖 זוהה: ')+autoResult.handName;
    box.appendChild(autoLbl);
  } else if(eligible.some(s=>(s.cards||[]).filter(Boolean).length<2)){
    const noCardsLbl = document.createElement('div');
    noCardsLbl.style.cssText = 'font-size:11px;text-align:center;margin-bottom:10px;color:#5a5870';
    noCardsLbl.textContent = '💡 סמן קלפים לזיהוי מנצח אוטומטי';
    box.appendChild(noCardsLbl);
  }

  eligible.forEach(seat=>{
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);margin-bottom:8px;cursor:pointer';
    row.id = 'sd-seat-'+seat.seatIdx;
    const swp = assignPos();
    const pos = swp.find(s=>s.seatIdx===seat.seatIdx)?.pos||'';
    const holeCards = (seat.cards||[]).filter(Boolean);
    const handScore = holeCards.length>=2 ? evaluateHand([...holeCards,...S.board.filter(Boolean)]) : null;
    const cardsStr = holeCards.map(c=>c.rank+c.suit).join(' ');
    const cardsBtnId = 'sd-cards-btn-'+seat.seatIdx;
    row.innerHTML =
      '<div style="width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0" id="sd-check-'+seat.seatIdx+'"></div>'+
      '<div style="flex:1">'+
        '<div style="font-size:13px;font-weight:700;color:#e2ddd4">'+pName(seat.playerId)+'</div>'+
        '<div style="font-size:10px;color:#5a5870">'+pos+' · ₪'+seat.stack.toLocaleString()+'</div>'+
        (cardsStr?'<div style="font-size:10px;color:#c8a96e;font-weight:700;direction:ltr;text-align:right">'+cardsStr+(handScore?' · <span style="color:#5fc47a">'+handScore.name+'</span>':'')+'</div>':
          '<div style="font-size:10px;color:#5a5870">קלפים לא הוזנו</div>')+
      '</div>'+
      '<button id="'+cardsBtnId+'" style="padding:4px 8px;border-radius:7px;border:1px solid rgba(200,169,110,0.4);background:rgba(200,169,110,0.1);color:#c8a96e;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0">'+
        (holeCards.length>=2?'✏️':'🃏 הזן')+
      '</button>';
    row.onclick = ()=>{
      const idx2 = selected.indexOf(seat.seatIdx);
      if(idx2>=0){ selected.splice(idx2,1); selectRow(seat.seatIdx, false); }
      else{ selected.push(seat.seatIdx); selectRow(seat.seatIdx, true); }
    };
    box.appendChild(row);

    // כפתור הזנת קלפים — פותח card picker ומרענן את המסך
    setTimeout(()=>{
      const cardsBtn = document.getElementById(cardsBtnId);
      if(!cardsBtn) return;
      cardsBtn.addEventListener('click', e=>{
        e.stopPropagation();
        // שמור את קלפי השחקן הקיימים ופתח card picker
        const sIdx = seat.seatIdx;
        const curCards = S.seats.find(s=>s.seatIdx===sIdx)?.cards||[null,null];
        // נקה קלף ראשון שאין
        const firstEmpty = curCards[0]?1:0;
        document.getElementById('showdown-overlay')?.remove();
        // פתח card picker ישירות — עוקף בדיקת btnLocked
        S._sdAfterCards = sIdx;
        cpTarget = 'seat'+sIdx+'_c'+firstEmpty;
        cpRank = null;
        renderCP();
        document.getElementById('card-picker').classList.add('open');
      });
    }, 0);
  });

  // Apply auto-selection after rows are in DOM
  setTimeout(()=>{ selected.forEach(s=>selectRow(s, true)); }, 0);

  const winBtn = document.createElement('button');
  winBtn.style.cssText = 'width:100%;padding:12px;border-radius:10px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:15px;cursor:pointer;margin-top:4px';
  winBtn.textContent = '✓ העבר קופה';
  winBtn.onclick = ()=>{ if(!selected.length){notify('בחר לפחות שחקן אחד');return;} awardPot(selected); overlay.remove(); };

  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:13px;cursor:pointer;margin-top:6px';
  cancelBtn.textContent = 'ביטול';
  cancelBtn.onclick = ()=>overlay.remove();

  box.appendChild(winBtn); box.appendChild(cancelBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function advanceTurn(fromSeatIdx){
  const next = getNextActor(fromSeatIdx);
  S.currentActor = next;
  if(next===null){
    S.bettingClosed = true;
    // Hide bet chip amounts
    const bc=document.getElementById('bet-chips-container');
    if(bc) bc.innerHTML='';
    S.lastBet = 0;
    // Auto-open card picker for next street after short delay
    setTimeout(()=>{
      const active = S.seats.filter(s=>s.playerId&&!s.folded);
      if(active.length<=1) return; // auto win already handled
      const bCnt = S.board.filter(Boolean).length;
      const canAct = active.filter(s=>!s.allin&&(s.stack||0)>0);
      // All-in situation: at least one all-in AND no one else can act
      const hasAllin = active.some(s=>s.allin) && canAct.length===0;
      // After calling an all-in → deal remaining cards then showdown
      if(hasAllin){
        S.bettingClosed = true;
        S.currentActor = null;
        if(bCnt===5) showShowdownPanel();
        else autoOpenNextCard();
        return;
      }
      // Normal betting close
      if(bCnt===5){
        showShowdownPanel();
      } else {
        autoOpenNextCard();
      }
    },300);
  }
  renderSeats();
  renderLiveActions();
}

function postBlinds(btnSeatIdx){
  // Auto-post SB and BB after BTN is set
  const b = getBlinds();
  const swp = assignPos();
  const sb = swp.find(s=>s.pos==='SB'||s.pos==='BTN/SB');
  const bb = swp.find(s=>s.pos==='BB');
  if(sb && sb.playerId){
    const seat = S.seats.find(s=>s.seatIdx===sb.seatIdx);
    if(seat){ seat.stack=Math.max(0,(seat.stack||0)-b.sb); if(!seat.actions)seat.actions=[]; seat.actions.push({street:'פרה-פלופ',type:'SB',amount:String(b.sb),raiseRound:0}); }
  }
  if(bb && bb.playerId){
    const seat = S.seats.find(s=>s.seatIdx===bb.seatIdx);
    if(seat){ seat.stack=Math.max(0,(seat.stack||0)-b.bb); if(!seat.actions)seat.actions=[]; seat.actions.push({street:'פרה-פלופ',type:'BB',amount:String(b.bb),raiseRound:0}); S.lastBet=b.bb; }
  }
  S.btnLocked = true;
  S.bettingClosed = false;
  S.lastRaiser = null;
  S.actionCount = 0;
  S.raiseRound = 0;
  S.lastRaiseSize = 0;
  S.lastRaiseWasFull = true;
  // Set first actor to UTG (first after BB)
  const preflopOrder = getActingOrder('פרה-פלופ');
  S.currentActor = preflopOrder[0]??null;

  persist(); render();
}

function confirmResetHand(){
  if(!S.btnLocked){ resetHand(); return; } // no hand in progress
  
  document.getElementById('reset-confirm-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'reset-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };

  const box = document.createElement('div');
  box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:14px;padding:18px;width:100%;max-width:320px;direction:rtl';
  box.onclick = e=>e.stopPropagation();

  const title = document.createElement('div');
  title.style.cssText = 'font-size:14px;font-weight:800;color:#c8a96e;margin-bottom:6px';
  title.textContent = '↺ אפס יד';
  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:11px;color:#5a5870;margin-bottom:12px';
  sub.textContent = 'אפשר לתת שם ליד לפני האיפוס (אופציונלי)';

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = 'שם היד (חובה)...';
  inp.style.cssText = 'width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#0a0e18;color:#e2ddd4;font-size:14px;outline:none;box-sizing:border-box;text-align:right;margin-bottom:10px';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px';

  const saveBtn = document.createElement('button');
  saveBtn.style.cssText = 'flex:1;padding:11px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:14px;cursor:pointer';
  saveBtn.textContent = '💾 שמור ואפס';
  const skipBtn = document.createElement('button');
  skipBtn.style.cssText = 'width:100%;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:13px;cursor:pointer;margin-top:6px';
  skipBtn.textContent = '↺ אפס בלי לשמור';
  skipBtn.onclick = ()=>{ overlay.remove(); resetHand(); };
  saveBtn.onclick = ()=>{
    const label = inp.value.trim() || new Date().toLocaleDateString('he-IL');
    // Save hand with label then reset
    const swp = assignPos();
    const b = getBlinds();
    const hand = {
      id:uid(), date:new Date().toLocaleDateString('he-IL'),
      blinds:`${b.sb}/${b.bb}`, anteStr:b.ante?`ante ${b.ante}`:'',
      label, board:[...S.board],
      seats: swp.filter(s=>s.playerId).map(s=>({
        seatIdx:s.seatIdx, playerId:s.playerId, playerName:pName(s.playerId),
        pos:s.pos, stack:s.stack, cards:[...(s.cards||[null,null])],
        actions:[...(s.actions||[])], folded:s.folded||false, allin:s.allin||false
      })),
      result:null, amount:'', notes:'',
      finalPot: calcPot(),
      winners: (S._lastWinners||[]).map(w=>({...w}))
    };
    S.handLog=[hand,...S.handLog];
    overlay.remove();
    resetHand();
    notify('💾 '+label+' נשמרה');
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'padding:11px 14px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:13px;cursor:pointer';
  cancelBtn.textContent = 'ביטול';
  cancelBtn.onclick = ()=>overlay.remove();

  inp.onkeydown = e=>{ if(e.key==='Enter') saveBtn.click(); };

  btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
  box.appendChild(title); box.appendChild(sub); box.appendChild(inp); box.appendChild(btnRow); box.appendChild(skipBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(()=>{ inp.focus(); }, 150);
}

function resetHand(){
  // Restore stacks to pre-hand state (only if hand not yet won)
  if(S.btnLocked && !S._lastWinners?.length){
    S.seats.forEach(s=>{
      const totalPaid = (s.actions||[]).reduce((sum,a)=>sum+(Number(a.amount)||0),0);
      if(totalPaid>0) s.stack = (s.stack||0) + totalPaid;
    });
  }
  S.btnLocked = false;
  S.btnSeat = null;
  S.lastBet = 0;
  S.lastRaiseSize = 0;
  S.lastRaiser = null;
  S.raiseRound = 0;
  S.currentActor = null;
  S.bettingClosed = false;
  S._lastWinners = null;
  S._winners = null;
  S.board = [null,null,null,null,null];
  S.seats = S.seats.map(s=>({...s, cards:[null,null], actions:[], folded:false, allin:false, sittingOut:(s.stack||0)===0?s.sittingOut:false}));
  persist(); render();
  const ct = document.querySelector('.nav-tab.active')?.id?.replace('tab-','');
  if(ct) showView(ct);
  notify('יד אופסה – ערימות שוחזרו');
}

function saveHandWithLabel(){
  const label = document.getElementById('hand-label-inp')?.value?.trim()||'';
  const swp = assignPos();
  const b = getBlinds();
  const hand = {
    id:uid(), date:new Date().toLocaleDateString('he-IL'),
    blinds:`${b.sb}/${b.bb}`, anteStr:b.ante?`ante ${b.ante}`:'',
    label, board:[...S.board],
    seats: swp.filter(s=>s.playerId).map(s=>({
      seatIdx:s.seatIdx, playerId:s.playerId, playerName:pName(s.playerId),
      pos:s.pos, stack:s.stack, cards:[...(s.cards||[null,null])],
      actions:[...(s.actions||[])], folded:s.folded||false, allin:s.allin||false
    })),
    result:null, amount:'', notes:'',
    finalPot: calcPot(),
    winners: (S._lastWinners||[]).map(w=>({...w}))
  };
  S.handLog=[hand,...S.handLog];
  resetHand();
  syncToSheets(false);
  notify('יד נשמרה ✓');
  document.getElementById('save-hand-panel')?.remove();
}

function showSaveHandPanel(){
  const existing = document.getElementById('save-hand-panel');
  if(existing){ existing.remove(); return; }
  const div = document.createElement('div');
  div.id = 'save-hand-panel';
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:60;background:#0a0e18;border-top:1px solid rgba(200,169,110,0.3);padding:14px;display:flex;gap:8px;align-items:center';
  div.innerHTML = `<input id="hand-label-inp" placeholder="לייבל (אופציונלי)..." style="flex:1;padding:9px 12px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:#141824;color:#e2ddd4;font-size:13px;outline:none;direction:rtl">
    <button onclick="saveHandWithLabel()" style="padding:9px 16px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:13px;cursor:pointer">💾 שמור</button>
    <button onclick="document.getElementById('save-hand-panel')?.remove()" style="padding:9px 12px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:13px;cursor:pointer">✕</button>`;
  document.body.appendChild(div);
  document.getElementById('hand-label-inp')?.focus();
}

function doKO(){if(isViewer()){notify('צופה בלבד');return;}
  if(activeSeat===null)return;
  const seat=S.seats.find(s=>s.seatIdx===activeSeat); if(!seat)return;
  const pid=seat.playerId;
  const name = pName(pid)||'שחקן';
  if(pid&&!S.koOrder.includes(pid))S.koOrder.push(pid);
  seat.playerId='';seat.stack=0;seat.cards=[null,null];seat.actions=[];seat.folded=false;seat.allin=false;
  activeSeat=null; closePanel('seat-panel');
  const activePids = S.playerLib.filter(p=>S.buyins[p.id]?.buyin>0&&!S.koOrder.includes(p.id));
  const totalPlayers = S.playerLib.filter(p=>S.buyins[p.id]?.buyin>0).length;
  const place = activePids.length + S.koOrder.length;
  persist(); render();
  playKOAnimation(name, place, totalPlayers);
}
function doRebuyActive(){if(isViewer()){notify('צופה בלבד');return;}
  const seat=S.seats.find(s=>s.seatIdx===activeSeat);
  if(seat?.playerId)doRebuy(seat.playerId,1);
}
function doBuyin(pid){
  if(!pid)return;
  if(!S.buyins[pid])S.buyins[pid]={buyin:0,rebuy:0};
  if(S.buyins[pid].buyin>0){notify('BuyIn כבר בוצע לשחקן זה');return;}
  S.buyins[pid].buyin=1;
  persist(); renderStats(); renderPlayerList(); notify('BuyIn נוסף ✓');
}
function cancelBuyin(pid){
  if(!S.buyins[pid])return;
  S.buyins[pid].buyin=0;
  persist(); renderStats(); renderPlayerList();
}
function doRebuy(pid,d){
  if(!pid)return;
  if(!S.buyins[pid])S.buyins[pid]={buyin:0,rebuy:0};
  const prev = S.buyins[pid].rebuy||0;
  S.buyins[pid].rebuy = Math.max(0,prev+d);
  const newR = S.buyins[pid].rebuy;
  persist(); renderStats(); renderPlayerList();
  if(d>0){
    if(newR===10||newR===16){
      const playerName = pName(pid)||'שחקן';
      setTimeout(()=>showExplosion(playerName, newR), 100);
      setTimeout(()=>showWhatsAppFreeRebuy(playerName, newR), 1500);
    } else {
      notify('Rebuy ✓');
    }
  }
}
function clearTable(){
  if(!isAdmin()){notify('צופה בלבד');return;}
  S.seats.forEach(s=>{
    s.playerId=''; s.stack=S.defaultRebuyAmount||50000; s.cards=[null,null];
    s.actions=[]; s.folded=false; s.allin=false; s.sittingOut=false;
  });
  S.btnSeat=null; S.btnLocked=false; S.currentActor=null;
  S.bettingClosed=false; S.lastRaiser=null; S.raiseRound=0; S.lastBet=0;
  S.lastRaiseSize=0; S.lastRaiseWasFull=true;
  S.board=[null,null,null,null,null];
  S._winners=null; S._lastWinners=null; S._preAwardState=null;
  persist(); render();
  notify('השולחן נוקה ✓');
}

function setTableSize(n){
  S.tableSize=n; S.seats=S.seats.filter(s=>s.seatIdx<n);
  persist(); render();
}
