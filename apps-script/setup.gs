/**
 * Run ONCE from the Apps Script editor (select "setup" -> Run).
 * Safe to run again: every step checks before changing anything.
 *
 * 1. Backs up TASK DATABASE, DASHBOARD, MILESTONES & RISKS, SETTINGS (hidden tabs)
 * 2. Fixes template bugs (shifted columns, text dates, broken dashboard formulas, ...)
 * 3. Creates USERS / ACTIVITY LOG / UPLOADS tabs and adds you as the first user
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var p = props_();
  if (!p.getProperty('SESSION_SECRET')) {
    p.setProperty('SESSION_SECRET', Utilities.getUuid() + Utilities.getUuid());
  }
  // "criminals docs" folder. Change it in Script properties if the folder moves.
  if (!p.getProperty('DRIVE_FOLDER_ID')) {
    p.setProperty('DRIVE_FOLDER_ID', '1N71gnZRUF1VkqJ9Z6mifKFlcz6CqCA4o');
  }

  backup_(ss);
  fixTasks_(ss);
  fixDates_(ss);
  fixSettings_(ss);
  fixDashboard_(ss);
  fixRisks_(ss);
  createTabs_(ss);
  SpreadsheetApp.flush();
  bumpRev_();
  p.setProperty('SETUP_DONE', new Date().toISOString());

  var missing = ['OAUTH_CLIENT_ID', 'DRIVE_FOLDER_ID'].filter(function (k) { return !p.getProperty(k); });
  console.log('Setup done.' + (missing.length ? ' Still missing script properties: ' + missing.join(', ') : ''));
}

function backup_(ss) {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  [TABS.TASKS, TABS.DASH, TABS.MR, TABS.SETTINGS].forEach(function (name) {
    var already = ss.getSheets().some(function (s) { return s.getName().indexOf('_BACKUP ' + name) === 0; });
    if (already) return;
    var copy = ss.getSheetByName(name).copyTo(ss);
    copy.setName(('_BACKUP ' + name + ' ' + stamp).slice(0, 99));
    copy.hideSheet();
  });
}

var REVIEW_VALUES_ = ['Not Reviewed', 'Approved', 'Changes Required'];
var TASK_ID_RE_ = /^[A-Z]{2}-\d{2}$/;

function fixTasks_(ss) {
  var sh = ss.getSheetByName(TABS.TASKS);
  var def = ENTITIES.tasks;
  var vals = sh.getDataRange().getDisplayValues();
  var loc = locate_(def, vals);
  var S = 18, T = 19, U = 20, V = 21, W = 22, X = 23, Y = 24;

  for (var r = loc.start; r < loc.end; r++) {
    var row = vals[r];
    var sheetRow = r + 1;
    var dirty = false;
    var out = row.slice(S, Y + 1); // S..Y

    // a) dependency IDs that spilled into T..W (OP-07) -> merge into S
    var spilled = [T, U, V, W].filter(function (c) { return TASK_ID_RE_.test(String(row[c]).trim()); });
    if (spilled.length) {
      var deps = String(row[S]).split(',').map(function (s) { return s.trim(); }).filter(String);
      spilled.forEach(function (c) { deps.push(String(row[c]).trim()); out[c - S] = ''; });
      out[0] = deps.join(', ');
      dirty = true;
    }

    // b) Review Result sitting in Last Updated (X), note text sitting in Review Result (W)
    var w = String(out[W - S]).trim();
    var x = String(out[X - S]).trim();
    if (REVIEW_VALUES_.indexOf(x) >= 0 && REVIEW_VALUES_.indexOf(w) < 0) {
      if (w) out[Y - S] = out[Y - S] ? out[Y - S] + ' | ' + w : w;
      out[W - S] = x;
      out[X - S] = '';
      dirty = true;
    }

    if (dirty) {
      sh.getRange(sheetRow, S + 1, 1, out.length).setNumberFormat('@').setValues([out]);
    }
  }

  // c) "Updated By" header in column Z
  var hdr = sh.getRange(loc.start, 26);
  if (!hdr.getValue()) {
    sh.getRange(loc.start, 25).copyTo(hdr, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    hdr.setValue('Updated By');
    sh.setColumnWidth(26, 130);
  }

  // d) Priority dropdown had a bogus "Priority" option; header cell had a dropdown too
  sh.getRange(loc.start, 12).clearDataValidations();
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Critical', 'High', 'Medium', 'Low'], true).setAllowInvalid(false).build();
  sh.getRange(loc.start + 1, 12, sh.getMaxRows() - loc.start, 1).setDataValidation(rule);
}

/** Planner dates were typed as text -> convert to real dates (same look) so formulas can use them. */
function fixDates_(ss) {
  convertDates_(ss, 'tasks', [12, 13, 14, 15, 23]);   // M N O P X
  convertDates_(ss, 'milestones', [4, 5]);            // E F
  convertDates_(ss, 'weekly', [0, 1, 14]);            // A B O
}

