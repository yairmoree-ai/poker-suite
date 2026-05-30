// ═══════════════════════════════════════
// CLOUDFLARE WORKER URL - עדכן כאן
// ═══════════════════════════════════════
const AUTH_WORKER_URL = 'https://poker-suite-auth.yairmoree.workers.dev';

// ═══════════════════════════════════════
// USERS - הוסף/ערוך משתמשים כאן
// ═══════════════════════════════════════
const USERS = [
  { name:'יאיר',   pass:'1q234r',    role:'admin'  },
  { name:'יאיר',   pass:'443211',    role:'local'  },
  // מנהלים נוספים:
  // { name:'שם', pass:'סיסמה', role:'admin' },
];
// viewer = read-only (no edit, no save, no delete)
let currentUser = null;
const isAdmin  = ()=> currentUser?.role==='admin' || currentUser?.role==='local' || currentUser?.role==='superadmin';
const isViewer = ()=> currentUser?.role==='viewer';
const isLocal  = ()=> currentUser?.role==='local'; // admin without sync
const isSuperAdmin = ()=> currentUser?.role==='superadmin';
const isAdminOnly  = ()=> currentUser?.role==='admin'; // regular admin, not super
let _superTempToken = null;
async function requireSuperAdmin(onSuccess){
  if(isSuperAdmin()){ onSuccess(); return; }
  if(_superTempToken){ onSuccess(); return; }
  document.getElementById('super-auth-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'super-auth-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
  const box = document.createElement('div');
  box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:14px;padding:18px;width:100%;max-width:300px;text-align:center';
  box.onclick = e=>e.stopPropagation();
  box.innerHTML = '<div style="font-size:14px;font-weight:800;color:#c8a96e;margin-bottom:4px">🔐 חסום למנהל-על בלבד</div>'+
    '<div style="font-size:11px;color:#5a5870;margin-bottom:12px">הכנס פרטי מנהל-על לאישור</div>'+
    '<input id="super-user" type="text" placeholder="שם משתמש" style="width:100%;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:13px;outline:none;margin-bottom:6px;box-sizing:border-box;direction:ltr">'+
    '<input id="super-pass" type="password" placeholder="סיסמה" style="width:100%;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:13px;outline:none;margin-bottom:10px;box-sizing:border-box">';
  const btn = document.createElement('button');
  btn.style.cssText = 'width:100%;padding:11px;border-radius:9px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:14px;cursor:pointer';
  btn.textContent = 'אשר';
  btn.onclick = async ()=>{
    const u = document.getElementById('super-user')?.value?.trim();
    const p = document.getElementById('super-pass')?.value?.trim();
    btn.textContent='...'; btn.disabled=true;
    try {
      const resp = await fetch(AUTH_WORKER_URL+'/verify-superadmin',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username:u, password:p})
      });
      const data = await resp.json();
      if(data.ok){ _superTempToken = data.token; overlay.remove(); onSuccess(); }
      else { btn.textContent='שגיאה: '+(data.error||''); btn.disabled=false; }
    } catch(e){ btn.textContent='שגיאה'; btn.disabled=false; }
  };
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('super-user')?.focus(),150);
}

function showUpgradeDialog(){
  document.getElementById('upgrade-dialog')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'upgrade-dialog';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
  const box = document.createElement('div');
  box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:16px;padding:20px;width:100%;max-width:300px;text-align:center';
  box.onclick = e=>e.stopPropagation();
  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:800;color:#c8a96e;margin-bottom:14px';
  title.textContent = '🔑 כניסה כמנהל';
  const inp = document.createElement('input');
  inp.type = 'password';
  inp.placeholder = 'סיסמה...';
  inp.style.cssText = 'width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#0a0e18;color:#e2ddd4;font-size:18px;text-align:center;outline:none;box-sizing:border-box;margin-bottom:12px;-webkit-appearance:none;direction:ltr';
  inp.onkeydown = e=>{ if(e.key==='Enter') tryUpgrade(inp.value); };
  const btn = document.createElement('button');
  btn.style.cssText = 'width:100%;padding:12px;border-radius:10px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:15px;cursor:pointer;margin-bottom:8px';
  btn.textContent = 'כניסה';
  btn.onclick = ()=>tryUpgrade(inp.value);
  const cancel = document.createElement('button');
  cancel.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:13px;cursor:pointer';
  cancel.textContent = 'ביטול';
  cancel.onclick = ()=>overlay.remove();
  box.appendChild(title); box.appendChild(inp); box.appendChild(btn); box.appendChild(cancel);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(()=>inp.focus(), 100);
}

