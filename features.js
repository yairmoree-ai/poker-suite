// ═══════════════════════
// HELP SYSTEM
// ═══════════════════════
const POKER_HELP = {
  Fold:{ title:'🏳️ Fold – קיפול', rules:[
    {t:'מה זה?', d:'ויתור על היד. השחקן מוסר את קלפיו ואינו יכול לזכות בקופה.', e:'BTN מחזיק 7-2, UTG מעלה → BTN קופל ומפסיד רק מה שכבר שם.'},
    {t:'חוק TDA', d:'לאחר קיפול לא ניתן לחזור. הקלפים הופכים למאק.'}
  ]},
  Check:{ title:'✋ Check – צק', rules:[
    {t:'מה זה?', d:'העברת התור ללא הימור – רק כשאין הימור פתוח.', e:'תחילת פלופ: SB צק, BB צק – אין עלות.'},
    {t:'Check-Raise', d:'אפשר לצק ואז לעלות כשמנגד מהמר – לגיטימי לחלוטין.'}
  ]},
  Call:{ title:'📞 Call – השוואה', rules:[
    {t:'מה זה?', d:'השוואת ההימור. משלמים את ההפרש בין מה שכבר שולם לבין ההימור הנוכחי.', e:'BB שילם 1K, UTG העלה ל-3K → Call עולה 2K בלבד.'},
    {t:'All-in חלקי', d:'אם שחקן all-in בפחות – שאר השחקנים משלמים רק עד הסכום שלו.'}
  ]},
  Raise:{ title:'📈 Raise – העלאה', rules:[
    {t:'מינימום', d:'מינימום raise = גודל ה-raise הקודם.', e:'BB=1K → Open 3K (raise 2K) → 3bet מינ 5K (עוד 2K).'},
    {t:'All-in חלקי', d:'All-in מתחת למינימום לא פותח מחדש לשחקנים שכבר פעלו.'},
    {t:'חוק TDA', d:'String bet אסור – הסכום חייב להיאמר לפני ביצוע.'}
  ]},
  'All-in':{ title:'🔥 All-in – כל הכסף', rules:[
    {t:'מה זה?', d:'הימור של כל הערימה. ממשיכים עד הסוף ללא הימורים נוספים.', e:'ערימה 8K נגד raise 15K → all-in ב-8K.'},
    {t:'Side pot', d:'All-in חלקי יוצר סייד פוט – שחקן יכול לזכות רק עד מה שהשקיע.'},
    {t:'Showdown', d:'לאחר all-in + call, שאר הקלפים מחולקים ואז נבחר מנצח.'}
  ]}
};

function showHelp(topic){
  const h = POKER_HELP[topic]; if(!h) return;
  // Remove existing overlay
  document.getElementById('help-overlay')?.remove();
  const ov = document.createElement('div');
  ov.id = 'help-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:500;display:flex;align-items:flex-end;justify-content:center';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
  const rulesHtml = h.rules.map(r=>
    '<div style="background:#0d1120;border-radius:10px;padding:12px;margin-bottom:8px">'+
    '<div style="font-size:11px;font-weight:800;color:#5b9bd5;margin-bottom:5px">'+r.t+'</div>'+
    '<div style="font-size:12px;color:#aaa;line-height:1.6">'+r.d+'</div>'+
    (r.e?'<div style="background:rgba(200,169,110,0.08);border-right:3px solid #c8a96e;padding:7px 10px;border-radius:0 6px 6px 0;margin-top:7px;font-size:11px;color:#c8a96e">💡 '+r.e+'</div>':'')+
    '</div>'
  ).join('');
  ov.innerHTML = '<div style="background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:20px;max-height:70vh;overflow-y:auto">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
    '<span style="font-size:16px;font-weight:800;color:#c8a96e">'+h.title+'</span>'+
    '<button onclick="closeHelp()" style="background:none;border:none;color:#5a5870;font-size:22px;cursor:pointer">✕</button>'+
    '</div>'+rulesHtml+'</div>';
  document.body.appendChild(ov);
}
function closeHelp(){ document.getElementById('help-overlay')?.remove(); }

// ═══════════════════════
// VOICE COMMANDS
// ═══════════════════════
let _voiceRecog = null;
let _voiceActive = false;

function initVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ notify('זיהוי קול לא נתמך בדפדפן זה'); return false; }
  _voiceRecog = new SR();
  _voiceRecog.lang = 'en-US';
  _voiceRecog.continuous = true;
  _voiceRecog.interimResults = false;
  _voiceRecog.onresult = e=>{
    const transcript = e.results[e.results.length-1][0].transcript.toLowerCase().trim();
    console.log('Voice:', transcript);
    handleVoiceCommand(transcript);
  };
  _voiceRecog.onerror = e=>{ console.log('Voice error:', e.error); if(e.error==='not-allowed') notify('אין הרשאת מיקרופון'); };
  _voiceRecog.onend = ()=>{ if(_voiceActive) _voiceRecog.start(); }; // keep listening
  return true;
}

function toggleTheme(){
  const isLight = document.documentElement.classList.toggle('light-mode');
  const btn = document.getElementById('btn-theme');
  if(btn) btn.textContent = isLight ? '🌙' : '☀️';
  localStorage.setItem('theme', isLight?'light':'dark');
}

// Load saved theme
(function(){
  if(localStorage.getItem('theme')==='light'){
    document.documentElement.classList.add('light-mode');
    const btn = document.getElementById('btn-theme');
    if(btn) btn.textContent = '🌙';
  }
})();

function toggleVoice(){
  if(!isSuperAdmin()&&!isAdminOnly()){
    notify('🎤 חסום למנהל בלבד'); return;
  }
  if(isAdminOnly()){
    requireSuperAdmin(()=>toggleVoice()); return;
  }
  if(!_voiceActive){
    if(!confirm('להפעיל פקודות קוליות?\nפקודות: Fold / Check / Call / Raise / All in\n\nלחץ ביטול לכיבוי בכל עת.')) return;
    if(!_voiceRecog && !initVoice()) return;
    _voiceActive = true;
    try { _voiceRecog.start(); } catch(e){}
    const btn = document.getElementById('btn-voice');
    if(btn){ btn.style.background='rgba(95,196,122,0.3)'; btn.style.color='#5fc47a'; btn.textContent='🔴'; }
    notify('🎤 מופעל – לחץ 🔴 לכיבוי');
  } else {
    _voiceActive = false;
    try { _voiceRecog.stop(); _voiceRecog.abort(); } catch(e){}
    _voiceRecog = null;
    const btn = document.getElementById('btn-voice');
    if(btn){ btn.style.background=''; btn.style.color=''; btn.textContent='🎤'; }
    notify('🎤 כבוי');
  }
}

function parseVoiceAmount(cmd){
  // Extract number from command e.g. "raise 3000" or "raise 3k"
  const m = cmd.match(/(\d+)\s*k/i);
  if(m) return parseInt(m[1])*1000;
  const m2 = cmd.match(/(\d+)/);
  if(m2) return parseInt(m2[1]);
  return null;
}

function voiceCard(cmd){
  // Parse card name: "ace of hearts", "king spades", "ten clubs"
  const rankMap = {'ace':'A','king':'K','queen':'Q','jack':'J','ten':'10','nine':'9','eight':'8','seven':'7','six':'6','five':'5','four':'4','three':'3','two':'2'};
  const suitMap = {'hearts':'♥','heart':'♥','diamonds':'♦','diamond':'♦','clubs':'♣','club':'♣','spades':'♠','spade':'♠'};
  let rank=null, suit=null;
  for(const [k,v] of Object.entries(rankMap)){ if(cmd.includes(k)){rank=v;break;} }
  for(const [k,v] of Object.entries(suitMap)){ if(cmd.includes(k)){suit=v;break;} }
  return rank&&suit?{rank,suit}:null;
}

