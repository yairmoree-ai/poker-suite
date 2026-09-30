// ═══════════════════════════════════════════════════════
// POT TRAINER — תרגול מעקב קופה / פוט אודס / עוגני יחס
// עצמאי לגמרי: בנוי כמודל (כמו stats-modal), לא נוגע ב-S/persist.
// כל ה-id/class בפנים מתחילים ב-trn- כדי לא להתנגש עם שאר האפליקציה.
// ═══════════════════════════════════════════════════════
(function(){
"use strict";

let _trnBuilt = false;

const TRN_STYLE = `
.trn-scope{
  --trn-panel:#0d1220; --trn-card:#121a28; --trn-card2:#0f1622;
  --trn-border:rgba(200,169,110,0.16); --trn-border-strong:rgba(200,169,110,0.32);
  --trn-gold:#c8a96e; --trn-gold-soft:#e3c68e;
  --trn-felt:#1f4534; --trn-felt-soft:#2a5c44;
  --trn-green:#5fc47a; --trn-green-dim:rgba(95,196,122,0.14);
  --trn-red:#e0645a; --trn-red-dim:rgba(224,100,90,0.14);
  --trn-text:#e9e4d8; --trn-muted:#93899a; --trn-muted2:#4a4560;
  font-family:'Rubik',system-ui,Arial,sans-serif; color:var(--trn-text); direction:rtl;
}
.trn-scope, .trn-scope *{box-sizing:border-box}
.trn-num{font-family:'Space Grotesk','Rubik',monospace;font-variant-numeric:tabular-nums;direction:ltr;display:inline-block}
.trn-wrap{display:flex;flex-direction:column;gap:14px}
.trn-tagline{font-size:11px;color:var(--trn-muted);margin-bottom:2px}
.trn-tabs{display:flex;gap:6px;background:var(--trn-panel);border:1px solid var(--trn-border);border-radius:12px;padding:4px}
.trn-tab{flex:1;text-align:center;padding:9px 6px;border-radius:9px;font-size:12px;font-weight:700;color:var(--trn-muted);cursor:pointer;user-select:none;transition:.15s}
.trn-tab.on{background:var(--trn-felt);color:var(--trn-gold-soft);box-shadow:inset 0 0 0 1px var(--trn-border-strong)}
.trn-card{background:var(--trn-card);border:1px solid var(--trn-border);border-radius:14px;padding:14px}
.trn-field{display:flex;flex-direction:column;gap:7px;margin-bottom:12px}
.trn-field:last-child{margin-bottom:0}
.trn-field-label{font-size:11px;color:var(--trn-muted);font-weight:700}
.trn-seg{display:flex;gap:6px;flex-wrap:wrap}
.trn-seg button{flex:1;min-width:70px;padding:8px 6px;border-radius:9px;border:1px solid var(--trn-border);background:var(--trn-card2);color:var(--trn-text);font-size:11.5px;font-weight:600;cursor:pointer}
.trn-seg button.on{background:var(--trn-gold);border-color:var(--trn-gold);color:#1a1408;font-weight:800}
.trn-hint{font-size:10.5px;color:var(--trn-muted2);line-height:1.5}
.trn-start{width:100%;margin-top:2px;padding:13px;border-radius:11px;border:none;background:linear-gradient(180deg,var(--trn-gold-soft),var(--trn-gold));color:#1a1408;font-size:14px;font-weight:900;cursor:pointer}
.trn-scorebar{display:flex;gap:8px}
.trn-stat{flex:1;background:var(--trn-card);border:1px solid var(--trn-border);border-radius:11px;padding:8px 8px;text-align:center}
.trn-stat b{display:block;font-size:16px;font-weight:800}
.trn-stat span{font-size:9px;color:var(--trn-muted)}
.trn-stat.gold b{color:var(--trn-gold-soft)}
.trn-stat.green b{color:var(--trn-green)}
.trn-felt-panel{background:linear-gradient(180deg,var(--trn-felt-soft),var(--trn-felt));border-radius:16px;border:1px solid rgba(0,0,0,0.4);box-shadow:inset 0 0 30px rgba(0,0,0,0.35);padding:12px;min-height:200px;display:flex;flex-direction:column;gap:8px}
.trn-street{font-size:10px;font-weight:800;letter-spacing:.1em;color:rgba(255,255,255,0.55);text-transform:uppercase;background:rgba(0,0,0,0.2);padding:3px 10px;border-radius:20px}
.trn-table-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.trn-blinds{font-size:10px;font-weight:800;color:var(--trn-gold-soft);background:rgba(0,0,0,0.2);padding:3px 10px;border-radius:20px;font-family:'Space Grotesk',monospace;direction:ltr}
.trn-table-oval{position:relative;width:100%;aspect-ratio:4/3;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,0.06),rgba(0,0,0,0.3));border:3px solid rgba(0,0,0,0.35);box-shadow:inset 0 0 26px rgba(0,0,0,0.45);flex:1;min-height:170px}
.trn-table-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:9.5px;color:rgba(255,255,255,0.28);font-weight:800;letter-spacing:.08em;text-transform:uppercase;text-align:center}
.trn-seats{position:absolute;inset:0}
.trn-seat{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;transition:.2s}
.trn-seat-name{font-size:10px;font-weight:700;color:#f2eee4;background:rgba(8,11,18,0.62);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:4px 9px;white-space:nowrap;max-width:70px;overflow:hidden;text-overflow:ellipsis;transition:.2s}
.trn-seat.trn-acting .trn-seat-name{border-color:var(--trn-gold);box-shadow:0 0 0 3px rgba(200,169,110,0.28)}
.trn-seat.trn-folded .trn-seat-name{opacity:.35}
.trn-seat.trn-folded .trn-seat-bet{opacity:.35}
.trn-seat-bet{font-size:11px;font-weight:800;color:#1a1408;background:var(--trn-gold-soft);border-radius:20px;padding:2px 9px}
.trn-seat-tag{font-size:8.5px;color:var(--trn-muted);font-weight:700}
.trn-tap-next{align-self:center;padding:8px 20px;border-radius:20px;border:1px solid rgba(255,255,255,0.25);background:rgba(0,0,0,0.25);color:#f2eee4;font-size:12px;font-weight:700;cursor:pointer}
.trn-checkpoint{background:var(--trn-card);border:1px solid var(--trn-border-strong);border-radius:14px;padding:18px 16px;display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center}
.trn-checkpoint .trn-q{font-size:13px;font-weight:800;color:var(--trn-gold-soft)}
.trn-checkpoint input{width:100%;max-width:200px;text-align:center;font-size:24px;font-weight:800;font-family:'Space Grotesk',monospace;direction:ltr;background:var(--trn-card2);border:2px solid var(--trn-border-strong);border-radius:11px;padding:9px;color:var(--trn-text)}
.trn-checkpoint input:focus{outline:none;border-color:var(--trn-gold)}
.trn-checkpoint .trn-submit{width:100%;max-width:200px;padding:11px;border-radius:11px;border:none;background:var(--trn-gold);color:#1a1408;font-weight:900;font-size:13px;cursor:pointer}
.trn-timerwrap{width:100%;max-width:200px;height:5px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden}
.trn-timerwrap i{display:block;height:100%;background:var(--trn-gold);transform-origin:right center}
.trn-feedback{display:flex;flex-direction:column;gap:8px;align-items:center;text-align:center;padding:4px 0}
.trn-feedback .trn-verdict{font-size:15px;font-weight:900}
.trn-feedback.trn-ok .trn-verdict{color:var(--trn-green)}
.trn-feedback.trn-bad .trn-verdict{color:var(--trn-red)}
.trn-feedback .trn-detail{font-size:12px;color:var(--trn-muted)}
.trn-feedback .trn-detail b{color:var(--trn-text)}
.trn-continue{padding:9px 22px;border-radius:10px;border:1px solid var(--trn-border-strong);background:var(--trn-card2);color:var(--trn-gold-soft);font-weight:800;font-size:12.5px;cursor:pointer}
.trn-po-scenario{display:flex;gap:10px}
.trn-po-box{flex:1;background:var(--trn-card2);border:1px solid var(--trn-border);border-radius:11px;padding:12px 8px;text-align:center}
.trn-po-box .trn-lbl{font-size:10px;color:var(--trn-muted);font-weight:700;margin-bottom:4px}
.trn-po-box .trn-val{font-size:20px;font-weight:800;color:var(--trn-gold-soft)}
.trn-po-plus{align-self:center;font-size:17px;color:var(--trn-muted);font-weight:800}
.trn-summary{display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;padding:4px 0}
.trn-summary .trn-big{font-size:30px;font-weight:900;color:var(--trn-gold-soft)}
.trn-summary .trn-sub{font-size:11px;color:var(--trn-muted)}
.trn-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
.trn-summary-grid .trn-cell{background:var(--trn-card2);border:1px solid var(--trn-border);border-radius:10px;padding:9px;text-align:center}
.trn-summary-grid .trn-cell b{display:block;font-size:15px;font-weight:800;color:var(--trn-text)}
.trn-summary-grid .trn-cell span{font-size:9.5px;color:var(--trn-muted)}
.trn-btnrow{display:flex;gap:8px;width:100%}
.trn-btnrow button{flex:1;padding:11px;border-radius:10px;border:none;font-weight:800;font-size:12.5px;cursor:pointer}
.trn-btnrow .trn-primary{background:var(--trn-gold);color:#1a1408}
.trn-btnrow .trn-ghost{background:var(--trn-card2);color:var(--trn-text);border:1px solid var(--trn-border)}
.trn-anchor-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.trn-anchor-btn{background:var(--trn-card2);border:1px solid var(--trn-border);border-radius:11px;padding:11px 6px;text-align:center;cursor:pointer;display:flex;flex-direction:column;gap:3px;color:var(--trn-text)}
.trn-anchor-btn.trn-correct{border-color:var(--trn-green);background:var(--trn-green-dim)}
.trn-anchor-btn.trn-wrong{border-color:var(--trn-red);background:var(--trn-red-dim)}
.trn-anchor-btn .trn-r{font-size:14px;font-weight:800;color:var(--trn-gold-soft)}
.trn-anchor-btn .trn-p{font-size:10px;color:var(--trn-muted)}
.trn-anchor-table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:2px}
.trn-anchor-table td{padding:4px;border-bottom:1px solid var(--trn-border);text-align:center}
.trn-anchor-table td:first-child{text-align:right;color:var(--trn-muted)}
.trn-insights{background:var(--trn-card2);border:1px solid var(--trn-border);border-radius:10px;padding:10px 12px;width:100%;text-align:right}
.trn-insights .trn-ins-title{font-size:10.5px;color:var(--trn-muted);font-weight:700;margin-bottom:6px}
.trn-insights .trn-ins-row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
.trn-insights .trn-ins-row b{color:var(--trn-red)}
[data-trn-hidden]{display:none!important}
`;

const TRN_HTML = `
<div class="trn-scope trn-wrap">
  <div class="trn-tagline">תרגול מעקב קופה ופוט אודס בזמן אמת, בלי מחשבון</div>

  <div class="trn-tabs">
    <div class="trn-tab on" id="trn-tab-track">מעקב קופה חי</div>
    <div class="trn-tab" id="trn-tab-odds">פוט אודס</div>
    <div class="trn-tab" id="trn-tab-anchor">עוגני יחס</div>
  </div>

  <div class="trn-scorebar" id="trn-scorebar" data-trn-hidden>
    <div class="trn-stat"><b class="trn-num" id="trn-sb-streak">0</b><span>רצף נכון</span></div>
    <div class="trn-stat gold"><b class="trn-num" id="trn-sb-best">0</b><span>שיא אישי</span></div>
    <div class="trn-stat green"><b class="trn-num" id="trn-sb-acc">—</b><span>דיוק</span></div>
  </div>

  <div class="trn-card" id="trn-track-settings">
    <div class="trn-field">
      <div class="trn-field-label">רמת קושי</div>
      <div class="trn-seg" id="trn-track-diff">
        <button data-v="easy" class="on">קל — הצ'יפ מציג כמה נוסף</button>
        <button data-v="hard">מציאותי — הצ'יפ מציג סה"כ בסיבוב</button>
      </div>
      <div class="trn-hint">ברמה מציאותית הצ'יפ ליד כל שחקן מציג את סך ההשקעה שלו בסיבוב (כמו על שולחן אמיתי) — ואתה צריך לחשב בעצמך כמה כל אחד הוסיף. העיוורים תמיד מוצגים למעלה, כדי שיהיה לך בסיס לחישוב.</div>
    </div>
    <div class="trn-field">
      <div class="trn-field-label">קצב</div>
      <div class="trn-seg" id="trn-track-pace">
        <button data-v="manual" class="on">לחיצה ידנית</button>
        <button data-v="2200">אוטומטי · רגיל</button>
        <button data-v="1200">אוטומטי · מהיר</button>
      </div>
    </div>
    <div class="trn-field">
      <div class="trn-field-label">גודל צ'יפים</div>
      <div class="trn-seg" id="trn-track-scale">
        <button data-v="small" class="on">קטן (100–2,000)</button>
        <button data-v="big">גדול (500–15,000)</button>
      </div>
    </div>
    <div class="trn-field">
      <div class="trn-field-label">מצב אדפטיבי</div>
      <div class="trn-seg" id="trn-track-adaptive">
        <button data-v="on" class="on">פועל — מתמקד בחולשות שלי</button>
        <button data-v="off">כבוי — אקראי לגמרי</button>
      </div>
      <div class="trn-hint">כשפועל, האפליקציה זוכרת באילו שילובי גודל/קושי אתה טועה יותר, ומגריל יותר ידיים מהסוג הזה.</div>
    </div>
    <div class="trn-insights" id="trn-track-insights" data-trn-hidden></div>
    <button class="trn-start" id="trn-track-start">התחל יד ▶</button>
  </div>

  <div id="trn-track-play" data-trn-hidden style="display:flex;flex-direction:column;gap:12px">
    <div class="trn-felt-panel">
      <div class="trn-table-top">
        <div class="trn-street" id="trn-street-lbl">פרה-פלופ</div>
        <div class="trn-blinds" id="trn-blinds-lbl">—/—</div>
      </div>
      <div class="trn-table-oval">
        <div class="trn-table-center" id="trn-pot-center">קופה<br>סמויה</div>
        <div class="trn-seats" id="trn-seats"></div>
      </div>
      <button class="trn-tap-next" id="trn-tap-next" data-trn-hidden>הצג פעולה הבאה ›</button>
    </div>
  </div>

  <div class="trn-checkpoint" id="trn-checkpoint" data-trn-hidden>
    <div class="trn-q" id="trn-cp-question">כמה יש בקופה כרגע?</div>
    <div class="trn-timerwrap" id="trn-cp-timerwrap" data-trn-hidden><i id="trn-cp-timer"></i></div>
    <input type="number" inputmode="numeric" id="trn-cp-input" placeholder="₪">
    <button class="trn-submit" id="trn-cp-submit">בדוק</button>
  </div>

  <div class="trn-card trn-feedback" id="trn-feedback" data-trn-hidden>
    <div class="trn-verdict" id="trn-fb-verdict"></div>
    <div class="trn-detail" id="trn-fb-detail"></div>
    <button class="trn-continue" id="trn-fb-continue">המשך ›</button>
  </div>

  <div class="trn-card trn-summary" id="trn-summary" data-trn-hidden>
    <div class="trn-sub" id="trn-sum-title">סיכום היד</div>
    <div class="trn-big trn-num" id="trn-sum-big">100%</div>
    <div class="trn-summary-grid" id="trn-sum-grid"></div>
    <div class="trn-btnrow">
      <button class="trn-primary" id="trn-sum-again">שוב</button>
      <button class="trn-ghost" id="trn-sum-settings">הגדרות</button>
    </div>
  </div>

  <div class="trn-card" id="trn-odds-settings" data-trn-hidden>
    <div class="trn-field">
      <div class="trn-field-label">רמת קושי</div>
      <div class="trn-seg" id="trn-odds-diff">
        <button data-v="round" class="on">מספרים עגולים</button>
        <button data-v="real">מספרים מציאותיים</button>
      </div>
    </div>
    <div class="trn-field">
      <div class="trn-field-label">זמן לתשובה</div>
      <div class="trn-seg" id="trn-odds-time">
        <button data-v="0" class="on">ללא לחץ זמן</button>
        <button data-v="15">15 שניות</button>
        <button data-v="8">8 שניות</button>
      </div>
    </div>
    <div class="trn-field">
      <div class="trn-field-label">מצב אדפטיבי</div>
      <div class="trn-seg" id="trn-odds-adaptive">
        <button data-v="on" class="on">פועל — מתמקד בטווחי % שאני טועה בהם</button>
        <button data-v="off">כבוי — אקראי לגמרי</button>
      </div>
    </div>
    <div class="trn-hint">קופה + סכום להשלמה. ענה באחוזים (%) — סטייה של עד 1% נחשבת נכונה.</div>
    <div class="trn-insights" id="trn-odds-insights" data-trn-hidden></div>
    <button class="trn-start" id="trn-odds-start">התחל תרגול ▶</button>
  </div>

  <div id="trn-odds-play" data-trn-hidden style="display:flex;flex-direction:column;gap:12px">
    <div class="trn-card">
      <div class="trn-po-scenario">
        <div class="trn-po-box"><div class="trn-lbl">בקופה</div><div class="trn-val trn-num" id="trn-po-pot">₪0</div></div>
        <div class="trn-po-plus">+</div>
        <div class="trn-po-box"><div class="trn-lbl">כדי להשלים</div><div class="trn-val trn-num" id="trn-po-call">₪0</div></div>
      </div>
    </div>
  </div>

  <div class="trn-card" id="trn-anchor-settings" data-trn-hidden>
    <div class="trn-field">
      <div class="trn-field-label">רמת קושי</div>
      <div class="trn-seg" id="trn-anchor-diff">
        <button data-v="intro" class="on">קל מאוד — מספרים עגולים, יחס מדויק</button>
        <button data-v="normal">רגיל — הערכה מול מספרים מהחיים</button>
      </div>
      <div class="trn-hint">ברמה "קל מאוד" הקופה וסכום ההשלמה תמיד יוצרים בדיוק את היחס של אחד העוגנים (למשל 1,000/500 = בדיוק 2:1) — כדי לתרגל את עצם ההיכרות עם הטבלה בלי צורך להעריך. ברמה "רגיל" המספרים לא מדויקים ואתה צריך למצוא את העוגן הקרוב ביותר.</div>
    </div>
    <div class="trn-field" id="trn-anchor-scale-field">
      <div class="trn-field-label">גודל צ'יפים</div>
      <div class="trn-seg" id="trn-anchor-scale">
        <button data-v="round" class="on">מספרים עגולים</button>
        <button data-v="real">מספרים מציאותיים</button>
      </div>
    </div>
    <div class="trn-hint">תראה קופה וסכום להשלמה — בלי מחשבון. בחר את היחס המעוגל הקרוב ביותר.</div>
    <table class="trn-anchor-table">
      <tr><td>1:1</td><td class="trn-num">50%</td></tr>
      <tr><td>1.5:1</td><td class="trn-num">40%</td></tr>
      <tr><td>2:1</td><td class="trn-num">33%</td></tr>
      <tr><td>2.5:1</td><td class="trn-num">29%</td></tr>
      <tr><td>3:1</td><td class="trn-num">25%</td></tr>
      <tr><td>4:1</td><td class="trn-num">20%</td></tr>
      <tr><td>5:1</td><td class="trn-num">17%</td></tr>
      <tr><td>6:1</td><td class="trn-num">14%</td></tr>
      <tr><td>8:1</td><td class="trn-num">11%</td></tr>
      <tr><td>10:1</td><td class="trn-num">9%</td></tr>
    </table>
    <div class="trn-field">
      <div class="trn-field-label">מצב אדפטיבי</div>
      <div class="trn-seg" id="trn-anchor-adaptive">
        <button data-v="on" class="on">פועל — מתמקד בעוגנים שאני טועה בהם</button>
        <button data-v="off">כבוי — אקראי לגמרי</button>
      </div>
    </div>
    <div class="trn-insights" id="trn-anchor-insights" data-trn-hidden></div>
    <button class="trn-start" id="trn-anchor-start">התחל תרגול ▶</button>
  </div>

  <div id="trn-anchor-play" data-trn-hidden style="display:flex;flex-direction:column;gap:12px">
    <div class="trn-card">
      <div class="trn-po-scenario">
        <div class="trn-po-box"><div class="trn-lbl">בקופה</div><div class="trn-val trn-num" id="trn-an-pot">₪0</div></div>
        <div class="trn-po-plus">+</div>
        <div class="trn-po-box"><div class="trn-lbl">כדי להשלים</div><div class="trn-val trn-num" id="trn-an-call">₪0</div></div>
      </div>
    </div>
    <div class="trn-card">
      <div class="trn-field-label" style="margin-bottom:10px;text-align:center">איזה יחס הכי קרוב?</div>
      <div class="trn-anchor-grid" id="trn-anchor-grid"></div>
    </div>
  </div>
</div>
`;

function trnEnsureBuilt(){
  if(_trnBuilt) return;
  _trnBuilt = true;

  const styleEl = document.createElement('style');
  styleEl.id = 'trainer-styles';
  styleEl.textContent = TRN_STYLE;
  document.head.appendChild(styleEl);

  document.getElementById('trainer-modal-content').innerHTML = TRN_HTML;

  trnInit();
}

// ---------- everything below is scoped state for the trainer only ----------
function trnInit(){
  function loadBest(){ try{ return JSON.parse(localStorage.getItem('potTrainerBest')||'{}'); }catch(e){ return {}; } }
  function saveBest(obj){ try{ localStorage.setItem('potTrainerBest', JSON.stringify(obj)); }catch(e){} }
  let bestScores = loadBest();

  // ---------- adaptive weak-point engine (per-device, localStorage) ----------
  // trnStats = { anchor:{ "<label>":{correct,total} }, odds:{ "<bucket>":{...} }, track:{ "<scale>_<diff>":{...} } }
  function loadStats(){ try{ return JSON.parse(localStorage.getItem('potTrainerStats')||'{}'); }catch(e){ return {}; } }
  function saveStats(o){ try{ localStorage.setItem('potTrainerStats', JSON.stringify(o)); }catch(e){} }
  let trnStats = loadStats();

  function recordStat(cat, key, ok){
    if(!trnStats[cat]) trnStats[cat] = {};
    if(!trnStats[cat][key]) trnStats[cat][key] = { correct:0, total:0 };
    trnStats[cat][key].total++;
    if(ok) trnStats[cat][key].correct++;
    saveStats(trnStats);
  }
  // Laplace-smoothed error rate: unseen buckets start neutral (0.5), buckets
  // with a worse track record get a higher weight (picked more often).
  function weaknessWeight(stat){
    const c = stat?.correct||0, t = stat?.total||0;
    return (t - c + 1) / (t + 2);
  }
  function weightedPick(weights){
    const sum = weights.reduce((a,b)=>a+b,0);
    let r = Math.random()*sum;
    for(let i=0;i<weights.length;i++){ r -= weights[i]; if(r<=0) return i; }
    return weights.length-1;
  }
  // Returns up to 3 weakest buckets with >=3 attempts, for the "insights" panel.
  function weakestBuckets(cat, labelFn){
    const stats = trnStats[cat]||{};
    return Object.entries(stats)
      .filter(([,v])=>v.total>=3)
      .map(([k,v])=>({ label: labelFn(k), acc: Math.round(v.correct/v.total*100), total:v.total }))
      .sort((a,b)=>a.acc-b.acc)
      .slice(0,3);
  }
  function renderInsights(elId, cat, labelFn){
    const el = $(elId); if(!el) return;
    const weak = weakestBuckets(cat, labelFn);
    if(!weak.length){ el.setAttribute('data-trn-hidden',''); return; }
    el.removeAttribute('data-trn-hidden');
    el.innerHTML = '<div class="trn-ins-title">🎯 הנקודות החלשות שלך (לפי ההיסטוריה במכשיר הזה)</div>' +
      weak.map(w=>'<div class="trn-ins-row"><span>'+w.label+'</span><b class="trn-num">'+w.acc+'%</b></div>').join('');
  }

  let currentMode = 'track';
  let session = null;

  const NAMES = ['עידן','ביאנה','בנדוס','איתן','אלי','דורון','יעל','נועה','גיא','רועי','שירה','אורי','טל','מאיה'];
  function shuffled(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function roundTo(n, step){ return Math.max(step, Math.round(n/step)*step); }
  function fmt(n){ return '₪'+Math.round(n).toLocaleString('en-US'); }
  const $ = id => document.getElementById(id);

  // ===== TRACK MODE =====
  const trackCfg = { diff:'easy', pace:'manual', scale:'small', adaptive:'on' };
  const TRACK_COMBOS = [
    { scale:'small', diff:'easy' }, { scale:'small', diff:'hard' },
    { scale:'big',   diff:'easy' }, { scale:'big',   diff:'hard' },
  ];
  function trackBucketKey(scale, diff){ return scale+'_'+diff; }
  function trackBucketLabel(key){
    const [scale,diff] = key.split('_');
    return (scale==='big'?'צ׳יפים גדולים':'צ׳יפים קטנים')+' · '+(diff==='hard'?'מציאותי':'קל');
  }
  // When adaptive is on, pick the scale/diff combo for the NEXT hand by weakness
  // instead of using the manual seg buttons directly (the buttons still show
  // what was picked, so the person sees why).
  function pickTrackCombo(){
    if(trackCfg.adaptive!=='on') return { scale:trackCfg.scale, diff:trackCfg.diff };
    const weights = TRACK_COMBOS.map(c=> weaknessWeight(trnStats.track?.[trackBucketKey(c.scale,c.diff)]));
    const idx = weightedPick(weights);
    return TRACK_COMBOS[idx];
  }

  function buildHand(cfg){
    const scale = cfg.scale==='big'
      ? { step:500, sbRange:[100,300], betMin:500 }
      : { step:100, sbRange:[25,100], betMin:100 };
    const numPlayers = 2 + Math.floor(Math.random()*5);
    const names = shuffled(NAMES).slice(0, numPlayers);
    let pot = 0;
    const events = [];
    function push(name, kind, delta, levelAfter){ pot += delta; events.push({ name, kind, delta, levelAfter, potAfter: pot }); }

    const sb = roundTo(scale.sbRange[0] + Math.random()*(scale.sbRange[1]-scale.sbRange[0]), scale.step/2 || 5);
    const bb = sb*2;
    push(names[0], 'blind', sb, sb);
    push(names[1], 'blind', bb, bb);

    const streets = ['פרה-פלופ','פלופ','טורן','ריבר'];
    let active = names.slice();

    streets.forEach((street, si)=>{
      if(active.length<2) return;
      events.push({street:true, name:street, isFirst: si===0});
      let level = si===0 ? bb : 0;
      const contrib = {}; active.forEach(n=>contrib[n]=0);
      if(si===0){ contrib[names[0]]=sb; contrib[names[1]]=bb; }
      // Action always moves seat-by-seat around the table (never a random jump):
      // preflop starts after the blinds (seat 3 / UTG), later streets start from
      // whichever active seat comes first after the button.
      const startIdx = (si===0 ? 2 : 0) % active.length;
      const order = active.slice(startIdx).concat(active.slice(0, startIdx));

      function playerAction(name, isSecondPass){
        if(active.indexOf(name)===-1) return;
        const myContrib = contrib[name]||0;
        if(level===0){
          if(Math.random()<0.5){ push(name, 'check', 0, myContrib); return; }
          const amt = roundTo(scale.betMin + Math.random()*(pot*0.9 + scale.betMin), scale.step);
          level = amt; contrib[name]=amt;
          push(name, 'bet', amt, amt);
        } else if(myContrib < level){
          const r = Math.random();
          if(r<0.18 && !isSecondPass){ active = active.filter(n=>n!==name); push(name, 'fold', 0, myContrib); return; }
          if(r<0.62 || isSecondPass){
            const delta = level - myContrib; contrib[name]=level;
            push(name, 'call', delta, level);
          } else {
            const to = roundTo(level*(1.8+Math.random()*1.4), scale.step);
            const delta = to - myContrib; contrib[name]=to; level = to;
            push(name, 'raise', delta, to);
          }
        }
      }
      order.forEach(n=>playerAction(n,false));
      active.slice().forEach(n=>{ if((contrib[n]||0) < level) playerAction(n,true); });
    });

    const actionIdxs = [];
    events.forEach((e,i)=>{ if(!e.street) actionIdxs.push(i); });
    const cpCount = Math.min(4, Math.max(2, Math.floor(actionIdxs.length/3)));
    const chosen = new Set();
    while(chosen.size < cpCount && chosen.size < actionIdxs.length-1){
      chosen.add(actionIdxs[1 + Math.floor(Math.random()*(actionIdxs.length-1))]);
    }
    chosen.forEach(idx=> events[idx].checkpoint = true);
    return { events, names, sb, bb };
  }

  function startTrackHand(){
    $('trn-track-settings').setAttribute('data-trn-hidden','');
    $('trn-summary').setAttribute('data-trn-hidden','');
    $('trn-track-play').removeAttribute('data-trn-hidden');
    $('trn-scorebar').removeAttribute('data-trn-hidden');
    const combo = pickTrackCombo();
    trackCfg.scale = combo.scale; trackCfg.diff = combo.diff;
    if(trackCfg.adaptive==='on'){
      // reflect the auto-picked combo in the seg buttons so it's not a silent switch
      ['trn-track-scale','trn-track-diff'].forEach(id=>{
        $(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.v===(id==='trn-track-scale'?combo.scale:combo.diff)));
      });
    }
    const hand = buildHand(trackCfg);
    session = { type:'track', hand, ptr:0, correct:0, total:0, streak:(session&&session.type==='track'?session.streak:0)||0, comboKey: trackBucketKey(combo.scale,combo.diff) };
    renderSeats(hand.names);
    $('trn-blinds-lbl').textContent = fmt(hand.sb)+' / '+fmt(hand.bb);
    $('trn-street-lbl').textContent = 'פרה-פלופ';
    // איפוס תצוגת הקופה במרכז השולחן — חוזרת ל"סמויה" ביד חדשה, גם אם
    // ביד הקודמת היא נחשפה בצ'ק-פוינט (ראו submitCheckpoint)
    $('trn-pot-center').innerHTML = 'קופה<br>סמויה';
    updateScorebar();
    advance();
  }

  let seatEls = {};
  function renderSeats(names){
    const wrap = $('trn-seats');
    wrap.innerHTML = '';
    seatEls = {};
    const n = names.length;
    names.forEach((name,i)=>{
      const angle = (-90 + i*(360/n)) * Math.PI/180;
      const left = 50 + 41*Math.cos(angle);
      const top = 50 + 40*Math.sin(angle);
      const seat = document.createElement('div');
      seat.className = 'trn-seat';
      seat.style.left = left+'%';
      seat.style.top = top+'%';
      seat.innerHTML = '<div class="trn-seat-name">'+name+'</div>'+
        '<div class="trn-seat-bet trn-num" data-trn-hidden></div>'+
        '<div class="trn-seat-tag" data-trn-hidden>קיפל</div>';
      wrap.appendChild(seat);
      seatEls[name] = seat;
    });
  }

  function advance(){
    const s = session;
    if(!s || s.type!=='track') return;
    if(s.ptr >= s.hand.events.length){ finishTrackHand(); return; }
    const ev = s.hand.events[s.ptr];
    if(ev.street){
      $('trn-street-lbl').textContent = ev.name;
      Object.values(seatEls).forEach(el=>{
        el.classList.remove('trn-acting');
        // רק במעבר סטריט אמיתי (פלופ/טרן/ריבר) מנקים את הצ'יפים שהוצגו —
        // הכסף "נבלע" לתוך הקופה הסמויה. במעבר הראשון (תחילת פרה-פלופ, מיד
        // אחרי הבליינדים) אין שום סיבוב הימורים קודם שצריך "לפנות" — הצ'יפים
        // שהוצגו הם הבליינדים עצמם, ועדיין רלוונטיים לסיבוב הנוכחי.
        if(!ev.isFirst){
          const bet = el.querySelector('.trn-seat-bet');
          bet.setAttribute('data-trn-hidden',''); bet.textContent='';
        }
      });
      s.ptr++; autoOrManual(); return;
    }

    Object.values(seatEls).forEach(el=>el.classList.remove('trn-acting'));
    const seat = seatEls[ev.name];
    if(seat){
      seat.classList.add('trn-acting');
      const betEl = seat.querySelector('.trn-seat-bet');
      const tagEl = seat.querySelector('.trn-seat-tag');
      if(ev.kind==='fold'){
        seat.classList.add('trn-folded');
        tagEl.removeAttribute('data-trn-hidden');
      } else if(ev.kind!=='check'){
        betEl.textContent = trackCfg.diff==='easy' ? '+'+fmt(ev.delta) : fmt(ev.levelAfter);
        betEl.removeAttribute('data-trn-hidden');
      }
    }

    const isCheckpoint = !!ev.checkpoint;
    s.ptr++;
    if(isCheckpoint){ setTimeout(()=> showCheckpoint(ev.potAfter), trackCfg.pace==='manual'?200:400); }
    else autoOrManual();
  }

  function autoOrManual(){
    const tapBtn = $('trn-tap-next');
    if(trackCfg.pace==='manual'){
      tapBtn.removeAttribute('data-trn-hidden');
      tapBtn.onclick = ()=>{ tapBtn.setAttribute('data-trn-hidden',''); advance(); };
    } else {
      tapBtn.setAttribute('data-trn-hidden','');
      setTimeout(advance, parseInt(trackCfg.pace,10));
    }
  }

  function showCheckpoint(correctPot){
    $('trn-tap-next').setAttribute('data-trn-hidden','');
    const cp = $('trn-checkpoint');
    cp.removeAttribute('data-trn-hidden');
    $('trn-cp-question').textContent = 'כמה יש בקופה כרגע?';
    const input = $('trn-cp-input');
    input.value=''; input.focus();
    cp._correct = correctPot;
    $('trn-cp-timerwrap').setAttribute('data-trn-hidden','');
    $('trn-cp-submit').onclick = ()=> submitCheckpoint();
    input.onkeydown = (e)=>{ if(e.key==='Enter') submitCheckpoint(); };
  }

  function submitCheckpoint(){
    const cp = $('trn-checkpoint');
    const input = $('trn-cp-input');
    const val = Number(input.value);
    const correct = cp._correct;
    const ok = !isNaN(val) && val === correct;
    cp.setAttribute('data-trn-hidden','');
    // אחרי צ'ק-פוינט, משאירים את סכום הקופה האמיתי גלוי במרכז השולחן (במקום
    // לחזור ל"קופה סמויה") — כדי שלא יהיה צורך לזכור אותו בעל פה עד היד הבאה.
    // מתאפס בחזרה רק ביד חדשה (startTrackHand).
    $('trn-pot-center').innerHTML = '<b class="trn-num" style="font-size:15px;color:var(--trn-gold-soft)">'+fmt(correct)+'</b><br>קופה';
    showFeedback(ok, correct, val, ()=>{ advance(); });
    registerResult(ok);
    if(session?.comboKey) recordStat('track', session.comboKey, ok);
  }

  function showFeedback(ok, correct, given, onContinue){
    const fb = $('trn-feedback');
    fb.removeAttribute('data-trn-hidden');
    fb.className = 'trn-card trn-feedback '+(ok?'trn-ok':'trn-bad');
    $('trn-fb-verdict').textContent = ok ? '✓ נכון!' : '✗ לא מדויק';
    $('trn-fb-detail').innerHTML = ok
      ? 'הקופה האמיתית היא <b class="trn-num">'+fmt(correct)+'</b>'
      : 'ענית <b class="trn-num">'+(isNaN(given)?'—':fmt(given))+'</b> · הקופה האמיתית היא <b class="trn-num">'+fmt(correct)+'</b>';
    $('trn-fb-continue').onclick = ()=>{ fb.setAttribute('data-trn-hidden',''); onContinue(); };
  }

  function registerResult(ok){
    const s = session;
    s.total++;
    if(ok){ s.correct++; s.streak++; } else { s.streak=0; }
    if(!bestScores[s.type] || s.streak > bestScores[s.type]){ bestScores[s.type]=s.streak; saveBest(bestScores); }
    updateScorebar();
  }

  function updateScorebar(){
    const s = session; if(!s) return;
    $('trn-sb-streak').textContent = s.streak;
    $('trn-sb-best').textContent = bestScores[s.type]||0;
    $('trn-sb-acc').textContent = s.total ? Math.round(s.correct/s.total*100)+'%' : '—';
  }

  function finishTrackHand(){
    $('trn-track-play').setAttribute('data-trn-hidden','');
    const sum = $('trn-summary');
    sum.removeAttribute('data-trn-hidden');
    $('trn-sum-title').textContent = 'סיכום היד';
    const s = session;
    $('trn-sum-big').textContent = (s.total? Math.round(s.correct/s.total*100):100)+'%';
    $('trn-sum-grid').innerHTML =
      '<div class="trn-cell"><b class="trn-num">'+s.correct+'/'+s.total+'</b><span>תשובות נכונות</span></div>'+
      '<div class="trn-cell"><b class="trn-num">'+s.streak+'</b><span>רצף נוכחי</span></div>';
    $('trn-sum-again').onclick = startTrackHand;
    $('trn-sum-settings').onclick = ()=>{ sum.setAttribute('data-trn-hidden',''); $('trn-track-settings').removeAttribute('data-trn-hidden'); renderInsights('trn-track-insights','track',trackBucketLabel); };
  }

  // ===== ODDS MODE =====
  const oddsCfg = { diff:'round', time:0, adaptive:'on' };
  let oddsTimerHandle = null;
  const ODDS_BUCKETS = [10,20,30,40,50,60,70]; // upper bound of each 10-wide bucket, covers the ~9%-70% range this mode can generate
  function oddsBucketKey(pct){
    for(const upper of ODDS_BUCKETS) if(pct < upper) return (upper-10)+'-'+upper;
    return '70+';
  }
  function oddsBucketLabel(key){ return key==='70+' ? 'מעל 70%' : key+'%'; }

  function startOddsSession(){
    $('trn-odds-settings').setAttribute('data-trn-hidden','');
    $('trn-odds-play').removeAttribute('data-trn-hidden');
    $('trn-scorebar').removeAttribute('data-trn-hidden');
    $('trn-summary').setAttribute('data-trn-hidden','');
    session = { type:'odds', correct:0, total:0, streak:(session&&session.type==='odds'?session.streak:0)||0, rounds:10, roundNum:0 };
    updateScorebar();
    nextOdds();
  }

  function genOddsScenario(){
    let pot, call;
    if(oddsCfg.adaptive==='on'){
      // Pick a target %-bucket by weakness, then build a pot/call pair whose
      // real percentage lands inside that bucket.
      const weights = ODDS_BUCKETS.map(upper=> weaknessWeight(trnStats.odds?.[(upper-10)+'-'+upper]));
      const bIdx = weightedPick(weights);
      const upper = ODDS_BUCKETS[bIdx], lower = upper-10;
      const targetPct = lower + Math.random()*10;
      const ratio = targetPct/(100-targetPct); // call/pot
      pot = oddsCfg.diff==='round' ? roundTo(200+Math.random()*9800, 100) : Math.round(150+Math.random()*12000);
      call = oddsCfg.diff==='round' ? roundTo(pot*ratio, 100) : Math.round(pot*ratio);
      if(call<1) call = oddsCfg.diff==='round' ? 100 : 1;
    } else if(oddsCfg.diff==='round'){ pot = roundTo(200+Math.random()*9800, 100); call = roundTo(100+Math.random()*pot*0.8, 100); }
    else { pot = Math.round(150+Math.random()*12000); call = Math.round(80+Math.random()*pot*0.9); }
    return { pot, call, pct: call/(pot+call)*100 };
  }

  function nextOdds(){
    const s = session;
    if(!s || s.type!=='odds') return;
    if(s.roundNum >= s.rounds){ finishOdds(); return; }
    s.roundNum++;
    const sc = genOddsScenario();
    s.current = sc;
    $('trn-po-pot').textContent = fmt(sc.pot);
    $('trn-po-call').textContent = fmt(sc.call);
    const cp = $('trn-checkpoint');
    cp.removeAttribute('data-trn-hidden');
    $('trn-cp-question').textContent = 'איזה אחוז זכייה (%) אתה צריך?';
    const input = $('trn-cp-input');
    input.value=''; input.placeholder='%'; input.focus();
    cp._correct = sc.pct;
    $('trn-cp-submit').onclick = ()=> submitOdds();
    input.onkeydown = (e)=>{ if(e.key==='Enter') submitOdds(); };

    const timeLimit = parseInt(oddsCfg.time,10);
    const wrap = $('trn-cp-timerwrap'); const bar = $('trn-cp-timer');
    clearTimeout(oddsTimerHandle);
    if(timeLimit>0){
      wrap.removeAttribute('data-trn-hidden');
      bar.style.transform='scaleX(1)'; bar.style.transition='none';
      requestAnimationFrame(()=>{ bar.style.transition='transform '+timeLimit+'s linear'; bar.style.transform='scaleX(0)'; });
      oddsTimerHandle = setTimeout(()=>{ if(!cp.hasAttribute('data-trn-hidden')) submitOdds(true); }, timeLimit*1000);
    } else { wrap.setAttribute('data-trn-hidden',''); }
  }

  function submitOdds(timedOut){
    clearTimeout(oddsTimerHandle);
    const cp = $('trn-checkpoint');
    const input = $('trn-cp-input');
    const val = timedOut ? NaN : parseFloat(input.value);
    const correct = cp._correct;
    const ok = !timedOut && !isNaN(val) && Math.abs(val-correct) <= 1;
    cp.setAttribute('data-trn-hidden','');
    const fb = $('trn-feedback');
    fb.removeAttribute('data-trn-hidden');
    fb.className = 'trn-card trn-feedback '+(ok?'trn-ok':'trn-bad');
    $('trn-fb-verdict').textContent = timedOut ? '⏱ נגמר הזמן' : (ok?'✓ נכון!':'✗ לא מדויק');
    $('trn-fb-detail').innerHTML =
      (timedOut?'':'ענית <b class="trn-num">'+(isNaN(val)?'—':val.toFixed(1)+'%')+'</b> · ')+
      'התשובה: <b class="trn-num">'+correct.toFixed(1)+'%</b> — נוסחה: <span class="trn-num">להשלים ÷ (קופה+להשלים) × 100</span>';
    $('trn-fb-continue').onclick = ()=>{ fb.setAttribute('data-trn-hidden',''); nextOdds(); };
    registerResult(ok);
    if(!timedOut || cp._correct!=null) recordStat('odds', oddsBucketKey(correct), ok);
  }

  function finishOdds(){
    $('trn-odds-play').setAttribute('data-trn-hidden','');
    const sum = $('trn-summary');
    sum.removeAttribute('data-trn-hidden');
    const s = session;
    $('trn-sum-title').textContent = 'סיכום תרגול';
    $('trn-sum-big').textContent = (s.total? Math.round(s.correct/s.total*100):100)+'%';
    $('trn-sum-grid').innerHTML =
      '<div class="trn-cell"><b class="trn-num">'+s.correct+'/'+s.total+'</b><span>תשובות נכונות</span></div>'+
      '<div class="trn-cell"><b class="trn-num">'+s.streak+'</b><span>רצף נוכחי</span></div>';
    $('trn-sum-again').onclick = startOddsSession;
    $('trn-sum-settings').onclick = ()=>{ sum.setAttribute('data-trn-hidden',''); $('trn-odds-settings').removeAttribute('data-trn-hidden'); renderInsights('trn-odds-insights','odds',oddsBucketLabel); };
  }

  // ===== ANCHOR RATIO MODE =====
  const anchorCfg = { scale:'round', adaptive:'on', diff:'intro' };
  const ANCHORS = [
    { label:'1:1',   pct:50 }, { label:'1.5:1', pct:40 }, { label:'2:1', pct:33.3 },
    { label:'2.5:1', pct:28.6 }, { label:'3:1', pct:25 }, { label:'4:1', pct:20 },
    { label:'5:1',   pct:16.7 }, { label:'6:1', pct:14.3 }, { label:'8:1', pct:11.1 }, { label:'10:1', pct:9.1 },
  ];
  // exact call/pot fraction for each anchor, used to build "intro" scenarios
  // whose numbers land exactly on the ratio (no estimation needed).
  const ANCHOR_FRACS = {
    '1:1':[1,1], '1.5:1':[2,3], '2:1':[1,2], '2.5:1':[2,5], '3:1':[1,3],
    '4:1':[1,4], '5:1':[1,5], '6:1':[1,6], '8:1':[1,8], '10:1':[1,10],
  };

  function renderAnchorGrid(){
    const grid = $('trn-anchor-grid');
    grid.innerHTML = '';
    ANCHORS.forEach((a, idx)=>{
      const btn = document.createElement('div');
      btn.className = 'trn-anchor-btn';
      btn.innerHTML = '<span class="trn-r trn-num">'+a.label+'</span><span class="trn-p trn-num">~'+(a.pct%1===0?a.pct:a.pct.toFixed(1))+'%</span>';
      btn.onclick = ()=> chooseAnchor(idx);
      grid.appendChild(btn);
    });
  }

  function genIntroAnchorScenario(){
    let targetIdx;
    if(anchorCfg.adaptive==='on'){
      const weights = ANCHORS.map(a => weaknessWeight(trnStats.anchor?.[a.label]));
      targetIdx = weightedPick(weights);
    } else {
      targetIdx = Math.floor(Math.random()*ANCHORS.length);
    }
    const [num, den] = ANCHOR_FRACS[ANCHORS[targetIdx].label];
    const bases = [100,200,500,1000];
    const base = bases[Math.floor(Math.random()*bases.length)];
    const k = 1 + Math.floor(Math.random()*3); // 1..3, keeps numbers small & clean
    const pot = den*k*base;
    const call = num*k*base;
    const pct = call/(pot+call)*100;
    return { pot, call, pct, ratio: pot/call, correctIdx: targetIdx };
  }

  function genAnchorScenario(){
    if(anchorCfg.diff==='intro') return genIntroAnchorScenario();
    let pot, call;
    if(anchorCfg.adaptive==='on'){
      // Pick a target anchor by weakness, then build a pot/call pair that
      // actually lands nearest that anchor (small jitter for variety).
      const weights = ANCHORS.map(a => weaknessWeight(trnStats.anchor?.[a.label]));
      const targetIdx = weightedPick(weights);
      const jitter = (Math.random()-0.5)*3; // ± up to 1.5 pct points
      const targetPct = Math.min(55, Math.max(7, ANCHORS[targetIdx].pct + jitter));
      const ratio = targetPct/(100-targetPct); // call/pot
      pot = anchorCfg.scale==='round' ? roundTo(300+Math.random()*9700, 100) : Math.round(200+Math.random()*12000);
      call = anchorCfg.scale==='round' ? roundTo(pot*ratio, 100) : Math.round(pot*ratio);
      if(call<1) call = anchorCfg.scale==='round' ? 100 : 1;
    } else if(anchorCfg.scale==='round'){ pot = roundTo(300+Math.random()*9700, 100); call = roundTo(pot*0.09 + Math.random()*pot*0.9, 100); }
    else { pot = Math.round(200+Math.random()*12000); call = Math.round(pot*0.09 + Math.random()*pot*0.9); }
    const pct = call/(pot+call)*100;
    let best = 0, bestDiff = Infinity;
    ANCHORS.forEach((a,idx)=>{ const d=Math.abs(a.pct-pct); if(d<bestDiff){ bestDiff=d; best=idx; } });
    return { pot, call, pct, ratio: pot/call, correctIdx: best };
  }

  function startAnchorSession(){
    $('trn-anchor-settings').setAttribute('data-trn-hidden','');
    $('trn-anchor-play').removeAttribute('data-trn-hidden');
    $('trn-scorebar').removeAttribute('data-trn-hidden');
    $('trn-summary').setAttribute('data-trn-hidden','');
    session = { type:'anchor', correct:0, total:0, streak:(session&&session.type==='anchor'?session.streak:0)||0, rounds:10, roundNum:0 };
    renderAnchorGrid();
    updateScorebar();
    nextAnchor();
  }

  function nextAnchor(){
    const s = session;
    if(!s || s.type!=='anchor') return;
    if(s.roundNum >= s.rounds){ finishAnchor(); return; }
    s.roundNum++;
    const sc = genAnchorScenario();
    s.current = sc;
    $('trn-an-pot').textContent = fmt(sc.pot);
    $('trn-an-call').textContent = fmt(sc.call);
    document.querySelectorAll('#trn-anchor-grid .trn-anchor-btn').forEach(b=>{ b.classList.remove('trn-correct','trn-wrong'); b.style.pointerEvents=''; });
  }

  function chooseAnchor(idx){
    const s = session;
    if(!s || s.type!=='anchor' || !s.current) return;
    const sc = s.current;
    const ok = idx === sc.correctIdx;
    const btns = document.querySelectorAll('#trn-anchor-grid .trn-anchor-btn');
    btns.forEach(b=>b.style.pointerEvents='none');
    btns[idx].classList.add(ok?'trn-correct':'trn-wrong');
    if(!ok) btns[sc.correctIdx].classList.add('trn-correct');
    registerResult(ok);
    recordStat('anchor', ANCHORS[sc.correctIdx].label, ok);
    setTimeout(()=>{
      const fb = $('trn-feedback');
      fb.removeAttribute('data-trn-hidden');
      fb.className = 'trn-card trn-feedback '+(ok?'trn-ok':'trn-bad');
      $('trn-fb-verdict').textContent = ok ? '✓ נכון!' : '✗ לא מדויק';
      $('trn-fb-detail').innerHTML =
        'יחס אמיתי: <b class="trn-num">'+sc.ratio.toFixed(2)+':1</b> · אחוז מדויק: <b class="trn-num">'+sc.pct.toFixed(1)+'%</b> · עוגן הכי קרוב: <b class="trn-num">'+ANCHORS[sc.correctIdx].label+'</b>';
      $('trn-fb-continue').onclick = ()=>{ fb.setAttribute('data-trn-hidden',''); nextAnchor(); };
    }, 400);
  }

  function finishAnchor(){
    $('trn-anchor-play').setAttribute('data-trn-hidden','');
    const sum = $('trn-summary');
    sum.removeAttribute('data-trn-hidden');
    const s = session;
    $('trn-sum-title').textContent = 'סיכום תרגול';
    $('trn-sum-big').textContent = (s.total? Math.round(s.correct/s.total*100):100)+'%';
    $('trn-sum-grid').innerHTML =
      '<div class="trn-cell"><b class="trn-num">'+s.correct+'/'+s.total+'</b><span>תשובות נכונות</span></div>'+
      '<div class="trn-cell"><b class="trn-num">'+s.streak+'</b><span>רצף נוכחי</span></div>';
    $('trn-sum-again').onclick = startAnchorSession;
    $('trn-sum-settings').onclick = ()=>{ sum.setAttribute('data-trn-hidden',''); $('trn-anchor-settings').removeAttribute('data-trn-hidden'); renderInsights('trn-anchor-insights','anchor',k=>k); };
  }

  // ===== UI wiring =====
  function bindSeg(containerId, cfgObj, cfgKey){
    const c = $(containerId);
    c.querySelectorAll('button').forEach(btn=>{
      btn.onclick = ()=>{
        c.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
        btn.classList.add('on');
        cfgObj[cfgKey] = btn.dataset.v;
      };
    });
  }
  bindSeg('trn-track-diff', trackCfg, 'diff');
  bindSeg('trn-track-pace', trackCfg, 'pace');
  bindSeg('trn-track-scale', trackCfg, 'scale');
  bindSeg('trn-track-adaptive', trackCfg, 'adaptive');
  bindSeg('trn-odds-diff', oddsCfg, 'diff');
  bindSeg('trn-odds-time', oddsCfg, 'time');
  bindSeg('trn-odds-adaptive', oddsCfg, 'adaptive');
  bindSeg('trn-anchor-scale', anchorCfg, 'scale');
  bindSeg('trn-anchor-adaptive', anchorCfg, 'adaptive');
  bindSeg('trn-anchor-diff', anchorCfg, 'diff');
  function syncAnchorScaleVisibility(){
    $('trn-anchor-scale-field').style.opacity = anchorCfg.diff==='intro' ? '0.4' : '1';
    $('trn-anchor-scale-field').style.pointerEvents = anchorCfg.diff==='intro' ? 'none' : '';
  }
  $('trn-anchor-diff').querySelectorAll('button').forEach(b=> b.addEventListener('click', syncAnchorScaleVisibility));
  syncAnchorScaleVisibility();

  renderInsights('trn-track-insights', 'track', trackBucketLabel);
  renderInsights('trn-odds-insights', 'odds', oddsBucketLabel);
  renderInsights('trn-anchor-insights', 'anchor', k=>k);

  $('trn-track-start').onclick = startTrackHand;
  $('trn-odds-start').onclick = startOddsSession;
  $('trn-anchor-start').onclick = startAnchorSession;

  function switchTab(tab){
    currentMode = tab;
    $('trn-tab-track').classList.toggle('on', tab==='track');
    $('trn-tab-odds').classList.toggle('on', tab==='odds');
    $('trn-tab-anchor').classList.toggle('on', tab==='anchor');
    ['trn-track-settings','trn-track-play','trn-odds-settings','trn-odds-play','trn-anchor-settings','trn-anchor-play','trn-summary','trn-checkpoint','trn-feedback'].forEach(id=>{
      $(id).setAttribute('data-trn-hidden','');
    });
    $('trn-scorebar').setAttribute('data-trn-hidden','');
    if(tab==='track') $('trn-track-settings').removeAttribute('data-trn-hidden');
    else if(tab==='odds') $('trn-odds-settings').removeAttribute('data-trn-hidden');
    else $('trn-anchor-settings').removeAttribute('data-trn-hidden');
    session = null;
  }
  $('trn-tab-track').onclick = ()=>switchTab('track');
  $('trn-tab-odds').onclick = ()=>switchTab('odds');
  $('trn-tab-anchor').onclick = ()=>switchTab('anchor');
}

// ---------- public entry points (called from index.html) ----------
window.showPotTrainer = function(){
  trnEnsureBuilt();
  const settingsBox = document.getElementById('settings-box');
  if(settingsBox) settingsBox.style.display = 'none';
  document.getElementById('trainer-modal').style.display = 'flex';
};
window.hidePotTrainer = function(){
  document.getElementById('trainer-modal').style.display = 'none';
};

})();
