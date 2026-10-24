import type { Row, Me } from './types';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "05 Oct 2026" | "2026-10-05" -> Date (local) */
export function parseDate(s: unknown): Date | null {
  const v = String(s ?? '').trim();
  let m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(v);
  if (m) {
    const mi = MON.findIndex((x) => x.toLowerCase() === m![2].toLowerCase());
    if (mi >= 0) return new Date(+m[3], mi, +m[1]);
  }
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}

export const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()}`;
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5);

export const DONE = ['Completed', 'Cancelled'];

export function isOverdue(t: Row) {
  const d = parseDate(t.plannedDeadline);
  return !!d && d < today() && !DONE.includes(String(t.status));
}

/** Owners in the sheet are roles ("Programmer"), so "mine" = my roles or my name. */
export function isMine(t: Row, me: Me, includeTeamWide = false) {
  const roles = me.taskRoles.map((r) => r.toLowerCase());
  const owner = String(t.owner).toLowerCase();
  const supp = String(t.supporting).toLowerCase();
  const name = me.name.toLowerCase();
  if (roles.includes(owner) || owner.includes(name) || supp.includes(name)) return true;
  if (includeTeamWide && me.teamRole !== 'Instructor') {
    return ['all students', 'full team'].includes(owner);
  }
  if (me.teamRole === 'Instructor' && owner === 'coach') return true;
  return false;
}

export const WS_SHORT: Record<string, string> = {
  'Innovation Project': 'IP', 'Robot Design': 'RD', 'Robot Game': 'RG', 'Core Values': 'CV',
  'Operations & Competition Readiness': 'OP', All: 'ALL',
};

export const WS_COLOR: Record<string, string> = {
  'Innovation Project': 'var(--c-ip)', 'Robot Design': 'var(--c-rd)', 'Robot Game': 'var(--c-rg)',
  'Core Values': 'var(--c-cv)', 'Operations & Competition Readiness': 'var(--c-op)', All: 'var(--c-all)',
};

export const STATUS_EMOJI: Record<string, string> = {
  'Not Started': '💤', 'In Progress': '🔥', Blocked: '💀', 'Under Review': '👀', Completed: '✅', Cancelled: '🚫',
  Open: '🟠', Closed: '✅',
};

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('') || '?';
}

export function cls(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(' '); }

export function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }
