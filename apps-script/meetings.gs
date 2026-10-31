/**
 * Meetings: a MEETINGS tab that only coaches/admins can edit, plus automatic email reminders
 * to the students (instructors are not emailed):
 *   - the morning of the meeting day (from MORNING_HOUR_, Cairo time)
 *   - 1 hour before
 *   - when it starts
 * Emails are sent from the Google account that owns this script (move the sheet to the team
 * account and they come from the team account).
 *
 * One-time: run `setupMeetings` from the editor (creates the tab + the 5-minute reminder trigger).
 */

var MEETING_TZ_ = 'Africa/Cairo';
var MORNING_HOUR_ = 8;          // morning reminder from 08:00
var LIVE_WINDOW_MIN_ = 15;      // "starting now" email is sent up to 15 min after the start
var SITE_URL_DEFAULT_ = 'https://criminals-hq.vercel.app';

function setupMeetings() {
  ensureMeetingsTab_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'meetingReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('meetingReminders').timeBased().everyMinutes(5).create();
  console.log('Meetings ready. Reminder emails left today: ' + MailApp.getRemainingDailyQuota());
}

function ensureMeetingsTab_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ensureTab_(ss, TABS.MEETINGS,
    ['Meeting ID', 'Title', 'Date', 'Start Time', 'Duration (min)', 'Link', 'Location', 'Agenda', 'Notes / Minutes',
      'Status', 'Created By', 'Reminders Sent'],
    [90, 220, 110, 90, 100, 240, 140, 260, 260, 100, 110, 110]);
}

/** Start of a meeting row as a real Date (Cairo time), or null if date/time are missing. */
function meetingStart_(m) {
  var d = parseDate_(m.date);
  var t = String(m.time || '').match(/^(\d{1,2}):(\d{2})/);
  if (!d || !t) return null;
  var ymd = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  return Utilities.parseDate(ymd + ' ' + ('0' + t[1]).slice(-2) + ':' + t[2], MEETING_TZ_, 'yyyy-MM-dd HH:mm');
}

/** Time-driven trigger (every 5 min). Sends each reminder once; flags are kept in "Reminders Sent". */
function meetingReminders() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var def = ENTITIES.meetings;
    var sh = ss.getSheetByName(def.tab);
    if (!sh) return;
    var now = new Date();
    var flagCol = def.fields.indexOf('remindersSent') + 1;
    readEntity_(ss, 'meetings').forEach(function (m) {
      if (String(m.status) === 'Cancelled') return;
      var start = meetingStart_(m);
      if (!start) return;
      var mins = (start.getTime() - now.getTime()) / 60000;
      if (mins < -LIVE_WINDOW_MIN_ || mins > 24 * 60) return;

      var sent = String(m.remindersSent || '');
      var kind = null;
      if (mins <= 0 && sent.indexOf('start') < 0) kind = 'start';
      else if (mins > 0 && mins <= 60 && sent.indexOf('hour') < 0) kind = 'hour';
      else if (mins > 75 && sent.indexOf('morning') < 0 && isMeetingDayMorning_(start, now)) kind = 'morning';
      if (!kind) return;

      // mark first, so a slow mail call can never send twice
      var flags = sent ? sent.split(',') : [];
      flags.push(kind);
      if (kind === 'start') { if (flags.indexOf('hour') < 0) flags.push('hour'); if (flags.indexOf('morning') < 0) flags.push('morning'); }
      if (kind === 'hour' && flags.indexOf('morning') < 0) flags.push('morning');
      sh.getRange(m._row, flagCol).setNumberFormat('@').setValue(flags.join(','));
      SpreadsheetApp.flush();
      sendMeetingEmail_(ss, m, start, kind, Math.max(1, Math.round(mins)));
    });
  } finally {
    lock.releaseLock();
  }
}

