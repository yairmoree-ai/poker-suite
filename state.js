// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const RANKS=['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const SUITS=['♠','♥','♦','♣'];
const SC={'♠':'#1a1a2e','♥':'oklch(0.6 0.22 25)','♦':'oklch(0.6 0.22 25)','♣':'#1a1a2e'};
const PC={BTN:'#5b9bd5','BTN/SB':'#8b7cb8',SB:'#8b7cb8',BB:'#e07b6a',
  UTG:'#e05555','UTG+1':'#d4735e',MP:'#c8a96e','MP+1':'#b8b870',
  HJ:'#7eb8a4',CO:'#5fc4b4',LJ:'#6ab8d4'};
const PBN={
  2:['BTN/SB','BB'],3:['BTN','SB','BB'],4:['BTN','SB','BB','UTG'],
  5:['BTN','SB','BB','UTG','CO'],6:['BTN','SB','BB','UTG','MP','CO'],
  7:['BTN','SB','BB','UTG','UTG+1','MP','CO'],
  8:['BTN','SB','BB','UTG','UTG+1','MP','HJ','CO'],
  9:['BTN','SB','BB','UTG','UTG+1','MP','MP+1','HJ','CO'],
  10:['BTN','SB','BB','UTG','UTG+1','MP','MP+1','HJ','CO','LJ']
};
const DEF_BLINDS=[
  {sb:500,bb:1000,ante:0},
  {sb:1000,bb:1000,ante:0},
  {sb:1000,bb:2000,ante:0},
  {sb:2000,bb:4000,ante:0},
  {sb:3000,bb:6000,ante:0},
  {sb:5000,bb:10000,ante:0},
  {sb:10000,bb:20000,ante:0},
  {sb:15000,bb:30000,ante:0},
  {sb:20000,bb:40000,ante:0},
  {sb:25000,bb:50000,ante:0},
  {sb:30000,bb:60000,ante:0},
  {sb:50000,bb:100000,ante:0}
];
let BLIND_LEVELS=[...DEF_BLINDS];
const ACTIONS=[
  {k:'Fold',   c:'#888888', amt:false},
  {k:'Check',  c:'#7eb8a4', amt:false},
  {k:'Call',   c:'#5b9bd5', amt:true},
  {k:'Open',   c:'#c8a96e', amt:true},
  {k:'Raise',  c:'#e0a050', amt:true},
  {k:'3bet',   c:'#e07b6a', amt:true},
  {k:'4bet',   c:'#e05555', amt:true},
  {k:'All-in', c:'#ff2222', amt:true}
];
const RESULTS=[
  {k:'win',l:'ניצחתי',e:'🏆',c:'#5fc47a'},
  {k:'lose',l:'הפסדתי',e:'💸',c:'#e07b6a'},
  {k:'fold_win',l:'קיפלו',e:'🤫',c:'#7eb8a4'},
  {k:'split',l:'חלוקה',e:'🤝',c:'#c8a96e'}
];

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
let S={
  playerLib:[],
  tableSize:9,
  tableOrientation:'vertical',
  buyinCost:50,
  buyins:{},       // {pid:{buyin:n,rebuy:n}}
  koOrder:[],      // pids in order of KO (first KO = last place)
  blindLevel:0,
  blindTimer:{running:false, secondsLeft:1200, levelDuration:1200, lastStartedAt:null}, // 20 min default
  blindStructure:null, // custom per-level durations [{sb,bb,ante,duration}]
  customBlinds:null,
  customBlindLevels:[],
  btnSeat:0,
  seats:[],
  board:[null,null,null,null,null],
  handLog:[],
  tournLog:[],
  houseRake:200,
  place4:0, place3:0,
  place1Override:null, place2Override:null,
  currentActor:null,
  bettingClosed:false,
  lastRaiser:null,
  raiseRound:0,
  actionCount:0,
  lastRaiseSize:0,  // size of last raise increment
  lastRaiseWasFull:true, // was last raise a full raise?
  btnLocked:false,
};
let activeSeat=null, cpTarget=null, cpRank=null;
let curHand=null, recStreet='פרה-פלופ', recActor='0';