function handleVoiceCommand(cmd){
  const c = cmd.trim().toLowerCase();
  
  // Management commands (always available)
  if(c.includes('save hand')||c.includes('save')) { if(isAdmin()) showSaveHandPanel(); notify('🎤 שמור יד'); return; }
  if(c.includes('reset hand')||c.includes('reset')) { if(isAdmin()) resetHand(); notify('🎤 איפוס יד'); return; }
  if(c.includes('clear table')) { if(isAdmin()) clearTable(); notify('🎤 נקה שולחן'); return; }
  
  // Card commands for board
  const card = voiceCard(c);
  if(card){
    // Find next empty board slot
    const slot = S.board.findIndex(b=>!b);
    if(slot>=0&&slot<5){
      // Check valid (not flop before having flop etc)
      if(slot===3&&!S.board[2]){notify('צריך פלופ קודם');return;}
      if(slot===4&&!S.board[3]){notify('צריך טורן קודם');return;}
      // Check not used
      const used = [...(S.board||[]),...(S.seats.flatMap(s=>s.cards||[]))].filter(Boolean);
      if(used.some(u=>u.rank===card.rank&&u.suit===card.suit)){notify('קלף תפוס');return;}
      S.board[slot]=card; persist(); renderBoard();
      notify('🎤 '+card.rank+card.suit);
    }
    return;
  }

  // Action commands - need active actor
  const actor = S.currentActor;
  if(actor===null||S.bettingClosed) return;

  if(c==='f'||c==='fold') { quickAction(actor,'Fold'); notify('🎤 Fold'); }
  else if(c==='ch'||c==='check') { quickAction(actor,'Check'); notify('🎤 Check'); }
  else if(c==='c'||c==='call') { quickAction(actor,'Call'); notify('🎤 Call'); }
  else if(c==='ai'||c.includes('all in')||c.includes('all-in')) { 
    const seat4=S.seats.find(s=>s.seatIdx===actor);
    const aiAmt=(seat4?.stack||0)+getStreetInvested(actor);
    doAction(actor,'All-in',String(aiAmt)); notify('🎤 All-in'); 
  }
  else if(c==='r'||c==='raise'||c.startsWith('raise')){
    const amt = parseVoiceAmount(c);
    if(amt){ doAction(actor,'Raise',String(amt)); notify('🎤 Raise '+amt.toLocaleString()); }
    else { showQuickInput(actor,'Raise'); notify('🎤 Raise'); }
  }
  // Player name + action e.g. "יאיר fold"
  else {
    const swp = assignPos();
    const seat = swp.find(s=>s.playerId&&pName(s.playerId)&&c.includes((pName(s.playerId)||'').toLowerCase()));
    if(seat){
      if(c.includes('fold')||c.includes('f ')) { quickAction(seat.seatIdx,'Fold'); notify('🎤 '+pName(seat.playerId)+' Fold'); }
      else if(c.includes('check')||c.includes('ch ')) { quickAction(seat.seatIdx,'Check'); notify('🎤 '+pName(seat.playerId)+' Check'); }
      else if(c.includes('call')||c.includes(' c ')) { quickAction(seat.seatIdx,'Call'); notify('🎤 '+pName(seat.playerId)+' Call'); }
    }
  }
}

// Show voice button always - handle unsupported in toggleVoice
document.addEventListener('DOMContentLoaded',()=>{
  const vb = document.getElementById('btn-voice');
  if(vb) vb.style.display='';
});

// GOOGLE SHEETS SYNC
// ═══════════════════════════════
// gsUrl — per-user, נטען מ-currentUser.sheetsUrl בעת login
let gsUrl = ''; // fallback לתאימות לאחור
let syncTimer = null;

function getGsUrl() {
  return currentUser?.sheetsUrl || gsUrl || '';
}

function loadGSUrl(){
  try{ gsUrl = localStorage.getItem('ps_gsurl')||''; }catch(e){ gsUrl=''; }
  const url = getGsUrl();
  const statusEl = document.getElementById('gs-url-status');
  if(statusEl){
    if(url){
      statusEl.innerHTML = '✅ מחובר לסנכרון אוטומטי';
      statusEl.style.color = '#5fc47a';
    } else {
      statusEl.innerHTML = '⚠️ לא מוגדר — צור קשר עם יאיר';
      statusEl.style.color = '#e07b6a';
    }
  }
  updateSyncDot(url ? 'idle' : 'off');
}

function saveGSUrl(){
  const inp = document.getElementById('gs-url');
  const url = inp?.value?.trim()||'';
  if(currentUser) currentUser.sheetsUrl = url;
  gsUrl = url;
  try{ localStorage.setItem('ps_gsurl', url); }catch(e){}
  updateSyncDot(url ? 'idle' : 'off');
  if(url){
    syncToSheets(true);
    // שמור גם ב-Worker אם מחובר
    const token = currentUser?.token||'';
    if(token){
      fetch(AUTH_WORKER_URL+'/update-sheets-url',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body:JSON.stringify({sheetsUrl:url})
      }).catch(()=>{});
    }
  } else { setSyncStatus('סנכרון כבוי'); }
  notify('URL נשמר ✓');
}