function isMeetingDayMorning_(start, now) {
  var day = function (d) { return Utilities.formatDate(d, MEETING_TZ_, 'yyyy-MM-dd'); };
  var hour = Number(Utilities.formatDate(now, MEETING_TZ_, 'H'));
  return day(start) === day(now) && hour >= MORNING_HOUR_;
}

/** Students with an email (instructors / coaches are not emailed). */
function meetingRecipients_(ss) {
  return readEntity_(ss, 'users')
    .filter(function (u) { return String(u.email).indexOf('@') > 0 && String(u.teamRole) !== 'Instructor'; })
    .map(function (u) { return String(u.email).trim(); });
}

function sendMeetingEmail_(ss, m, start, kind, minsLeft) {
  var to = meetingRecipients_(ss);
  if (!to.length) return;
  var when = Utilities.formatDate(start, MEETING_TZ_, 'EEE d MMM · HH:mm');
  var title = String(m.title || 'Team meeting');
  var head = {
    morning: { en: 'Meeting today', ar: 'عندنا ميتينج النهارده' },
    hour: minsLeft >= 55 ? { en: 'Starts in 1 hour', ar: 'الميتينج بعد ساعة' }
      : { en: 'Starts in ' + minsLeft + ' min', ar: 'الميتينج بعد ' + minsLeft + ' دقيقة' },
    start: { en: 'Starting now', ar: 'الميتينج بدأ دلوقتي' }
  }[kind];
  var subject = (kind === 'start' ? '🔴 ' : kind === 'hour' ? '⏰ ' : '📅 ') + head.ar + ' · ' + title + ' (' + Utilities.formatDate(start, MEETING_TZ_, 'HH:mm') + ')';
  var site = props_().getProperty('SITE_URL') || SITE_URL_DEFAULT_;
  var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var link = /^https?:\/\//.test(String(m.link || '')) ? String(m.link) : '';
  var html =
    '<div style="background:#0B0C0E;padding:28px 16px;font-family:Inter,Arial,sans-serif">' +
    '<div style="max-width:520px;margin:0 auto;background:#15171A;border:1px solid #25282E;padding:24px;color:#EDE8DF">' +
    '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;letter-spacing:2px;color:#FF5A5F;text-transform:uppercase">CRIMINALS // ' + esc(head.en) + '</div>' +
    '<div style="font-size:24px;font-weight:800;margin:10px 0 4px">' + esc(title) + '</div>' +
    '<div style="font-size:15px;color:#9A968E" dir="rtl">' + esc(head.ar) + '</div>' +
    '<div style="height:4px;width:28px;background:#E5242B;margin:16px 0"></div>' +
    '<div style="font-size:15px">🕒 ' + esc(when) + (m.duration ? ' · ' + esc(m.duration) + ' min' : '') + '</div>' +
    (m.location ? '<div style="font-size:15px;margin-top:6px">📍 ' + esc(m.location) + '</div>' : '') +
    (m.agenda ? '<div style="font-size:14px;line-height:1.6;color:#C9C3B8;margin-top:14px;white-space:pre-wrap">' + esc(m.agenda) + '</div>' : '') +
    (link ? '<a href="' + esc(link) + '" style="display:inline-block;margin-top:20px;background:#E5242B;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px">Join meeting · ادخل الميتينج</a>' : '') +
    '<div style="margin-top:22px;font-size:12px;color:#9A968E"><a href="' + esc(site) + '/#/meetings" style="color:#FF5A5F">Criminals HQ</a> · We don\'t steal things. We steal points.</div>' +
    '</div></div>';
  var text = head.en + ' — ' + title + '\n' + when + (link ? '\n' + link : '') + '\n' + site + '/#/meetings';
  // students in BCC (they don't see each other's emails); the sending account gets the visible copy
  var owner = String(Session.getEffectiveUser().getEmail() || '');
  var bcc = to.filter(function (e) { return e.toLowerCase() !== owner.toLowerCase(); });
  MailApp.sendEmail({ to: owner, bcc: bcc.join(','), subject: subject, htmlBody: html, body: text, name: 'Criminals HQ' });
}