// ═══════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════
function applySnapshot(v){
  // מזג handLog — הוסף ידיים חסרות לפי id
  if(v.handLog?.length){
    const existingIds = new Set((S.handLog||[]).map(h=>h.id).filter(Boolean));
    const newHands = v.handLog.filter(h=>h.id && !existingIds.has(h.id));
    if(newHands.length){
      S.handLog = [...(S.handLog||[]), ...newHands].sort((a,b)=>(b.ts||0)-(a.ts||0));
    }
  }
  // מזג tournLog — הוסף טורנירים חסרים לפי id
  if(v.tournLog?.length){
    const existingIds = new Set((S.tournLog||[]).map(t=>t.id).filter(Boolean));
    const newT = v.tournLog.filter(t=>t.id && !existingIds.has(t.id));
    if(newT.length){
      S.tournLog = [...(S.tournLog||[]), ...newT].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    }
  }
  // מזג playerLib — הוסף שחקנים חסרים לפי id
  if(v.playerLib?.length){
    const existingIds = new Set((S.playerLib||[]).map(p=>p.id).filter(Boolean));
    const newP = v.playerLib.filter(p=>p.id && !existingIds.has(p.id));
    if(newP.length) S.playerLib = [...(S.playerLib||[]), ...newP];
  }
  // שאר השדות — קח מהגרסה החדשה יותר בלבד
  const incomingNewer = !S.savedAt || !v.savedAt || v.savedAt > S.savedAt;
  if(incomingNewer){
    if(v.seats) S.seats=v.seats;
    if(v.board) S.board=v.board;
    if(v.btnSeat!==undefined) S.btnSeat=v.btnSeat;
    if(v.btnLocked!==undefined) S.btnLocked=v.btnLocked;
    if(v.lastBet!==undefined) S.lastBet=v.lastBet;
    if(v.buyinCost) S.buyinCost=v.buyinCost;
    if(v.buyins) S.buyins=v.buyins;
    if(v.koOrder) S.koOrder=v.koOrder;
    const prevLevel = S.blindLevel;
    if(v.blindLevel!==undefined) S.blindLevel=v.blindLevel;
    if(v.blindLevel!==undefined && v.blindLevel !== prevLevel && v.blindLevel > prevLevel){
      const nb2 = BLIND_LEVELS[v.blindLevel];
      if(nb2) setTimeout(()=>announceBlindLevel(v.blindLevel+1, nb2.sb, nb2.bb), 300);
    }
    if(v.blindTimer){
      Object.assign(S.blindTimer, v.blindTimer);
      if(S.blindTimer.running && S.blindTimer.startedAt){
        const elapsed = Math.floor((Date.now() - S.blindTimer.startedAt)/1000);
        S.blindTimer.secondsLeft = Math.max(0, (S.blindTimer.pausedAt||getLevelDuration(S.blindLevel)) - elapsed);
      }
      updateTimerDisplay();
      if(!isAdmin()){
        clearInterval(_timerInterval); _timerInterval = null;
        if(S.blindTimer.running){
          _timerInterval = setInterval(()=>{
            if(S.blindTimer.secondsLeft>0){
              S.blindTimer.secondsLeft--;
              updateTimerDisplay();
            } else {
              const next = S.blindLevel + 1;
              if(next < BLIND_LEVELS.length){
                S.blindLevel = next;
                S.blindTimer.secondsLeft = getLevelDuration(next);
                S.blindTimer.pausedAt = S.blindTimer.secondsLeft;
                updateTimerDisplay();
                const nb = BLIND_LEVELS[next];
                if(nb) setTimeout(()=>announceBlindLevel(next+1, nb.sb, nb.bb), 300);
              } else {
                clearInterval(_timerInterval); _timerInterval=null;
              }
            }
          },1000);
        }
      }
    }
    if(v.customBlinds!==undefined) S.customBlinds=v.customBlinds;
    if(v.customBlindLevels) S.customBlindLevels=v.customBlindLevels;
    if(v.tableSize) S.tableSize=v.tableSize;
    if(v.houseRake!==undefined) S.houseRake=v.houseRake;
    if(v.place4!==undefined) S.place4=v.place4;
    if(v.place3!==undefined) S.place3=v.place3;
    if(v.place1Override!==undefined) S.place1Override=v.place1Override;
    if(v.place2Override!==undefined) S.place2Override=v.place2Override;
    // לא מעדכנים S.savedAt — רק persist() יעדכן אותו
  }
  if(S.currentActor===undefined) S.currentActor=null;
  if(S.bettingClosed===undefined) S.bettingClosed=false;
  if(S.lastRaiser===undefined) S.lastRaiser=null;
  if(S.raiseRound===undefined) S.raiseRound=0;
  if(S.actionCount===undefined) S.actionCount=0;
  BLIND_LEVELS=[...DEF_BLINDS,...(S.customBlindLevels||[])];
}

