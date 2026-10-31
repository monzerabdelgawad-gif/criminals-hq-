/**
 * Criminals dashboard API (Google Apps Script web app, bound to the season sheet).
 * Deploy: Execute as "Me", Who has access "Anyone".
 * Access control is done here: Google sign-in token -> USERS allowlist -> signed session.
 *
 * Script Properties (Project Settings -> Script properties):
 *   OAUTH_CLIENT_ID  Google OAuth Web client ID (same one used by the website)
 *   DRIVE_FOLDER_ID  Drive folder that receives uploads
 *   SESSION_SECRET   created automatically by setup()
 */

var SESSION_DAYS = 30;
var MAX_UPLOAD_MB = 25;

function doGet() {
  return json_({ ok: true, app: 'criminals-dashboard', time: new Date().toISOString() });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  try {
    var action = body.action;
    if (action === 'login') return json_(apiLogin_(body));

    var user = verifySession_(body.token);
    if (!user) return json_({ ok: false, error: 'unauthorized' });

    switch (action) {
      case 'rev': return json_({ ok: true, rev: getRev_() });
      case 'getAll': return json_(apiGetAll_(user));
      case 'update': return json_(apiUpdate_(user, body));
      case 'add': return json_(apiAdd_(user, body));
      case 'upload': return json_(apiUpload_(user, body));
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server_error', message: String(err && err.message || err) });
  }
}

/* ---------------- auth ---------------- */

function props_() { return PropertiesService.getScriptProperties(); }

function apiLogin_(body) {
  var clientId = props_().getProperty('OAUTH_CLIENT_ID');
  if (!clientId) return { ok: false, error: 'not_configured' };

  var res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(body.idToken || ''),
    { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return { ok: false, error: 'invalid_google_token' };
  var info = JSON.parse(res.getContentText());
  if (info.aud !== clientId || String(info.email_verified) !== 'true') {
    return { ok: false, error: 'invalid_google_token' };
  }

  var user = findUser_(info.email);
  if (!user) return { ok: false, error: 'not_allowed', email: info.email };

  // first sign-in: use the Google profile photo until the member uploads their own
  if (!user.photo && /^https:\/\/lh\d\.googleusercontent\.com\//.test(info.picture || '')) {
    setOwnPhoto_(user, info.picture);
    user.photo = info.picture;
  }

  var payload = { e: user.email, x: Date.now() + SESSION_DAYS * 864e5 };
  return { ok: true, token: sign_(payload), user: user, picture: info.picture || '' };
}

function sign_(obj) {
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify(obj));
  var sig = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, props_().getProperty('SESSION_SECRET')));
  return payload + '.' + sig;
}

function verifySession_(token) {
  if (!token || token.indexOf('.') < 0) return null;
  var parts = token.split('.');
  var expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(parts[0], props_().getProperty('SESSION_SECRET')));
  if (expected !== parts[1]) return null;
  var data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  if (!data.x || data.x < Date.now()) return null;
  return findUser_(data.e); // removed from USERS = locked out immediately
}

function findUser_(email) {
  var e = String(email || '').trim().toLowerCase();
  if (!e) return null;
  var users = readEntity_(SpreadsheetApp.getActiveSpreadsheet(), 'users');
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].email).trim().toLowerCase() === e) {
      var u = users[i];
      return {
        email: e,
        name: u.name || e.split('@')[0],
        nameAr: u.nameAr || '',
        teamRole: u.teamRole || 'Student',
        taskRoles: String(u.taskRoles || '').split(',').map(function (s) { return s.trim(); }).filter(String),
        lang: u.lang || 'en',
        photo: u.photo || '',
        isAdmin: isAdmin_(e, u.teamRole),
        perms: parsePerms_(u.perms)
      };
    }
  }
  return null;
}

/* ---------------- read ---------------- */

function apiGetAll_(user) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = {};
  Object.keys(ENTITIES).forEach(function (k) { data[k] = readEntity_(ss, k); });
  var folderId = props_().getProperty('DRIVE_FOLDER_ID');
  return {
    ok: true,
    rev: getRev_(),
    me: user,
    data: data,
    dropdowns: readDropdowns_(ss),
    activity: readLog_(ss, TABS.LOG, 200),
    uploads: readLog_(ss, TABS.UPLOADS, 200),
    guide: readGuide_(ss),
    folderUrl: folderId ? 'https://drive.google.com/drive/folders/' + folderId : '',
    admins: adminEmails_()
  };
}

