import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity as ActivityIcon, BookOpen, CalendarRange, Flag, Home as HomeIcon, Languages, Link2, ListChecks,
  LogOut, Menu, Moon, NotebookPen, ShieldAlert, Sun, UploadCloud, Users, Settings as SettingsIcon,
} from 'lucide-react';
import { getToken } from './api';
import { DEMO } from './config';
import { useI18n, type TKey } from './i18n';
import { StoreProvider, useDisplayName, useStore } from './store';
import { Login } from './Login';
import { Avatar, Modal, Toasts } from './components/ui';
import { Home } from './pages/Home';
import { Tasks } from './pages/Tasks';
import { Timeline } from './pages/Timeline';
import { Milestones } from './pages/Milestones';
import { Risks } from './pages/Risks';
import { Weekly } from './pages/Weekly';
import { Team } from './pages/Team';
import { Activity, Guide, Resources, Settings, Uploads } from './pages/Other';
import { cls, isOverdue } from './util';

export type Page = 'home' | 'tasks' | 'timeline' | 'milestones' | 'risks' | 'weekly' | 'team' | 'uploads' | 'activity' | 'resources' | 'guide' | 'settings';

const NAV: { id: Page; icon: ReactNode; key: TKey }[] = [
  { id: 'home', icon: <HomeIcon size={18} />, key: 'home' },
  { id: 'tasks', icon: <ListChecks size={18} />, key: 'tasks' },
  { id: 'timeline', icon: <CalendarRange size={18} />, key: 'timeline' },
  { id: 'milestones', icon: <Flag size={18} />, key: 'milestones' },
  { id: 'risks', icon: <ShieldAlert size={18} />, key: 'risks' },
  { id: 'weekly', icon: <NotebookPen size={18} />, key: 'weekly' },
  { id: 'uploads', icon: <UploadCloud size={18} />, key: 'uploads' },
  { id: 'team', icon: <Users size={18} />, key: 'team' },
  { id: 'activity', icon: <ActivityIcon size={18} />, key: 'activity' },
  { id: 'resources', icon: <Link2 size={18} />, key: 'resources' },
  { id: 'guide', icon: <BookOpen size={18} />, key: 'guide' },
  { id: 'settings', icon: <SettingsIcon size={18} />, key: 'settings' },
];
const MOBILE_TABS: Page[] = ['home', 'tasks', 'uploads', 'weekly'];

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
      <div className="bg"><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /><div className="blob b4" /><div className="grain" /></div>
      {authed ? (
        <StoreProvider onSignOut={onSignOut}>
          <Shell theme={theme} setTheme={setTheme} />
          <Toasts />
        </StoreProvider>
      ) : <Login onLogin={onLogin} />}
    </>
  );
}

function Shell({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const { t, lang, setLang } = useI18n();
  const { all, error, refresh, busy, signOut } = useStore();
  const dn = useDisplayName();
  const [page, setPage] = useState<Page>(readHash);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const on = () => setPage(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (p: Page) => { location.hash = '/' + p; setPage(p); setMore(false); window.scrollTo({ top: 0 }); };

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
  const pages: Record<Page, ReactNode> = {
    home: <Home go={go} />, tasks: <Tasks />, timeline: <Timeline />, milestones: <Milestones />, risks: <Risks />,
    weekly: <Weekly />, team: <Team />, uploads: <Uploads />, activity: <Activity />, resources: <Resources />,
    guide: <Guide />, settings: <Settings theme={theme} setTheme={setTheme} />,
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="panel">
          <div className="brand">
            <div className="logo">C</div>
            <div className="brand-name">criminals<small>BIOGLOW · {t('appTagline')}</small></div>
          </div>
          {NAV.map((n, i) => (
            <div key={n.id}>
              {(i === 6 || i === 9) && <div className="nav-sep" />}
              <button className={cls('nav-item', page === n.id && 'active')} onClick={() => go(n.id)}>
                {n.icon} {t(n.key)}
                {n.id === 'tasks' && blockedCount > 0 && <span className="count">{blockedCount}</span>}
              </button>
            </div>
          ))}
          <div className="side-foot">
            {DEMO && <div className="demo-pill">🧪 {t('demoMode')}</div>}
            <div className="row" style={{ padding: '0 6px' }}>
              <button className="btn icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t('theme')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
              <button className="btn icon" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} aria-label={t('language')}><Languages size={16} /></button>
              {busy && <span className="saving-dot pulse" title={t('saving')} />}
            </div>
            <div className="row" style={{ padding: '6px', flexWrap: 'nowrap' }}>
              <Avatar name={dn(all.me.name)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{dn(all.me.name)}</div>
                <div className="muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{all.me.email}</div>
              </div>
              {!DEMO && <button className="btn icon ghost" onClick={signOut} aria-label={t('signOut')}><LogOut size={16} /></button>}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {pages[page]}
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
        <div className="grid g-2" style={{ gap: 8 }}>
          {NAV.filter((n) => !MOBILE_TABS.includes(n.id)).map((n) => (
            <button key={n.id} className={cls('nav-item', page === n.id && 'active')} onClick={() => go(n.id)}>{n.icon} {t(n.key)}</button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} {t('theme')}</button>
          <button className="btn sm" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}><Languages size={14} /> {lang === 'en' ? 'عربي' : 'English'}</button>
          {!DEMO && <button className="btn sm" onClick={signOut}><LogOut size={14} /> {t('signOut')}</button>}
        </div>
        {DEMO && <div className="demo-pill" style={{ marginTop: 12 }}>🧪 {t('demoMode')}</div>}
      </Modal>
    </div>
  );
}
