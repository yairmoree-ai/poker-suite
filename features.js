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
// חשוב: מונע דחיפה לענן (syncToSheets) לפני שהמשיכה הראשונית מהענן (syncFromSheets)
// הסתיימה בהקשר האחסון הנוכחי (מכשיר/דפדפן/PWA). בלי זה, כל persist() מוקדם היה עלול
// לדחוף נתונים מקומיים ריקים/ישנים ולדרוס בטעות נתונים אמיתיים שכבר בענן.
let _initialSyncDone = false;

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
  markDeleted('players',id);
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


// ── Firebase ──────────────────────────────────────────
const FIREBASE_URL = 'https://poker-suite-db-default-rtdb.europe-west1.firebasedatabase.app';

async function syncToSheets(immediate){
  if(isViewer()||isLocal()) return;
  if(!S.playerLib?.length) return;
  if(!currentUser?.username) return;
  if(!_initialSyncDone){
    // עדיין לא קיבלנו את הגרסה האמיתית מהענן בהקשר האחסון הזה — לא דוחפים נתונים
    // מקומיים שעלולים להיות ריקים/ישנים ולדרוס במקום. מנסים שוב בעוד רגע (לא מוותרים
    // על השינוי, רק דוחים אותו).
    setTimeout(()=>syncToSheets(immediate), 500);
    return;
  }
  if(!immediate){
    clearTimeout(syncTimer);
    syncTimer = setTimeout(()=>syncToSheets(true), 2000);
    return;
  }
  updateSyncDot('syncing');
  setSyncStatus('שולח נתונים...', '#c8a96e');
  try{
    S.savedAt = Date.now();
    const snap = fullSnapshot();
    const uname = encodeURIComponent(currentUser.username);
    const baseUrl = FIREBASE_URL+'/users/'+uname;

    // שמור snapshot ראשי (ללא handLog)
    // PATCH ולא PUT! PUT מחליף את כל הצומת ומוחק את /hands עד שיכתבו מחדש —
    // כשל רשת באמצע היה גורם לאובדן כל הידיים בענן
    const snapWithoutHands = {...snap, handLog:[]};
    const resp = await fetch(baseUrl+'.json', {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(snapWithoutHands)
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);

    // שמור כל ידיים ב-Firebase
    if(S.handLog?.length){
      await Promise.all(S.handLog.map(hand =>
        fetch(baseUrl+'/hands/'+hand.id+'.json', {
          method:'PUT',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(hand)
        })
      ));
      console.log('[sync] pushed', S.handLog.length, 'hands to Firebase');
    }

    updateSyncDot('ok');
    setSyncStatus('סונכרן: '+new Date().toLocaleTimeString('he-IL'), '#5fc47a');
  }catch(e){
    updateSyncDot('err');
    setSyncStatus('שגיאה: '+e.message, '#e07b6a');
  }
}

async function syncFromSheets(){
  if(isLocal()) return;
  if(!currentUser) return;
  const username = currentUser.username || currentUser.viewingAdmin || '';
  if(!username) return;
  updateSyncDot('syncing');
  setSyncStatus('מושך נתונים...', '#c8a96e');
  try{
    const uname = encodeURIComponent(username);
    const baseUrl = FIREBASE_URL+'/users/'+uname;

    // משוך snapshot ראשי וידיים במקביל
    const [snapResp, handsResp] = await Promise.all([
      fetch(baseUrl+'.json?t='+Date.now()),
      fetch(baseUrl+'/hands.json?t='+Date.now())
    ]);
    const data = await snapResp.json();
    const handsData = await handsResp.json();

    if(data && data.playerLib){
      const beforeHands = S.handLog?.length||0;
      // מזג ידיים מ-Firebase
      if(handsData && typeof handsData === 'object'){
        const remoteHands = Object.values(handsData).filter(Boolean);
        const existingIds = new Set((S.handLog||[]).map(h=>h.id).filter(Boolean));
        const newHands = remoteHands.filter(h=>h.id && !existingIds.has(h.id) && !isDeleted('hands',h.id));
        console.log('[syncFromSheets] remote='+remoteHands.length+' existing='+existingIds.size+' new='+newHands.length);
        if(newHands.length){
          S.handLog = [...(S.handLog||[]), ...newHands].sort((a,b)=>handTs(b)-handTs(a));
          try{ localStorage.setItem('ps_log', JSON.stringify(S.handLog)); }catch(e){}
        }
        // גם עדכן ידיים קיימות שמשתנות
        data.handLog = Object.values(handsData).filter(Boolean);
      }

      applySnapshot(data);
      try{ localStorage.setItem('ps_lib', JSON.stringify(S.playerLib)); }catch(e){}
      render();
      renderHandList();
      renderTournList();
      updateSyncDot('ok');
      setSyncStatus('עודכן: '+new Date().toLocaleTimeString('he-IL'), '#5fc47a');
    } else {
      updateSyncDot('idle');
      setSyncStatus('אין נתונים שמורים עדיין', '#c8a96e');
    }
  }catch(e){
    updateSyncDot('err');
    setSyncStatus('שגיאה: '+e.message, '#e07b6a');
  }finally{
    // חשוב: מסמנים שהניסיון הראשון הסתיים (גם אם נכשל) — כדי ש-syncToSheets ידע
    // שמותר עכשיו לדחוף (ולא ייתקע לנצח אם הייתה שגיאת רשת חד-פעמית)
    _initialSyncDone = true;
  }
}

async function migrateFromSheets(){
  const gsUrl = getGsUrl();
  if(!gsUrl){ notify('הכנס Google Sheets URL קודם'); return; }
  if(!currentUser?.username){ notify('התחבר קודם'); return; }
  notify('⏳ ממגר נתונים מ-Sheets...');
  try{
    const resp = await fetch(gsUrl+'?key=poker_data&username='+encodeURIComponent(currentUser.username)+'&t='+Date.now(), {method:'GET',redirect:'follow'});
    const r = JSON.parse(await resp.text());
    if(r.ok && r.value){
      applySnapshot(r.value);
      persist();
      await syncToSheets(true);
      notify('✅ מיגרציה הושלמה!');
      render();
    } else {
      notify('לא נמצאו נתונים ב-Sheets');
    }
  }catch(e){
    notify('שגיאה: '+e.message);
  }
}

// ── Drive Restore ────────────────────────────────────────
async function showDriveRestore(){
  const gsUrl = getGsUrl();
  if(!gsUrl){ notify('הגדר Google Sheets URL קודם'); return; }
  document.getElementById('settings-box').style.display='none';
  const box = document.getElementById('drive-restore-box');
  const cont = document.getElementById('drive-restore-content');
  cont.innerHTML='<div style="text-align:center;color:#5a5870;padding:20px">⏳ טוען גיבויים...</div>';
  box.style.display='flex';
  try{
    const username = encodeURIComponent(currentUser?.username||'');
    const resp = await fetch(gsUrl+'?action=get_backup_list&username='+username+'&t='+Date.now(), {method:'GET',redirect:'follow'});
    const data = await resp.json();
    console.log('[showDriveRestore]', data);
    if(!data.ok){ cont.innerHTML=`<div style="color:#e07b6a;padding:12px;font-size:13px">שגיאה: ${data.error}</div>`; return; }
    if(!data.backups?.length){ cont.innerHTML='<div style="text-align:center;color:#5a5870;padding:20px;font-size:13px">לא נמצאו גיבויים</div>'; return; }
    cont.innerHTML=`
      <div style="font-size:11px;color:#5a5870;margin-bottom:10px">נמצאו ${data.backups.length} גיבויים — בחר תאריך:</div>
      ${data.backups.map(b=>`
        <button onclick="loadDriveBackup('${b}')" style="width:100%;text-align:right;padding:10px 12px;border-radius:10px;border:1px solid rgba(95,196,122,0.2);background:rgba(95,196,122,0.06);color:#e2ddd4;font-size:13px;cursor:pointer;margin-bottom:6px;display:block">
          📅 ${b}
        </button>`).join('')}`;
  }catch(e){ cont.innerHTML=`<div style="color:#e07b6a;padding:12px;font-size:13px">שגיאה: ${e.message}</div>`; }
}

let _driveSnap = null;

async function loadDriveBackup(sheetName){
  const gsUrl = getGsUrl();
  const cont = document.getElementById('drive-restore-content');
  cont.innerHTML=`<div style="text-align:center;color:#5a5870;padding:20px">⏳ טוען גיבוי מ-${sheetName}...</div>`;
  try{
    const username = encodeURIComponent(currentUser?.username||'');
    const resp = await fetch(gsUrl+'?action=get_backup_data&username='+username+'&sheetName='+encodeURIComponent(sheetName)+'&t='+Date.now(), {method:'GET',redirect:'follow'});
    const data = await resp.json();
    if(!data.ok){ cont.innerHTML=`<div style="color:#e07b6a;padding:12px;font-size:13px">שגיאה: ${data.error}</div>`; return; }
    _driveSnap = data.data;
    document.getElementById('drive-restore-box').style.display='none';
    previewMergeFromSnap(_driveSnap, sheetName);
  }catch(e){ cont.innerHTML=`<div style="color:#e07b6a;padding:12px;font-size:13px">שגיאה: ${e.message}</div>`; }
}

function previewMergeFromSnap(snap, label){
  const sourceTournaments = snap.tournLog || [];
  const existingIds = new Set((S.tournLog||[]).map(t=>t.id));
  const newT = sourceTournaments.filter(t=>!existingIds.has(t.id));
  const existT = sourceTournaments.filter(t=>existingIds.has(t.id));
  const list = document.getElementById('merge-list');
  let html=`<div style="font-size:11px;color:#5a5870;margin-bottom:10px">גיבוי: <span style="color:#e2ddd4">${label}</span><br>${sourceTournaments.length} טורנירים • <span style="color:#5fc47a">${newT.length} חדשים</span> • <span style="color:#5a5870">${existT.length} קיימים</span></div>`;
  if(!newT.length){
    html+=`<div style="text-align:center;color:#5a5870;padding:16px;font-size:13px">כל הטורנירים כבר קיימים</div>`;
  } else {
    html+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:11px;color:#5a5870">בחר טורנירים לייבוא:</span>
      <button onclick="document.querySelectorAll('.merge-cb').forEach(c=>c.checked=true)" style="font-size:10px;color:#5b9bd5;background:none;border:none;cursor:pointer;padding:0">בחר הכל</button>
    </div>`;
    html+=newT.map(t=>{
      const winners=(t.finishOrder||[]).filter(f=>f.place<=3).sort((a,b)=>a.place-b.place).map(f=>f.name).join(', ');
      return `<label style="display:flex;align-items:flex-start;gap:10px;padding:10px;border-radius:10px;background:rgba(91,155,213,0.06);border:1px solid rgba(91,155,213,0.15);margin-bottom:6px;cursor:pointer">
        <input type="checkbox" class="merge-cb" data-id="${t.id}" checked style="margin-top:3px;accent-color:#5b9bd5;flex-shrink:0">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:700;color:#e2ddd4">${t.name||t.date||t.id}</div>
          <div style="font-size:10px;color:#5a5870;margin-top:2px">${t.date||''} • ${t.totalEntries||0} כניסות • ₪${(t.prizePool||0).toLocaleString()}</div>
          ${winners?`<div style="font-size:10px;color:#c8a96e;margin-top:2px">🏆 ${winners}</div>`:''}
        </div>
      </label>`;
    }).join('');
  }
  list.innerHTML=html;
  document.getElementById('merge-box').style.display='flex';
}

function previewMergeTournaments(){
  const ta = document.getElementById('import-ta');
  const code = ta.value.trim();
  if(!code){ notify('הדבק קוד גיבוי'); return; }
  try{
    const snap = JSON.parse(decodeURIComponent(escape(atob(code))));
    _driveSnap = snap;
    document.getElementById('import-box').style.display='none';
    previewMergeFromSnap(snap, 'קוד גיבוי ידני');
  }catch(e){ notify('קוד לא תקין'); }
}

function confirmMergeTournaments(){
  if(!_driveSnap) return;
  const selected = new Set([...document.querySelectorAll('.merge-cb:checked')].map(c=>c.dataset.id));
  if(!selected.size){ notify('לא נבחרו טורנירים'); return; }
  const toAdd = (_driveSnap.tournLog||[]).filter(t=>selected.has(t.id));
  S.tournLog = [...(S.tournLog||[]), ...toAdd].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  persist();
  renderTournList();
  document.getElementById('merge-box').style.display='none';
  _driveSnap = null;
  notify(`${toAdd.length} טורנירים יובאו ✓`);
}

// מקור אמת יחיד לרשימת השחקנים+נטו מצטבר, ממוין מהטוב לגרוע — משמש גם את
// showStatistics וגם את showPlayerDetail (שורת המעבר המהיר בין שחקנים),
// כדי ששני המקומות תמיד יסכימו על אותו מיון/סכומים.
function _computeAllPlayerStats(){
  const history = S.tournLog || [];
  const stats = {};
  history.forEach(t=>{
    const buyin = t.buyinCost || S.buyinCost || 50;
    const prizes = {1:t.place1||0, 2:t.place2||0, 3:t.place3||0, 4:t.place4||0};
    (t.finishOrder||[]).forEach(f=>{
      const name = f.name || f.pid;
      if(!name || /^\d+$/.test(name)) return;
      if(!stats[name]) stats[name]={paid:0, won:0};
      stats[name].paid += (1+(f.rebuy||0)) * buyin;
      stats[name].won += prizes[f.place]||0;
    });
  });
  return Object.entries(stats)
    .map(([name,d])=>({name, paid:d.paid, won:d.won, net:d.won-d.paid}))
    .filter(p=>p.paid>0)
    .sort((a,b)=>b.net-a.net);
}

function showStatistics(){
  document.getElementById('settings-box').style.display='none';
  const modal = document.getElementById('stats-modal');
  modal.style.display='flex';
  const history = S.tournLog || [];
  const players = _computeAllPlayerStats();
  if(!players.length){
    document.getElementById('stats-modal-content').innerHTML='<div style="text-align:center;color:#5a5870;padding:24px;font-size:13px">אין נתוני טורנירים עדיין</div>';
    return;
  }
  const maxAbs = Math.max(...players.map(p=>Math.abs(p.net)), 1);
  const BAR_MAX = 90, ZERO_Y = 100;
  const barsHtml = players.map(p=>{
    const isPos = p.net>=0;
    const barH = Math.max(Math.round((Math.abs(p.net)/maxAbs)*BAR_MAX), 3);
    const color = isPos?'rgba(95,196,122,0.85)':'rgba(224,123,106,0.85)';
    const label = (isPos?'+':'')+(p.net/1000).toFixed(1)+'k';
    return `<div style="display:flex;flex-direction:column;align-items:center;width:36px;flex-shrink:0">
      <div style="height:18px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px">
        <span style="font-size:9px;font-weight:900;color:${color};white-space:nowrap">${label}</span>
      </div>
      <div style="width:28px;height:${ZERO_Y}px;display:flex;flex-direction:column;justify-content:flex-end">
        ${isPos?`<div style="width:100%;height:${barH}px;background:${color};border-radius:3px 3px 0 0"></div>`:''}
      </div>
      <div style="width:28px;height:1px;background:rgba(255,255,255,0.18)"></div>
      <div style="width:28px;height:${BAR_MAX}px;display:flex;flex-direction:column;justify-content:flex-start">
        ${!isPos?`<div style="width:100%;height:${barH}px;background:${color};border-radius:0 0 3px 3px"></div>`:''}
      </div>
      <div style="height:46px;display:flex;align-items:flex-start;justify-content:center;margin-top:3px">
        <span style="font-size:12px;font-weight:700;color:#e2ddd4;writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;letter-spacing:1px">${p.name}</span>
      </div>
    </div>`;
  }).join('');
  const html = `
    <div style="font-size:10px;color:#5a5870;margin-bottom:10px">${history.length} טורנירים • ${players.length} שחקנים</div>
    <div style="overflow-x:auto;padding-bottom:4px;margin-bottom:16px;direction:ltr">
      <div style="display:flex;align-items:flex-start;gap:4px;min-width:min-content;padding:0 4px;direction:ltr">${barsHtml}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:4px 10px;">
      <span style="font-size:11px;font-weight:800;color:#8a8799;padding:8px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">שחקן</span>
      <span style="font-size:11px;font-weight:800;color:#8a8799;text-align:right;padding:8px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">השקעה</span>
      <span style="font-size:11px;font-weight:800;color:#8a8799;text-align:right;padding:8px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">זכיות</span>
      <span style="font-size:11px;font-weight:800;color:#8a8799;text-align:right;padding:8px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">נטו</span>
      ${players.map(p=>{
        const enc = encodeURIComponent(p.name);
        const cell = 'cursor:pointer';
        return `
      <span onclick="showPlayerDetail('${enc}')" style="font-size:12px;font-weight:700;color:#e2ddd4;padding:7px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center;${cell}">${p.name}</span>
      <span onclick="showPlayerDetail('${enc}')" style="font-size:11px;color:#5a5870;text-align:right;padding:7px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center;${cell}">₪${p.paid.toLocaleString()}</span>
      <span onclick="showPlayerDetail('${enc}')" style="font-size:11px;color:#5b9bd5;text-align:right;padding:7px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center;${cell}">₪${p.won.toLocaleString()}</span>
      <span onclick="showPlayerDetail('${enc}')" style="font-size:12px;font-weight:900;color:${p.net>=0?'#5fc47a':'#e07b6a'};text-align:right;padding:7px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center;${cell}">${p.net>=0?'+':''}₪${p.net.toLocaleString()}</span>`;
      }).join('')}
    </div>`;
  document.getElementById('stats-modal-content').innerHTML = html;
  // מוודא שהגלילה נפתחת מההתחלה (scrollLeft=0 = יאיר, המצטבר הכי טוב) —
  // ליתר ביטחון מעבר ל-direction:ltr שכבר הוגדר למעלה, כי לפעמים דפדפן שכבר
  // "זוכר" מיקום גלילה קודם (למשל אם הסטטיסטיקה נפתחה כבר פעם בעבר) לא
  // מתאפס אוטומטית רק מ-CSS.
  const chartScroller = document.querySelector('#stats-modal-content > div:nth-child(2)');
  if(chartScroller) chartScroller.scrollLeft = 0;
}

// פאנל פירוט לשחקן בודד: כל הטורנירים שלו + באיזה מקום סיים בכל אחד, פילוח
// לפי מקום (כמה פעמים ראשון/שני/וכו'), ומדדים ממוצעים (לא רק נטו מצטבר).
// נפתח בלחיצה על שורת שחקן בטבלה הראשית (showStatistics); "→ חזרה" חוזר לשם.
function showPlayerDetail(encodedName){
  const name = decodeURIComponent(encodedName);
  const history = S.tournLog || [];
  const rows = [];
  history.forEach(t=>{
    const buyin = t.buyinCost || S.buyinCost || 50;
    const prizes = {1:t.place1||0, 2:t.place2||0, 3:t.place3||0, 4:t.place4||0};
    (t.finishOrder||[]).forEach(f=>{
      const fname = f.name || f.pid;
      if(fname !== name) return;
      const paid = (1+(f.rebuy||0)) * buyin;
      const won = prizes[f.place]||0;
      rows.push({date:t.date||'', tournName:t.name||'', place:f.place, paid, won, net:won-paid, rebuy:f.rebuy||0, paidPlace:!!prizes[f.place]});
    });
  });
  if(!rows.length){ notify('אין נתונים לשחקן זה'); return; }

  const n = rows.length;
  const totalNet = rows.reduce((s,r)=>s+r.net,0);
  const totalPaid = rows.reduce((s,r)=>s+r.paid,0);
  const avgNet = totalNet/n;
  const avgPlace = rows.reduce((s,r)=>s+r.place,0)/n;
  const roi = totalPaid>0 ? (totalNet/totalPaid*100) : 0;
  const itmCount = rows.filter(r=>r.paidPlace).length;
  const wins = rows.filter(r=>r.place===1).length;
  const podium = rows.filter(r=>r.place<=3).length;
  const best = rows.reduce((b,r)=>r.net>b.net?r:b, rows[0]);
  const worst = rows.reduce((w,r)=>r.net<w.net?r:w, rows[0]);

  const placeCounts = {};
  rows.forEach(r=>{ const key = r.place<=4 ? String(r.place) : '5+'; placeCounts[key]=(placeCounts[key]||0)+1; });
  const placeOrder = ['1','2','3','4','5+'];

  const statCard = (label,val,color)=>`<div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:9px 6px;text-align:center">
    <div style="font-size:11px;font-weight:700;color:#8a8799;margin-bottom:4px;letter-spacing:0.2px">${label}</div>
    <div style="font-size:14px;font-weight:900;color:${color||'#e2ddd4'}">${val}</div>
  </div>`;

  const summaryHtml = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">
    ${statCard('טורנירים', n)}
    ${statCard('מקום ממוצע', avgPlace.toFixed(1))}
    ${statCard('ITM%', Math.round(itmCount/n*100)+'%')}
    ${statCard('רווח ממוצע/טורניר', (avgNet>=0?'+':'')+'₪'+Math.round(avgNet).toLocaleString(), avgNet>=0?'#5fc47a':'#e07b6a')}
    ${statCard('סה"כ נטו', (totalNet>=0?'+':'')+'₪'+totalNet.toLocaleString(), totalNet>=0?'#5fc47a':'#e07b6a')}
    ${statCard('ROI', Math.round(roi)+'%', roi>=0?'#5fc47a':'#e07b6a')}
    ${statCard('זכיות (מקום 1)', wins+' · '+Math.round(wins/n*100)+'%', '#c8a96e')}
    ${statCard('פודיום (1-3)', podium+' · '+Math.round(podium/n*100)+'%')}
    ${statCard('הכי טוב', (best.net>=0?'+':'')+'₪'+best.net.toLocaleString(), '#5fc47a')}
  </div>`;

  // מגמת נטו מצטבר לאורך זמן: rows כרגע מסודרות חדש-לישן (כמו S.tournLog),
  // הופכים לכרונולוגי (ישן-לחדש) כדי שהגרף ייקרא משמאל לימין בסדר טבעי.
  const chrono = [...rows].reverse();
  let cum = 0;
  const trendPoints = chrono.map(r=>{ cum += r.net; return {cum, tournNet:r.net, date:r.date}; });
  const maxAbsCum = Math.max(...trendPoints.map(p=>Math.abs(p.cum)), 1);
  const TREND_BAR_MAX = 60, TREND_ZERO = 62;
  const trendBarsHtml = trendPoints.map(p=>{
    const isPos = p.cum>=0;
    const barH = Math.max(Math.round((Math.abs(p.cum)/maxAbsCum)*TREND_BAR_MAX), 2);
    const color = isPos?'rgba(95,196,122,0.85)':'rgba(224,123,106,0.85)';
    // חץ קטן מעל כל עמודה: תוצאת *הטורניר הבודד הזה* (▲ ירוק=רווח, ▼ אדום=הפסד),
    // בנפרד לגמרי מצבע/גובה העמודה עצמה שמייצגים את המצטבר עד לאותה נקודה —
    // כדי שאפשר יהיה להבחין "טורניר טוב באמצע מגמה שלילית כללית" וכדומה.
    const tournIsPos = p.tournNet>=0;
    const arrowColor = tournIsPos?'#5fc47a':'#e07b6a';
    const arrow = tournIsPos?'▲':'▼';
    // 'title' (tooltip ב-hover) כמעט לא עובד במגע/מובייל — הוחלף בלחיצה
    // רגילה (tap) שמפעילה notify(), שכבר בשימוש באפליקציה בדיוק לזה.
    const tapMsg = `${p.date}: הטורניר עצמו ${tournIsPos?'+':''}₪${p.tournNet.toLocaleString()} · מצטבר ${isPos?'+':''}₪${p.cum.toLocaleString()}`;
    // -webkit-touch-callout/-user-select: מונע מ-iOS Safari לחטוף לחיצה
    // ארוכה על התוכן הזה לתפריט "Copy / Find Selection" המובנה שלו, שהיה
    // מסתיר/מבטל את ה-onclick שלנו לפני שהוא בכלל מקבל סיכוי לפעול.
    return `<div onclick="notify('${tapMsg}')" style="display:flex;flex-direction:column;align-items:center;width:10px;flex-shrink:0;cursor:pointer;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none">
      <div style="font-size:7px;line-height:1;color:${arrowColor};margin-bottom:2px">${arrow}</div>
      <div style="width:8px;height:${TREND_ZERO}px;display:flex;flex-direction:column;justify-content:flex-end">
        ${isPos?`<div style="width:100%;height:${barH}px;background:${color};border-radius:2px 2px 0 0"></div>`:''}
      </div>
      <div style="width:8px;height:1px;background:rgba(255,255,255,0.15)"></div>
      <div style="width:8px;height:${TREND_BAR_MAX}px;display:flex;flex-direction:column;justify-content:flex-start">
        ${!isPos?`<div style="width:100%;height:${barH}px;background:${color};border-radius:0 0 2px 2px"></div>`:''}
      </div>
    </div>`;
  }).join('');
  const trendHtml = trendPoints.length>1 ? `<div style="margin-bottom:12px">
    <div style="font-size:10px;color:#8a8799;margin-bottom:2px">מגמת נטו מצטבר (${trendPoints[0].date||'?'} ← ${trendPoints[trendPoints.length-1].date||'?'})</div>
    <div style="font-size:9px;color:#5a5870;margin-bottom:6px">גובה+צבע העמודה = הסכום המצטבר עד לאותו טורניר &nbsp;·&nbsp; <span style="color:#5fc47a">▲</span>/<span style="color:#e07b6a">▼</span> מעליה = אם הטורניר הבודד הזה עצמו היה רווח או הפסד</div>
    <div style="overflow-x:auto;padding-bottom:2px;direction:ltr;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none">
      <div style="display:flex;align-items:flex-start;gap:2px;min-width:min-content;padding:0 2px;direction:ltr;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none">${trendBarsHtml}</div>
    </div>
  </div>` : '';

  const breakdownHtml = `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${placeOrder.filter(k=>placeCounts[k]).map(k=>`
      <div style="background:rgba(200,169,110,0.1);border:1px solid rgba(200,169,110,0.3);border-radius:8px;padding:5px 10px;font-size:11px;color:#c8a96e">
        מקום ${k}: <b>${placeCounts[k]}</b>
      </div>`).join('')}
  </div>`;

  const listHtml = `<div style="display:grid;grid-template-columns:auto 1fr auto auto auto;gap:4px 8px">
    <span style="font-size:11px;font-weight:800;color:#8a8799;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">מקום</span>
    <span style="font-size:11px;font-weight:800;color:#8a8799;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">תאריך</span>
    <span style="font-size:11px;font-weight:800;color:#8a8799;text-align:right;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">השקעה</span>
    <span style="font-size:11px;font-weight:800;color:#8a8799;text-align:right;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">זכייה</span>
    <span style="font-size:11px;font-weight:800;color:#8a8799;text-align:right;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.08)">נטו</span>
    ${rows.map(r=>`
    <span style="font-size:11px;font-weight:900;color:${r.place===1?'#c8a96e':'#e2ddd4'};padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center">${r.place}${r.place===1?' 🏆':''}</span>
    <span style="font-size:11px;color:#e2ddd4;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.date||'—'}${r.tournName?' · '+r.tournName:''}</span>
    <span style="font-size:10px;color:#5a5870;text-align:right;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center">₪${r.paid.toLocaleString()}</span>
    <span style="font-size:10px;color:#5b9bd5;text-align:right;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center">₪${r.won.toLocaleString()}</span>
    <span style="font-size:11px;font-weight:900;color:${r.net>=0?'#5fc47a':'#e07b6a'};text-align:right;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.05);align-self:center">${r.net>=0?'+':''}₪${r.net.toLocaleString()}</span>`).join('')}
  </div>`;

  // שורת מעבר-מהיר בין שחקנים — אותה רשימה/מיון כמו showStatistics, כדי
  // שאפשר לקפוץ ישירות לשחקן אחר בלי ללחוץ קודם "→ חזרה".
  const allPlayers = _computeAllPlayerStats();
  const switcherHtml = allPlayers.length>1 ? `<div style="display:flex;gap:5px;overflow-x:auto;padding-bottom:8px;margin-bottom:10px">
    ${allPlayers.map(p=>`<button onclick="showPlayerDetail('${encodeURIComponent(p.name)}')" style="flex-shrink:0;background:${p.name===name?'rgba(200,169,110,0.18)':'rgba(255,255,255,0.04)'};border:1px solid ${p.name===name?'rgba(200,169,110,0.5)':'rgba(255,255,255,0.08)'};border-radius:14px;padding:4px 11px;font-size:11px;font-weight:700;color:${p.name===name?'#c8a96e':'#8a8799'};cursor:pointer;white-space:nowrap">${p.name}</button>`).join('')}
  </div>` : '';

  const html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <button onclick="showStatistics()" style="background:none;border:none;color:#c8a96e;font-size:13px;cursor:pointer;padding:2px 4px">→ חזרה</button>
      <div style="font-size:14px;font-weight:800;color:#c8a96e">${name}</div>
    </div>
    ${switcherHtml}
    ${summaryHtml}
    ${trendHtml}
    ${breakdownHtml}
    ${listHtml}`;
  document.getElementById('stats-modal-content').innerHTML = html;
}