function convertDates_(ss, entity, cols) {
  var def = ENTITIES[entity];
  var sh = ss.getSheetByName(def.tab);
  var vals = sh.getDataRange().getDisplayValues();
  var loc = locate_(def, vals);
  if (!loc || loc.end <= loc.start) return;
  cols.forEach(function (c) {
    var range = sh.getRange(loc.start + 1, c + 1, loc.end - loc.start, 1);
    var raw = range.getValues();
    var changed = false;
    var out = raw.map(function (rr) {
      var v = rr[0];
      if (v instanceof Date || v === '') return [v];
      var d = parseDate_(String(v).trim());
      if (d) { changed = true; return [d]; }
      return [v];
    });
    if (changed) range.setNumberFormat(DATE_FORMAT).setValues(out);
  });
}

var TEAM_ = [
  ['Monzer', 'منذر', 'Student'], ['Arwa', 'اروى', 'Student'], ['Amal', 'امل', 'Student'],
  ['Nesma', 'نسمه', 'Student'], ['Aysel', 'ايسل', 'Student'], ['Jory', 'جوري', 'Student'],
  ['Saja', 'ساجا', 'Student'], ['Malek', 'مالك', 'Student'], ['Hamza', 'حمزه', 'Student'],
  ['Eslam', 'اسلام', 'Student'], ['Eng. Ziad', 'م. زياد', 'Instructor'], ['Eng. Ahmed Tarek', 'م. احمد طارق', 'Instructor']
];

function fixSettings_(ss) {
  var sh = ss.getSheetByName(TABS.SETTINGS);
  var vals = sh.getDataRange().getDisplayValues();
  for (var r = 0; r < vals.length; r++) {
    var a = norm_(vals[r][0]);
    if (a === 'team name:' && /enter team name/i.test(vals[r][1])) sh.getRange(r + 1, 2).setValue('Criminals');
    if (a === 'head coach:' && /enter coach/i.test(vals[r][1])) sh.getRange(r + 1, 2).setValue('Eng. Ziad');
    if (a === 'assistant coach:' && /enter name/i.test(vals[r][1])) sh.getRange(r + 1, 2).setValue('Eng. Ahmed Tarek');
    if (/^example:/i.test(vals[r][0])) sh.getRange(r + 1, 1, 1, 6).clearContent();
  }
  // Team Directory: fill student names if it's empty
  var team = readEntity_(ss, 'team');
  var def = ENTITIES.team;
  var loc = locate_(def, sh.getDataRange().getDisplayValues());
  if (team.length === 0 && loc) {
    var students = TEAM_.filter(function (p) { return p[2] === 'Student'; });
    var room = loc.end - loc.start;
    if (room < students.length) sh.insertRowsBefore(loc.end + 1, students.length - room);
    sh.getRange(loc.start + 1, 1, students.length, 1).setValues(students.map(function (p) { return [p[0]]; }));
  }
}

