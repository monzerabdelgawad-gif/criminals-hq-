/**
 * The only file that knows the sheet layout.
 * Sections are found by their header text (not fixed row numbers),
 * so inserting rows in the sheet won't break the dashboard.
 */

var TABS = {
  SETTINGS: 'SETTINGS',
  TASKS: 'TASK DATABASE',
  CALENDAR: 'SEASON CALENDAR',
  WEEKLY: 'WEEKLY REVIEW',
  MR: 'MILESTONES & RISKS',
  DASH: 'DASHBOARD',
  GUIDE: 'USER GUIDE',
  USERS: 'USERS',
  LOG: 'ACTIVITY LOG',
  UPLOADS: 'UPLOADS'
};

var DATE_FORMAT = 'dd mmm yyyy';

/**
 * keyMode 'id'  -> rows found by the value in column A (Task ID, M-01, ...)
 * keyMode 'row' -> rows found by sheet row number (sections without IDs)
 * fields: one entry per column starting at column A (null = skip column)
 */
var ENTITIES = {
  tasks: {
    tab: TABS.TASKS, header: 'Task ID', keyMode: 'id',
    fields: ['id', 'season', 'workstream', 'subcategory', 'task', 'procedure', 'deliverable',
      'acceptance', 'owner', 'supporting', 'reviewer', 'priority', 'plannedStart',
      'plannedDeadline', 'actualStart', 'actualCompletion', 'status', 'completion',
      'dependency', 'blocker', 'nextAction', 'evidence', 'review', 'lastUpdated', 'notes',
      'updatedBy'],
    dateFields: ['plannedStart', 'plannedDeadline', 'actualStart', 'actualCompletion', 'lastUpdated'],
    numberFields: ['completion'],
    readOnly: ['id', 'lastUpdated', 'updatedBy'],
    stamp: { date: 'lastUpdated', by: 'updatedBy' }
  },
  milestones: {
    tab: TABS.MR, header: 'Milestone ID', keyMode: 'id',
    fields: ['id', 'workstream', 'name', 'description', 'targetDate', 'actualDate', 'evidence',
      'acceptance', 'responsible', 'reviewer', 'status', 'reviewNotes', 'relatedTasks'],
    dateFields: ['targetDate', 'actualDate'],
    readOnly: ['id']
  },
  risks: {
    tab: TABS.MR, header: 'Risk ID', keyMode: 'id',
    fields: ['id', 'dateIdentified', 'workstream', 'description', 'likelihood', 'impact', 'score',
      'warning', 'mitigation', 'contingency', 'owner', 'reviewDate', 'status'],
    numberFields: ['likelihood', 'impact'],
    readOnly: ['id', 'score'],
    formulas: { score: function (r) { return '=E' + r + '*F' + r; } }
  },
  weekly: {
    tab: TABS.WEEKLY, header: 'Week Starting', keyMode: 'id',
    fields: ['id', 'weekEnd', 'workstream', 'objectives', 'plannedTasks', 'completedTasks',
      'incompleteTasks', 'blockedTasks', 'evidence', 'coachFeedback', 'decisions', 'corrective',
      'nextPriorities', 'responsible', 'reviewDate', 'completionRate'],
    dateFields: ['id', 'weekEnd', 'reviewDate'],
    readOnly: ['id', 'weekEnd']
  },
  weeklyQ: {
    tab: TABS.WEEKLY, after: 'WEEKLY REVIEW TEMPLATE', keyMode: 'row', maxRows: 5,
    fields: ['question', null, null, null, null, null, null, null, 'answer'],
    readOnly: ['question']
  },
  settings: {
    tab: TABS.SETTINGS, after: 'A. SEASON SETTINGS', until: 'B. TEAM DIRECTORY', keyMode: 'row',
    fields: ['label', 'value', 'hint'],
    readOnly: ['label', 'hint']
  },
  team: {
    tab: TABS.SETTINGS, header: 'Student Name', until: 'C. OFFICIAL RESOURCES', keyMode: 'row',
    fields: ['name', 'responsibilities', 'supporting', 'skills', 'mentor', 'availability']
  },
  resources: {
    tab: TABS.SETTINGS, header: 'Resource Name', until: 'D. DROPDOWN REFERENCE VALUES', keyMode: 'row',
    fields: ['name', 'workstream', 'url', 'version', 'lastChecked', 'verifiedBy']
  },
  users: {
    tab: TABS.USERS, header: 'Email', keyMode: 'row',
    fields: ['email', 'name', 'nameAr', 'teamRole', 'taskRoles', 'lang', 'photo']
  }
};

var ID_PREFIX = {
  'Innovation Project': 'IP',
  'Robot Design': 'RD',
  'Robot Game': 'RG',
  'Core Values': 'CV',
  'Operations & Competition Readiness': 'OP'
};

function norm_(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Returns {start, end} as 0-based row indexes into vals (end exclusive). */
function locate_(def, vals) {
  var i, start = -1;
  if (def.header) {
    for (i = 0; i < vals.length; i++) {
      if (norm_(vals[i][0]) === norm_(def.header)) { start = i + 1; break; }
    }
  } else if (def.after) {
    for (i = 0; i < vals.length; i++) {
      if (norm_(vals[i][0]).indexOf(norm_(def.after)) === 0) { start = i + 1; break; }
    }
  }
  if (start < 0) return null;

  var end;
  if (def.until) {
    end = vals.length;
    for (i = start; i < vals.length; i++) {
      if (norm_(vals[i][0]).indexOf(norm_(def.until)) === 0) { end = i; break; }
    }
  } else if (def.maxRows) {
    end = Math.min(vals.length, start + def.maxRows);
  } else if (def.keyMode === 'id') {
    end = start;
    while (end < vals.length && String(vals[end][0] || '').trim() !== '') end++;
  } else {
    // row-keyed table without end marker (USERS): to the last non-empty row
    end = vals.length;
    while (end > start && isBlankRow_(vals[end - 1])) end--;
  }
  return { start: start, end: end };
}

function isBlankRow_(row) {
  for (var i = 0; i < row.length; i++) if (String(row[i]).trim() !== '') return false;
  return true;
}

function rowToObj_(def, rowVals, sheetRow) {
  var o = { _row: sheetRow };
  def.fields.forEach(function (f, i) { if (f) o[f] = rowVals[i] == null ? '' : String(rowVals[i]); });
  if (def.keyMode === 'row') o.id = 'r' + sheetRow;
  return o;
}

function readEntity_(ss, name) {
  var def = ENTITIES[name];
  var sh = ss.getSheetByName(def.tab);
  if (!sh) return [];
  var vals = sh.getDataRange().getDisplayValues();
  var loc = locate_(def, vals);
  if (!loc) return [];
  var out = [];
  for (var r = loc.start; r < loc.end; r++) {
    if (isBlankRow_(vals[r].slice(0, def.fields.length))) continue;
    out.push(rowToObj_(def, vals[r], r + 1));
  }
  return out;
}

/** 0-based index into vals of the row for this id, or -1. */
function findRowIndex_(def, vals, id) {
  var loc = locate_(def, vals);
  if (!loc) return -1;
  if (def.keyMode === 'row') {
    var idx = parseInt(String(id).replace('r', ''), 10) - 1;
    return idx >= loc.start && idx < loc.end ? idx : -1;
  }
  for (var r = loc.start; r < loc.end; r++) {
    if (String(vals[r][0]).trim() === String(id).trim()) return r;
  }
  return -1;
}