function updateSyncDot(state){
  const dot = document.getElementById('sync-dot');
  if(!dot) return;
  const colors = {off:'#3a3650', idle:'#5b9bd5', syncing:'#c8a96e', ok:'#5fc47a', err:'#e07b6a'};
  dot.style.background = colors[state]||colors.idle;
  dot.title = {off:'ללא סנכרון', idle:'מחובר ל-Google', syncing:'מסנכרן...', ok:'סונכרן ✓', err:'שגיאת סנכרון'}[state]||'';
}

function setSyncStatus(msg, color){
  const el = document.getElementById('sync-status');
  if(el){ el.textContent = msg; el.style.color = color||'#5a5870'; }
}

async function syncToSheets(immediate){
  if(isViewer()||isLocal()) return;
  if(!S.playerLib?.length) return;
  const url = getGsUrl();
  if(!url || !currentUser) return;
  if(!immediate){
    clearTimeout(syncTimer);
    syncTimer = setTimeout(()=>syncToSheets(true), 2000);
    return;
  }
  updateSyncDot('syncing');
  setSyncStatus('שולח נתונים...', '#c8a96e');
  try{
    const snap = fullSnapshot();
    const payload = JSON.stringify({key:'poker_data', username: currentUser?.username||'', value: snap});
    console.log('[syncToSheets] שולח hands='+snap.handLog?.length+' savedAt='+snap.savedAt+' size='+Math.round(payload.length/1024)+'KB');
    const pushResp = await fetch(url, {
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body: payload
    });
    console.log('[syncToSheets] response type='+pushResp.type);
    updateSyncDot('ok');
    setSyncStatus('סונכרן: '+new Date().toLocaleTimeString('he-IL'), '#5fc47a');
  }catch(e){
    updateSyncDot('err');
    setSyncStatus('שגיאה: '+e.message, '#e07b6a');
  }
}

async function syncFromSheets(){
  const url = getGsUrl();
  if(!url){ setSyncStatus('הכנס URL קודם', '#e07b6a'); return; }
  if(isLocal()) return;
  const username = currentUser?.username || currentUser?.viewingAdmin || '';
  updateSyncDot('syncing');
  setSyncStatus('מושך נתונים...', '#c8a96e');
  try{
    const resp = await fetch(url+'?key=poker_data&username='+encodeURIComponent(username)+'&t='+Date.now(), {method:'GET',redirect:'follow'});
    const r = JSON.parse(await resp.text());
    if(r.ok && r.value){
      const before = {hands: S.handLog?.length||0, players: S.playerLib?.length||0};
      applySnapshot(r.value);
      const after = {hands: S.handLog?.length||0, players: S.playerLib?.length||0};
      // הצג debug על המסך
      let dbg = document.getElementById('sync-debug');
      if(!dbg){ dbg=document.createElement('div'); dbg.id='sync-debug'; dbg.style.cssText='position:fixed;bottom:60px;left:8px;right:8px;background:rgba(0,0,0,0.85);color:#5fc47a;font-size:10px;padding:8px;border-radius:8px;z-index:9999;font-family:monospace;direction:ltr'; document.body.appendChild(dbg); }
      dbg.innerHTML = `sync: ${new Date().toLocaleTimeString()}<br>
        incoming hands=${r.value.handLog?.length||0} savedAt=${r.value.savedAt}<br>
        S.savedAt=${S.savedAt}<br>
        before: hands=${before.hands} players=${before.players}<br>
        after: hands=${after.hands} players=${after.players}`;
      setTimeout(()=>{ if(dbg) dbg.remove(); }, 8000);
      render();
      const activeTab = document.querySelector('.nav-tab.active')?.id?.replace('tab-','');
      if(activeTab==='tourn') renderTournList();
      if(activeTab==='players') renderPlayerList();
      if(activeTab==='hands') renderHandList();
      updateSyncDot('ok');
      setSyncStatus('עודכן: '+new Date().toLocaleTimeString('he-IL'), '#5fc47a');
    } else {
      updateSyncDot('idle');
      setSyncStatus('אין נתונים שמורים עדיין', '#c8a96e');
    }
  }catch(e){
    updateSyncDot('err');
    setSyncStatus('שגיאה: '+e.message, '#e07b6a');
  }
}





