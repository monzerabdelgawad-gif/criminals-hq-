import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity as ActivityIcon, BookOpen, CalendarClock, CalendarRange, FileText, Flag, Home as HomeIcon, Languages, Link2, ListChecks,
  LogOut, Menu, Moon, NotebookPen, PanelLeftClose, PanelLeftOpen, ShieldAlert, Sun, UploadCloud, Users, Settings as SettingsIcon,
} from 'lucide-react';
import { getToken } from './api';
import { getDemoRole, setDemoRole, type DemoRole } from './mock';
import { DEMO } from './config';
import { useI18n, type TKey } from './i18n';
import { StoreProvider, useDisplayName, useSeeActivity, useStore } from './store';
import { Login } from './Login';
import { Avatar, Chip, Modal, Toasts } from './components/ui';
import { Welcome } from './components/Welcome';
import { Mark, Wordmark } from './components/Brand';
import { InstallButton, OfflineBanner } from './components/Mobile';
import { Home } from './pages/Home';
import { Tasks } from './pages/Tasks';
import { Timeline } from './pages/Timeline';
import { Milestones } from './pages/Milestones';
import { Risks } from './pages/Risks';
import { Weekly } from './pages/Weekly';
import { Team } from './pages/Team';
import { Meetings } from './pages/Meetings';
import { Content } from './pages/Content';
import { Activity, Guide, Resources, Settings, Uploads } from './pages/Other';
import { cls, isOverdue } from './util';

export type Page = 'home' | 'meetings' | 'tasks' | 'timeline' | 'milestones' | 'risks' | 'weekly' | 'team' | 'uploads' | 'activity' | 'resources' | 'content' | 'guide' | 'settings';

const NAV: { id: Page; icon: ReactNode; key: TKey }[] = [
  { id: 'home', icon: <HomeIcon size={18} />, key: 'home' },
  { id: 'meetings', icon: <CalendarClock size={18} />, key: 'meetings' },
  { id: 'tasks', icon: <ListChecks size={18} />, key: 'tasks' },
  { id: 'uploads', icon: <UploadCloud size={18} />, key: 'uploads' },
  { id: 'timeline', icon: <CalendarRange size={18} />, key: 'timeline' },
  { id: 'milestones', icon: <Flag size={18} />, key: 'milestones' },
  { id: 'risks', icon: <ShieldAlert size={18} />, key: 'risks' },
  { id: 'weekly', icon: <NotebookPen size={18} />, key: 'weekly' },
  { id: 'team', icon: <Users size={18} />, key: 'team' },
  { id: 'activity', icon: <ActivityIcon size={18} />, key: 'activity' },
  { id: 'resources', icon: <Link2 size={18} />, key: 'resources' },
  { id: 'content', icon: <FileText size={18} />, key: 'content' },
  { id: 'guide', icon: <BookOpen size={18} />, key: 'guide' },
  { id: 'settings', icon: <SettingsIcon size={18} />, key: 'settings' },
];
/** Sidebar groups: daily work first, planning next, then the crew and the back office. */
const NAV_GROUPS: { key: TKey; ids: Page[] }[] = [
  { key: 'navOps', ids: ['home', 'meetings', 'tasks', 'uploads'] },
  { key: 'navPlan', ids: ['timeline', 'milestones', 'risks', 'weekly'] },
  { key: 'navCrew', ids: ['team', 'activity'] },
  { key: 'navMore', ids: ['resources', 'content', 'guide', 'settings'] },
];
const RAIL_KEY = 'criminals.rail';
const MOBILE_TABS: Page[] = ['home', 'meetings', 'tasks', 'uploads'];

const readHash = (): Page => {
  const h = location.hash.replace('#/', '') as Page;
  return NAV.some((n) => n.id === h) ? h : 'home';
};

