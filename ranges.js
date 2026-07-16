// ═══════════════════════════════════════════════════════════════
// ranges.js — כל נתוני טווחי הפוקר (GTO/סולבר) ופונקציות העזר שלהם
// ═══════════════════════════════════════════════════════════════
// הוצא מ-render.js (2026-07-12) כדי לא לנפח קובץ UI עם נתוני טווחים
// שממשיכים לגדול (עוד עמדות/עומקים ממקורות סולבר). כל התוכן כאן גלובלי,
// בדיוק כמו קודם — אין import/export, נטען כ-<script> רגיל לפני render.js.
//
// מבנה: _RANGES[tableSize][stackDepth][position][action]
// stackDepth: 'deep' (75BB+), 'mid' (35-74BB), 'short' (20-34BB), 'push' (<20BB)

const _RANGES = {
  6: {
    deep: { // 75BB+ — פתיחות 2.5-3x, ranges מלאים לפי solver
      'BTN/SB':{
        // ראש-בראש: הכפתור/סמול פותח רחב מאוד. נוצר מ-_HAND_RANKING (top X%)
        RFI: 'AA,KK,QQ,JJ,TT,99,88,AQs,AKs,77,ATs,AKo,AJs,AQo,A9s,66,KQs,AJo,ATo,A8s,A7s,KJs,KTs,A9o,KQo,KJo,A8o,A6s,QJs,55,A5s,K8s,Q9s,A7o,A4s,KTo,QTs,K9s,A4o,A5o,QJo,J9s,K9o,A3s,K7s,A2s,K5s,44,K6s,JTs,A6o,K8o,K3s,QTo,K4s,A3o,Q8s,J8s,K7o,Q7s,Q9o,A2o,33,Q8o,K2s,T9s,K5o,K4o,Q5s,JTo,K6o,J9o,Q4s,J7s,Q7o,98s,Q3s,T8s,T9o,Q6s,K2o,Q2s,J8o,T7s,Q5o,K3o,J5s,22,Q6o,J6s,J4s,T6s,T8o,Q4o,97s,J6o,J3s,J7o,J2s,Q3o,87s,T7o,96s,Q2o,98o,T5s,97o,J5o,J4o,T4s,86s,T6o,95s,T3s,T2s,96o,87o,76s,J3o,J2o,95o,94s,T4o,93s,85s,75s,T3o,86o,T5o,65s,76o,54s,T2o,84s,74s,92s,64s,65o,94o,93o,85o,75o,83s,82s,73s,63s,72s,43s,52s,53s,62s,42s,32s',
      },
      BTN:{
        // מעודכן לפי מקורות סולבר עדכניים (100BB, 6-max): ~43% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,JTs,J9s,J8s,J7s,J6s,J5s,J4s,T9s,T8s,T7s,T6s,98s,97s,96s,87s,86s,85s,76s,75s,65s,64s,54s,53s,AKo,AQo,AJo,ATo,A9o,A8o,A7o,A6o,A5o,A4o,KQo,KJo,KTo,K9o,K8o,QJo,QTo,Q9o,JTo,J9o,T9o,T8o,98o',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AJs,AKo,AQo,A5s,A4s,A3s,A2s,KQs,98s,87s,76s',
        call:  'TT,99,88,77,66,ATs,A9s,A8s,KJs,KTs,K9s,QJs,QTs,Q9s,JTs,J9s,T9s,AJo,ATo,KQo,KJo',
        '4bet': 'AA,KK,QQ,AKs,AKo,A5s,A4s',
      },
      CO:{
        // מעודכן לפי מקורות סולבר עדכניים (100BB, 6-max): ~28% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,QJs,QTs,Q9s,Q8s,Q7s,Q6s,JTs,J9s,J8s,T9s,T8s,T7s,98s,97s,87s,76s,AKo,AQo,AJo,ATo,A9o,A8o,KQo,KJo,KTo,QJo,QTo,JTo',
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
        // מעודכן לפי מקורות סולבר עדכניים (100BB, 6-max): ~21% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,QJs,QTs,Q9s,JTs,J9s,T9s,98s,87s,76s,AKo,AQo,AJo,ATo,KQo,KJo,KTo,QJo,QTo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s,A4s',
        call:  'TT,99,88,AQs,AJs,ATs,KQs,KJs,QJs,JTs,AQo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo',
      },
      UTG:{
        // מעודכן לפי מקורות סולבר עדכניים (100BB, 6-max): ~17% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,KQs,KJs,KTs,K9s,K8s,QJs,QTs,Q9s,JTs,J9s,T9s,AKo,AQo,AJo,ATo,KQo,KJo,QJo',
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
      'BTN/SB':{
        // ראש-בראש: הכפתור/סמול פותח רחב מאוד. נוצר מ-_HAND_RANKING (top X%)
        RFI: 'AA,KK,QQ,JJ,TT,99,88,AQs,AKs,77,ATs,AKo,AJs,AQo,A9s,66,KQs,AJo,ATo,A8s,A7s,KJs,KTs,A9o,KQo,KJo,A8o,A6s,QJs,55,A5s,K8s,Q9s,A7o,A4s,KTo,QTs,K9s,A4o,A5o,QJo,J9s,K9o,A3s,K7s,A2s,K5s,44,K6s,JTs,A6o,K8o,K3s,QTo,K4s,A3o,Q8s,J8s,K7o,Q7s,Q9o,A2o,33,Q8o,K2s,T9s,K5o,K4o,Q5s,JTo,K6o,J9o,Q4s,J7s,Q7o,98s,Q3s,T8s,T9o,Q6s,K2o,Q2s,J8o,T7s,Q5o,K3o,J5s,22,Q6o,J6s,J4s,T6s,T8o,Q4o,97s,J6o,J3s,J7o,J2s,Q3o,87s,T7o,96s,Q2o,98o,T5s,97o,J5o,J4o,T4s,86s,T6o,95s,T3s,T2s,96o,87o,76s,J3o,J2o,95o,94s,T4o,93s,85s,75s,T3o,86o,T5o,65s,76o',
      },
      BTN:{
        // מעודכן: ~38% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,JTs,J9s,J8s,J7s,J6s,T9s,T8s,T7s,T6s,98s,97s,96s,87s,86s,85s,76s,75s,65s,64s,54s,AKo,AQo,AJo,ATo,A9o,A8o,A7o,A6o,KQo,KJo,KTo,K9o,QJo,QTo,Q9o,JTo,J9o,T9o,98o',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s,A4s,KQs',
        call:  'TT,99,88,77,AJs,ATs,KJs,QJs,JTs,T9s,AJo,KQo',
        '4bet': 'AA,KK,QQ,AKs,AKo',
      },
      CO:{
        // מעודכן: ~25% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,QJs,QTs,Q9s,Q8s,Q7s,JTs,J9s,J8s,T9s,T8s,98s,97s,87s,76s,AKo,AQo,AJo,ATo,A9o,KQo,KJo,KTo,QJo,QTo',
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
        // מעודכן: ~19% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,QJs,QTs,Q9s,JTs,J9s,T9s,98s,87s,AKo,AQo,AJo,ATo,KQo,KJo,KTo,QJo',
        '3bet': 'AA,KK,QQ,AKs,AKo,A5s',
        call:  'JJ,TT,AQs,AJs,KQs,AQo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      UTG:{
        // מעודכן: ~15% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,KQs,KJs,KTs,K9s,QJs,QTs,Q9s,JTs,J9s,T9s,AKo,AQo,AJo,ATo,KQo,KJo',
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
      'BTN/SB':{
        // ראש-בראש: הכפתור/סמול פותח רחב מאוד. נוצר מ-_HAND_RANKING (top X%)
        RFI: 'AA,KK,QQ,JJ,TT,99,88,AQs,AKs,77,ATs,AKo,AJs,AQo,A9s,66,KQs,AJo,ATo,A8s,A7s,KJs,KTs,A9o,KQo,KJo,A8o,A6s,QJs,55,A5s,K8s,Q9s,A7o,A4s,KTo,QTs,K9s,A4o,A5o,QJo,J9s,K9o,A3s,K7s,A2s,K5s,44,K6s,JTs,A6o,K8o,K3s,QTo,K4s,A3o,Q8s,J8s,K7o,Q7s,Q9o,A2o,33,Q8o,K2s,T9s,K5o,K4o,Q5s,JTo,K6o,J9o,Q4s,J7s,Q7o,98s,Q3s,T8s,T9o,Q6s,K2o,Q2s,J8o,T7s,Q5o,K3o,J5s,22,Q6o,J6s,J4s,T6s,T8o,Q4o,97s,J6o,J3s,J7o,J2s,Q3o,87s,T7o,96s,Q2o,98o,T5s,97o,J5o,J4o,T4s,86s,T6o,95s,T3s,T2s,96o',
      },
      BTN:{
        // מעודכן: ~25% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,QJs,QTs,Q9s,Q8s,JTs,J9s,J8s,T9s,T8s,98s,97s,87s,76s,AKo,AQo,AJo,ATo,A9o,A8o,KQo,KJo,KTo,QJo,QTo',
        '3bet': 'AA,KK,QQ,JJ,AKs,AQs,AKo,AQo,A5s',
        call:  'TT,99,88,AJs,KQs,QJs,JTs,AJo,KQo',
        '4bet': 'AA,KK,AKs,AKo',
      },
      CO:{
        // מעודכן: ~18% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,QJs,QTs,Q9s,JTs,J9s,T9s,98s,87s,AKo,AQo,AJo,ATo,KQo,KJo',
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
        // מעודכן: ~13% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,KQs,KJs,KTs,K9s,QJs,QTs,JTs,T9s,98s,AKo,AQo,AJo,KQo',
        '3bet': 'AA,KK,QQ,AKs,AKo',
        call:  'JJ,TT,AQs,KQs',
        '4bet': 'AA,KK,AKs,AKo',
      },
      UTG:{
        // מעודכן: ~12% מהידיים
        RFI: 'AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,ATs,A9s,A8s,KQs,KJs,KTs,K9s,QJs,QTs,JTs,T9s,AKo,AQo,AJo,ATo,KQo',
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
// דלי 'midlow' (35-54BB) חדש — פיצול של ה-'mid' הישן (35-74BB, טווח רחב מדי,
// 60bb ו-40bb קיבלו בעבר בדיוק אותו טווח). כרגע מאוכלס כעותק מפורש של 'mid'
// (55-74BB) כברירת מחדל — לא ממציאים נתונים ל-35-54 שאין לנו עדיין; ברגע
// שיגיעו נתוני סולבר אמיתיים לטווח הזה ספציפית, מחליפים כאן בדיוק כמו שנעשה
// למעלה עם 'mid'. ראו _depthFromBB לגבולות המדויקים.
_RANGES[6].midlow = JSON.parse(JSON.stringify(_RANGES[6].mid));

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

// דריסת RFI ב-mid (35-74BB) ל-7 עמדות, מבוסס סולבר אמיתי (PokerCoaching, Tournament
// 60BB — נופל בדיוק בתוך הדלי הזה). זו ההשלמה הראשונה של mid ל-9max שלא הייתה עותק
// גנרי של deep/6max — במיוחד עבור UTG+1/LJ שלא היה להן בכלל ייצוג ב-mid קודם.
// כולל רק RFI (הפעולה שיש לנו עליה נתוני סולבר אמיתיים); 3bet/call/4bet נשארים
// בכוונה לא-מוגדרים כאן ונופלים אוטומטית דרך _getRangeStrForDepth לטבלת ה-6max
// הקיימת (six[pos][action]) — לא צריך "להמציא" נתונים שאין לנו.
// תאי תדירות-מעורבת (למשל K7s ב-40% raise) הושמטו בכוונה — הלוח שלנו בוליאני
// (יש/אין), לא תומך בתדירות חלקית; זו הסיבה שהאחוזים כאן נמוכים מעט מהמוצג
// בתמונות המקור (למשל UTG כאן 15.1% מול 16.5% בתמונה — עקבי עם השיטה שהוחלט
// עליה במהלך כל השיחה, לא טעות).
Object.assign(_RANGES[9].mid, {
  UTG: { ..._RANGES[9].mid.UTG,
    RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,KQs,KJs,KTs,K9s,K8s,QJs,QTs,Q9s,JTs,J9s,T9s,T8s,AKo,AQo,AJo,ATo',
  },
  'UTG+1': { ..._RANGES[9].mid['UTG+1'],
    RFI: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,QJs,QTs,Q9s,JTs,J9s,J8s,T9s,T8s,98s,87s,AKo,AQo,AJo,ATo',
  },
  LJ: { ..._RANGES[9].mid.LJ,
    RFI: 'AA,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,AKo,KK,KQs,KJs,KTs,K9s,K8s,K7s,K6s,AQo,QQ,QJs,QTs,Q9s,AJo,JJ,JTs,J9s,J8s,ATo,TT,T9s,T8s,A9o,99,98s,88,87s,77,76s,66,65s,55,44,33',
  },
  HJ: { ..._RANGES[9].mid.HJ,
    RFI: 'AA,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,AKo,KK,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,AQo,KQo,QQ,QJs,QTs,Q9s,Q8s,AJo,KJo,QJo,JJ,JTs,J9s,J8s,ATo,KTo,QTo,JTo,TT,T9s,T8s,T7s,99,98s,97s,A8o,88,87s,77,76s,66,65s,55,44,33,22',
  },
  CO: { ..._RANGES[9].mid.CO,
    RFI: 'AA,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,AKo,KK,KQs,KJs,KTs,K9s,K8s,K7s,K6s,AQo,KQo,QQ,QJs,QTs,Q9s,Q8s,AJo,KJo,QJo,JJ,JTs,J9s,J8s,J7s,ATo,KTo,QTo,JTo,TT,T9s,T8s,T7s,T6s,99,98s,97s,96s,88,87s,86s,77,76s,75s,66,65s,55,54s,44,33,22',
  },
  BTN: { ..._RANGES[9].mid.BTN,
    RFI: 'AA,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,AKo,KK,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,AQo,KQo,QQ,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,Q2s,AJo,KJo,QJo,JJ,JTs,J9s,J8s,J7s,J6s,J5s,J4s,J3s,ATo,KTo,QTo,JTo,TT,T9s,T8s,T7s,T6s,T5s,T4s,T3s,A9o,K9o,Q9o,J9o,T9o,99,98s,97s,96s,95s,A8o,K8o,Q8o,J8o,T8o,98o,88,87s,86s,85s,A7o,K7o,T7o,87o,77,76s,75s,74s,73s,A6o,K6o,66,65s,64s,63s,A5o,K5o,55,54s,53s,52s,A4o,K4o,44,43s,42s,A3o,33,32s,A2o,22',
  },
  SB: { ..._RANGES[9].mid.SB,
    RFI: 'AA,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,AKo,KK,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,AQo,KQo,QQ,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,Q2s,AJo,KJo,QJo,JJ,JTs,J9s,J8s,J7s,J6s,J5s,J4s,J3s,J2s,ATo,KTo,QTo,JTo,TT,T9s,T8s,T7s,T6s,T5s,T4s,T3s,T2s,A9o,K9o,Q9o,J9o,T9o,99,98s,97s,96s,95s,94s,93s,92s,A8o,K8o,Q8o,J8o,T8o,98o,88,87s,86s,85s,84s,83s,82s,A7o,K7o,Q7o,J7o,T7o,97o,87o,77,76s,75s,74s,73s,72s,A6o,K6o,Q6o,J6o,T6o,96o,86o,76o,66,65s,64s,63s,62s,A5o,K5o,Q5o,J5o,T5o,95o,85o,75o,65o,55,54s,53s,52s,A4o,K4o,Q4o,J4o,T4o,64o,54o,44,43s,42s,A3o,K3o,Q3o,J3o,T3o,43o,33,32s,A2o,K2o,Q2o,J2o,22',
  },
});
// UTG מול 3bet, לפי-יריב-ספציפי (mid=55-74BB, 60bb נופל כאן) — מ-7 תרשימי
// GTOWizard (2026-07-14), אחד לכל 3-בטר אפשרי. סף 50%: יד נכנסת לטווח אם
// התדירות של הפעולה הרלוונטית ≥50% מהקומבינציות שלה (הוחלט מפורשות מול
// המשתמש; תאים מעורבים הוכרעו ידנית תא-תא, לא בהערכה חזותית). Allin מוזג
// לתוך 4bet (אין קטגוריית allin נפרדת בסכימה; שתיהן "ממשיך אגרסיבי" לצורך
// טווח-המשך). מחליף את ה-call/4bet ה"ישנים" הגנריים (JJ,TT / AA,KK,AKs)
// שהיו כאן קודם — אלה היו קירוב גס לפני שהיה נתון אמיתי לפי-יריב. מוגדר על
// _RANGES[9] כי _RANGES[7]/[8] מכוונים לאותו אובייקט ממש (הוחלט להשאיר כך
// בשלב זה — ראו CHANGELOG; יריב בעמדה שלא קיימת ב-8max, למשל MP האמיתי של
// 9max, נופל אוטומטית לאיחוד-כל-האפשרויות דרך _resolveOpponentRangeStr).
Object.assign(_RANGES[9].mid, {
  UTG: { ..._RANGES[9].mid.UTG,
    call: {
      'UTG+1': 'AQs,AJs,ATs,A5s,KQs,TT,JTs,99,88,76s,66,44,33,QQ,JJ,T9s',
      LJ:      'AQs,AJs,ATs,QJs,QTs,JTs,J9s,TT,99,88,76s,66,44,33,KTs,KJs,A9s,55,77,JJ,QQ,AQo,T9s',
      HJ:      'AQs,AJs,ATs,KQs,QJs,QTs,JTs,J9s,TT,T9s,99,76s,66,55,77,88,44,33,KTs,A5s,A9s,AQo,QQ',
      CO:      'AQs,AJs,ATs,A5s,KQs,AQo,QJs,QTs,JTs,J9s,TT,76s,66,55,44,33,KJs,A9s,T9s,JJ,77,88,99',
      BTN:     'AQs,AJs,ATs,A9s,A5s,KQs,KJs,AQo,QJs,QTs,JJ,J9s,TT,99,76s,66,55,44,33,JTs,88,77',
      SB:      'AKs,AQs,AJs,ATs,A9s,A8s,A5s,A4s,A3s,AKo,KK,KQs,KJs,KTs,AQo,QQ,QJs,QTs,JJ,JTs,TT,T9s,99,88,76s,66,55,44,33,AA,A7s,77',
      BB:      'AKs,AQs,AJs,ATs,A9s,A8s,A7s,A5s,A4s,A3s,AKo,KK,KQs,KJs,KTs,AQo,QQ,QJs,QTs,JJ,JTs,TT,99,88,76s,66,44,33,T9s,55',
    },
    '4bet': {
      'UTG+1': 'AA,AKs,KK,AKo,KTs,KJs',
      LJ:      'AA,AKs,KK,AKo,A5s',
      HJ:      'AA,AKs,KK,AKo,KJs,JJ',
      CO:      'AA,AKs,AKo,KK,QQ,K8s,A4s,A7s',
      BTN:     'AA,AKs,AKo,QQ,KK,K9s',
      SB:      '',
      BB:      'AA,KJo',
    },
  },
});
// עותק מפורש של 'mid' (55-74BB, כולל דריסות ה-RFI האמיתיות מלמעלה) כברירת
// מחדל, לא המצאה. מוגדר על _RANGES[9] אחרי הדריסות, אז 7/8 (שמכוונים לאותו
// אובייקט ממש — ראו למטה) מקבלים אותו אוטומטית, בלי עבודה נוספת.
_RANGES[9].midlow = JSON.parse(JSON.stringify(_RANGES[9].mid));
// 2-5 players
[2,3].forEach(n=>{
  _RANGES[n]={deep:{BTN:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,QJs,QTs,JTs,T9s,98s,87s,76s,65s,54s,AKo,AQo,AJo,ATo,A9o,A8o,KQo,KJo,KTo,QJo,QTo,JTo,T9o','3bet':'AA,KK,QQ,JJ,TT,AKs,AQs,AKo,AQo',call:'99,88,AJs,KQs,AJo','4bet':'AA,KK,AKs,AKo'},SB:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,ATo,KQo,KJo','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s',call:'TT,99,AJs,KQs,AJo','4bet':'AA,KK,AKs,AKo'},BB:{RFI:'','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s',call:'TT,99,88,77,AJs,ATs,KQs,QJs,JTs,AJo,KQo','4bet':'AA,KK,AKs,AKo'}},mid:{},short:{},push:{}};
  ['mid','short','push'].forEach(d=>{ _RANGES[n][d]=_RANGES[n].deep; });
  _RANGES[n].midlow = _RANGES[n].deep;
});
_RANGES[4]={deep:{BTN:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,QJs,QTs,JTs,T9s,98s,87s,76s,65s,AKo,AQo,AJo,ATo,KQo,KJo,QJo,JTo','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s,A4s',call:'TT,99,88,AJs,ATs,KQs,QJs,JTs,AJo','4bet':'AA,KK,AKs,AKo'},CO:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,87s,AKo,AQo,AJo,ATo,KQo,KJo,QJo','3bet':'AA,KK,QQ,AKs,AQs,AKo,A5s',call:'JJ,TT,AJs,KQs,QJs,AJo,KQo','4bet':'AA,KK,AKs,AKo'},SB:{RFI:'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,AKs,AQs,AJs,ATs,A9s,A5s,A4s,KQs,KJs,QJs,JTs,T9s,98s,AKo,AQo,AJo,KQo','3bet':'AA,KK,QQ,AKs,AKo,A5s',call:'JJ,TT,AJs,KQs','4bet':'AA,KK,AKs'},BB:{RFI:'','3bet':'AA,KK,QQ,JJ,AKs,AQs,AKo,A5s,87s',call:'TT,99,88,77,66,AJs,ATs,KQs,QJs,JTs,AJo,KQo','4bet':'AA,KK,AKs,AKo'}},mid:{},short:{},push:{}};
['mid','short','push'].forEach(d=>{ _RANGES[4][d]=_RANGES[4].deep; });
_RANGES[4].midlow = _RANGES[4].deep;
_RANGES[5]=_RANGES[6]; _RANGES[7]=_RANGES[9]; _RANGES[8]=_RANGES[9];

const _POS_BY_SIZE = {
  2:['BTN','BB'], 3:['BTN','SB','BB'], 4:['BTN','CO','SB','BB'],
  5:['BTN','CO','SB','BB'], 6:['BTN','CO','HJ','MP','UTG','SB','BB'],
  7:['BTN','CO','HJ','MP','UTG','SB','BB'],
  8:['BTN','CO','HJ','LJ','MP','UTG','SB','BB'],
  9:['BTN','CO','HJ','LJ','MP','UTG+1','UTG','SB','BB'],
};
const _ACTIONS_LABELS = {RFI:'פתיחה','3bet':'3-Bet',call:'Call','4bet':'4-Bet',limp:'לימפ (אין טווח תיאורטי — ראו 🃏 לימפים ידועים)','facing-open':'מול פתיחה (call∪3bet — טרם החליט)',unclear:'מצב רב-שכבתי (אין טווח תיאורטי מדויק)'};

// ממיר שני קלפים לנוטציית יד סטנדרטית (AKs / AKo / AA) — קלף גבוה קודם, בדיוק כמו בטבלת _RANGES
function _cardsToHandNotation(cards){
  const RANKMAP = {'2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','10':'T','J':'J','Q':'Q','K':'K','A':'A'};
  const RANKVAL = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
  const [c1,c2] = cards;
  const hi = RANKVAL[c1.rank] >= RANKVAL[c2.rank] ? c1 : c2;
  const lo = hi===c1 ? c2 : c1;
  if(hi.rank===lo.rank) return RANKMAP[hi.rank]+RANKMAP[lo.rank];
  return RANKMAP[hi.rank]+RANKMAP[lo.rank]+(hi.suit===lo.suit?'s':'o');
}

// דירוג דרגות (0=A החזק ביותר...12=2 החלש ביותר) — עצמאי מ-_MC_RANKS/_MC_RANK_VAL
// שב-render.js (שם הסדר הפוך, מה-2 ל-A, לצורך בניית חפיסה) כדי לא להתנגש בשם.
const _RANGE_RANK_ORDER = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const _RANGE_RANK_IDX = Object.fromEntries(_RANGE_RANK_ORDER.map((r,i)=>[r,i]));

// מרחיב טוקן בודד בפורמט "+" הסטנדרטי של כלים חיצוניים (GTOWizard, PokerCruncher,
// Equilab וכו') לרשימת ידיים קונקרטיות: "66+" → 66,77,88,...,AA. "ATs+"/"A2s+" →
// כל הסוטד מהיד הנתונה ומעלה לכיוון AKs (לא כולל AA). טוקן בלי "+" בסוף מוחזר
// כפי שהוא ללא שינוי — כל טבלה קיימת שכבר כתובה במפורש ממשיכה לעבוד בדיוק כמו
// קודם; זו הרחבה נטו, לא שינוי-שובר. נועד למנוע בדיוק את הבאג שהתגלה באמצע
// השיחה: הדבקת טווח בפורמט "+" ישירות מסולבר, בלי לפרוש אותו ידנית, הייתה
// גורמת לידיים "להיעלם" בשקט (ה"66+" היה מתפרש כטוקן לא-מזוהה ומתעלם ממנו).
// דירוג לא מזוהה, או r1 שאינו "חזק" מ-r2 (סימון לא תקין) — מוחזר כמו שהוא, לא
// ממציאים תוצאה; validate_ranges.js עדיין יתפוס טוקן כזה כפגום אם הוא לא תקף.
function _expandPlusToken(token){
  if(!token.endsWith('+')) return [token];
  const base = token.slice(0,-1);
  if(base.length===2 && base[0]===base[1]){
    const startIdx = _RANGE_RANK_IDX[base[0]];
    if(startIdx===undefined) return [token];
    const out=[];
    for(let i=startIdx;i>=0;i--) out.push(_RANGE_RANK_ORDER[i]+_RANGE_RANK_ORDER[i]);
    return out;
  }
  const suffix = base.slice(-1);
  if(suffix!=='s' && suffix!=='o') return [token];
  const r1=base[0], r2=base[1];
  const i1=_RANGE_RANK_IDX[r1], i2=_RANGE_RANK_IDX[r2];
  if(i1===undefined || i2===undefined || i1>=i2) return [token];
  const out=[];
  for(let j=i2;j>i1;j--) out.push(r1+_RANGE_RANK_ORDER[j]+suffix);
  return out;
}

function _parseRangeToSet(str){
  const s=new Set();
  if(!str)return s;
  str.split(',').map(x=>x.trim()).filter(Boolean).forEach(tok=>{
    _expandPlusToken(tok).forEach(h=>{
      if(h.length===2&&h[0]===h[1])s.add(h);
      else if(h.endsWith('s'))s.add(h);
      else if(h.endsWith('o'))s.add(h);
      else{s.add(h+'s');s.add(h+'o');}
    });
  });
  return s;
}

// נבנה מעל _parseRangeToSet (ולא לוגיקת-פירוש כפולה משלו) בדיוק מהסיבה שכבר
// עלתה כמה פעמים היום: שתי מימושים מקבילים לאותה שאלה נוטים לסטות זה מזה.
function _countCombos(str){
  const set = _parseRangeToSet(str);
  let n=0;
  set.forEach(h=>{ n += h.length===2 ? 6 : (h.endsWith('s') ? 4 : 12); });
  return n;
}

function _depthFromBB(effBB){
  if(effBB >= 75) return 'deep';
  if(effBB >= 55) return 'mid';
  if(effBB >= 35) return 'midlow';
  if(effBB >= 20) return 'short';
  return 'push';
}

function _getStackDepth(){
  // חישוב effective stack (קטן בין currentActor לשאר) חלקי BB — למצב חי בלבד (S.currentActor)
  const actor = S.currentActor;
  const bb = (getBlinds&&getBlinds()?.bb)||50;
  const actorSeat = S.seats.find(s=>s.seatIdx===actor);
  const actorStack = actorSeat?.stack||0;
  const opponents = S.seats.filter(s=>s.playerId&&!s.folded&&!s.allin&&s.seatIdx!==actor);
  const minOppStack = opponents.length ? Math.min(...opponents.map(s=>s.stack||0)) : actorStack;
  const effStack = Math.min(actorStack, minOppStack);
  const effBB = bb>0 ? effStack/bb : 100;
  return _depthFromBB(effBB);
}


function _getRangeStrForDepth(tableSize, pos, action, depth, vsPos){
  const ts = tableSize||S.tableSize||6;
  const rBySize = _RANGES[ts]||_RANGES[6];
  const rByDepth = rBySize[depth]||rBySize.deep||rBySize;
  // שרשרת fallback (חשוב: _RANGES מכיל טבלה לכל גודל שולחן 2-9, לכן עמדה שחסרה
  // בטבלת הגודל הנוכחי חייבת ליפול קודם לטבלת ה-6 — שם יושבות כניסות מיוחדות כמו
  // BTN/SB של ראש-בראש — ורק אז לעמדת ה-alias הקרובה. בלי זה, חיפוש שנכשל מחזיר
  // טווח ריק ⇒ שום יד לא "בטווח" (אפילו KK).
  const six = _RANGES[6][depth]||_RANGES[6].deep;
  const alias = {'BTN/SB':'BTN','UTG+1':'UTG','UTG+2':'MP','LJ':'MP','MP+1':'HJ'}[pos];
  const raw = (rByDepth[pos]||{})[action]
      || (six[pos]||{})[action]
      || (alias ? (((rByDepth[alias]||{})[action]) || ((six[alias]||{})[action]) || '') : '');
  return _resolveRangeEntry(raw, vsPos);
}

// 'call'/'4bet' יכולים להיות מחרוזת שטוחה כרגיל (טווח גנרי, לא תלוי-יריב — כל
// הטבלאות הישנות), *או* אובייקט { עמדת-היריב-הספציפי: מחרוזת } — כשיש נתוני
// סולבר מפורקים לפי מי בדיוק 3-בט (למשל "UTG מול 3bet של HJ" שונה מ"UTG מול
// 3bet של BB"). כשיודעים בדיוק מול מי (vsPos) — מחזירים את הטווח הספציפי שלו.
// כשלא (vsPos לא סופק, או שאין נתון לאותו יריב ספציפי) — מאחדים את *כל* תתי-
// הטווחים הידועים כברירת מחדל סבירה, במקום להחזיר ריק סתם כי לא ציינו יריב.
function _resolveRangeEntry(raw, vsPos){
  if(typeof raw === 'string') return raw;
  if(raw && typeof raw === 'object'){
    if(vsPos && raw[vsPos]) return raw[vsPos];
    return Object.values(raw).reduce((acc,r)=>_unionRangeStr(acc,r), '');
  }
  return '';
}

function _getRangeStr(tableSize, pos, action){
  return _getRangeStrForDepth(tableSize, pos, action, _getStackDepth());
}


// Monte Carlo vs specific range (מחליף את הקודם)
function monteCarloEquityVsRange(holeCards, boardCards, rangeStr, iterations=8000){
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
      const rr=_notationRankToCard(h[0]);
      _MC_SUITS.forEach((s1,i)=>_MC_SUITS.forEach((s2,j)=>{
        if(i<j){
          const c1={rank:rr,suit:s1},c2={rank:rr,suit:s2};
          if(!knownKeys.has(c1.rank+c1.suit)&&!knownKeys.has(c2.rank+c2.suit))
            rangeCombos.push([c1,c2]);
        }
      }));
    } else if(h.endsWith('s')){
      const r1=_notationRankToCard(h[0]),r2=_notationRankToCard(h[1]);
      _MC_SUITS.forEach(s=>{
        const c1={rank:r1,suit:s},c2={rank:r2,suit:s};
        if(!knownKeys.has(c1.rank+c1.suit)&&!knownKeys.has(c2.rank+c2.suit))
          rangeCombos.push([c1,c2]);
      });
    } else if(h.endsWith('o')){
      const r1=_notationRankToCard(h[0]),r2=_notationRankToCard(h[1]);
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

  const baseBoard=boardCards.filter(Boolean);
  const sameCard=(a,b)=>a.rank===b.rank&&a.suit===b.suit;
  let wins=0,ties=0;
  for(let i=0;i<iterations;i++){
    // בחר קומבו אקראי מה-range
    const oppHand=rangeCombos[Math.floor(Math.random()*rangeCombos.length)];
    // ערבוב חלקי של סוף החפיסה — בלי לבנות deck חדש בכל איטרציה.
    // חלון של need+2 כדי שיהיה מרווח לדלג על קלפי היריב אם נשלפו
    const win=boardNeeded+2;
    for(let j=deck.length-1;j>=deck.length-win&&j>0;j--){
      const k=Math.floor(Math.random()*(j+1));
      [deck[j],deck[k]]=[deck[k],deck[j]];
    }
    const runBoard=baseBoard.slice();
    let idx=deck.length-1;
    while(runBoard.length<5){
      const c=deck[idx--];
      if(!sameCard(c,oppHand[0])&&!sameCard(c,oppHand[1])) runBoard.push(c);
    }
    const myVal=_handRankMC([...holeCards,...runBoard]);
    const oppVal=_handRankMC([...oppHand,...runBoard]);
    if(myVal>oppVal)wins++;
    else if(myVal===oppVal)ties++;
  }
  return (wins+ties*0.5)/iterations*100;
}

// ── התאמת טווח סולבר לפי תגית שחקן (TAG/LAG/Nit/Station/Fish) ──────
// רשימות תוספת/הפחתה כלליות (לא תלויות עמדה) — קירוב סביר, לא סולבר מדויק
const _RANGE_LOOSEN = 'A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,Q2s,J8s,J7s,J6s,T8s,T7s,97s,96s,86s,85s,75s,64s,53s,43s,32s,A9o,A8o,A7o,A6o,A5o,A4o,A3o,A2o,K9o,K8o,QTo,Q9o,J9o,T9o,98o,87o,76o,65o';
const _RANGE_TIGHTEN = '22,33,44,55,A2s,A3s,A4s,K9s,K8s,QTs,Q9s,J9s,T9s,98s,87s,76s,65s,54s,ATo,KJo,KTo,QJo,QTo,JTo';
const _RANGE_STATION_EXTRA = '22,33,44,55,66,77,J8o,J7o,T8o,T7o,97o,96o,86o,85o,75o,64o,54o,43o,K7o,K6o,K5o,K4o,K3o,K2o,Q8o,Q7o,Q6o,Q5o,Q4o,Q3o,Q2o';

// playerType null/לא מוגדר → משאירים את טווח הסולבר כמו שהוא (טווח מאוזן, ערך+בלאף)
// TAG → טווח הסולבר כמו שהוא. Nit → מצמצם. LAG/Station/Fish → מרחיב (Station בעיקר ב-call, Fish בכל הפעולות)
function _adjustRangeForType(baseRangeStr, playerType, actionCat){
  if(!baseRangeStr) return baseRangeStr; // אין בסיס תיאורטי (למשל לימפ אמיתי) — נשאר ריק, לא "ממלאים" מהתוספות
  if(!playerType || playerType==='TAG') return baseRangeStr;
  const set = _parseRangeToSet(baseRangeStr);
  if(playerType==='Nit'){
    _parseRangeToSet(_RANGE_TIGHTEN).forEach(h=>set.delete(h));
  } else if(playerType==='LAG'){
    _parseRangeToSet(_RANGE_LOOSEN).forEach(h=>set.add(h));
  } else if(playerType==='Station'){
    _parseRangeToSet(_RANGE_LOOSEN).forEach(h=>set.add(h));
    // 'call' = כבר קרא בפועל ביד הזו; 'facing-open' = עוד לא פעל אבל ניצב מול
    // open (טווח-המשך call∪3bet, ראו _getContextualRangeInfo round=0/BB ו-round=1) —
    // שתיהן בדיוק אותה שאלה מבחינת "סטיישן קורא הרבה" ולכן צריכות להתנהג זהה.
    // התנאי הישן (`actionCat==='call'` בלבד) גרם לשני מקומות בקוד שמחשבים את
    // אותו טווח-המשך בדיוק (עורך הטווח מול פאנל ה-equity) להחזיר actionCat שונה
    // ('call' מול 'facing-open' בהתאמה) ולכן טווחים שונים בפועל לאותו שחקן/סיטואציה —
    // באג אמיתי שהתגלה כשמשתמש בדק ידנית מול מחשבון חיצוני.
    if(actionCat==='call' || actionCat==='facing-open') _parseRangeToSet(_RANGE_STATION_EXTRA).forEach(h=>set.add(h));
  } else if(playerType==='Fish'){
    _parseRangeToSet(_RANGE_LOOSEN).forEach(h=>set.add(h));
    _parseRangeToSet(_RANGE_STATION_EXTRA).forEach(h=>set.add(h));
  }
  return [...set].join(',');
}

// מזהה אוטומטית מה הייתה הפעולה האחרונה (הכי מחייבת) של השחקן פרה-פלופ,
// כדי לבחור את קטגוריית הטווח המתאימה מהסולבר (RFI/3bet/4bet/call) בלי בחירה ידנית.
// אם עדיין לא פעל בכלל: BB מקבל 'call' (מגן/צ'ק-אופציה — לא הוא זה שפותח את הפוט);
// כל עמדה אחרת (UTG/MP/CO/BTN/SB) מקבלת 'RFI' — כי אם עוד לא נפל עליה תור, ההנחה
// הסבירה היא שהיא זו שתפתח (לא "תקרא" למשהו שעוד לא קרה).
function _inferPreflopActionCat(seat, pos){
  const preflopActs = (seat.actions||[]).filter(a=>a.street==='פרה-פלופ' && a.type!=='SB' && a.type!=='BB');
  if(!preflopActs.length) return pos==='BB' ? 'call' : 'RFI';
  const last = preflopActs[preflopActs.length-1];
  const round = last.raiseRound||0;
  if(['Raise','Open','All-in','3bet','4bet','5bet','Bet'].includes(last.type)){
    if(round<=1) return 'RFI';
    if(round===2) return '3bet';
    return '4bet';
  }
  // Call: אם round===0 — אין עדיין raise על השולחן, זה לימפ אמיתי. בהתאם להחלטה
  // מפורשת: לא ממציאים קירוב תיאורטי (לא RFI, לא איחוד RFI∪call) — GTO preflop
  // הוא בעיקרו עץ raise-or-fold ואין בו בכלל "צומת לימפ" עבור רוב העמדות, ואין
  // טעם לזייף דיוק שלא קיים, בטח לא בתוך חישובי equity. מחזירים 'limp' — מפתח
  // שלא קיים באף טבלת _RANGES, ולכן _getRangeStrForDepth יחזיר '' בכל מקום שבו
  // נעשה בו שימוש (תצוגת הפאנל, equity חי, equity היסטורי) — "אין טווח תיאורטי"
  // באופן אחיד, בלי טיפול מיוחד בכל אתר קריאה בנפרד. הכלי הנכון ללימפ הוא ה"🃏
  // לימפים ידועים" האמפירי (נבנה מתיעוד ידיים אמיתי לאורך זמן), לא ניחוש אוטומטי.
  // round>=1 = call אמיתי מול raise שכבר קיים — זו בדיוק ההגדרה של טבלת 'call'.
  return round===0 ? 'limp' : 'call';
}

// הטווח האוטומטי המלא של מושב נתון: עמדה (מ-assignPos) + פעולה שביצע ביד הנוכחית
// (או ברירת מחדל לפי עמדה אם עדיין לא פעל — ראו _inferPreflopActionCat) + עומק לפי
// הערימה שלו (BB) + התאמת סוג שחקן. משמש הן לתצוגה בפאנל המושב (כשאין טווח ידני)
// הטווח האוטומטי המלא של מושב נתון: עמדה (מ-assignPos) + פעולה שביצע ביד הנוכחית
// (או ברירת מחדל לפי עמדה אם עדיין לא פעל — ראו _inferPreflopActionCat) + עומק לפי
// הערימה שלו (BB) + התאמת סוג שחקן. משמש הן לתצוגה בפאנל המושב (כשאין טווח ידני)
// והן כנקודת-פתיחה לעריכה.
// הערה: כששחקן למפ בפועל, _inferPreflopActionCat מחזירה 'limp' — מפתח שלא קיים
// באף טבלת _RANGES, ולכן rangeStr יוצא ריק בכוונה ('אין טווח תיאורטי'), ואין הפעלת
// התאמת-סוג-שחקן על טווח שלא קיים מלכתחילה. זו התנהגות מכוונת, לא חוסר. לניתוח
// לימפים בפועל — ראו "🃏 לימפים ידועים" (_getEmpiricalLimpHands) בפאנל המושב.
// מאחד שתי מחרוזות טווח (פסיקים) לרשימת ידיים ייחודית אחת, ללא כפילויות.
function _unionRangeStr(a, b){
  const set = new Set();
  (a||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(h=>set.add(h));
  (b||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(h=>set.add(h));
  return [...set].join(',');
}

// קובעת את הטווח וקטגוריית הפעולה הרלוונטיים לשחקן נתון *בהתחשב במה שקרה בפועל על
// השולחן עד כה* — לא רק לפי עמדה בבידוד. משמשת בכל מקום שמחשב טווח אוטומטי (פאנל
// מושב, טווח לפועל) כדי שכל שחקן יקבל את הטווח הנכון לסיטואציה שהוא בה עכשיו:
//  - אם השחקן כבר פעל ביד הנוכחית → הפעולה בפועל שלו (RFI/3bet/call/4bet כרגיל).
//  - אם עדיין לא פעל, בודקים מול כמה raises כבר קרו בפרה-פלופ (raiseRound):
//      0   → הוא זה ש"פותח" (RFI, או call ל-BB) — אף אחד עוד לא לחץ עליו
//      1   → ניצב מול open אחד — טווח-המשך שלו הוא איחוד call∪3bet (עדיין לא
//            ידוע אם יקרא או יעלה שוב, אז מציגים את כל מה שממשיך ולא מקפל)
//      2   → ניצב מול 3bet (אחרי שהוא עצמו פתח) — טווח-המשך הוא איחוד call∪4bet,
//            באותו היגיון בדיוק כמו round=1. תומך בנתוני סולבר מפורקים-לפי-יריב
//            (vsPos — עמדת מי-שעשה-3bet): אם call/4bet בטבלה הם אובייקט
//            {עמדת-יריב: טווח} (ראו _resolveRangeEntry) והעמדה הספציפית ידועה,
//            מקבלים את הטווח המדויק מולה; אחרת נופלים לאיחוד-כל-האפשרויות.
//      3+  → מצב רב-שכבתי (מול 4bet ומעלה) — אין עדיין טבלה טובה לזה; טווח ריק,
//            בדיוק כמו לימפ. לא ממציאים.
function _getContextualRangeInfo(seat, pos, tableSize, depth, currentRaiseRound, vsPos){
  if(!pos) return {rangeStr:'', actionCat:''};
  const preflopActs = (seat.actions||[]).filter(a=>a.street==='פרה-פלופ' && a.type!=='SB' && a.type!=='BB');
  if(preflopActs.length){
    const actionCat = _inferPreflopActionCat(seat, pos);
    return {rangeStr: _getRangeStrForDepth(tableSize, pos, actionCat, depth, vsPos) || '', actionCat};
  }
  const round = currentRaiseRound||0;
  if(round===0){
    // BB בפרט: RFI ריק תמיד (BB לא "פותח"), וההגדרה של round=0 היא "אף אחד עוד
    // לא פעל" — לא בהכרח "לא תהיה פתיחה בכלל". שימוש בטבלת 'call' בלבד כאן היה
    // באג אמיתי: 'call' מייצגת רק את חלק ה-flat-call בתוך טווח ההמשך של BB —
    // הידיים הכי חזקות (AA-TT, AKs/AQs/KQs וכו') מסווגות ל-'3bet' בטבלה ולכן
    // "נעלמו" מהטווח האוטומטי/ברירת-המחדל, בעוד שבדיוק אותה סיטואציה (round=1,
    // BB מול open) כן מאחדת call∪3bet. שני המצבים (round=0/round=1 עבור BB)
    // מייצגים בפועל את אותה שאלה — "מה הטווח שלו כשתגיע אליו פתיחה" — ולכן
    // צריכים להחזיר את אותו טווח מאוחד. ההפרדה בין הטבלאות 'call' ו-'3bet' עצמן
    // *נשמרת* במלואה — האיחוד קורה רק כאן, בשכבת התצוגה/החישוב.
    if(pos==='BB'){
      const callR = _getRangeStrForDepth(tableSize, pos, 'call', depth) || '';
      const bet3R = _getRangeStrForDepth(tableSize, pos, '3bet', depth) || '';
      return {rangeStr: _unionRangeStr(callR, bet3R), actionCat:'call'};
    }
    const actionCat = 'RFI';
    return {rangeStr: _getRangeStrForDepth(tableSize, pos, actionCat, depth) || '', actionCat};
  }
  if(round===2){
    const callR = _getRangeStrForDepth(tableSize, pos, 'call', depth, vsPos) || '';
    const bet4R = _getRangeStrForDepth(tableSize, pos, '4bet', depth, vsPos) || '';
    if(!callR && !bet4R) return {rangeStr:'', actionCat:'unclear'};
    return {rangeStr: _unionRangeStr(callR, bet4R), actionCat:'facing-3bet'};
  }
  if(round===1){
    const callR = _getRangeStrForDepth(tableSize, pos, 'call', depth) || '';
    const bet3R = _getRangeStrForDepth(tableSize, pos, '3bet', depth) || '';
    return {rangeStr: _unionRangeStr(callR, bet3R), actionCat:'facing-open'};
  }
  return {rangeStr:'', actionCat:'unclear'};
}

// ── מקור אמת יחיד ל"מה הטווח האפקטיבי של המושב הזה עכשיו" ─────────────────
// מאחד לוגיקה שהייתה כפולה (ולסטתה בעבר, ראו CHANGELOG 2026-07-14) בשני
// מקומות שונים ב-render.js: פאנל equity "רגיל" (יריב שכבר פעל בפועל) ופאנל
// equity במצב-פתיחה (יריב שעוד לא פעל, טווח-המשך היפותטי). סדר עדיפויות קבוע:
//   1. טווח ידני שמור לשחקן (S.playerRanges) — תמיד גובר, בכל מצב.
//   2. בחירת טווח גלובלית ישנה (rs / S._rangeSelection) — חלה על כל היריבים
//      ללא טווח ידני משלהם; לא רלוונטית במצב-פתיחה (שם rs תמיד null מלכתחילה).
//   3. זיהוי אוטומטי — עמדה + פעולה (או actionCatOverride, לצורך פיצול
//      call-בלבד/3bet-בלבד) + התאמת טיפוס שחקן.
// actionCatOverride עוקף שלב 3 בלבד; טווח ידני (שלב 1) לא ניתן לפיצול
// call/3bet מהותית (הוא רשימת ידיים שטוחה בלי הפרדה פנימית), ולכן כשמבקשים
// override ויש גם טווח ידני — מוחזר rangeStr:null באופן מפורש (לא ממציאים).
function _resolveOpponentRangeStr(seat, opts){
  const {pos, tableSize, depth, round, actionCatOverride, rs} = opts;
  const manualR = S.playerRanges?.[seat.playerId];
  if(manualR){
    if(actionCatOverride) return {rangeStr:null, tag:'manual-unsplittable:'+seat.playerId};
    return {rangeStr: manualR, tag:'manual:'+seat.playerId+':'+manualR.length+':'+_countCombos(manualR)};
  }
  if(rs){
    return {rangeStr: _getRangeStrForDepth(tableSize, rs.pos, rs.action, depth) || '', tag:'global:'+rs.pos+':'+rs.action+':'+depth};
  }
  let baseR, actCat;
  if(actionCatOverride){
    baseR = _getRangeStrForDepth(tableSize, pos, actionCatOverride, depth) || '';
    actCat = actionCatOverride;
  } else {
    ({rangeStr: baseR, actionCat: actCat} = _getContextualRangeInfo(seat, pos, tableSize, depth, round));
  }
  const player = (S.playerLib||[]).find(p=>p.id===seat.playerId);
  const playerType = player?.playerType || null;
  const adjR = _adjustRangeForType(baseR, playerType, actCat);
  return {rangeStr: adjR, tag:'auto:'+pos+':'+(actCat||'')+':'+depth+':'+(playerType||'none')};
}

function _getAutoRangeForSeat(seatIdx){
  const seat = S.seats.find(s=>s.seatIdx===seatIdx);
  if(!seat) return {rangeStr:'', pos:'', actionCat:'', depth:''};
  const swp = assignPos();
  const pos = swp.find(s=>s.seatIdx===seatIdx)?.pos || '';
  const bb = getBB();
  const depth = _depthFromBB(bb>0 ? (seat.stack||0)/bb : 100);
  const {rangeStr: baseRangeStr, actionCat} = _getContextualRangeInfo(seat, pos, S.tableSize, depth, S.raiseRound);
  const player = (S.playerLib||[]).find(p=>p.id===seat.playerId);
  const playerType = player?.playerType || null;
  const rangeStr = _adjustRangeForType(baseRangeStr, playerType, actionCat);
  return {rangeStr, pos, actionCat, depth, playerType};
}

// לימפים אמפיריים ידועים לשחקן: סורק את S.handLog (היסטוריית ידיים אמיתית, לא
// חישוב חי) ומאתר ידיים שבהן (א) הקלפים של השחקן הוזנו ו-(ב) פעולתו הפרה-פלופית
// הראשונה (לא כולל SB/BB) הייתה Call ב-raiseRound===0 — כלומר כניסה ראשונה בלי
// שהייתה כבר העלאה, שזו ההגדרה המדויקת של "לימפ" (בניגוד ל-call על העלאה של מישהו
// אחר). מחזיר {hand: count} — מידע בלבד, לא נוגע בשום חישוב equity או בטווח האוטומטי.
// הטיה ידועה: סופר רק ידיים שבהן הוזנו קלפים בפועל (בד"כ showdown) — לימפים חלשים
// שקופלו מוקדם ולא הוזנו קלפים לרוב לא ייספרו כאן, כך שהתמונה עלולה להיראות "חזקה"
// יותר משהיא באמת.
function _getEmpiricalLimpHands(pid){
  const tally = {};
  (S.handLog||[]).forEach(h=>{
    const seat = (h.seats||[]).find(s=>s.playerId===pid);
    if(!seat) return;
    const cards = (seat.cards||[]).filter(Boolean);
    if(cards.length!==2) return;
    const preflopActs = (seat.actions||[]).filter(a=>a.street==='פרה-פלופ' && a.type!=='SB' && a.type!=='BB');
    const first = preflopActs[0];
    if(first && first.type==='Call' && (first.raiseRound||0)===0){
      const hType = _cardsToHandNotation(cards);
      tally[hType] = (tally[hType]||0)+1;
    }
  });
  return tally;
}

// ממיר מחרוזת range (למשל "AKs,QQ,ATo") לרשימת קומבינציות קלפים בפועל,
// תוך סינון קלפים "מתים" (כבר ידועים כתפוסים)
// ── דירוג קבוע: כל 169 סוגי הידיים, מהחזקה לחלשה ──────────────
// מבוסס על equity ממוצע מול יד אקראית לחלוטין (Monte Carlo, 4000 איטרציות/יד,
// חושב חד-פעמית מראש). זו נקודת מוצא ל"top X%" — קירוב טוב לטווחי solver ליניאריים
// (כמו RFI), אבל לא זהה במדויק (סולבר מתחשב גם ב-realized equity וכיסוי בורד,
// וטווחי 3bet/4bet לרוב מקוטבים ולא ליניאריים בכלל).
const _HAND_RANKING = ['AA','KK','QQ','JJ','TT','99','88','AQs','AKs','77','ATs','AKo','AJs','AQo','A9s','66','KQs','AJo','ATo','A8s','A7s','KJs','KTs','A9o','KQo','KJo','A8o','A6s','QJs','55','A5s','K8s','Q9s','A7o','A4s','KTo','QTs','K9s','A4o','A5o','QJo','J9s','K9o','A3s','K7s','A2s','K5s','44','K6s','JTs','A6o','K8o','K3s','QTo','K4s','A3o','Q8s','J8s','K7o','Q7s','Q9o','A2o','33','Q8o','K2s','T9s','K5o','K4o','Q5s','JTo','K6o','J9o','Q4s','J7s','Q7o','98s','Q3s','T8s','T9o','Q6s','K2o','Q2s','J8o','T7s','Q5o','K3o','J5s','22','Q6o','J6s','J4s','T6s','T8o','Q4o','97s','J6o','J3s','J7o','J2s','Q3o','87s','T7o','96s','Q2o','98o','T5s','97o','J5o','J4o','T4s','86s','T6o','95s','T3s','T2s','96o','87o','76s','J3o','J2o','95o','94s','T4o','93s','85s','75s','T3o','86o','T5o','65s','76o','54s','T2o','84s','74s','92s','64s','65o','94o','93o','85o','75o','83s','82s','73s','63s','84o','72s','92o','83o','74o','43s','52s','54o','53s','64o','62s','63o','42s','73o','43o','53o','72o','82o','32s','62o','42o','52o','32o'];

// ממיר אחוז (0-100) לרשימת ידיים בפועל, לפי צבירת קומבינציות (לא סוגי-יד!) תוך
// ירידה בדירוג הקבוע, עד הגעה ל-X% מתוך 1,326 הקומבינציות הכולל. קריטי: סוגי יד
// שונים שווים במשקל שונה (זוג=6, סוטד=4, לא-סוטד=12 קומבינציות) — לכן חובה לספור
// קומבינציות בפועל, לא רק לקחת את N הראשונות ברשימה.
function _topPercentRange(pct){
  if(!pct || pct<=0) return '';
  const targetCombos = (pct/100) * 1326;
  const combosOf = h => h.length===2 ? 6 : (h.endsWith('s') ? 4 : 12);
  let acc = 0;
  const out = [];
  for(const h of _HAND_RANKING){
    if(acc >= targetCombos) break;
    out.push(h);
    acc += combosOf(h);
  }
  return out.join(',');
}

function _rangeStrToCombos(rangeStr, deadKeys){
  const combos=[];
  if(!rangeStr) return combos;
  const rangeSet=_parseRangeToSet(rangeStr);
  rangeSet.forEach(h=>{
    if(h.length===2&&h[0]===h[1]){
      const rr=_notationRankToCard(h[0]);
      _MC_SUITS.forEach((s1,i)=>_MC_SUITS.forEach((s2,j)=>{
        if(i<j){
          const c1={rank:rr,suit:s1},c2={rank:rr,suit:s2};
          if(!deadKeys.has(c1.rank+c1.suit)&&!deadKeys.has(c2.rank+c2.suit)) combos.push([c1,c2]);
        }
      }));
    } else if(h.endsWith('s')){
      const r1=_notationRankToCard(h[0]),r2=_notationRankToCard(h[1]);
      _MC_SUITS.forEach(s=>{
        const c1={rank:r1,suit:s},c2={rank:r2,suit:s};
        if(!deadKeys.has(c1.rank+c1.suit)&&!deadKeys.has(c2.rank+c2.suit)) combos.push([c1,c2]);
      });
    } else if(h.endsWith('o')){
      const r1=_notationRankToCard(h[0]),r2=_notationRankToCard(h[1]);
      _MC_SUITS.forEach(s1=>_MC_SUITS.forEach(s2=>{
        if(s1!==s2){
          const c1={rank:r1,suit:s1},c2={rank:r2,suit:s2};
          if(!deadKeys.has(c1.rank+c1.suit)&&!deadKeys.has(c2.rank+c2.suit)) combos.push([c1,c2]);
        }
      }));
    }
  });
  return combos;
}

// ── ייצוא ל-Node בלבד, לצורך כלי-עזר (tools/) — לא משפיע על הדפדפן בכלל ──
// בדפדפן 'module' לא מוגדר, אז הבלוק הזה פשוט מדולג; שם ranges.js ממשיך לפעול
// בדיוק כמו קודם, כ-<script> גלובלי רגיל. ב-Node זה נותן ל-tools/ גישה ישירה
// ואמינה (require, לא regex/eval שביר) לנתונים ולפונקציות הפירוש עצמן — כדי
// שכלי כמו validate_ranges.js ו-expand_range.js תמיד יבדקו את אותה לוגיקת
// פירוש בדיוק שהאפליקציה החיה משתמשת בה, לא עותק נפרד שעלול לסטות ממנה.
if(typeof module!=='undefined' && module.exports){
  module.exports = { _RANGES, _parseRangeToSet, _countCombos, _expandPlusToken, _getRangeStrForDepth, _unionRangeStr, _HAND_RANKING };
}

