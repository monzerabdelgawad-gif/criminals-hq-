/**
 * Demo backend used when VITE_API_URL is empty. Mirrors the Apps Script API
 * with the real season plan (shortened text). Edits persist in localStorage.
 */
import type { AllData, Row, Entity, Change } from './types';

const WS: Record<string, string> = {
  IP: 'Innovation Project', RD: 'Robot Design', RG: 'Robot Game', CV: 'Core Values',
  OP: 'Operations & Competition Readiness',
};

// id, subcategory, task, owner, supporting, priority, start, deadline, dependency
const T: [string, string, string, string, string, string, string, string, string][] = [
  ['IP-01', 'Phase 1: Understand', 'Review BIOGLOW Innovation Project requirements', 'Coach', 'Full Team', 'Critical', '05 Oct 2026', '10 Oct 2026', ''],
  ['IP-02', 'Phase 1: Understand', 'Explore biodiversity and BIOGLOW theme', 'Team Lead', 'All Students', 'High', '10 Oct 2026', '17 Oct 2026', 'IP-01'],
  ['IP-03', 'Phase 1: Understand', 'Identify potential biodiversity problems', 'Team Lead', 'All Students', 'High', '17 Oct 2026', '24 Oct 2026', 'IP-02'],
  ['IP-04', 'Phase 1: Understand', 'Select and define a specific problem', 'Team Lead', 'All Students', 'Critical', '24 Oct 2026', '31 Oct 2026', 'IP-03'],
  ['IP-05', 'Phase 2: Research', 'Gather credible research sources', 'Researcher', 'All Students', 'High', '01 Nov 2026', '14 Nov 2026', 'IP-04'],
  ['IP-06', 'Phase 2: Research', 'Identify existing solutions', 'Researcher', 'All Students', 'High', '07 Nov 2026', '21 Nov 2026', 'IP-05'],
  ['IP-07', 'Phase 2: Research', 'Contact or research an expert or stakeholder', 'Team Lead', '2-3 Students', 'Medium', '14 Nov 2026', '28 Nov 2026', 'IP-05'],
  ['IP-08', 'Phase 3: Solution', 'Brainstorm multiple candidate solutions', 'All Students', '', 'High', '28 Nov 2026', '05 Dec 2026', 'IP-06'],
  ['IP-09', 'Phase 3: Solution', 'Compare and select the best solution', 'Team Lead', 'All Students', 'Critical', '05 Dec 2026', '12 Dec 2026', 'IP-08'],
  ['IP-10', 'Phase 3: Solution', 'Develop the solution concept', 'Builder / Designer', 'All Students', 'Critical', '12 Dec 2026', '02 Jan 2027', 'IP-09'],
  ['IP-11', 'Phase 4: Testing', 'Define evaluation criteria and test plan', 'Team Lead', 'All Students', 'High', '02 Jan 2027', '09 Jan 2027', 'IP-10'],
  ['IP-12', 'Phase 4: Testing', 'Test and gather feedback on the solution', 'Tester', '2-3 Students', 'High', '09 Jan 2027', '23 Jan 2027', 'IP-11'],
  ['IP-13', 'Phase 4: Testing', 'Revise solution based on evidence', 'Builder / Designer', 'All Students', 'High', '23 Jan 2027', '06 Feb 2027', 'IP-12'],
  ['IP-14', 'Phase 5: Communication', 'Organize the project presentation structure', 'Team Lead', 'All Students', 'Critical', '06 Feb 2027', '13 Feb 2027', 'IP-13'],
  ['IP-15', 'Phase 5: Communication', 'Prepare presentation visuals or demonstration', 'Designer', 'All Students', 'High', '13 Feb 2027', '20 Feb 2027', 'IP-14'],
  ['IP-16', 'Phase 5: Communication', 'Rehearse presentation (timed)', 'All Students', '', 'Critical', '20 Feb 2027', '27 Feb 2027', 'IP-15'],
  ['IP-17', 'Phase 5: Communication', 'Mock judging session — Innovation Project', 'All Students', '', 'Critical', '01 Mar 2027', '07 Mar 2027', 'IP-16'],
  ['RD-01', 'Requirements', 'Review Robot Game and Robot Design requirements', 'Coach', 'Full Team', 'Critical', '05 Oct 2026', '12 Oct 2026', ''],
  ['RD-02', 'Drive Base', 'Select and build the drive base', 'Builder', '2-3 Students', 'High', '12 Oct 2026', '26 Oct 2026', 'RD-01'],
  ['RD-03', 'Attachments', 'Design and build Mission Attachment 1', 'Builder', '2-3 Students', 'High', '01 Nov 2026', '22 Nov 2026', 'RD-02'],
  ['RD-04', 'Attachments', 'Design and build Mission Attachment 2', 'Builder', '2-3 Students', 'High', '22 Nov 2026', '13 Dec 2026', 'RD-03'],
  ['RD-05', 'Attachments', 'Design and build Mission Attachment 3 (if applicable)', 'Builder', '2-3 Students', 'Medium', '13 Dec 2026', '03 Jan 2027', 'RD-04'],
  ['RD-06', 'Documentation', 'Record all design decisions and iterations', 'Documenter', 'All Students', 'High', '05 Oct 2026', '01 Mar 2027', 'RD-02'],
  ['RD-07', 'Reliability', 'Test robot reliability and robustness', 'Tester', '2-3 Students', 'Critical', '15 Jan 2027', '28 Feb 2027', 'RD-05'],
  ['RD-08', 'Presentation', 'Prepare Robot Design explanation for judges', 'All Students', '', 'Critical', '20 Feb 2027', '10 Mar 2027', 'RD-07'],
  ['RG-01', 'Rules & Setup', 'Review all BIOGLOW missions, rules, and scoring', 'Coach', 'Full Team', 'Critical', '05 Oct 2026', '12 Oct 2026', ''],
  ['RG-02', 'Rules & Setup', 'Build and verify all mission models', 'Builder', 'All Students', 'High', '12 Oct 2026', '26 Oct 2026', 'RG-01'],
  ['RG-03', 'Strategy', 'Analyse mission difficulty, scoring, and risk', 'Team Lead', 'All Students', 'Critical', '19 Oct 2026', '02 Nov 2026', 'RG-02'],
  ['RG-04', 'Strategy', 'Develop initial game strategy and mission priority list', 'Team Lead', 'All Students', 'Critical', '02 Nov 2026', '09 Nov 2026', 'RG-03'],
  ['RG-05', 'Programming', 'Program and test Mission 1 (individual)', 'Programmer', '2-3 Students', 'High', '09 Nov 2026', '23 Nov 2026', 'RG-04'],
  ['RG-06', 'Programming', 'Program and test Mission 2 (individual)', 'Programmer', '2-3 Students', 'High', '23 Nov 2026', '07 Dec 2026', 'RG-05'],
  ['RG-07', 'Programming', 'Program and test Mission 3 (individual)', 'Programmer', '2-3 Students', 'High', '07 Dec 2026', '21 Dec 2026', 'RG-06'],
  ['RG-08', 'Programming', 'Program and test remaining priority missions', 'Programmer', '2-3 Students', 'High', '21 Dec 2026', '18 Jan 2027', 'RG-07'],
  ['RG-09', 'Integration', 'Combine missions into efficient runs', 'Programmer', 'All Students', 'Critical', '18 Jan 2027', '08 Feb 2027', 'RG-08'],
  ['RG-10', 'Performance', 'Run timed practice rounds and track scores', 'All Students', '', 'Critical', '08 Feb 2027', '01 Mar 2027', 'RG-09'],
  ['RG-11', 'Performance', 'Freeze strategy and reduce unnecessary changes', 'Coach', 'All Students', 'Critical', '15 Mar 2027', '22 Mar 2027', 'RG-10'],
  ['RG-12', 'Performance', 'Final reliability testing before competition', 'All Students', '', 'Critical', '01 Apr 2027', '10 Apr 2027', 'RG-11'],
  ['CV-01', 'Team Agreements', 'Review official Core Values and establish team norms', 'Coach', 'Full Team', 'Critical', '05 Oct 2026', '12 Oct 2026', ''],
  ['CV-02', 'Practice', 'Core Values reflection — end of each session', 'Team Recorder', 'All Students', 'High', '12 Oct 2026', '01 Apr 2027', 'CV-01'],
  ['CV-03', 'Practice', 'Document real examples of teamwork and Core Values', 'Team Recorder', 'All Students', 'High', '12 Oct 2026', '01 Mar 2027', 'CV-02'],
  ['CV-04', 'Practice', 'Practice explaining how the team worked together', 'All Students', '', 'High', '01 Feb 2027', '01 Mar 2027', 'CV-03'],
  ['CV-05', 'Review', 'Mock Core Values judging session', 'All Students', '', 'Critical', '01 Mar 2027', '15 Mar 2027', 'CV-04'],
  ['OP-01', 'Registration', 'Confirm team registration and eligibility', 'Coach', '', 'Critical', '05 Oct 2026', '15 Oct 2026', ''],
  ['OP-02', 'Registration', 'Confirm competition date and event details', 'Coach', '', 'Critical', '05 Oct 2026', '15 Oct 2026', 'OP-01'],
  ['OP-03', 'Logistics', 'Collect required forms and permissions', 'Coach', '', 'High', '15 Oct 2026', '15 Nov 2026', 'OP-01'],
  ['OP-04', 'Logistics', 'Track equipment, parts, and materials inventory', 'Equipment Manager', '2 Students', 'Medium', '01 Nov 2026', '01 Dec 2026', ''],
  ['OP-05', 'Logistics', 'Prepare competition-day packing checklist', 'Coach', 'All Students', 'High', '01 Mar 2027', '15 Mar 2027', 'OP-02'],
  ['OP-06', 'Readiness', 'Assign competition-day responsibilities', 'Coach', 'All Students', 'High', '15 Mar 2027', '22 Mar 2027', 'OP-05'],
  ['OP-07', 'Readiness', 'Final competition readiness review', 'Coach', 'Full Team', 'Critical', '10 Apr 2027', '13 Apr 2027', 'OP-05, RG-12, IP-17, RD-08, CV-05'],
  ['OP-08', 'Post-Competition', 'Record competition results and collect feedback', 'Coach', 'All Students', 'High', '21 Apr 2027', '28 Apr 2027', 'OP-07'],
  ['OP-09', 'Post-Competition', 'Team debrief and lessons learned', 'Coach', 'Full Team', 'Medium', '28 Apr 2027', '05 May 2027', 'OP-08'],
];

