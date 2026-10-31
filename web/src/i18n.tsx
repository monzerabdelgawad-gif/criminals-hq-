import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ar';

const en = {
  appTagline: 'season HQ',
  home: 'Home', tasks: 'Tasks', timeline: 'Timeline', milestones: 'Milestones', risks: 'Risks',
  weekly: 'Weekly Review', team: 'Team', uploads: 'Uploads', activity: 'Activity', resources: 'Resources',
  guide: 'Guide', settings: 'Settings', more: 'More',
  signInTitle: 'pull up to HQ', signInSub: 'Sign in with your Google account. Only team members get in.',
  appAbout: 'Criminals HQ is the private planning dashboard of the Criminals FIRST LEGO League team: tasks, milestones, risks, weekly reviews and documentation in one place.',
  privacyPolicy: 'Privacy policy',
  notAllowed: 'This Google account is not on the team list. Ask a teammate to add you in Team → Members.',
  notConfigured: 'The backend is not configured yet (OAUTH_CLIENT_ID missing).',
  signOut: 'Sign out', demoMode: 'Demo mode — changes stay on this device',
  greetingMorning: 'morning', greetingAfternoon: 'afternoon', greetingEvening: 'evening',
  hey: 'hey', heroSub: "here's where the season's at.",
  daysToComp: 'days to competition', compDateMissing: 'set the competition date in Settings',
  overall: 'overall progress', total: 'Total', done: 'Done', inProgress: 'In progress', blocked: 'Blocked',
  overdue: 'Overdue', underReview: 'Under review', notStarted: 'Not started',
  myTasks: 'Your tasks', noMyTasks: 'Nothing assigned to your roles. Set your roles in Team → Members.',
  upcoming: 'Upcoming milestones', recent: 'Recent activity', noActivity: 'No changes yet.',
  workstreams: 'Workstreams', seeAll: 'see all',
  search: 'Search…', all: 'All', mine: 'Mine', board: 'Board', list: 'List', showCancelled: 'Show cancelled',
  newTask: 'New task', add: 'Add', save: 'Save', cancel: 'Cancel', close: 'Close',
  saving: 'saving…', saved: 'saved ✓', conflict: 'Someone changed this meanwhile — refreshed with the latest.',
  error: 'Something went wrong', retry: 'Retry', offline: 'Network error — check your connection.',
  procedure: 'Procedure', deliverable: 'Expected deliverable', acceptance: 'Acceptance criteria',
  owner: 'Owner', supporting: 'Supporting', reviewer: 'Reviewer', priority: 'Priority', status: 'Status',
  plannedStart: 'Planned start', deadline: 'Deadline', actualStart: 'Actual start', actualCompletion: 'Completed on',
  completion: 'Completion %', dependency: 'Depends on', blocker: 'Blocker / issue', nextAction: 'Next action',
  evidence: 'Evidence / files', review: 'Review result', notes: 'Notes', lastUpdated: 'Last updated',
  by: 'by', workstream: 'Workstream', subcategory: 'Subcategory', task: 'Task',
  blockedHint: 'Blocked? Write why in "Blocker / issue" so someone can help.',
  attachFile: 'Upload evidence', today: 'Today',
  milestone: 'Milestone', targetDate: 'Target date', actualDate: 'Actual date', responsible: 'Responsible',
  requiredEvidence: 'Required evidence', relatedTasks: 'Related tasks', reviewNotes: 'Review notes', description: 'Description',
  newMilestone: 'New milestone', newRisk: 'New risk',
  likelihood: 'Likelihood', impact: 'Impact', score: 'Score', warning: 'Warning sign', mitigation: 'Mitigation plan',
  contingency: 'Contingency plan', reviewDate: 'Review', heatmap: 'Risk heatmap', riskOpen: 'open risks',
  week: 'Week', weekOf: 'Week of', thisWeek: 'this week', objectives: 'Planned objectives', plannedTasks: 'Planned tasks (IDs)',
  completedTasks: 'Completed tasks', incompleteTasks: 'Incomplete tasks', blockedTasks: 'Blocked tasks',
  evidenceReviewed: 'Evidence reviewed', coachFeedback: 'Coach feedback', decisions: 'Decisions required',
  corrective: 'Corrective actions', nextPriorities: 'Next week priorities', completionRate: 'Completion rate %',
  keyQuestions: '5 key questions', autoFill: 'Auto-fill from tasks',
  members: 'Members (login access)', directory: 'Team directory', email: 'Email', name: 'Name', teamRole: 'Role',
  inAppTitle: 'Open this in Chrome or Safari', inAppSub: "Google sign-in doesn't work inside Instagram, TikTok or Facebook. Open the link in your phone's browser.",
  inAppIos: 'Tap ⋯ at the top → “Open in browser”. Or copy the link and paste it in Safari.', openInChrome: 'Open in Chrome',
  copyLink: 'Copy link', linkCopied: 'Link copied ✓', offlineNow: "You're offline. Changes won't save until you're back online.",
  bigFilesTitle: 'Too big to upload here', bigFilesSub: 'Files over 25 MB (usually long videos) go straight into the Drive folder:',
  installApp: 'Add to home screen', installIos: 'In Safari: tap Share, then “Add to Home Screen”.', dismiss: 'Got it',
  notYourProfile: 'Only the owner of this profile can change it.', adminOnly: 'Only instructors and the team admin can do this.',
  ownEmail: "You can't change your own email — ask an instructor.", badPhoto: "Couldn't use that image. Try a JPG or PNG photo.",
  changePhoto: 'Change photo', removePhoto: 'Remove', photoSaved: 'Photo saved ✓', onlyOwner: 'Only {name} can edit this profile.',
  accessAdmins: 'Email and role can only be changed by instructors.', editProfile: 'Edit your profile',
  viewOnly: 'View only', noPermission: "You don't have permission to edit this. Ask an instructor.",
  noUploadRights: "You can view uploads but can't upload. Ask an instructor to turn it on.",
  permissions: 'Edit permissions', permsHint: 'What this member can change. Everyone can always read everything.',
  canDoAll: 'Can edit everything', readOnlyAll: 'View only', fullAccess: 'Full access', adminAccess: 'Instructor / admin: always full access',
  sectionsOn: 'sections', yourAccess: 'Your edit access',
  heroCase: 'season in progress',
  you: 'you', welcomeTitle: 'welcome to the crew', welcomeSub: "you're officially on Criminals. this is your account.",
  memberNo: 'member', ofTeam: 'of', pickRoles: 'Pick your task roles',
  pickRolesSub: 'Tasks in the sheet are assigned to roles, not names. Pick yours so “Your tasks” shows the right ones. You can change it later in Team.',
  letsGo: "let's go", myProfile: 'Your account', setRoles: 'set your roles',
  taskRoles: 'Task roles', nameAr: 'Name in Arabic', membersCount: 'members', noEmail: '⚠ no email yet', language: 'Language', addMember: 'Add member', responsibilities: 'Primary responsibilities',
  supportingRoles: 'Supporting roles', skills: 'Skills to develop', mentor: 'Mentor / coach', availability: 'Availability',
  addPerson: 'Add to directory', tasksOwned: 'tasks',
  dropFiles: 'Drop files here or tap to choose', uploadTo: 'Folder', linkTask: 'Attach to task (optional)',
  note: 'Note', upload: 'Upload', uploading: 'uploading…', uploaded: 'uploaded', openFolder: 'Open Drive folder',
  history: 'Upload history', tooBig: 'File is over the size limit — upload it in the Drive folder directly.',
  noUploads: 'No uploads yet.', general: 'General',
  field: 'Field', from: 'from', to: 'to', created: 'created',
  resourceName: 'Resource', version: 'Version / date', lastChecked: 'Last checked', verifiedBy: 'Verified by', addResource: 'Add resource',
  seasonSettings: 'Season settings', theme: 'Theme', dark: 'Dark', light: 'Light',
  none: '—', loading: 'loading the season…',
};