function closeUsersMgmt(){ document.getElementById('users-mgmt-overlay')?.remove(); }
async function showUsersManager(){
  document.getElementById('settings-box').style.display='none';
  document.getElementById('users-mgmt-overlay')?.remove();
  
  const token = currentUser?.token||localStorage.getItem('auth_token')||'';
  
  const overlay = document.createElement('div');
  overlay.id = 'users-mgmt-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);overflow-y:auto;direction:rtl';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
  
  const box = document.createElement('div');
  box.style.cssText = 'max-width:380px;margin:20px auto;background:#121824;border:1px solid rgba(200,169,110,0.3);border-radius:16px;padding:18px';
  box.onclick = e=>e.stopPropagation();
  box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
    '<span style="font-size:15px;font-weight:800;color:#c8a96e">👥 ניהול משתמשים</span>'+
    '<button onclick="closeUsersMgmt()" style="background:none;border:none;color:#5a5870;font-size:20px;cursor:pointer">✕</button></div>'+
    '<div id="users-list-div" style="margin-bottom:14px"><div style="color:#5a5870;font-size:12px">טוען...</div></div>'+
    '<div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;margin-top:4px">'+
    '<div style="font-size:12px;font-weight:700;color:#e2ddd4;margin-bottom:8px">+ הוסף משתמש</div>'+
    '<input id="new-uname" type="text" placeholder="שם משתמש" style="width:100%;padding:8px;border-radius:7px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:13px;outline:none;margin-bottom:6px;box-sizing:border-box;direction:ltr">'+
    '<input id="new-name" type="text" placeholder="שם מלא" style="width:100%;padding:8px;border-radius:7px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:13px;outline:none;margin-bottom:6px;box-sizing:border-box;text-align:right">'+
    '<input id="new-pass" type="password" placeholder="סיסמה" style="width:100%;padding:8px;border-radius:7px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:13px;outline:none;margin-bottom:6px;box-sizing:border-box">'+
    '<select id="new-role" style="width:100%;padding:8px;border-radius:7px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:13px;outline:none;margin-bottom:8px">'+
    '<option value="admin">מנהל 🔑</option>'+
    '<option value="local">מקומי 🔒</option>'+
    '<option value="viewer">צופה 👁</option>'+
    '</select>'+
    '<button onclick="addUserFromMgmt()" style="width:100%;padding:10px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:13px;cursor:pointer">✓ הוסף</button>'+
    '</div>';
  
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  // Load users
  try {
    const resp = await fetch(AUTH_WORKER_URL+'/users',{headers:{'Authorization':'Bearer '+token}});
    const data = await resp.json();
    const div = document.getElementById('users-list-div');
    if(!div) return;
    if(!data.ok){ div.innerHTML = '<div style="color:#e07b6a;font-size:12px">'+data.error+'</div>'; return; }
    div.innerHTML = data.users.map(u=>
      '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#0d1120;border-radius:8px;margin-bottom:6px">'+
      '<div style="flex:1"><div style="font-size:13px;font-weight:700;color:#e2ddd4">'+u.name+'</div>'+
      '<div style="font-size:10px;color:#5a5870">@'+u.username+' · '+u.role+'</div></div>'+
      '<button onclick="resetUserPassword(\''+u.username+'\')" style="padding:5px 9px;border-radius:6px;border:1px solid rgba(91,155,213,0.4);background:rgba(91,155,213,0.1);color:#5b9bd5;font-size:10px;font-weight:700;cursor:pointer">🔑 סיסמה</button>'+
      '</div>'
    ).join('');
  } catch(e){
    const div = document.getElementById('users-list-div');
    if(div) div.innerHTML = '<div style="color:#e07b6a;font-size:12px">שגיאה: '+e.message+'</div>';
  }
}

async function resetUserPassword(username){
  const newPassword = prompt('סיסמה חדשה עבור '+username+':');
  if(!newPassword) return;
  const token = currentUser?.token||localStorage.getItem('auth_token')||'';
  try {
    const resp = await fetch(AUTH_WORKER_URL+'/reset-password',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({username, newPassword})
    });
    const data = await resp.json();
    if(data.ok) notify('✓ סיסמה אופסה עבור '+username);
    else notify('שגיאה: '+data.error);
  } catch(e){ notify('שגיאה: '+e.message); }
}