function tryUpgrade(pass){
  const u = USERS.find(u=>u.pass===pass && (u.role==='admin'||u.role==='local'));
  if(!u){ notify('סיסמה שגויה'); return; }
  document.getElementById('upgrade-dialog')?.remove();
  currentUser = {name:u.name, role:u.role, username: u.user||u.name?.toLowerCase()};
  const badge = document.getElementById('user-badge');
  if(badge){ badge.textContent=u.name+(u.role==='local'?' 🔒':' 🔑'); badge.style.color=u.role==='local'?'#5b9bd5':'#c8a96e'; }
  const upBtn = document.getElementById('btn-upgrade-to-admin');
  if(upBtn) upBtn.style.display='none';
  try{ loadState(); }catch(e){ render(); }
  try{ showView('tourn'); }catch(e){}
  notify('ברוך הבא '+u.name+' 🔑');
}

function loginSuccess(){
  document.getElementById('lock-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  const dot = document.getElementById('sync-dot');
  if(dot) dot.title = 'מחובר: '+currentUser.name;
  const badge = document.getElementById('user-badge');
  if(badge){
    badge.textContent = currentUser.name + (currentUser.role==='viewer'?' 👁':currentUser.role==='local'?' 🔒':' 🔑');
    badge.style.color = currentUser.role==='viewer'?'#5b9bd5':currentUser.role==='local'?'#5b9bd5':'#c8a96e';
  }
  const upBtn2 = document.getElementById('btn-upgrade-to-admin');
  if(upBtn2) upBtn2.style.display='none';
  try{ loadState(); }catch(e){ try{render();}catch(e2){} }
  try{ startBlindTimer(); }catch(e){}
  try{ showView('table'); }catch(e){}
}

async function checkPass(){
  const inp = document.getElementById('pass-inp');
  const val = inp?.value?.trim();
  if(!val) return;
  
  // Get username from input (new field)
  const userInp = document.getElementById('user-inp');
  const username = userInp?.value?.trim();
  
  // Try Worker auth first if username provided
  if(username && AUTH_WORKER_URL){
    const loginBtn = document.getElementById('login-btn');
    if(loginBtn){ loginBtn.textContent='...'; loginBtn.disabled=true; }
    try {
      const resp = await fetch(AUTH_WORKER_URL+'/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username, password:val})
      });
      const data = await resp.json();
      if(data.ok){
        currentUser = {name:data.user.name, role:data.user.role, token:data.token, username: username, sheetsUrl: data.user.sheetsUrl||null};
        localStorage.setItem('auth_token', data.token);
        if(loginBtn){ loginBtn.textContent='כניסה'; loginBtn.disabled=false; }
        inp.value=''; if(userInp) userInp.value='';
        loginSuccess();
        return;
      }
    } catch(e){ /* fallback to local */ }
    if(loginBtn){ loginBtn.textContent='כניסה'; loginBtn.disabled=false; }
  }
  
  // Fallback: local USERS
  const user = USERS.find(u=>u.pass===val);
  if(user){
    currentUser = user;
    document.getElementById('lock-screen').style.display='none';
    document.getElementById('app').style.display='flex';
    const dot = document.getElementById('sync-dot');
    if(dot) dot.title = 'מחובר: '+user.name;
    const badge = document.getElementById('user-badge');
    if(badge){
      badge.textContent = user.name + (user.role==='viewer'?' 👁':user.role==='local'?' 🔒':' 🔑');
      badge.style.color = user.role==='viewer'?'#5b9bd5':user.role==='local'?'#5b9bd5':'#c8a96e';
    }
    const upBtn2 = document.getElementById('btn-upgrade-to-admin');
    if(upBtn2) upBtn2.style.display='none';
    inp.value='';
    try{ loadState(); }catch(e){ console.error('loadState error:',e); try{render();}catch(e2){} }
    try{ startBlindTimer(); }catch(e){}
    try{ updateTimerDisplay(); }catch(e){}
    try{ showView('table'); }catch(e){ console.error('showView error:',e); }
    try{
      loadGSUrl();
      if(getGsUrl()){ setTimeout(()=>syncFromSheets(), 800); }
      // On first load: pull from Sheets before any push
if(getGsUrl() && currentUser && isAdmin()){
  syncFromSheets().then(()=>{
    // Only start auto-sync after initial pull
    setInterval(()=>{ if(getGsUrl() && currentUser) syncFromSheets(); }, 10000);
  });
} else {
  setInterval(()=>{ if(getGsUrl() && currentUser) syncFromSheets(); }, 10000);
}
    }catch(e){}
  } else {
    const err = document.getElementById('pass-err');
    if(err){ err.textContent='סיסמה שגויה'; setTimeout(()=>err.textContent='',2000); }
    inp?.select();
  }
}