// a little fake progress so the demo looks alive
const DEMO_STATUS: Record<string, [string, string]> = {
  'IP-01': ['Completed', '100'], 'RD-01': ['Completed', '100'], 'RG-01': ['Completed', '100'],
  'CV-01': ['Completed', '100'], 'OP-01': ['Under Review', '90'], 'IP-02': ['In Progress', '60'],
  'RD-02': ['In Progress', '40'], 'RG-02': ['Blocked', '30'], 'OP-02': ['In Progress', '50'],
  'IP-03': ['In Progress', '20'], 'RD-06': ['In Progress', '10'],
};

function buildTasks(): Row[] {
  return T.map((t, i) => {
    const [status, completion] = DEMO_STATUS[t[0]] || ['Not Started', '0'];
    return {
      _row: i + 3, id: t[0], season: '2026-2027', workstream: WS[t[0].slice(0, 2)], subcategory: t[1],
      task: t[2], procedure: 'See the TASK DATABASE tab for the full procedure.', deliverable: '', acceptance: '',
      owner: t[3], supporting: t[4], reviewer: 'Coach', priority: t[5], plannedStart: t[6], plannedDeadline: t[7],
      actualStart: '', actualCompletion: '', status, completion, dependency: t[8],
      blocker: status === 'Blocked' ? 'Missing 2 mission model bags' : '', nextAction: '', evidence: '',
      review: 'Not Reviewed', lastUpdated: '', notes: '', updatedBy: '',
    };
  });
}

