import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n';

const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
/** Instagram / TikTok / Facebook / Snapchat / LinkedIn in-app browsers block Google sign-in. */
export const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|Snapchat|LinkedInApp|Line\//i.test(UA);
const ANDROID = /Android/i.test(UA);
const IOS = /iPhone|iPad|iPod/i.test(UA);
const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** Login screen: tell people to leave the in-app browser, with a one-tap way out. */
export function InAppBanner() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!IN_APP) return null;
  const url = location.href.split('#')[0];
  const chrome = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { window.prompt(t('copyLink'), url); }
  };
  return (
    <div className="warn-box">
      <div style={{ fontWeight: 700 }}>⚠ {t('inAppTitle')}</div>
      <div className="small" style={{ marginTop: 4 }}>{t('inAppSub')}</div>
      {IOS && <div className="small muted" style={{ marginTop: 4 }}>{t('inAppIos')}</div>}
      <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 10 }}>
        {ANDROID && <a className="btn primary sm" href={chrome}><ExternalLink size={14} /> {t('openInChrome')}</a>}
        <button className="btn sm" onClick={copy}><Copy size={14} /> {copied ? t('linkCopied') : t('copyLink')}</button>
      </div>
    </div>
  );
}

/** Fixed pill while the phone has no connection. */
export function OfflineBanner() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!offline) return null;
  return <div className="offline-pill"><WifiOff size={14} /> {t('offlineNow')}</div>;
}

interface InstallEvent extends Event { prompt: () => Promise<void> }
let deferred: InstallEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; });
}

/** "Add to home screen": real install prompt on Android/Chrome, instructions on iPhone. Hidden once installed. */
export function InstallButton() {
  const { t } = useI18n();
  const [hint, setHint] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    const on = () => force((n) => n + 1);
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);
  if (standalone() || (!deferred && !IOS)) return null;
  const click = async () => {
    if (deferred) { await deferred.prompt(); deferred = null; force((n) => n + 1); }
    else setHint(true);
  };
  return (
    <>
      <button className="btn sm" onClick={click}><Download size={14} /> {t('installApp')}</button>
      {hint && <div className="muted small" style={{ width: '100%', marginTop: 6 }}>{t('installIos')}</div>}
    </>
  );
}
