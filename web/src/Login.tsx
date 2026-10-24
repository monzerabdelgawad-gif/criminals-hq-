import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { call, setToken } from './api';
import { GOOGLE_CLIENT_ID } from './config';
import { useI18n } from './i18n';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function Login({ onLogin }: { onLogin: () => void }) {
  const { t, lang, setLang } = useI18n();
  const btn = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let tries = 0;
    const init = () => {
      if (!window.google || !btn.current) {
        if (tries++ < 50) setTimeout(init, 150);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (res: { credential: string }) => {
          setBusy(true); setErr(null);
          const r = await call<{ token: string }>('login', { idToken: res.credential });
          setBusy(false);
          if (r.ok) { setToken(r.token); onLogin(); return; }
          setErr(r.error === 'not_allowed' ? `${t('notAllowed')} (${String(r.email ?? '')})`
            : r.error === 'not_configured' ? t('notConfigured')
            : r.error === 'network' ? t('offline') : `${t('error')}: ${r.error}`);
        },
      });
      btn.current.innerHTML = '';
      window.google.accounts.id.renderButton(btn.current, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: lang });
    };
    init();
  }, [lang, onLogin, t]);

  return (
    <div className="login-wrap">
      <motion.div className="card login" initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }}>
        <div className="logo">C</div>
        <h1>criminals</h1>
        <div className="tag">FLL BIOGLOW 2026–27 · {t('signInTitle')}</div>
        <div className="gbtn" ref={btn} style={{ opacity: busy ? 0.4 : 1 }} />
        <div className="muted small" style={{ marginTop: 14 }}>{busy ? t('loading') : t('signInSub')}</div>
        {err && <div className="err-box">{err}</div>}
        <button className="btn ghost sm" style={{ marginTop: 18 }} onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
          {lang === 'en' ? 'عربي' : 'English'}
        </button>
      </motion.div>
    </div>
  );
}