const M: [string, string, string, string, string][] = [
  ['M-01', 'All', 'Season launch & resources confirmed', '10 Oct 2026', 'Completed'],
  ['M-02', 'All', 'Initial season plan approved', '17 Oct 2026', 'In Progress'],
  ['M-03', 'Innovation Project', 'Problem defined & approved', '31 Oct 2026', 'Not Started'],
  ['M-08', 'Robot Design', 'Drive base & basic robot tested', '26 Oct 2026', 'Not Started'],
  ['M-07', 'Robot Game', 'Game strategy approved', '09 Nov 2026', 'Not Started'],
  ['M-04', 'Innovation Project', 'Research evidence reviewed', '21 Nov 2026', 'Not Started'],
  ['M-05', 'Innovation Project', 'Solution selected', '12 Dec 2026', 'Not Started'],
  ['M-09', 'Robot Design', 'All attachments built and tested', '03 Jan 2027', 'Not Started'],
  ['M-13', 'All', 'First full mock judging completed', '07 Mar 2027', 'Not Started'],
  ['M-16', 'All', 'Final competition readiness approved', '13 Apr 2027', 'Not Started'],
];

const R: [string, string, string, number, number, string][] = [
  ['R-01', 'Innovation Project', 'Research phase delayed — insufficient credible sources found', 3, 3, 'Team Lead'],
  ['R-02', 'Innovation Project', 'Solution concept is too vague or impractical to demonstrate', 3, 4, 'Coach'],
  ['R-03', 'Robot Game', 'Robot runs are unreliable at competition time', 4, 5, 'Programmer'],
  ['R-04', 'Robot Game', 'Missing LEGO components or damaged parts', 2, 4, 'Equipment Mgr'],
  ['R-05', 'Robot Design', 'Programming regressions — working programs stop working after changes', 3, 4, 'Programmer'],
  ['R-06', 'Core Values', 'Uneven participation — some students not contributing', 3, 3, 'Coach'],
  ['R-08', 'Operations & Competition Readiness', 'Competition schedule changed by organiser', 2, 5, 'Coach'],
];