function readDropdowns_(ss) {
  var out = {};
  var sh = ss.getSheetByName(TABS.SETTINGS);
  var vals = sh.getDataRange().getDisplayValues();
  var start = -1;
  for (var i = 0; i < vals.length; i++) {
    if (norm_(vals[i][0]).indexOf('d. dropdown') === 0) { start = i + 1; break; }
  }
  if (start > 0) {
    for (var r = start; r < vals.length && vals[r][0]; r++) {
      out[vals[r][0]] = vals[r].slice(1).filter(function (v) { return String(v).trim() !== ''; });
    }
  }
  // Owner / supporting lists come from the TASK DATABASE dropdowns
  var t = ss.getSheetByName(TABS.TASKS);
  out.Owners = validationList_(t.getRange('I3'));
  out.Supporting = validationList_(t.getRange('J3'));
  return out;
}

function validationList_(range) {
  var dv = range.getDataValidation();
  if (!dv || dv.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) return [];
  return dv.getCriteriaValues()[0];
}

function readLog_(ss, tab, limit) {
  var sh = ss.getSheetByName(tab);
  if (!sh || sh.getLastRow() < 2) return [];
  var n = Math.min(limit, sh.getLastRow() - 1);
  var first = sh.getLastRow() - n + 1;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var rows = sh.getRange(first, 1, n, headers.length).getDisplayValues();
  return rows.reverse().map(function (r) {
    var o = {};
    headers.forEach(function (h, i) { o[camel_(h)] = r[i]; });
    return o;
  });
}

function camel_(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+(.)/g, function (m, c) { return c.toUpperCase(); })
    .replace(/[^a-zA-Z0-9]/g, '');
}

function readGuide_(ss) {
  var sh = ss.getSheetByName(TABS.GUIDE);
  if (!sh) return [];
  return sh.getDataRange().getDisplayValues()
    .map(function (r) { return [r[0], r[1]]; })
    .filter(function (r) { return r[0] || r[1]; });
}

/* ---------------- write ---------------- */

/**
 * body: { entity, id, changes: [{ field, value, expected }] }
 * expected = what the user saw; if the sheet changed meanwhile -> conflict, nothing written.
 */
function apiUpdate_(user, body) {
  var def = ENTITIES[body.entity];
  if (!def) return { ok: false, error: 'bad_entity' };
  var changes = body.changes || [];
  if (!changes.length) return { ok: false, error: 'no_changes' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(def.tab);
    var vals = sh.getDataRange().getDisplayValues();
    var idx = findRowIndex_(def, vals, body.id);
    if (idx < 0) return { ok: false, error: 'not_found' };

    if (body.entity !== 'users' && !canEdit_(user, body.entity)) return { ok: false, error: 'no_permission' };
    if (body.entity === 'users') {
      for (var p = 0; p < changes.length; p++) {
        var why = userFieldBlocked_(user, vals[idx][0], changes[p]);
        if (why) return { ok: false, error: why, field: changes[p].field };
      }
    }

    var conflicts = [];
    for (var i = 0; i < changes.length; i++) {
      var c = changes[i];
      var col = def.fields.indexOf(c.field);
      if (col < 0 || (def.readOnly || []).indexOf(c.field) >= 0) {
        return { ok: false, error: 'read_only', field: c.field };
      }
      var cur = vals[idx][col] == null ? '' : String(vals[idx][col]);
      if (c.expected !== undefined && c.expected !== null && norm_(cur) !== norm_(c.expected)) {
        conflicts.push({ field: c.field, current: cur });
      }
    }
    if (conflicts.length) {
      return { ok: false, error: 'conflict', conflicts: conflicts, row: rowToObj_(def, vals[idx], idx + 1) };
    }

    var sheetRow = idx + 1;
    changes.forEach(function (c) {
      var col = def.fields.indexOf(c.field);
      var old = vals[idx][col];
      writeCell_(sh.getRange(sheetRow, col + 1), def, c.field, c.value);
      log_(ss, user, body.entity, body.id, c.field, old, c.value);
    });
    if (def.stamp) {
      writeCell_(sh.getRange(sheetRow, def.fields.indexOf(def.stamp.date) + 1), def, def.stamp.date, today_());
      writeCell_(sh.getRange(sheetRow, def.fields.indexOf(def.stamp.by) + 1), def, def.stamp.by, user.name);
    }
    // a rescheduled meeting gets its reminders again
    if (body.entity === 'meetings' && changes.some(function (c) { return c.field === 'date' || c.field === 'time'; })) {
      sh.getRange(sheetRow, def.fields.indexOf('remindersSent') + 1).clearContent();
    }
    SpreadsheetApp.flush();
    bumpRev_();
    var fresh = sh.getRange(sheetRow, 1, 1, def.fields.length).getDisplayValues()[0];
    return { ok: true, row: rowToObj_(def, fresh, sheetRow) };
  } finally {
    lock.releaseLock();
  }
}