export default function App() {
  const [authed, setAuthed] = useState(() => DEMO || !!getToken());
  const [theme, setThemeState] = useState(() => { try { return localStorage.getItem('criminals.theme') || 'dark'; } catch { return 'dark'; } });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const setTheme = (t: string) => { setThemeState(t); try { localStorage.setItem('criminals.theme', t); } catch { /* */ } };
  const onSignOut = useCallback(() => setAuthed(false), []);
  const onLogin = useCallback(() => setAuthed(true), []);

  return (
    <>
      <div className="bg"><div className="grain" /></div>
      <OfflineBanner />
      {authed ? (
        <StoreProvider onSignOut={onSignOut}>
          <Shell theme={theme} setTheme={setTheme} />
          <Welcome />
          <Toasts />
        </StoreProvider>
      ) : <Login onLogin={onLogin} />}
    </>
  );
}

function Shell({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const { t, v, lang, setLang } = useI18n();
  const { all, error, refresh, busy, signOut } = useStore();
  const dn = useDisplayName();
  const seeActivity = useSeeActivity();
  const [page, setPage] = useState<Page>(readHash);
  const [more, setMore] = useState(false);
  const [rail, setRailState] = useState(() => { try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; } });
  const setRail = (r: boolean) => { setRailState(r); try { localStorage.setItem(RAIL_KEY, r ? '1' : '0'); } catch { /* */ } };

  useEffect(() => {
    const on = () => setPage(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (p: Page) => { location.hash = '/' + p; setPage(p); setMore(false); window.scrollTo({ top: 0 }); };
  const openMe = () => { try { sessionStorage.setItem('criminals.openMe', '1'); } catch { /* */ } go('team'); };

  // first visit: use the language saved on the member's profile
  useEffect(() => {
    if (!all) return;
    try {
      if (!localStorage.getItem('criminals.lang') && (all.me.lang === 'ar' || all.me.lang === 'en')) setLang(all.me.lang);
    } catch { /* */ }
  }, [all, setLang]);

  if (!all) {
    return (
      <div className="loader">
        {error ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 12 }}>{t('error')}: {error}</div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary" onClick={refresh}>{t('retry')}</button>
              <button className="btn" onClick={signOut}>{t('signOut')}</button>
            </div>
          </div>
        ) : <span className="pulse">{t('loading')}</span>}
      </div>
    );
  }

  const blockedCount = all.data.tasks.filter((x) => x.status === 'Blocked' || isOverdue(x)).length;
  // Activity is private to a few people: hide it everywhere for everyone else
  const canPage = (id: Page) => id !== 'activity' || seeActivity;
  const shown: Page = canPage(page) ? page : 'home';
  const pages: Record<Page, ReactNode> = {
    home: <Home go={go} />, meetings: <Meetings />, tasks: <Tasks />, timeline: <Timeline />, milestones: <Milestones />, risks: <Risks />,
    weekly: <Weekly />, team: <Team />, uploads: <Uploads />, activity: <Activity />, resources: <Resources />,
    content: <Content />, guide: <Guide />, settings: <Settings theme={theme} setTheme={setTheme} />,
  };

  return (
    <div className={cls('app', rail && 'rail')}>
      <aside className="sidebar">
        <div className="panel">
          <div className="brand">
            <Mark size={rail ? 36 : 40} className="mark" />
            <div className="brand-name"><Wordmark height={16} /><small>BIOGLOW 26/27 · {t('appTagline')}</small></div>
            <button className="btn icon ghost side-toggle" onClick={() => setRail(!rail)} title={rail ? t('expandSide') : t('collapseSide')} aria-label={rail ? t('expandSide') : t('collapseSide')}>
              {(rail !== (lang === 'ar')) ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>
          {NAV_GROUPS.map((g, gi) => (
            <div key={g.key}>
              {gi > 0 && <div className="nav-group-sep" />}
              <div className="nav-group">{t(g.key)}</div>
              {g.ids.filter(canPage).map((id) => {
                const n = NAV.find((x) => x.id === id)!;
                return (
                  <button key={id} className={cls('nav-item', page === id && 'active')} onClick={() => go(id)} title={rail ? t(n.key) : undefined}>
                    {n.icon} <span className="nav-label">{t(n.key)}</span>
                    {id === 'tasks' && blockedCount > 0 && <span className="count">{blockedCount}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="side-foot">
            {DEMO && <div className="demo-pill hide-rail">🧪 {t('demoMode')}<DemoRolePicker /></div>}
            <div className="row" style={{ padding: '0 4px' }}>
              <button className="btn icon ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t('theme')} title={t('theme')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
              <button className="btn icon ghost" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} aria-label={t('language')} title={t('language')}><Languages size={16} /></button>
              {busy && <span className="saving-dot pulse" title={t('saving')} />}
            </div>
            <div className="row me-row" style={{ padding: '6px', flexWrap: 'nowrap' }} onClick={openMe} title={t('editProfile')}>
              <Avatar name={dn(all.me.name)} />
              <div className="hide-rail" style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{dn(all.me.name)}</div>
                <div className="muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{all.me.email}</div>
              </div>
              {!DEMO && <button className="btn icon ghost hide-rail" onClick={(e) => { e.stopPropagation(); signOut(); }} aria-label={t('signOut')}><LogOut size={16} /></button>}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {pages[shown]}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="tabbar">
        {MOBILE_TABS.map((id) => {
          const n = NAV.find((x) => x.id === id)!;
          return <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}>{n.icon}{t(n.key)}</button>;
        })}
        <button className={!MOBILE_TABS.includes(page) ? 'active' : ''} onClick={() => setMore(true)}><Menu size={18} />{t('more')}</button>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title={t('more')}>
        <div className="me-card">
          <Avatar name={dn(all.me.name)} size={44} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700 }}><bdi>{dn(all.me.name)}</bdi> <span className="you-tag">{t('you')}</span></div>
            <div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{all.me.email}</div>
            <div className="row" style={{ gap: 5, marginTop: 6 }}>
              <Chip color={all.me.teamRole === 'Instructor' ? 'var(--accent-2)' : 'var(--accent)'}>{v(all.me.teamRole || 'Student')}</Chip>
              {all.me.taskRoles.map((r) => <Chip key={r}>{r}</Chip>)}
            </div>
            <button className="btn sm" style={{ marginTop: 10 }} onClick={openMe}>✏️ {t('editProfile')}</button>
          </div>
        </div>
        <div className="more-grid">
          {NAV.filter((n) => !MOBILE_TABS.includes(n.id) && canPage(n.id)).map((n) => (
            <button key={n.id} className={cls('nav-item', page === n.id && 'active')} onClick={() => go(n.id)}>{n.icon} {t(n.key)}</button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} {t('theme')}</button>
          <button className="btn sm" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}><Languages size={14} /> {lang === 'en' ? 'عربي' : 'English'}</button>
          {!DEMO && <button className="btn sm" onClick={signOut}><LogOut size={14} /> {t('signOut')}</button>}
          <InstallButton />
        </div>
        {DEMO && <div className="demo-pill" style={{ marginTop: 12 }}>🧪 {t('demoMode')}<DemoRolePicker /></div>}
      </Modal>
    </div>
  );
}

/** Demo mode only: switch who you are to preview permissions. */
function DemoRolePicker() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  return (
    <select className="select" style={{ marginTop: 6, fontSize: 12, padding: '5px 8px' }} value={getDemoRole()}
      onChange={(e) => setDemoRole(e.target.value as DemoRole)}>
      <option value="admin">{ar ? 'جرّب كـ: أدمن' : 'Try as: admin'}</option>
      <option value="tasks">{ar ? 'جرّب كـ: طالب (تاسكات + رفع)' : 'Try as: student (tasks + uploads)'}</option>
      <option value="view">{ar ? 'جرّب كـ: طالب (قراية بس)' : 'Try as: student (view only)'}</option>
    </select>
  );
}