export const TEAM: [string, string, string][] = [
  ['Monzer', 'منذر', 'Student'], ['Arwa', 'اروى', 'Student'], ['Amal', 'امل', 'Student'],
  ['Nesma', 'نسمه', 'Student'], ['Aysel', 'ايسل', 'Student'], ['Jory', 'جوري', 'Student'],
  ['Saja', 'ساجا', 'Student'], ['Malek', 'مالك', 'Student'], ['Hamza', 'حمزه', 'Student'],
  ['Eslam', 'اسلام', 'Student'], ['Eng. Ziad', 'م. زياد', 'Instructor'], ['Eng. Ahmed Tarek', 'م. احمد طارق', 'Instructor'],
];

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmt(d: Date) { return `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()}`; }

function build(): AllData {
  const weekly: Row[] = [];
  for (let i = 0; i < 30; i++) {
    const s = addDays(new Date(2026, 9, 5), i * 7);
    weekly.push({ _row: i + 3, id: fmt(s), weekEnd: fmt(addDays(s, 6)), workstream: '', objectives: '', plannedTasks: '',
      completedTasks: '', incompleteTasks: '', blockedTasks: '', evidence: '', coachFeedback: '', decisions: '',
      corrective: '', nextPriorities: '', responsible: '', reviewDate: '', completionRate: '' });
  }
  const qs = ['1. What did we plan to finish this week?', '2. What did we actually finish? (List task IDs)',
    '3. What evidence proves the work is complete? (Photos, files, test logs)',
    '4. What is blocked, and what decision or support is needed?', '5. What are the three most important priorities for next week?'];
  const settingsRows: [string, string, string][] = [
    ['Season Name:', '2026-2027 BIOGLOW', 'Enter the official season name'],
    ['Team Name:', 'Criminals', "Your team's registered name"],
    ['Head Coach:', 'Eng. Ziad', 'Primary coach name'],
    ['Assistant Coach:', 'Eng. Ahmed Tarek', ''],
    ['Planning Start Date:', '01 Oct 2026', 'Date the team began planning'],
    ['Competition Date:', '⚠  ENTER ACTUAL DATE', 'Contact local organiser for official date'],
    ['Planning End Date:', '30 Apr 2027', 'Adjust if your competition is earlier/later'],
    ['Training Days:', 'e.g. Tuesday, Thursday', 'Days of the week you train'],
    ['Weekly Session Frequency:', '2 sessions per week', ''],
    ['Session Duration (mins):', '90', ''],
    ['Current Reporting Week:', '1', 'Update each week for Weekly Review'],
    ['Event Location:', '⚠  ENTER VENUE', 'From official event organiser'],
    ['Registration Deadline:', '⚠  CONFIRM WITH ORGANISER', 'Official deadline only'],
  ];
  const FI = 'https://www.firstinspires.org/resource-library/fll/challenge/challenge-and-resources';
  return {
    rev: 1,
    me: { email: 'demo@criminals.team', name: 'Monzer', nameAr: 'منذر', teamRole: 'Student', taskRoles: [], lang: 'ar', photo: '', isAdmin: true, perms: [] },
    data: {
      tasks: buildTasks(),
      milestones: M.map((m, i) => ({ _row: i + 4, id: m[0], workstream: m[1], name: m[2], description: '', targetDate: m[3],
        actualDate: '', evidence: '', acceptance: '', responsible: 'Coach', reviewer: 'Coach', status: m[4], reviewNotes: '', relatedTasks: '' })),
      risks: R.map((r, i) => ({ _row: i + 26, id: r[0], dateIdentified: 'Oct 2026', workstream: r[1], description: r[2],
        likelihood: String(r[3]), impact: String(r[4]), score: String(r[3] * r[4]), warning: '', mitigation: '', contingency: '',
        owner: r[5], reviewDate: 'Monthly', status: 'Open' })),
      weekly,
      weeklyQ: qs.map((q, i) => ({ _row: 36 + i, id: 'r' + (36 + i), question: q, answer: '' })),
      settings: settingsRows.map((s, i) => ({ _row: i + 4, id: 'r' + (i + 4), label: s[0], value: s[1], hint: s[2] })),
      team: TEAM.filter(([, , r]) => r === 'Student').map(([name], i) => ({ _row: 20 + i, id: 'r' + (20 + i), name, responsibilities: '', supporting: '', skills: '', mentor: '', availability: '' })),
      resources: [
        { _row: 35, id: 'r35', name: 'BIOGLOW Season Materials', workstream: 'All', url: FI, version: '2026-2027', lastChecked: '24 Oct 2026', verifiedBy: 'Coach' },
        { _row: 36, id: 'r36', name: 'BIOGLOW Robot Game Rulebook', workstream: 'Robot Game', url: FI, version: '⚠ Confirm version', lastChecked: '', verifiedBy: '' },
        { _row: 40, id: 'r40', name: 'LEGO Education Season Materials', workstream: 'All', url: 'https://education.lego.com/en-us/first-lego-league/season-materials/', version: '2026-2027', lastChecked: '24 Oct 2026', verifiedBy: 'Coach' },
      ],
      users: TEAM.map(([name, nameAr, role], i) => ({ _row: i + 2, id: 'r' + (i + 2), email: i === 0 ? 'demo@criminals.team' : i === 1 ? 'arwa@example.com' : i === 10 ? 'ziad@example.com' : '',
        name, nameAr, teamRole: role, taskRoles: '', lang: 'ar', photo: '', perms: i === 1 ? 'tasks, uploads' : '' })),
      meetings: demoMeetings(),
    },
    dropdowns: {
      Workstreams: Object.values(WS),
      Priority: ['Critical', 'High', 'Medium', 'Low'],
      Status: ['Not Started', 'In Progress', 'Blocked', 'Under Review', 'Completed', 'Cancelled'],
      'Review Result': ['Not Reviewed', 'Approved', 'Changes Required'],
      'Risk Likelihood': ['1', '2', '3', '4', '5'],
      'Risk Impact': ['1', '2', '3', '4', '5'],
      Owners: ['Coach', 'Team Lead', 'Researcher', 'All Students', 'Builder / Designer', 'Tester', 'Designer', 'Builder', 'Documenter', 'Programmer', 'Team Recorder', 'Equipment Manager'],
      Supporting: ['Full Team', 'All Students', '2-3 Students', '2 Students'],
    },
    activity: [],
    uploads: [],
    guide: [
      ['HOW TO START', ''],
      ['1. Enter Settings', 'Open the SETTINGS page. Enter your Team Name, Competition Date (⚠ required), Coach Name, Training Days, and Session Duration.'],
      ['WEEKLY MAINTENANCE', ''],
      ['Each training session', 'Update Status for tasks worked on. Add Actual Start / Actual Completion dates. Note any blockers.'],
    ],
    folderUrl: 'https://drive.google.com',
  };
}