function showSetupAdmin(){
  document.getElementById('setup-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'setup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl';
  
  const box = document.createElement('div');
  box.style.cssText = 'background:#121824;border:1px solid rgba(200,169,110,0.4);border-radius:16px;padding:20px;width:100%;max-width:320px';
  
  box.innerHTML = 
    '<div style="font-size:15px;font-weight:800;color:#c8a96e;margin-bottom:6px;text-align:center">⚙️ הגדרה ראשונה</div>'+
    '<div style="font-size:11px;color:#5a5870;margin-bottom:14px;text-align:center">יצירת מנהל ראשון</div>'+
    '<input id="setup-name" type="text" placeholder="שם מלא" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:14px;outline:none;margin-bottom:8px;text-align:right;box-sizing:border-box">'+
    '<input id="setup-user" type="text" placeholder="שם משתמש" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:14px;outline:none;margin-bottom:8px;text-align:right;box-sizing:border-box;direction:ltr">'+
    '<input id="setup-pass" type="password" placeholder="סיסמה" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0a0e18;color:#e2ddd4;font-size:14px;outline:none;margin-bottom:12px;text-align:right;box-sizing:border-box">'+
    '<div id="setup-err" style="color:#e07b6a;font-size:12px;margin-bottom:8px;display:none"></div>';

  const btn = document.createElement('button');
  btn.style.cssText = 'width:100%;padding:12px;border-radius:10px;border:none;background:#c8a96e;color:#0a0d14;font-weight:800;font-size:14px;cursor:pointer;margin-bottom:8px';
  btn.textContent = 'צור מנהל';
  btn.onclick = async ()=>{
    const name = document.getElementById('setup-name').value.trim();
    const username = document.getElementById('setup-user').value.trim();
    const password = document.getElementById('setup-pass').value.trim();
    const errEl = document.getElementById('setup-err');
    if(!name||!username||!password){ errEl.textContent='מלא את כל השדות'; errEl.style.display='block'; return; }
    btn.textContent = 'יוצר...'; btn.disabled = true;
    try {
      const resp = await fetch(AUTH_WORKER_URL+'/setup-admin',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username,password,name})
      });
      const data = await resp.json();
      if(data.ok){
        overlay.remove();
        notify('✓ מנהל נוצר! התחבר עם הפרטים שלך');
      } else {
        errEl.textContent = data.error||'שגיאה';
        errEl.style.display='block';
        btn.textContent='צור מנהל'; btn.disabled=false;
      }
    } catch(e){
      errEl.textContent = 'שגיאה: '+e.message;
      errEl.style.display='block';
      btn.textContent='צור מנהל'; btn.disabled=false;
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#5a5870;font-size:13px;cursor:pointer';
  cancelBtn.textContent = 'ביטול';
  cancelBtn.onclick = ()=>overlay.remove();

  box.appendChild(btn); box.appendChild(cancelBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('setup-name')?.focus(),150);
}

function enterAsViewer(adminUsername){
  currentUser = { name:'צופה', role:'viewer', viewingAdmin: adminUsername||null };
  document.getElementById('lock-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  const badge = document.getElementById('user-badge');
  if(badge){ badge.textContent='צופה 👁'; badge.style.color='#5b9bd5'; }
  const upBtn = document.getElementById('btn-upgrade-to-admin');
  if(upBtn) upBtn.style.display = adminUsername ? 'none' : '';
  // הסתר לשוניות שאינן טורנירים
  ['tab-table','tab-hands','tab-players'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display='none';
  });
  try{ render(); }catch(e){}
  setTimeout(()=>showView('tourn'), 50);
  try{
    loadGSUrl();
    const url = getGsUrl();
    if(url){ setTimeout(()=>syncFromSheets(), 800); }
    setInterval(()=>{ if(getGsUrl() && currentUser) syncFromSheets(); }, 10000);
  }catch(e){}
}

// בדוק אם יש פרמטר ?admin= ב-URL — כניסת צופה אוטומטית
async function checkAdminParam(){
  const params = new URLSearchParams(window.location.search);
  const adminUser = params.get('admin');
  if(!adminUser) return false;

  // שאל את ה-Worker על ה-sheetsUrl של המנהל הזה
  try{
    const resp = await fetch(AUTH_WORKER_URL+'/admin-info?username='+encodeURIComponent(adminUser));
    const data = await resp.json();
    if(data.ok && data.sheetsUrl){
      if(currentUser) currentUser.sheetsUrl = data.sheetsUrl;
      else currentUser = { name:'צופה', role:'viewer', sheetsUrl: data.sheetsUrl, viewingAdmin: adminUser };
      enterAsViewer(adminUser);
      return true;
    }
  }catch(e){}
  // Fallback — כניסת צופה ללא sync
  enterAsViewer(adminUser);
  return true;
}

// Auto-focus password input or auto-enter viewer mode
setTimeout(async ()=>{
  const handled = await checkAdminParam();
  if(!handled) document.getElementById('pass-inp')?.focus();
}, 100);