async function addUserFromMgmt(){
  const token = currentUser?.token||localStorage.getItem('auth_token')||'';
  const username = document.getElementById('new-uname')?.value?.trim();
  const name = document.getElementById('new-name')?.value?.trim();
  const password = document.getElementById('new-pass')?.value?.trim();
  const role = document.getElementById('new-role')?.value;
  if(!username||!name||!password){ notify('מלא את כל השדות'); return; }
  const appsScriptUrl = getGsUrl();
  try {
    const resp = await fetch(AUTH_WORKER_URL+'/create-user',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({username,name,password,role,appsScriptUrl})
    });
    const data = await resp.json();
    if(data.ok){
      if(data.user?.sheetsUrl){
        const viewerUrl = location.origin + location.pathname + '?admin=' + encodeURIComponent(username);
        const msg = `✓ ${name} נוסף + Sheet נוצר`;
        notify(msg);
        // הצג דיאלוג עם קישור לצופים
        setTimeout(()=>{
          const share = confirm(`קישור לצופים של ${name}:\n${viewerUrl}\n\nהעתק לשיתוף?`);
          if(share) navigator.clipboard?.writeText(viewerUrl).then(()=>notify('קישור הועתק ✓'));
        }, 500);
      } else {
        notify('✓ '+name+' נוסף (ללא Sheet — ודא שה-Apps Script URL מוגדר ב-Settings)');
      }
      showUsersManager();
    } else notify('שגיאה: '+data.error);
  } catch(e){ notify('שגיאה: '+e.message); }
}

async function manualBackup(){
  if(!getGsUrl()){ notify('הגדר Google Sheets URL קודם'); return; }
  notify('💾 מגבה...');
  try {
    const resp = await fetch(getGsUrl(), {
      method:'POST',
      body: JSON.stringify({ action:'manual_backup' })
    });
    const data = await resp.json();
    if(data.ok) notify('✓ גיבוי הושלם – ' + (data.sheet||''));
    else notify('שגיאה בגיבוי: ' + (data.error||''));
  } catch(e) {
    notify('שגיאה: ' + e.message);
  }
}

function toggleSettings(){
  const box = document.getElementById('settings-box');
  if(!box) return;
  loadGSUrl();
  const rebuyInp = document.getElementById('rebuy-default-inp');
  if(rebuyInp) rebuyInp.value = S.defaultRebuyAmount||50000;
  const usersBtn = document.getElementById('btn-users-mgmt');
  if(usersBtn) usersBtn.style.display = (currentUser?.role==='superadmin')?'block':'none';

  // הצג שדה עריכת URL רק ל-superadmin
  const gsEditRow = document.getElementById('gs-url-edit-row');
  if(gsEditRow){
    gsEditRow.style.display = isSuperAdmin() ? 'block' : 'none';
    if(isSuperAdmin()){
      const inp = document.getElementById('gs-url');
      if(inp) inp.value = getGsUrl();
    }
  }

  // הצג URL לצופים אם המשתמש הוא מנהל
  const viewerUrlRow = document.getElementById('viewer-url-row');
  if(viewerUrlRow && isAdmin() && currentUser?.username){
    const adminKey = currentUser.username.match(/[a-zA-Z0-9_-]/) ? currentUser.username : (currentUser.usernameEn || currentUser.username);
    const viewerUrl = location.origin + location.pathname + '?admin=' + encodeURIComponent(adminKey);
    const urlEl = document.getElementById('viewer-url-display');
    if(urlEl) urlEl.textContent = viewerUrl;
    viewerUrlRow.style.display = 'block';
  } else if(viewerUrlRow){
    viewerUrlRow.style.display = 'none';
  }

  box.style.display = box.style.display==='none' ? 'flex' : 'none';
}



function exportData(){
  try{
    const snap = JSON.stringify(fullSnapshot());
    const b64 = btoa(unescape(encodeURIComponent(snap)));
    // Show copy dialog
    const box = document.getElementById('backup-box');
    const ta = document.getElementById('backup-ta');
    ta.value = b64;
    box.style.display = 'flex';
    ta.select();
    try{ navigator.clipboard.writeText(b64); notify('קוד גיבוי הועתק ✓'); }
    catch(e){ notify('העתק את הקוד ידנית'); }
  }catch(e){ notify('שגיאה: '+e.message); }
}

