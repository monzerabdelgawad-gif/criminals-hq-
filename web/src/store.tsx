import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { call, fileToBase64, setToken } from './api';
import { POLL_MS, MAX_UPLOAD_MB } from './config';
import type { AllData, Change, Entity, Row } from './types';
import { useI18n } from './i18n';

interface Toast { id: number; text: string; kind: 'ok' | 'err' | 'info' }

interface Store {
  all: AllData | null;
  error: string | null;
  busy: boolean;
  refresh: () => Promise<void>;
  update: (entity: Entity, row: Row, changes: Record<string, string>) => Promise<boolean>;
  add: (entity: Entity, values: Record<string, string>) => Promise<Row | null>;
  upload: (file: File, opts: { workstream?: string; taskId?: string; note?: string }) => Promise<boolean>;
  toast: (text: string, kind?: Toast['kind']) => void;
  toasts: Toast[];
  signOut: () => void;
}

const Ctx = createContext<Store>(null!);

export function StoreProvider({ children, onSignOut }: { children: ReactNode; onSignOut: () => void }) {
  const { t } = useI18n();
  const [all, setAll] = useState<AllData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const rev = useRef(-1);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, text, kind }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3800);
  }, []);

  const signOut = useCallback(() => { setToken(null); savePicture(''); onSignOut(); }, [onSignOut]);

  const handleErr = useCallback((err: string) => {
    if (err === 'unauthorized') { signOut(); return; }
    toast(err === 'network' ? t('offline') : `${t('error')}: ${err}`, 'err');
  }, [signOut, toast, t]);

  const refresh = useCallback(async () => {
    const r = await call<AllData>('getAll');
    if (r.ok) {
      rev.current = r.rev;
      setAll(r as unknown as AllData);
      setError(null);
    } else if (r.error === 'unauthorized') {
      signOut();
    } else {
      setError(r.error);
    }
  }, [signOut]);

  // first load + cheap polling on the change counter (only while the tab is visible)
  useEffect(() => {
    refresh();
    const tick = async () => {
      if (document.hidden) return;
      const r = await call<{ rev: number }>('rev');
      if (r.ok && r.rev !== rev.current) refresh();
    };
    const id = setInterval(tick, POLL_MS);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  const patchRow = (entity: Entity, row: Row) =>
    setAll((a) => a && ({ ...a, data: { ...a.data, [entity]: a.data[entity].map((r) => (r.id === row.id ? row : r)) } }));

  const update = useCallback(async (entity: Entity, row: Row, values: Record<string, string>) => {
    const changes: Change[] = Object.entries(values)
      .filter(([f, v]) => String(row[f] ?? '') !== v)
      .map(([field, value]) => ({ field, value, expected: String(row[field] ?? '') }));
    if (!changes.length) return true;
    // optimistic UI
    patchRow(entity, { ...row, ...values });
    setBusy(true);
    const r = await call<{ row: Row }>('update', { entity, id: row.id, changes });
    setBusy(false);
    if (r.ok) {
      patchRow(entity, r.row);
      rev.current++;
      refreshActivitySoon();
      return true;
    }
    if (r.error === 'conflict') toast(t('conflict'), 'err');
    else handleErr(r.error);
    await refresh();
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, handleErr, toast, t]);

  const refreshTimer = useRef<number>();
  const refreshActivitySoon = () => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => refresh(), 1500);
  };

  const add = useCallback(async (entity: Entity, values: Record<string, string>) => {
    setBusy(true);
    const r = await call<{ row: Row }>('add', { entity, values });
    setBusy(false);
    if (r.ok) {
      setAll((a) => a && ({ ...a, data: { ...a.data, [entity]: [...a.data[entity], r.row] } }));
      toast(t('saved'), 'ok');
      refreshActivitySoon();
      return r.row;
    }
    handleErr(r.error);
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleErr, toast, t]);

  const upload = useCallback(async (file: File, opts: { workstream?: string; taskId?: string; note?: string }) => {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) { toast(t('tooBig'), 'err'); return false; }
    setBusy(true);
    const data = await fileToBase64(file);
    const r = await call('upload', { fileName: file.name, mimeType: file.type, data, ...opts });
    setBusy(false);
    if (r.ok) { toast(`${file.name} — ${t('uploaded')}`, 'ok'); await refresh(); return true; }
    handleErr(r.error);
    return false;
  }, [handleErr, refresh, toast, t]);

  return (
    <Ctx.Provider value={{ all, error, busy, refresh, update, add, upload, toast, toasts, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);

/** Google profile photo, saved on this device at sign-in (never written to the sheet). */
const PIC_KEY = 'criminals.picture';
export const savePicture = (url: string) => { try { if (url) localStorage.setItem(PIC_KEY, url); else localStorage.removeItem(PIC_KEY); } catch { /* */ } };
export const getPicture = () => { try { return localStorage.getItem(PIC_KEY) || ''; } catch { return ''; } };

/** The signed-in member's row in USERS (matched by email, then by name for demo data). */
export function useMyRow(): Row | undefined {
  const { all } = useStore();
  if (!all) return undefined;
  const e = all.me.email.trim().toLowerCase();
  return all.data.users.find((u) => String(u.email).trim().toLowerCase() === e)
    ?? all.data.users.find((u) => String(u.name).trim().toLowerCase() === all.me.name.trim().toLowerCase());
}

/** Names are stored in English; in Arabic mode show the member's Arabic name (USERS -> Name (Arabic)). */
export function useDisplayName() {
  const { all } = useStore();
  const { lang } = useI18n();
  return (name: unknown) => {
    const n = String(name ?? '');
    if (lang !== 'ar' || !all || !n) return n;
    const u = all.data.users.find((x) => String(x.name).trim().toLowerCase() === n.trim().toLowerCase());
    return (u && String(u.nameAr || '')) || (all.me.name === n && all.me.nameAr) || n;
  };
}
