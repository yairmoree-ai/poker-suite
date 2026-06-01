// ═══════════════════════════════════════════════════════════════════
// POKER SUITE - Google Apps Script Backend v2
// הוראות התקנה:
// 1. פתח script.google.com
// 2. צור פרויקט חדש → מחק קוד קיים → הדבק את הקוד הזה
// 3. Deploy → New Deployment → Web App
// 4. Execute as: Me | Who has access: Anyone
// 5. העתק את ה-URL → הדבק באפליקציה
// ═══════════════════════════════════════════════════════════════════

const SHEET_NAME = 'PokerData';
const POKER_FOLDER_ID = '1shMZ123ht9RwFv31ZiuKWr3rpvOJayd_';

function moveToPokerFolder(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const folder = DriveApp.getFolderById(POKER_FOLDER_ID);
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  } catch(e) {
    Logger.log('שגיאה בהזזה לתיקייה: ' + e.toString());
  }
}

function getOrCreateSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); }
    catch(e) { ssId = null; }
  }
  if (!ssId) {
    ss = SpreadsheetApp.create('Poker Suite Data');
    ssId = ss.getId();
    props.setProperty('SPREADSHEET_ID', ssId);
    moveToPokerFolder(ssId);
  }
  return ss;
}

function getOrCreateSheet(username) {
  const props = PropertiesService.getScriptProperties();

  if (username) {
    // אותה המרה בדיוק כמו ב-createUserSheet — כך הם תואמים גם בעברית
    const propKey = 'SHEET_ID_' + username.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const ssId = props.getProperty(propKey);
    if (ssId) {
      try {
        const ss = SpreadsheetApp.openById(ssId);
        let sheet = ss.getSheetByName('poker_data');
        if (!sheet) {
          sheet = ss.getActiveSheet();
          sheet.setName('poker_data');
          if (sheet.getLastRow() === 0) {
            sheet.getRange('A1:C1').setValues([['key','value','updated']]);
          }
        }
        return sheet;
      } catch(e) { /* fallback */ }
    }
  }

  // Fallback — Spreadsheet גלובלי
  const ss = getOrCreateSpreadsheet();
  let sheet = ss.getSheetByName('poker_data');
  if (!sheet) {
    const sheets = ss.getSheets();
    const other = sheets.find(s => s.getName() !== 'Sheet1');
    if (other) {
      other.setName('poker_data');
      sheet = other;
    } else {
      sheet = ss.getActiveSheet();
      sheet.setName('poker_data');
      if (sheet.getLastRow() === 0) {
        sheet.getRange('A1:C1').setValues([['key','value','updated']]);
      }
    }
  }
  return sheet;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  try {
    const key = (e && e.parameter && e.parameter.key) ? e.parameter.key : 'poker_data';
    const callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
    const username = (e && e.parameter && e.parameter.username) ? e.parameter.username : null;
    const sheet = getOrCreateSheet(username);
    const data = sheet.getDataRange().getValues();
    let result = { ok: false, error: 'not found' };

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        let val;
        try { val = JSON.parse(data[i][1]); }
        catch(err) { val = data[i][1]; }
        result = { ok: true, value: val };
        break;
      }
    }

    const jsonStr = JSON.stringify(result);
    // Support JSONP for cross-origin GET requests
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + jsonStr + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(jsonStr)
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost_identifyCards(e) {
  // Called when action=identify_cards
  try {
    const body = JSON.parse(e.postData.contents);
    const imageBase64 = body.image;
    const prompt = body.prompt || 'זהה את קלפי הפוקר בתמונה. החזר JSON בלבד: {"cards":[{"rank":"A","suit":"♥"},...]}'
    
    const text = callAnthropicProxy(imageBase64, prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, cards: parsed.cards || [] }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action } = body;

    // Route to createUserSheet
    if (action === 'create_user_sheet') {
      return createUserSheet(body);
    }

    // Route to manual backup
    if (action === 'manual_backup') {
      const result = autoBackup();
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Route to identify_cards
    if (action === 'identify_cards') {
      return doPost_identifyCards(e);
    }

    // Default: save data
    const key = body.key || 'poker_data';
    const username = body.username || null;
    const value = body.value;
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    const now = new Date().toLocaleString('he-IL');

    const sheet = getOrCreateSheet(username);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2, 1, 2).setValues([[valStr, now]]);
        return ContentService
          .createTextOutput(JSON.stringify({ ok: true, updated: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    sheet.appendRow([key, valStr, now]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, created: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CREATE USER SHEET - יוצר Spreadsheet נפרד לכל מנהל
// ═══════════════════════════════════════════════════════════════════
function createUserSheet(body) {
  try {
    const { username, name } = body;
    if (!username || !name) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'חסרים username ו-name' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const props = PropertiesService.getScriptProperties();
    const propKey = 'SHEET_ID_' + username.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // אם כבר קיים Sheet למשתמש הזה — החזר אותו
    const existingId = props.getProperty(propKey);
    if (existingId) {
      try {
        const existingSS = SpreadsheetApp.openById(existingId);
        const scriptUrl = ScriptApp.getService().getUrl();
        return ContentService
          .createTextOutput(JSON.stringify({
            ok: true,
            alreadyExists: true,
            sheetsUrl: scriptUrl,
            spreadsheetId: existingId,
            spreadsheetUrl: existingSS.getUrl()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch(e) { /* קובץ נמחק, ניצור חדש */ }
    }

    // צור Spreadsheet חדש בשם המשתמש
    const ss = SpreadsheetApp.create('Poker Suite — ' + name);
    const ssId = ss.getId();
    moveToPokerFolder(ssId);

    // צור sheet בסיסי
    const sheet = ss.getActiveSheet();
    sheet.setName('poker_data');
    sheet.getRange('A1:C1').setValues([['key', 'value', 'updated']]);

    // שמור את ה-ID
    props.setProperty(propKey, ssId);

    // החזר את ה-URL של ה-Apps Script הנוכחי (כי הוא כבר יודע לנתב לפי username)
    const scriptUrl = ScriptApp.getService().getUrl();

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        sheetsUrl: scriptUrl,
        spreadsheetId: ssId,
        spreadsheetUrl: ss.getUrl()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost_identifyCards(e) {
  // Called when action=identify_cards
  try {
    const body = JSON.parse(e.postData.contents);
    const imageBase64 = body.image;
    const prompt = body.prompt || 'זהה את קלפי הפוקר בתמונה. החזר JSON בלבד: {"cards":[{"rank":"A","suit":"♥"},...]}'
    
    const text = callAnthropicProxy(imageBase64, prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, cards: parsed.cards || [] }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ANTHROPIC PROXY - זיהוי קלפים
// הוסף את ה-ANTHROPIC_KEY שלך בהגדרות הסקריפט:
// File → Project Properties → Script Properties → הוסף ANTHROPIC_KEY
// ═══════════════════════════════════════════════════════════════════

function callAnthropicProxy(imageBase64, prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_KEY לא מוגדר ב-Script Properties');
  
  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: prompt }
      ]
    }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
  const data = JSON.parse(response.getContentText());
  
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || '';
}

// ═══════════════════════════════════════════════════════════════════
// BACKUP - גיבוי אוטומטי
// ═══════════════════════════════════════════════════════════════════

// הרץ את הפונקציה הזו פעם אחת כדי להגדיר גיבוי אוטומטי פעמיים ביום
function setupBackupTriggers() {
  // מחק טריגרים קיימים למניעת כפילויות
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'autoBackup')
    .forEach(t => ScriptApp.deleteTrigger(t));
  
  // גיבוי בשעה 8 בבוקר
  ScriptApp.newTrigger('autoBackup')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();
  
  // גיבוי בשעה 22 בלילה
  ScriptApp.newTrigger('autoBackup')
    .timeBased()
    .atHour(22)
    .everyDays(1)
    .create();
  
  Logger.log('טריגרים הוגדרו בהצלחה');
}

function autoBackup() {
  const props = PropertiesService.getScriptProperties();
  const now = new Date();
  const sheetName = Utilities.formatDate(now, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm');
  const allProps = props.getProperties();
  let backedUp = 0;

  // גבה כל משתמש שיש לו SHEET_ID נפרד
  Object.keys(allProps).forEach(key => {
    if (!key.startsWith('SHEET_ID_')) return;
    const username = key.replace('SHEET_ID_', '');
    const ssId = allProps[key];
    try {
      const ss = SpreadsheetApp.openById(ssId);
      const dataSheet = ss.getSheetByName('poker_data');
      if (!dataSheet) return;
      const data = dataSheet.getDataRange().getValues();
      if (!data || data.length <= 1) return;

      // קובץ גיבוי ייחודי למשתמש
      const backupFileName = 'Poker Suite Backup — ' + ss.getName().replace('Poker Suite — ', '');
      const files = DriveApp.getFilesByName(backupFileName);
      let backupSS = files.hasNext()
        ? SpreadsheetApp.open(files.next())
        : (() => { const s = SpreadsheetApp.create(backupFileName); moveToPokerFolder(s.getId()); return s; })();

      // הגבל ל-20 גיבויים
      const sheets = backupSS.getSheets();
      if (sheets.length >= 20) backupSS.deleteSheet(sheets[0]);

      const newSheet = backupSS.insertSheet(sheetName);
      newSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      backedUp++;
      Logger.log('גיבוי הושלם: ' + backupFileName + ' — ' + sheetName);
    } catch(e) {
      Logger.log('שגיאה בגיבוי ' + username + ': ' + e.toString());
    }
  });

  // גבה גם את ה-Spreadsheet הגלובלי (backward compat — יאיר)
  try {
    const globalId = props.getProperty('SPREADSHEET_ID');
    if (globalId) {
      const ss = SpreadsheetApp.openById(globalId);
      // גבה כל טאב שמתחיל ב-user_
      ss.getSheets().forEach(sheet => {
        const name = sheet.getName();
        if (!name.startsWith('user_') && name !== 'poker_data') return;
        const data = sheet.getDataRange().getValues();
        if (!data || data.length <= 1) return;

        const backupFileName = 'Poker Suite Backup — ' + (name === 'poker_data' ? 'global' : name.replace('user_',''));
        const files = DriveApp.getFilesByName(backupFileName);
        let backupSS = files.hasNext()
          ? SpreadsheetApp.open(files.next())
          : (() => { const s = SpreadsheetApp.create(backupFileName); moveToPokerFolder(s.getId()); return s; })();

        const sheets = backupSS.getSheets();
        if (sheets.length >= 20) backupSS.deleteSheet(sheets[0]);

        const newSheet = backupSS.insertSheet(sheetName);
        newSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
        backedUp++;
      });
    }
  } catch(e) { Logger.log('שגיאה בגיבוי גלובלי: ' + e.toString()); }

  Logger.log('סה"כ גיבויים: ' + backedUp);
  return { ok: true, count: backedUp, sheet: sheetName };
}

// הרץ פונקציה זו פעם אחת כדי להזיז את כל קבצי Poker Suite לתיקייה
function migrateAllFilesToFolder() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const folder = DriveApp.getFolderById(POKER_FOLDER_ID);
  let moved = 0;

  Object.keys(props).forEach(key => {
    if (key !== 'SPREADSHEET_ID' && !key.startsWith('SHEET_ID_')) return;
    const fileId = props[key];
    try {
      const file = DriveApp.getFileById(fileId);
      // בדוק שהקובץ לא כבר בתיקייה
      const parents = file.getParents();
      let alreadyIn = false;
      while (parents.hasNext()) {
        if (parents.next().getId() === POKER_FOLDER_ID) { alreadyIn = true; break; }
      }
      if (!alreadyIn) {
        folder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
        Logger.log('הוזז: ' + file.getName());
        moved++;
      }
    } catch(e) {
      Logger.log('שגיאה עם ' + key + ': ' + e.toString());
    }
  });

  Logger.log('סה"כ הוזזו: ' + moved + ' קבצים');
}

// הרץ את הפונקציה הזו כדי לבדוק שהכל עובד
function testSetup() {
  const sheet = getOrCreateSheet();
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  Logger.log('✓ Sheet ready: https://docs.google.com/spreadsheets/d/' + ssId);
  
  // Test write
  sheet.appendRow(['test', 'hello', new Date().toString()]);
  Logger.log('✓ Write test passed');
  
  // Clean test row
  const last = sheet.getLastRow();
  sheet.deleteRow(last);
  Logger.log('✓ Setup complete!');
}