function importFromCode(){
  const ta = document.getElementById('import-ta');
  const code = ta.value.trim();
  if(!code){ notify('הדבק קוד גיבוי'); return; }
  try{
    const snap = JSON.parse(decodeURIComponent(escape(atob(code))));
    applySnapshot(snap);
    persist();
    render();
    document.getElementById('import-box').style.display='none';
    ta.value='';
    notify('נתונים שוחזרו ✓ ('+S.playerLib.length+' שחקנים)');
  }catch(e){ notify('קוד לא תקין'); }
}

function importData(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const data = JSON.parse(e.target.result);
      applySnapshot(data);
      persist();
      render();
      renderPlayerList();
      notify('נתונים יובאו בהצלחה ✓ (' + (S.playerLib.length) + ' שחקנים)');
    } catch(err) {
      notify('שגיאה בקובץ: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function diagStorage(){
  const box = document.getElementById('diag-box');
  box.style.display = 'block';
  let html = '<div style="color:var(--gold);font-weight:700;margin-bottom:8px">מפתחות ב-localStorage:</div>';
  const allKeys = [];
  for(let i=0; i<localStorage.length; i++) allKeys.push(localStorage.key(i));
  if(!allKeys.length){ box.innerHTML = html + '<div style="color:#e07b6a">localStorage ריק לחלוטין!</div>'; return; }
  allKeys.sort().forEach(k=>{
    const val = localStorage.getItem(k);
    let preview = '';
    try{
      const parsed = JSON.parse(val);
      if(Array.isArray(parsed)) preview = `[${parsed.length} פריטים]`;
      else if(typeof parsed === 'object') preview = `{${Object.keys(parsed).join(', ')}}`;
      else preview = String(parsed).slice(0,40);
    }catch(e){ preview = val?.slice(0,40)||''; }
    html += `<div style="margin-bottom:6px;padding:5px;background:rgba(255,255,255,0.04);border-radius:6px">
      <div style="color:var(--gold);font-weight:600">${k}</div>
      <div style="color:var(--muted)">${preview}</div>
      <button class="btn btn-green btn-xs" style="margin-top:3px" onclick="tryLoad('${k}')">טען כ-שחקנים</button>
    </div>`;
  });
  box.innerHTML = html;
}
function tryLoad(key){
  try{
    const v = JSON.parse(localStorage.getItem(key));
    if(Array.isArray(v) && v[0]?.name){
      S.playerLib = v;
      persist();
      renderPlayerList();
      document.getElementById('diag-box').style.display='none';
      notify('שחקנים נטענו ✓ ('+v.length+')');
    } else if(v?.seats || v?.playerLib){
      if(v.playerLib){ S.playerLib=v.playerLib; }
      if(v.seats){ S.seats=v.seats; }
      if(v.buyins){ S.buyins=v.buyins; }
      if(v.handLog){ S.handLog=v.handLog; }
      if(v.tournLog){ S.tournLog=v.tournLog; }
      persist(); render();
      document.getElementById('diag-box').style.display='none';
      notify('נתונים נטענו ✓');
    } else {
      notify('המפתח לא מכיל שחקנים');
    }
  }catch(e){ notify('שגיאה: '+e.message); }
}
function showAddPlayer(){document.getElementById('new-pname')?.focus();}
function addPlayer(){if(isViewer()){notify('צופה בלבד');return;}
  const inp=document.getElementById('new-pname');
  const name=inp?.value?.trim(); if(!name)return;
  S.playerLib.push({id:uid(),name});
  inp.value=''; inp.focus();
  persist(); renderPlayerList(); notify('שחקן נוסף ✓');
}
function deletePlayer(id){if(isViewer()){notify('צופה בלבד');return;}
  S.playerLib=S.playerLib.filter(p=>p.id!==id);
  persist(); renderPlayerList();
}
function koPlayerFromList(pid){
  if(!S.koOrder.includes(pid)) S.koOrder.push(pid);
  const seat=S.seats.find(s=>s.playerId===pid);
  if(seat){
    seat.playerId=''; seat.stack=0; seat.cards=[null,null];
    seat.actions=[]; seat.folded=false; seat.allin=false;
  }
  persist(); render(); renderPlayerList();
  // Calculate place
  const activePids = S.playerLib.filter(p=>S.buyins[p.id]?.buyin>0&&!S.koOrder.includes(p.id));
  const totalPlayers = S.playerLib.filter(p=>S.buyins[p.id]?.buyin>0).length;
  const place = activePids.length + S.koOrder.length;
  const name = pName(pid)||'שחקן';
  playKOAnimation(name, place, totalPlayers);
}

function playKOAnimation(name, place, total) {
  console.log('ANIMATION START for '+name);
  
  // Dark overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99996;pointer-events:none';
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.remove(), 3000);

  // Create black hole
  const hole = document.createElement('div');
  hole.className = 'black-hole';
  hole.style.zIndex = '999';
  document.body.appendChild(hole);

  // Chip colors and emojis
  const chips = ['🔴','🔵','⚫','🟡','🟢','🔴','🔵','⚫','🟡','🟢','🔴','🔵'];
  const colors = ['#e05555','#5b9bd5','#333','#c8a96e','#5fc47a'];
  
  // Spawn chips from random positions around the screen
  chips.forEach((emoji, i) => {
    setTimeout(() => {
      const chip = document.createElement('div');
      chip.className = 'ko-chip';
      
      // Random starting position around edges
      const angle = (i / chips.length) * Math.PI * 2;
      const radius = Math.min(window.innerWidth, window.innerHeight) * 0.4;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const startX = cx + Math.cos(angle) * radius * (0.7 + Math.random() * 0.6);
      const startY = cy + Math.sin(angle) * radius * (0.7 + Math.random() * 0.6);
      
      chip.style.left = startX + 'px';
      chip.style.top = startY + 'px';
      chip.style.setProperty('--sx', '0px');
      chip.style.setProperty('--sy', '0px');
      chip.style.setProperty('--cx', cx + 'px');
      chip.style.setProperty('--cy', cy + 'px');
      chip.style.background = colors[i % colors.length];
      chip.style.border = '2px solid rgba(255,255,255,0.3)';
      chip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
      chip.textContent = '💰';
      chip.style.zIndex = '1000';
      chip.style.animationDelay = (i * 0.08) + 's';
      chip.style.animationDuration = (0.9 + Math.random() * 0.5) + 's';
      
      document.body.appendChild(chip);
      setTimeout(() => chip.remove(), 2000);
    }, i * 80);
  });

  // After chips disappear, show black hole shrinking then KO notification
  setTimeout(() => {
    hole.style.animation = 'blackHoleDisappear 0.3s ease-in forwards';
    setTimeout(() => {
      hole.remove();
      showKONotification(name, place, total);
    }, 300);
  }, 2200);
}