type Dict = typeof en;

const ar: Dict = {
  appTagline: 'غرفة العمليات',
  home: 'الرئيسية', tasks: 'التاسكات', timeline: 'الجدول الزمني', milestones: 'المحطات', risks: 'المخاطر',
  weekly: 'المراجعة الأسبوعية', team: 'التيم', uploads: 'الرفع', activity: 'السجل', resources: 'المصادر',
  guide: 'الدليل', settings: 'الإعدادات', more: 'المزيد',
  signInTitle: 'ادخل الـHQ', signInSub: 'سجّل دخول بحساب جوجل. أعضاء التيم بس اللي يدخلوا.',
  appAbout: 'Criminals HQ هو داشبورد التخطيط الخاص بفريق Criminals في FIRST LEGO League: التاسكات، والمراحل، والمخاطر، والمراجعة الأسبوعية، والتوثيق في مكان واحد.',
  privacyPolicy: 'سياسة الخصوصية',
  notAllowed: 'الحساب ده مش في ليستة التيم. خلي حد من التيم يضيفك من التيم ← الأعضاء.',
  notConfigured: 'الباك إند لسه متظبطش (OAUTH_CLIENT_ID ناقص).',
  signOut: 'تسجيل خروج', demoMode: 'وضع تجريبي — التعديلات على الجهاز ده بس',
  greetingMorning: 'صباح الخير', greetingAfternoon: 'أهلاً', greetingEvening: 'مساء الخير',
  hey: 'أهلاً', heroSub: 'دي حالة الموسم دلوقتي.',
  daysToComp: 'يوم على المسابقة', compDateMissing: 'حط ميعاد المسابقة في الإعدادات',
  overall: 'الإنجاز الكلي', total: 'الكل', done: 'خلصت', inProgress: 'شغالين عليها', blocked: 'واقفة',
  overdue: 'متأخرة', underReview: 'تحت المراجعة', notStarted: 'لسه مبدأتش',
  myTasks: 'تاسكاتك', noMyTasks: 'مفيش تاسكات على أدوارك. حدد أدوارك من التيم ← الأعضاء.',
  upcoming: 'المحطات الجاية', recent: 'آخر التعديلات', noActivity: 'مفيش تعديلات لسه.',
  workstreams: 'المسارات', seeAll: 'شوف الكل',
  search: 'دوّر…', all: 'الكل', mine: 'بتوعي', board: 'بورد', list: 'ليستة', showCancelled: 'اعرض الملغية',
  newTask: 'تاسك جديدة', add: 'إضافة', save: 'حفظ', cancel: 'إلغاء', close: 'قفل',
  saving: 'بيتحفظ…', saved: 'اتحفظ ✓', conflict: 'حد عدّل هنا في نفس الوقت — جبنا آخر نسخة.',
  error: 'حصلت مشكلة', retry: 'جرّب تاني', offline: 'مشكلة في النت — اتأكد من الاتصال.',
  procedure: 'الخطوات', deliverable: 'المطلوب تسليمه', acceptance: 'معايير القبول',
  owner: 'المسؤول', supporting: 'المساعدين', reviewer: 'المراجع', priority: 'الأولوية', status: 'الحالة',
  plannedStart: 'البداية المخططة', deadline: 'الديدلاين', actualStart: 'البداية الفعلية', actualCompletion: 'اتقفلت في',
  completion: 'نسبة الإنجاز %', dependency: 'معتمدة على', blocker: 'العائق / المشكلة', nextAction: 'الخطوة الجاية',
  evidence: 'الإثباتات / الملفات', review: 'نتيجة المراجعة', notes: 'ملاحظات', lastUpdated: 'آخر تعديل',
  by: 'بواسطة', workstream: 'المسار', subcategory: 'القسم', task: 'التاسك',
  blockedHint: 'واقفة؟ اكتب السبب في "العائق" عشان حد يساعد.',
  attachFile: 'ارفع إثبات', today: 'النهارده',
  milestone: 'المحطة', targetDate: 'الميعاد المستهدف', actualDate: 'الميعاد الفعلي', responsible: 'المسؤول',
  requiredEvidence: 'الإثبات المطلوب', relatedTasks: 'تاسكات مرتبطة', reviewNotes: 'ملاحظات المراجعة', description: 'الوصف',
  newMilestone: 'محطة جديدة', newRisk: 'خطر جديد',
  likelihood: 'الاحتمال', impact: 'التأثير', score: 'الدرجة', warning: 'علامة التحذير', mitigation: 'خطة التقليل',
  contingency: 'الخطة البديلة', reviewDate: 'المراجعة', heatmap: 'خريطة المخاطر', riskOpen: 'مخاطر مفتوحة',
  week: 'أسبوع', weekOf: 'أسبوع', thisWeek: 'الأسبوع ده', objectives: 'الأهداف المخططة', plannedTasks: 'التاسكات المخططة',
  completedTasks: 'اللي خلص', incompleteTasks: 'اللي مخلصش', blockedTasks: 'اللي واقف',
  evidenceReviewed: 'الإثباتات اللي اتراجعت', coachFeedback: 'رأي الكوتش', decisions: 'قرارات مطلوبة',
  corrective: 'إجراءات تصحيحية', nextPriorities: 'أولويات الأسبوع الجاي', completionRate: 'نسبة الإنجاز %',
  keyQuestions: '5 أسئلة أساسية', autoFill: 'املأ تلقائي من التاسكات',
  members: 'الأعضاء (صلاحية الدخول)', directory: 'دليل التيم', email: 'الإيميل', name: 'الاسم', teamRole: 'الدور',
  inAppTitle: 'افتح اللينك في Chrome أو Safari', inAppSub: 'تسجيل الدخول بجوجل مش بيشتغل جوه إنستجرام أو تيك توك أو فيسبوك. افتح اللينك من متصفح الموبايل.',
  inAppIos: 'دوس ⋯ فوق ← «Open in browser». أو انسخ اللينك والصقه في Safari.', openInChrome: 'افتح في Chrome',
  copyLink: 'انسخ اللينك', linkCopied: 'اتنسخ ✓', offlineNow: 'النت فاصل. التعديلات مش هتتحفظ لحد ما النت يرجع.',
  bigFilesTitle: 'الملفات دي أكبر من الحد', bigFilesSub: 'أي ملف أكبر من 25MB (غالباً فيديو طويل) ارفعه على فولدر الدرايف مباشرة:',
  installApp: 'ضيفه على الشاشة الرئيسية', installIos: 'من Safari: دوس Share وبعدين «Add to Home Screen».', dismiss: 'تمام',
  notYourProfile: 'صاحب البروفايل بس هو اللي يقدر يعدّله.', adminOnly: 'المهندسين والأدمن بس اللي يقدروا يعملوا ده.',
  ownEmail: 'مينفعش تغيّر إيميلك بنفسك، اطلب من المهندس.', badPhoto: 'الصورة دي مش نافعة، جرّب صورة JPG أو PNG.',
  changePhoto: 'غيّر الصورة', removePhoto: 'شيلها', photoSaved: 'الصورة اتحفظت ✓', onlyOwner: '{name} بس اللي يقدر يعدّل البروفايل ده.',
  accessAdmins: 'الإيميل والدور المهندسين بس اللي يغيروهم.', editProfile: 'عدّل بروفايلك',
  viewOnly: 'قراية بس', noPermission: 'معندكش صلاحية تعدّل هنا. اطلب من المهندس.',
  noUploadRights: 'تقدر تشوف الملفات بس مش ترفع. اطلب من المهندس يفتحهالك.',
  permissions: 'صلاحيات التعديل', permsHint: 'العضو ده يقدر يعدّل إيه. القراية مفتوحة للكل دايماً.',
  canDoAll: 'يعدّل كل حاجة', readOnlyAll: 'قراية بس', fullAccess: 'صلاحية كاملة', adminAccess: 'مهندس / أدمن: صلاحية كاملة دايماً',
  sectionsOn: 'أقسام', yourAccess: 'صلاحياتك في التعديل',
  heroCase: 'الموسم شغال',
  you: 'انت', welcomeTitle: 'أهلاً بيك في التيم', welcomeSub: 'انت رسمياً في Criminals، وده حسابك.',
  memberNo: 'عضو', ofTeam: 'من', pickRoles: 'اختار أدوارك في التاسكات',
  pickRolesSub: 'التاسكات في الشيت متوزعة على الأدوار مش الأسامي. اختار أدوارك عشان «تاسكاتك» تظهر صح. تقدر تغيرها بعدين من صفحة التيم.',
  letsGo: 'يلا بينا', myProfile: 'حسابك', setRoles: 'اختار أدوارك',
  taskRoles: 'أدوار التاسكات', nameAr: 'الاسم بالعربي', membersCount: 'عضو', noEmail: '⚠ لسه مفيش إيميل', language: 'اللغة', addMember: 'ضيف عضو', responsibilities: 'المسؤوليات الأساسية',
  supportingRoles: 'أدوار مساعدة', skills: 'مهارات يطورها', mentor: 'المنتور / الكوتش', availability: 'المواعيد المتاحة',
  addPerson: 'ضيف للدليل', tasksOwned: 'تاسك',
  dropFiles: 'اسحب الملفات هنا أو دوس للاختيار', uploadTo: 'الفولدر', linkTask: 'اربطه بتاسك (اختياري)',
  note: 'ملاحظة', upload: 'ارفع', uploading: 'بيترفع…', uploaded: 'اترفع', openFolder: 'افتح فولدر الدرايف',
  history: 'سجل الرفع', tooBig: 'الملف أكبر من الحد — ارفعه في فولدر الدرايف مباشرة.',
  noUploads: 'مفيش ملفات اترفعت لسه.', general: 'عام',
  field: 'الخانة', from: 'من', to: 'لـ', created: 'أضاف',
  resourceName: 'المصدر', version: 'النسخة / التاريخ', lastChecked: 'آخر مراجعة', verifiedBy: 'اتأكد منه', addResource: 'ضيف مصدر',
  seasonSettings: 'إعدادات الموسم', theme: 'الثيم', dark: 'غامق', light: 'فاتح',
  none: '—', loading: 'بنحمّل الموسم…',
};