/** body: { entity, values: {field: value} } -> appends a new row (new ID generated for id-tables). */
function apiAdd_(user, body) {
  var def = ENTITIES[body.entity];
  if (!def || ['tasks', 'milestones', 'risks', 'team', 'resources', 'users', 'meetings'].indexOf(body.entity) < 0) {
    return { ok: false, error: 'bad_entity' };
  }
  if (body.entity === 'users' && !user.isAdmin) return { ok: false, error: 'admin_only' };
  if (body.entity !== 'users' && !canEdit_(user, body.entity)) return { ok: false, error: 'no_permission' };
  var values = body.values || {};
  if (body.entity === 'users') delete values.photo;
  if (body.entity === 'meetings') {
    ensureMeetingsTab_();
    if (!values.status) values.status = 'Scheduled';
    values.createdBy = user.name;
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(def.tab);
    var vals = sh.getDataRange().getDisplayValues();
    var loc = locate_(def, vals);
    if (!loc) return { ok: false, error: 'section_not_found' };

    var sheetRow;
    if (def.keyMode === 'id') {
      values.id = nextId_(body.entity, vals, loc, values);
      sh.insertRowAfter(loc.end); // keeps formatting + dropdowns of the row above
      sheetRow = loc.end + 1;
    } else {
      sheetRow = -1;
      for (var r = loc.start; r < loc.end; r++) {
        if (isBlankRow_(vals[r].slice(0, def.fields.length))) { sheetRow = r + 1; break; }
      }
      if (sheetRow < 0) {
        if (def.until) {
          sh.insertRowBefore(loc.end + 1);
          sheetRow = loc.end + 1;
        } else {
          sheetRow = loc.end + 1;
        }
      }
    }

    if (body.entity === 'tasks' && !values.season) values.season = '2026-2027';
    if (body.entity === 'tasks' && !values.status) values.status = 'Not Started';
    if (body.entity === 'tasks' && !values.completion) values.completion = '0';
    if (body.entity === 'tasks' && !values.review) values.review = 'Not Reviewed';

    def.fields.forEach(function (f, i) {
      if (!f) return;
      var range = sh.getRange(sheetRow, i + 1);
      if (def.formulas && def.formulas[f]) {
        range.setFormula(def.formulas[f](sheetRow));
      } else if (values[f] !== undefined && values[f] !== '') {
        writeCell_(range, def, f, values[f]);
      } else if (def.keyMode === 'id') {
        range.clearContent();
      }
    });
    if (def.stamp) {
      writeCell_(sh.getRange(sheetRow, def.fields.indexOf(def.stamp.date) + 1), def, def.stamp.date, today_());
      writeCell_(sh.getRange(sheetRow, def.fields.indexOf(def.stamp.by) + 1), def, def.stamp.by, user.name);
    }
    var newId = def.keyMode === 'id' ? values.id : 'r' + sheetRow;
    log_(ss, user, body.entity, newId, '(new row)', '', values.task || values.name || values.description || values.email || '');
    SpreadsheetApp.flush();
    bumpRev_();
    var fresh = sh.getRange(sheetRow, 1, 1, def.fields.length).getDisplayValues()[0];
    return { ok: true, row: rowToObj_(def, fresh, sheetRow) };
  } finally {
    lock.releaseLock();
  }
}