function showKONotification(name, place, total){
  document.getElementById('ko-notif')?.remove();
  const div = document.createElement('div');
  div.id = 'ko-notif';
  div.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:300;background:#1a0a0a;border:1px solid rgba(224,85,85,0.5);border-radius:14px;padding:12px 16px;text-align:center;direction:rtl;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,0.6)';
  
  const ordinal = place===1?'🥇 מקום ראשון':place===2?'🥈 מקום שני':place===3?'🥉 מקום שלישי':'מקום '+place;
  const msg = '💀 '+name+' הודח\n'+ordinal+' מתוך '+total+' שחקנים 🃏';
  
  div.innerHTML = 
    '<div style="font-size:13px;font-weight:800;color:#e07b6a;margin-bottom:4px">💀 '+name+' הודח</div>'+
    '<div style="font-size:11px;color:#aaa;margin-bottom:10px">'+ordinal+' (מתוך '+total+')</div>'+
    '<div style="display:flex;gap:8px;justify-content:center">'+
    '<button id="ko-share-btn" style="padding:7px 14px;border-radius:8px;border:none;background:#25D366;color:#fff;font-size:12px;font-weight:700;cursor:pointer">📲 שתף</button>'+
    '<button onclick="document.getElementById(\'ko-notif\').remove()" style="padding:7px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#aaa;font-size:12px;cursor:pointer">✕</button>'+
    '</div>';
  document.body.appendChild(div);
  document.getElementById('ko-share-btn').onclick = ()=>shareKO(msg);
  div.__koMsg = msg; // store for later
  
  setTimeout(()=>div?.remove(), 15000);
}

function shareKO(encodedMsg){
  const msg = decodeURIComponent(encodedMsg);
  const waUrl = 'https://wa.me/?text='+encodeURIComponent(msg);
  window.open(waUrl, '_blank');
}