function loadState(){
  // 0. Try embedded <script id="ps-data"> tag (data saved inside HTML file)
  try{
    const dataEl = document.getElementById('ps-data');
    if(dataEl && dataEl.textContent.trim()){
      const v = JSON.parse(dataEl.textContent);
      if(v && (v.playerLib?.length||v.handLog?.length||v.tournLog?.length)){
        applySnapshot(v);
        persist();
        render();
        return;
      }
    }
  }catch(e){}

  // 1. Try sessionStorage full snapshot (survives refresh)
  try{
    const snap = sessionStorage.getItem('ps_snap');
    if(snap){ const v=JSON.parse(snap); if(v.playerLib?.length||v.handLog?.length||v.tournLog?.length){ applySnapshot(v); render(); return; } }
  }catch(e){}

  // 2. Try localStorage full snapshot
  try{
    const snap = localStorage.getItem('ps_backup');
    if(snap){ const v=JSON.parse(snap); if(v.playerLib?.length||v.handLog?.length||v.tournLog?.length){ applySnapshot(v); render(); return; } }
  }catch(e){}

  // 3. Try individual keys (old format)
  function readLS(keys){ for(const k of keys){ try{ const v=localStorage.getItem(k); if(v) return JSON.parse(v); }catch(e){} } return null; }

  const lib=readLS(['ps_lib','ptlib']);
  if(lib) S.playerLib=Array.isArray(lib)?lib:[];

  const seats=readLS(['ps_seats','ptseats']);
  if(seats){ S.seats=seats.seats||[]; S.board=seats.board||[null,null,null,null,null]; S.btnSeat=seats.btnSeat||0; }

  const tourn=readLS(['ps_tourn','pttable','ps_tournament']);
  if(tourn){
    Object.assign(S,{
      buyinCost:tourn.buyinCost||50, buyins:tourn.buyins||{}, koOrder:tourn.koOrder||[],
      blindLevel:tourn.blindLevel||0, customBlinds:tourn.customBlinds||null,
      customBlindLevels:tourn.customBlindLevels||[], tableSize:tourn.tableSize||9,
      houseRake:tourn.houseRake??200, place4:tourn.place4||0, place3:tourn.place3||0
    });
    BLIND_LEVELS=[...DEF_BLINDS,...S.customBlindLevels];
  }

  const log=readLS(['ps_log','ptlog']);
  if(log) S.handLog=Array.isArray(log)?log:[];

  const tlog=readLS(['ps_tlog','pttlog']);
  if(tlog) S.tournLog=Array.isArray(tlog)?tlog:[];

  if(S.buyinCost===100) S.buyinCost=50;
  render();

}
function persist(){
  if(isViewer()) return;
  if(isViewer()) return;
  S.savedAt = Date.now();
  const snap = fullSnapshot();
  // Save to both localStorage and sessionStorage
  try{ localStorage.setItem('ps_lib',JSON.stringify(S.playerLib)); }catch(e){}
  try{ localStorage.setItem('ps_seats',JSON.stringify({seats:S.seats,board:S.board,btnSeat:S.btnSeat})); }catch(e){}
  try{ localStorage.setItem('ps_tourn',JSON.stringify({buyinCost:S.buyinCost,buyins:S.buyins,koOrder:S.koOrder,blindLevel:S.blindLevel,customBlinds:S.customBlinds,customBlindLevels:S.customBlindLevels,tableSize:S.tableSize,tableOrientation:S.tableOrientation,houseRake:S.houseRake,place4:S.place4,place3:S.place3,place1Override:S.place1Override,place2Override:S.place2Override,btnLocked:S.btnLocked,lastBet:S.lastBet,blindTimer:S.blindTimer,blindStructure:S.blindStructure})); }catch(e){}
  try{ localStorage.setItem('ps_log',JSON.stringify(S.handLog)); }catch(e){}
  try{ localStorage.setItem('ps_tlog',JSON.stringify(S.tournLog)); }catch(e){}
  // Also save full snapshot to sessionStorage (survives refresh, not new tab)
  try{ sessionStorage.setItem('ps_snap', JSON.stringify(snap)); }catch(e){}
  // Save to all known old keys for migration
  try{ localStorage.setItem('ps_backup', JSON.stringify(snap)); }catch(e){}
  S._lastSaved = Date.now();
  // Auto-sync to Google Sheets - only for admins, immediate
  if(typeof syncToSheets === 'function' && getGsUrl() && isAdmin()) syncToSheets(true);
}