/** Data values stay English in the sheet; translate for display only. */
const VALUES_AR: Record<string, string> = {
  'Innovation Project': 'مشروع الابتكار', 'Robot Design': 'تصميم الروبوت', 'Robot Game': 'لعبة الروبوت',
  'Core Values': 'القيم الأساسية', 'Operations & Competition Readiness': 'التشغيل والاستعداد', All: 'الكل',
  'Not Started': 'لسه مبدأتش', 'In Progress': 'شغالين', Blocked: 'واقفة', 'Under Review': 'تحت المراجعة',
  Completed: 'خلصت', Cancelled: 'اتلغت', Critical: 'حرجة', High: 'عالية', Medium: 'متوسطة', Low: 'قليلة',
  'Not Reviewed': 'لسه متراجعتش', Approved: 'اتوافق عليها', 'Changes Required': 'محتاجة تعديلات',
  Open: 'مفتوح', Closed: 'مقفول', Student: 'طالب', Instructor: 'مدرب',
};

const dicts = { en, ar };

interface I18n { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof Dict) => string; v: (s: unknown) => string }
const Ctx = createContext<I18n>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('criminals.lang') as Lang) || 'en'; } catch { return 'en'; }
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('criminals.lang', l); } catch { /* */ } };
  const t = (k: keyof Dict) => dicts[lang][k] ?? en[k];
  const v = (s: unknown) => { const str = String(s ?? ''); return lang === 'ar' ? VALUES_AR[str] ?? str : str; };
  return <Ctx.Provider value={{ lang, setLang, t, v }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export type TKey = keyof Dict;