function fixDashboard_(ss) {
  var sh = ss.getSheetByName(TABS.DASH);
  var vals = sh.getDataRange().getDisplayValues();
  var settings = ss.getSheetByName(TABS.SETTINGS).getDataRange().getDisplayValues();
  var teamRow = -1, compRow = -1;
  settings.forEach(function (r, i) {
    if (norm_(r[0]) === 'team name:') teamRow = i + 1;
    if (norm_(r[0]) === 'competition date:') compRow = i + 1;
  });

  var T = "'TASK DATABASE'!";
  var ID = T + 'A3:A', WS = T + 'C3:C', ST = T + 'Q3:Q', DL = T + 'N3:N';

  for (var r = 0; r < vals.length; r++) {
    var a = norm_(vals[r][0]);
    var row = r + 1;
    // Season overview: link to SETTINGS instead of hardcoded values
    if (a === 'team name:' && teamRow > 0) sh.getRange(row, 2).setFormula('=SETTINGS!B' + teamRow);
    if (a === 'competition date:' && compRow > 0) sh.getRange(row, 2).setFormula('=SETTINGS!B' + compRow);

    // Task overview KPI row (the row under "Total Tasks")
    if (a === 'total tasks') {
      var k = row + 1;
      sh.getRange(k, 1, 1, 8).setFormulas([[
        '=COUNTA(' + ID + ')',
        '=COUNTIF(' + ST + ',"Completed")',
        '=COUNTIF(' + ST + ',"In Progress")',
        '=COUNTIF(' + ST + ',"Blocked")',
        '=COUNTIF(' + ST + ',"Not Started")',
        '=IFERROR(COUNTIF(' + ST + ',"Completed")/(COUNTA(' + ID + ')-COUNTIF(' + ST + ',"Cancelled")),0)',
        '=COUNTIF(' + ST + ',"Cancelled")',
        '=COUNTIF(' + ST + ',"Under Review")'
      ]]);
    }

    // Workstream progress rows
    if (ID_PREFIX[vals[r][0]]) {
      var w = '$A' + row;
      sh.getRange(row, 2, 1, 6).setFormulas([[
        '=COUNTIF(' + WS + ',' + w + ')',
        '=COUNTIFS(' + WS + ',' + w + ',' + ST + ',"Completed")',
        '=COUNTIFS(' + WS + ',' + w + ',' + ST + ',"In Progress")',
        '=COUNTIFS(' + WS + ',' + w + ',' + ST + ',"Blocked")',
        '=COUNTIFS(' + WS + ',' + w + ',' + DL + ',"<"&TODAY(),' + ST + ',"<>Completed",' + ST + ',"<>Cancelled")',
        '=IFERROR(COUNTIFS(' + WS + ',' + w + ',' + ST + ',"Completed")/(COUNTIF(' + WS + ',' + w + ')-COUNTIFS(' + WS + ',' + w + ',' + ST + ',"Cancelled")),0)'
      ]]);
      sh.getRange(row, 6).setNumberFormat('0');
    }

    // Upcoming milestones: live list instead of a static copy
    if (a.indexOf('d. upcoming milestones') === 0) {
      var first = row + 2; // under the column headers
      var last = first;
      while (last <= vals.length && !norm_(vals[last - 1][0]).match(/^e\./)) last++;
      var height = Math.max(1, last - first - 1);
      sh.getRange(first, 1, height, 5).clearContent();
      var M = "'MILESTONES & RISKS'!";
      sh.getRange(first, 1).setFormula(
        '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({' + M + 'A4:A40,' + M + 'B4:B40,' + M + 'C4:C40,' + M + 'E4:E40,' + M + 'K4:K40},' +
        'ISNUMBER(' + M + 'E4:E40),' + M + 'E4:E40>=TODAY(),' + M + 'E4:E40<=TODAY()+30,' + M + 'K4:K40<>"Completed"),4,TRUE),' +
        height + ',5),"No milestones in the next 30 days")');
      sh.getRange(first, 4, height, 1).setNumberFormat(DATE_FORMAT);
    }
  }
}

function fixRisks_(ss) {
  var def = ENTITIES.risks;
  var sh = ss.getSheetByName(def.tab);
  var vals = sh.getDataRange().getDisplayValues();
  var loc = locate_(def, vals);
  if (!loc) return;
  for (var r = loc.start; r < loc.end; r++) {
    var cell = sh.getRange(r + 1, 7);
    if (!cell.getFormula()) cell.setFormula(def.formulas.score(r + 1));
  }
}

function createTabs_(ss) {
  ensureTab_(ss, TABS.USERS, ['Email', 'Name', 'Name (Arabic)', 'Team Role', 'Task Roles', 'Language', 'Photo', 'Permissions'], [180, 140, 140, 110, 260, 90, 120, 260]);
  ensureTab_(ss, TABS.LOG, ['Timestamp', 'Name', 'Email', 'Entity', 'ID', 'Field', 'Old Value', 'New Value'],
    [150, 120, 180, 100, 80, 130, 220, 220]);
  ensureTab_(ss, TABS.UPLOADS, ['Timestamp', 'Name', 'Email', 'File Name', 'URL', 'Folder', 'Task ID', 'Note', 'Size'],
    [150, 120, 180, 200, 260, 160, 80, 200, 80]);

  // Team list: emails are filled in later (sheet or dashboard -> Team).
  // A row with no email can't log in yet, so leaving them empty is safe.
  var users = ss.getSheetByName(TABS.USERS);
  if (users.getLastRow() < 2) {
    var me = Session.getEffectiveUser().getEmail();
    var rows = TEAM_.map(function (p, i) {
      return [i === 0 ? me : '', p[0], p[1], p[2], '', 'ar'];
    });
    users.getRange(2, 1, rows.length, 6).setValues(rows);
  }
  // Team Role dropdown
  users.getRange('D2:D200').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Student', 'Instructor'], true).build());
  users.getRange('F2:F200').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['en', 'ar'], true).build());
  ss.getSheetByName(TABS.LOG).getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  ss.getSheetByName(TABS.UPLOADS).getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
}

function ensureTab_(ss, name, headers, widths) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1b1f3b');
  sh.setFrozenRows(1);
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  return sh;
}