function nextId_(entity, vals, loc, values) {
  var prefix = entity === 'milestones' ? 'M' : entity === 'risks' ? 'R' : entity === 'meetings' ? 'MT' : (ID_PREFIX[values.workstream] || 'OP');
  var max = 0;
  for (var r = loc.start; r < loc.end; r++) {
    var m = String(vals[r][0]).match(new RegExp('^' + prefix + '-(\\d+)$'));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + '-' + ('0' + (max + 1)).slice(-2);
}

function writeCell_(range, def, field, value) {
  var v = value == null ? '' : String(value).trim();
  if (v === '') { range.clearContent(); return; }
  if ((def.dateFields || []).indexOf(field) >= 0) {
    var d = parseDate_(v);
    if (d) { range.setNumberFormat(DATE_FORMAT).setValue(d); return; }
  }
  if ((def.numberFields || []).indexOf(field) >= 0 && !isNaN(Number(v))) {
    range.setValue(Number(v));
    return;
  }
  // plain text: stop Sheets from turning "Oct 2026" or "1-2" into dates/numbers
  range.setNumberFormat('@').setValue(v);
}

var MONTHS_ = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Accepts "05 Oct 2026" or "2026-10-05". */
function parseDate_(s) {
  var m = String(s).match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (m && MONTHS_[m[2].toLowerCase()] !== undefined) {
    return new Date(Number(m[3]), MONTHS_[m[2].toLowerCase()], Number(m[1]));
  }
  m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function log_(ss, user, entity, id, field, oldV, newV) {
  var sh = ss.getSheetByName(TABS.LOG);
  if (!sh) return;
  if (field === 'photo') { oldV = oldV ? '(photo)' : ''; newV = newV ? '(new photo)' : '(removed)'; }
  sh.appendRow([new Date(), user.name, user.email, entity, id, field,
    String(oldV == null ? '' : oldV), String(newV == null ? '' : newV)]);
}

/* ---------------- profiles & permissions ---------------- */

var PROFILE_FIELDS_ = ['name', 'nameAr', 'taskRoles', 'lang', 'photo']; // only the member themselves
var ACCESS_FIELDS_ = ['email', 'teamRole', 'perms'];                   // only admins
var MAX_PHOTO_CHARS_ = 45000; // a cell holds 50,000 characters

/**
 * Edit permissions per section, stored in USERS -> Permissions as "all" or a list like "tasks, uploads".
 * Empty = view only. Admins can always edit everything.
 */
var SECTIONS_ = ['tasks', 'milestones', 'risks', 'weekly', 'uploads', 'resources', 'settings'];
var ENTITY_SECTION_ = { tasks: 'tasks', milestones: 'milestones', risks: 'risks', weekly: 'weekly', weeklyQ: 'weekly',
  resources: 'resources', settings: 'settings', team: 'settings', uploads: 'uploads' };

function parsePerms_(v) {
  var s = String(v || '').toLowerCase();
  if (s.trim() === 'all') return SECTIONS_.slice();
  return s.split(',').map(function (x) { return x.trim(); })
    .filter(function (x) { return SECTIONS_.indexOf(x) >= 0; });
}

function canEdit_(user, entityOrSection) {
  if (user.isAdmin) return true;
  if (entityOrSection === 'meetings') return false; // coaches / admins only
  var sec = ENTITY_SECTION_[entityOrSection];
  return !!sec && (user.perms || []).indexOf(sec) >= 0;
}

/**
 * Admins = instructors + the account the script runs as + everyone in the Script property
 * ADMIN_EMAILS (comma separated). ADMIN_EMAILS keeps people admin after the sheet moves to the team account.
 */
function adminEmails_() {
  var list = String(props_().getProperty('ADMIN_EMAILS') || '').toLowerCase().split(',')
    .map(function (s) { return s.trim(); }).filter(String);
  try {
    var owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
    if (owner && list.indexOf(owner) < 0) list.push(owner);
  } catch (e) { /* */ }
  return list;
}

function isAdmin_(email, teamRole) {
  if (String(teamRole) === 'Instructor') return true;
  return adminEmails_().indexOf(String(email).trim().toLowerCase()) >= 0;
}

/** Returns an error code if this user may not make this change to this USERS row, else ''. */
function userFieldBlocked_(user, rowEmail, change) {
  var own = norm_(rowEmail) !== '' && norm_(rowEmail) === norm_(user.email);
  var f = change.field;
  if (ACCESS_FIELDS_.indexOf(f) >= 0) {
    if (!user.isAdmin) return 'admin_only';
    if (own && f === 'email') return 'own_email'; // don't lock yourself out
    return '';
  }
  if (PROFILE_FIELDS_.indexOf(f) >= 0) {
    // admins may fill in profiles of members who haven't joined yet (no email)
    if (!own && !(user.isAdmin && norm_(rowEmail) === '')) return 'not_your_profile';
    if (f === 'photo' && !validPhoto_(change.value)) return 'bad_photo';
    return '';
  }
  return 'read_only';
}

function validPhoto_(v) {
  v = String(v || '');
  if (v === '') return true;
  if (v.length > MAX_PHOTO_CHARS_) return false;
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(v) ||
    /^https:\/\/lh\d\.googleusercontent\.com\/[^\s"'<>]+$/.test(v);
}

function setOwnPhoto_(user, url) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var def = ENTITIES.users;
    var sh = ss.getSheetByName(def.tab);
    var vals = sh.getDataRange().getDisplayValues();
    var loc = locate_(def, vals);
    if (!loc) return;
    var col = def.fields.indexOf('photo') + 1;
    if (sh.getRange(1, col).getValue() === '') sh.getRange(1, col).setValue('Photo');
    for (var r = loc.start; r < loc.end; r++) {
      if (norm_(vals[r][0]) === norm_(user.email)) {
        sh.getRange(r + 1, col).setNumberFormat('@').setValue(url);
        bumpRev_();
        return;
      }
    }
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- uploads ---------------- */

/** body: { fileName, mimeType, data (base64), workstream, taskId, note } */
function apiUpload_(user, body) {
  if (!canEdit_(user, 'uploads')) return { ok: false, error: 'no_permission' };
  var folderId = props_().getProperty('DRIVE_FOLDER_ID');
  if (!folderId) return { ok: false, error: 'no_folder' };
  if (!body.data || !body.fileName) return { ok: false, error: 'no_file' };

  var bytes = Utilities.base64Decode(body.data);
  if (bytes.length > MAX_UPLOAD_MB * 1024 * 1024) return { ok: false, error: 'too_big' };

  var root = DriveApp.getFolderById(folderId);
  var folder = root;
  var sub = String(body.workstream || '').trim();
  if (sub) {
    var it = root.getFoldersByName(sub);
    folder = it.hasNext() ? it.next() : root.createFolder(sub);
  }
  var blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.fileName);
  var file = folder.createFile(blob);
  file.setDescription('Uploaded by ' + user.name + ' via Criminals dashboard' + (body.note ? ' — ' + body.note : ''));

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheetByName(TABS.UPLOADS).appendRow([new Date(), user.name, user.email, body.fileName,
    file.getUrl(), sub || '(root)', body.taskId || '', body.note || '', Math.round(bytes.length / 1024) + ' KB']);
  log_(ss, user, 'uploads', body.taskId || '-', 'file', '', body.fileName);

  // attach link to the task's Evidence column
  if (body.taskId) {
    var def = ENTITIES.tasks;
    var sh = ss.getSheetByName(def.tab);
    var vals = sh.getDataRange().getDisplayValues();
    var idx = findRowIndex_(def, vals, body.taskId);
    if (idx >= 0) {
      var col = def.fields.indexOf('evidence');
      var cur = vals[idx][col];
      var next = cur ? cur + '\n' + file.getUrl() : file.getUrl();
      writeCell_(sh.getRange(idx + 1, col + 1), def, 'evidence', next);
      writeCell_(sh.getRange(idx + 1, def.fields.indexOf('lastUpdated') + 1), def, 'lastUpdated', today_());
      writeCell_(sh.getRange(idx + 1, def.fields.indexOf('updatedBy') + 1), def, 'updatedBy', user.name);
    }
  }
  bumpRev_();
  return { ok: true, url: file.getUrl(), id: file.getId(), folder: sub || '(root)' };
}

/* ---------------- change counter ---------------- */

function getRev_() { return Number(props_().getProperty('REV') || 0); }
function bumpRev_() { props_().setProperty('REV', String(getRev_() + 1)); }

/** Simple trigger: edits made directly in the sheet also refresh the dashboard. */
function onEdit(e) { bumpRev_(); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