const KEY = 'criminals.demo.v4';
function load(): AllData {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* ignore */ }
  return build();
}
function save(d: AllData) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Demo only: try the app as different kinds of member (admin / partial / view only). */
export type DemoRole = 'admin' | 'tasks' | 'view';
export function getDemoRole(): DemoRole {
  const me = load().me;
  return me.isAdmin ? 'admin' : (me.perms ?? []).length ? 'tasks' : 'view';
}
export function setDemoRole(role: DemoRole) {
  const db = load();
  db.me.isAdmin = role === 'admin';
  db.me.perms = role === 'tasks' ? ['tasks', 'uploads'] : [];
  save(db);
  location.reload();
}

export async function mockCall(body: Record<string, unknown>): Promise<unknown> {
  await wait(150);
  const db = load();
  const me = db.me;
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  switch (body.action) {
    case 'login': return { ok: true, token: 'demo', user: me };
    case 'rev': return { ok: true, rev: db.rev };
    case 'getAll': return { ok: true, ...db };
    case 'update': {
      const rows = db.data[body.entity as Entity];
      const row = rows.find((r) => r.id === body.id);
      if (!row) return { ok: false, error: 'not_found' };
      if (!canEditDemo(me, String(body.entity))) return { ok: false, error: 'no_permission' };
      if (body.entity === 'users') {
        // same rules as the real backend (Code.gs -> userFieldBlocked_)
        const own = String(row.email).toLowerCase() === me.email.toLowerCase();
        for (const c of body.changes as Change[]) {
          if (['email', 'teamRole', 'perms'].includes(c.field) && !me.isAdmin) return { ok: false, error: 'admin_only' };
          if (['name', 'nameAr', 'taskRoles', 'lang', 'photo'].includes(c.field) && !own && !(me.isAdmin && !row.email)) return { ok: false, error: 'not_your_profile' };
        }
      }
      for (const c of body.changes as Change[]) {
        const pic = c.field === 'photo';
        db.activity.unshift({ timestamp: now, name: me.name, email: me.email, entity: String(body.entity), id: String(body.id),
          field: c.field, oldValue: pic ? (row.photo ? '(photo)' : '') : String(row[c.field] ?? ''), newValue: pic ? '(new photo)' : c.value });
        row[c.field] = toDisplay(c.value);
      }
      if (body.entity === 'users' && String(row.email).toLowerCase() === me.email.toLowerCase()) {
        Object.assign(me, { photo: row.photo, name: row.name, nameAr: row.nameAr, lang: row.lang,
          taskRoles: String(row.taskRoles || '').split(',').map((s) => s.trim()).filter(Boolean) });
      }
      if (body.entity === 'tasks') { row.lastUpdated = fmt(new Date()); row.updatedBy = me.name; }
      if (body.entity === 'risks') row.score = String(Number(row.likelihood) * Number(row.impact));
      db.rev++; save(db);
      return { ok: true, row };
    }
    case 'add': {
      const entity = body.entity as Entity;
      if (entity === 'users' ? !me.isAdmin : !canEditDemo(me, entity)) return { ok: false, error: 'no_permission' };
      const values = body.values as Record<string, string>;
      const rows = db.data[entity];
      const row: Row = { _row: 900 + rows.length, id: 'r' + (900 + rows.length), ...values };
      if (entity === 'tasks') {
        const p = Object.entries(WS).find(([, v]) => v === values.workstream)?.[0] || 'OP';
        const n = Math.max(0, ...rows.filter((r) => r.id.startsWith(p)).map((r) => Number(r.id.split('-')[1]))) + 1;
        Object.assign(row, { id: `${p}-${String(n).padStart(2, '0')}`, status: 'Not Started', completion: '0', review: 'Not Reviewed', lastUpdated: fmt(new Date()), updatedBy: me.name });
      }
      if (entity === 'meetings') Object.assign(row, { status: 'Scheduled', createdBy: me.name, date: toDisplay(values.date || '') });
      if (entity === 'risks' || entity === 'milestones' || entity === 'meetings') {
        const p = entity === 'risks' ? 'R' : entity === 'meetings' ? 'MT' : 'M';
        const n = Math.max(0, ...rows.map((r) => Number(String(r.id).split('-')[1]) || 0)) + 1;
        row.id = `${p}-${String(n).padStart(2, '0')}`;
        if (entity === 'risks') row.score = String(Number(values.likelihood || 0) * Number(values.impact || 0));
      }
      rows.push(row);
      db.activity.unshift({ timestamp: now, name: me.name, email: me.email, entity, id: row.id, field: '(new row)', oldValue: '', newValue: values.task || values.name || values.description || '' });
      db.rev++; save(db);
      return { ok: true, row };
    }
    case 'upload': {
      if (!canEditDemo(me, 'uploads')) return { ok: false, error: 'no_permission' };
      db.uploads.unshift({ timestamp: now, name: me.name, email: me.email, fileName: String(body.fileName), url: '#',
        folder: String(body.workstream || '(root)'), taskId: String(body.taskId || ''), note: String(body.note || ''), size: '—' });
      db.rev++; save(db);
      return { ok: true, url: '#' };
    }
  }
  return { ok: false, error: 'unknown_action' };
}

