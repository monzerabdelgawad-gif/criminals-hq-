import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { STATUS_EMOJI, WS_COLOR, WS_SHORT, cls, initials, isoDate, parseDate } from '../util';

export const STATUS_COLOR: Record<string, string> = {
  'Not Started': 'var(--s-ns)', 'In Progress': 'var(--s-ip)', Blocked: 'var(--s-bl)', 'Under Review': 'var(--s-ur)',
  Completed: 'var(--s-done)', Cancelled: 'var(--s-cx)', Open: 'var(--s-ur)', Closed: 'var(--s-done)',
  Approved: 'var(--s-done)', 'Changes Required': 'var(--s-bl)', 'Not Reviewed': 'var(--s-ns)',
};
const PRIORITY_COLOR: Record<string, string> = { Critical: 'var(--s-bl)', High: 'var(--c-ip)', Medium: 'var(--s-ur)', Low: 'var(--s-ns)' };

export function Chip({ color, children, dot, className }: { color?: string; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cls('chip', className)} style={{ ['--c' as string]: color }}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const { v } = useI18n();
  if (!status) return null;
  return <Chip color={STATUS_COLOR[status]}>{STATUS_EMOJI[status] ?? ''} {v(status)}</Chip>;
}

export function WsChip({ ws, short }: { ws: string; short?: boolean }) {
  const { v } = useI18n();
  if (!ws) return null;
  return <Chip className="ws" color={WS_COLOR[ws]} dot>{short ? WS_SHORT[ws] ?? ws : v(ws)}</Chip>;
}

export function PriorityChip({ p }: { p: string }) {
  const { v } = useI18n();
  if (!p) return null;
  return <Chip color={PRIORITY_COLOR[p]}>{p === 'Critical' ? '⚡ ' : ''}{v(p)}</Chip>;
}

export function Avatar({ name, src, size = 30 }: { name: string; src?: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} title={name}>
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  );
}

export function Bar({ value, color }: { value: number; color?: string }) {
  return <div className="bar" style={{ ['--c' as string]: color }}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Ring({ value, size = 120, stroke = 12, color = 'var(--accent)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in srgb, var(--text) 10%, transparent)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const { lang } = useI18n();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  const dx = lang === 'ar' ? -40 : 40;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drawer" initial={{ opacity: 0, x: dx }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dx }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function DrawerHead({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="drawer-head">
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <button className="btn icon ghost" onClick={onClose} aria-label={t('close')}><X size={18} /></button>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="modal" initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-48%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-48%' }} style={{ transform: 'none' }}>
            <h3>{title}</h3>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'number';

/**
 * Inline-editable field. Saves on blur (text) or on change (select/date).
 * Pass readOnly for computed columns.
 */
export function Field({ label, value, onSave, type = 'text', options, readOnly, full, placeholder, translate, live }: {
  label: string; value: string; onSave?: (v: string) => void; type?: FieldType; options?: string[];
  readOnly?: boolean; full?: boolean; placeholder?: string; translate?: boolean;
  /** live = report every keystroke (for "new item" forms, not saved fields) */
  live?: boolean;
}) {
  const { v: tv } = useI18n();
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  const commit = (next: string) => { if (next !== value) onSave?.(next); };

  let input: ReactNode;
  if (readOnly || !onSave) {
    input = <div className="ro">{(translate ? tv(value) : value) || '—'}</div>;
  } else if (type === 'select') {
    const opts = options ?? [];
    input = (
      <select className="select" value={val} onChange={(e) => { setVal(e.target.value); commit(e.target.value); }}>
        {!opts.includes(val) && <option value={val}>{val || '—'}</option>}
        {opts.map((o) => <option key={o} value={o}>{translate ? tv(o) : o}</option>)}
      </select>
    );
  } else if (type === 'date') {
    const d = parseDate(val);
    input = (
      <input className="input" type="date" value={d ? isoDate(d) : ''} onChange={(e) => { setVal(e.target.value); commit(e.target.value); }} />
    );
  } else if (type === 'textarea') {
    input = <textarea className="textarea" value={val} placeholder={placeholder}
      onChange={(e) => { setVal(e.target.value); if (live) onSave?.(e.target.value); }} onBlur={() => commit(val)} />;
  } else {
    input = (
      <input className="input" type={type === 'number' ? 'number' : 'text'} value={val} placeholder={placeholder}
        onChange={(e) => { setVal(e.target.value); if (live) onSave?.(e.target.value); }} onBlur={() => commit(val)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    );
  }
  return (
    <div className={full ? 'full' : undefined}>
      <label className="lbl">{label}</label>
      {input}
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className={cls('toast', t.kind)} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="topbar">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      <div className="spacer" />
      <div className="row">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Linkify URLs inside plain text (evidence column may hold several links). */
export function Linkify({ text }: { text: string }) {
  const parts = String(text || '').split(/(https?:\/\/\S+)/g);
  return <>{parts.map((p, i) => (/^https?:\/\//.test(p)
    ? <a key={i} className="link" href={p} target="_blank" rel="noreferrer">{p.length > 48 ? p.slice(0, 48) + '…' : p}</a>
    : <span key={i}>{p}</span>))}</>;
}