function fullSnapshot(){
  return {
    version:3, ts: Date.now(), savedAt: S.savedAt||Date.now(),
    playerLib:S.playerLib, seats:S.seats, board:S.board, btnSeat:S.btnSeat,
    buyinCost:S.buyinCost, buyins:S.buyins, koOrder:S.koOrder,
    blindLevel:S.blindLevel, customBlinds:S.customBlinds,
    customBlindLevels:S.customBlindLevels, tableSize:S.tableSize, tableOrientation:S.tableOrientation,
    houseRake:S.houseRake, place4:S.place4, place3:S.place3,
    handLog:S.handLog, tournLog:S.tournLog,
    blindTimer:S.blindTimer, blindStructure:S.blindStructure
  };
}

// ═══════════════════════════════════════════════════════
// DERIVED
// ═══════════════════════════════════════════════════════
const getBlinds=()=>S.customBlinds||(S.blindStructure?S.blindStructure[S.blindLevel]:null)||BLIND_LEVELS[S.blindLevel]||DEF_BLINDS[0];
const getLevelDuration=(lvl)=>{
  if(S.blindStructure?.[lvl]?.duration) return S.blindStructure[lvl].duration;
  return S.blindTimer.levelDuration;
};
const getBB=()=>getBlinds().bb;
const pName=pid=>S.playerLib.find(p=>p.id===pid)?.name||'';
const sortedLib=()=>[...S.playerLib].sort((a,b)=>a.name.localeCompare(b.name,'he'));
const totalBuyins=()=>Object.values(S.buyins).reduce((s,b)=>s+b.buyin,0);
const totalRebuys=()=>Object.values(S.buyins).reduce((s,b)=>s+b.rebuy,0);
const totalEntries=()=>totalBuyins()+totalRebuys();
// Rebuys that are free: every 10th and 16th rebuy per player
function calcFreeRebuys(){
  let free = 0;
  Object.values(S.buyins).forEach(b=>{
    const r = b.rebuy||0;
    if(r>=10) free++;
    if(r>=16) free++;
  });
  return free;
}
function totalChips(){
  // Each buyin + each rebuy = 50,000 chips
  return totalEntries() * 50000;
}

function calcPaidEntries(){
  const totalR = totalRebuys();
  const free = calcFreeRebuys();
  return totalBuyins() + totalR - free;
}
const prizePool=()=>calcPaidEntries()*S.buyinCost;
const activePlayers=()=>S.seats.filter(s=>s.playerId&&!s.folded);
// Active tournament players = have buyin AND not KO'd
const activeTournPlayers=()=>Object.keys(S.buyins).filter(pid=>S.buyins[pid]?.buyin>0&&!S.koOrder.includes(pid));
const allUsedCards=()=>[...S.board,...S.seats.flatMap(s=>s.cards||[])].filter(Boolean);

function calcPot(){
  // Sum all amounts from all seats current round actions
  return S.seats.reduce((total,seat)=>{
    return total+(seat.actions||[]).reduce((s,a)=>s+(parseFloat(a.amount)||0),0);
  },0);
}

function assignPos(){
  const occ=S.seats.filter(s=>s.playerId).map(s=>s.seatIdx).sort((a,b)=>a-b);
  if(occ.length<2) return S.seats;
  const labels=PBN[Math.min(occ.length,10)]||[];
  const bi=occ.indexOf(S.btnSeat);
  const rot=bi>=0?[...occ.slice(bi),...occ.slice(0,bi)]:occ;
  return S.seats.map(s=>{const pi=rot.indexOf(s.seatIdx);return{...s,pos:pi>=0?(labels[pi]||''):''}; });
}

function getSeatXY(i,count){
  const gapDeg = count<=4 ? 50 : count<=6 ? 40 : count<=7 ? 32 : 22;
  const rx = count>=8 ? 42 : 36;
  const ry = count>=8 ? 46 : 40;
  const spreadDeg = 360 - gapDeg*2;
  const startRad = gapDeg * Math.PI/180;
  const stepRad = (spreadDeg * Math.PI/180) / (count - 1);
  const angle = startRad + i * stepRad;
  return{x:50+rx*Math.cos(angle), y:50+ry*Math.sin(angle)};
}
function getDealerSeatXY(){
  return{x:50+36, y:50};
}