/** Same section rules as Code.gs -> canEdit_ (users rows are checked separately). */
function canEditDemo(me: AllData['me'], entity: string) {
  if (entity === 'users' || me.isAdmin) return true;
  const sec: Record<string, string> = { tasks: 'tasks', milestones: 'milestones', risks: 'risks', weekly: 'weekly', weeklyQ: 'weekly',
    resources: 'resources', settings: 'settings', team: 'settings', uploads: 'uploads' };
  return (me.perms ?? []).includes(sec[entity]);
}

/** Three sample meetings around today: one done (with minutes), one later today, one next week. */
function demoMeetings(): Row[] {
  const d = (days: number) => { const x = new Date(); x.setDate(x.getDate() + days); return fmt(x); };
  const inTwoHours = new Date(Date.now() + 2 * 3600e3);
  const hhmm = `${String(inTwoHours.getHours()).padStart(2, '0')}:00`;
  return [
    { _row: 2, id: 'MT-01', title: 'Season kickoff', date: d(-6), time: '18:00', duration: '60', link: 'https://meet.google.com/abc-defg-hij',
      location: 'Online', agenda: 'Roles, season calendar, BIOGLOW theme', notes: 'Roles assigned. Next: research sprint.', status: 'Done', createdBy: 'Eng. Ziad', remindersSent: 'morning,hour,start' },
    { _row: 3, id: 'MT-02', title: 'Robot game strategy', date: d(0), time: hhmm, duration: '90', link: 'https://meet.google.com/xyz-uvwx-rst',
      location: 'Lab', agenda: '1. Mission priorities · 2. Attachment ideas · 3. Run order', notes: '', status: 'Scheduled', createdBy: 'Eng. Ziad', remindersSent: 'morning' },
    { _row: 4, id: 'MT-03', title: 'Innovation project review', date: d(7), time: '17:30', duration: '60', link: '',
      location: 'Lab', agenda: 'Problem statement + research evidence', notes: '', status: 'Scheduled', createdBy: 'Eng. Ahmed Tarek', remindersSent: '' },
  ];
}

function toDisplay(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? fmt(new Date(+m[1], +m[2] - 1, +m[3])) : v;
}
