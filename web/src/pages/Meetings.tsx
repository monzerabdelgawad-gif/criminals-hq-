import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Clock, Link2, MapPin, Plus, Video } from 'lucide-react';
import { useI18n } from '../i18n';
import { useCan, useStore } from '../store';
import type { Row } from '../types';
import { Chip, Drawer, DrawerHead, Empty, Field, Locked, Modal, PageHead } from '../components/ui';
import { parseDate } from '../util';

/** Start / end of a meeting (the team is in Egypt, so local time = Cairo time). */
export function meetingTimes(m: Row) {
  const d = parseDate(m.date);
  const t = /^(\d{1,2}):(\d{2})/.exec(String(m.time ?? ''));
  if (!d) return null;
  const start = new Date(d);
  if (t) start.setHours(+t[1], +t[2], 0, 0); else start.setHours(23, 59, 0, 0);
  const end = new Date(start.getTime() + (Number(m.duration) || 60) * 60000);
  return { start, end, hasTime: !!t };
}

export type MeetingState = 'live' | 'upcoming' | 'past' | 'cancelled';
export function meetingState(m: Row, now = new Date()): MeetingState {
  if (m.status === 'Cancelled') return 'cancelled';
  const tm = meetingTimes(m);
  if (!tm) return 'upcoming';
  if (m.status === 'Done' || now >= tm.end) return 'past';
  return now >= tm.start ? 'live' : 'upcoming';
}

/** "LIVE", "in 2h 10m", "tomorrow 18:00", "in 5 days" */
export function useCountdown() {
  const { t } = useI18n();
  return (m: Row, now: Date) => {
    const tm = meetingTimes(m);
    if (!tm) return '';
    const st = meetingState(m, now);
    if (st === 'live') return t('liveNow');
    const mins = Math.round((tm.start.getTime() - now.getTime()) / 60000);
    if (mins < 60) return `${t('inTime')} ${mins} ${t('minShort')}`;
    if (mins < 24 * 60) return `${t('inTime')} ${Math.floor(mins / 60)}${t('hourShort')} ${mins % 60}${t('minShort')}`;
    const days = Math.round((new Date(tm.start).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 864e5);
    return days === 1 ? t('tomorrow') : `${t('inTime')} ${days} ${t('daysShort')}`;
  };
}

/** Re-render every 30 s so countdowns and LIVE badges stay fresh. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

const fmtDay = (d: Date, lang: string) => d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (d: Date, lang: string) => d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

export function JoinButton({ m, big }: { m: Row; big?: boolean }) {
  const { t } = useI18n();
  const link = String(m.link ?? '');
  if (!/^https?:\/\//.test(link)) return null;
  return (
    <a className={big ? 'btn primary' : 'btn sm primary'} href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      <Video size={big ? 16 : 14} /> {t('joinMeeting')}
    </a>
  );
}

/** The meeting link as a visible, clickable line (e.g. "meet.google.com/abc-defg-hij"). */
export function MeetLink({ m }: { m: Row }) {
  const link = String(m.link ?? '').trim();
  if (!/^https?:\/\//.test(link)) return null;
  const short = link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return (
    <a className="meet-link" href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={link}>
      <Link2 size={14} /> <span>{short}</span>
    </a>
  );
}

export function Meetings() {
  const { t, lang } = useI18n();
  const { all } = useStore();
  const can = useCan()('meetings');
  const now = useNow();
  const cd = useCountdown();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const list = all!.data.meetings ?? [];
  const sel = list.find((m) => m.id === open) ?? null;

  const { next, upcoming, past } = useMemo(() => {
    const withT = list.map((m) => ({ m, tm: meetingTimes(m), st: meetingState(m, now) }));
    const up = withT.filter((x) => x.st === 'live' || x.st === 'upcoming')
      .sort((a, b) => (a.tm?.start.getTime() ?? 9e15) - (b.tm?.start.getTime() ?? 9e15));
    const pa = withT.filter((x) => x.st === 'past' || x.st === 'cancelled')
      .sort((a, b) => (b.tm?.start.getTime() ?? 0) - (a.tm?.start.getTime() ?? 0));
    return { next: up[0]?.m ?? null, upcoming: up.slice(1).map((x) => x.m), past: pa.map((x) => x.m) };
  }, [list, now]);

  return (
    <Locked section="meetings"><div>
      <PageHead title={t('meetings')} sub={`📧 ${t('remindersInfo')}`}>
        {can && <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> {t('newMeeting')}</button>}
      </PageHead>

      {next ? (
        <motion.div className="card meet-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setOpen(next.id)}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="case-label">{t('nextMeeting')} // {next.id}</span>
            <span className={meetingState(next, now) === 'live' ? 'live-pill' : 'count-pill'}>{cd(next, now)}</span>
          </div>
          <h2 className="meet-title">{next.title}</h2>
          <MeetMeta m={next} lang={lang} />
          <MeetLink m={next} />
          {next.agenda && <div className="meet-agenda">{next.agenda}</div>}
          <div className="row" style={{ marginTop: 14 }}><JoinButton m={next} big /></div>
        </motion.div>
      ) : (
        <div className="card"><Empty><CalendarClock size={22} /><br />{t('noMeetings')}</Empty></div>
      )}

      {upcoming.length > 0 && <>
        <div className="card-title" style={{ marginTop: 22 }}>{t('upcomingMeetings')}</div>
        <div className="stack" style={{ gap: 10 }}>
          {upcoming.map((m) => <MeetRow key={m.id} m={m} now={now} onOpen={() => setOpen(m.id)} />)}
        </div>
      </>}

      <div className="card-title" style={{ marginTop: 22 }}>{t('pastMeetings')} <span className="sub">{past.length}</span></div>
      {past.length === 0 ? <div className="card"><Empty>—</Empty></div> : (
        <div className="stack" style={{ gap: 10 }}>
          {past.map((m) => <MeetRow key={m.id} m={m} now={now} onOpen={() => setOpen(m.id)} />)}
        </div>
      )}

      <Drawer open={!!sel} onClose={() => setOpen(null)}>{sel && <MeetingBody m={sel} onClose={() => setOpen(null)} />}</Drawer>
      <NewMeeting open={adding} onClose={() => setAdding(false)} />
    </div></Locked>
  );
}

function MeetMeta({ m, lang }: { m: Row; lang: string }) {
  const { t } = useI18n();
  const tm = meetingTimes(m);
  return (
    <div className="meet-meta">
      {tm && <span><CalendarClock size={14} /> {fmtDay(tm.start, lang)}{tm.hasTime && <> · {fmtTime(tm.start, lang)}</>}</span>}
      {m.duration && <span><Clock size={14} /> {m.duration} {t('minShort')}</span>}
      {m.location && <span><MapPin size={14} /> {m.location}</span>}
    </div>
  );
}

function MeetRow({ m, now, onOpen }: { m: Row; now: Date; onOpen: () => void }) {
  const { t, lang } = useI18n();
  const cd = useCountdown();
  const st = meetingState(m, now);
  const tm = meetingTimes(m);
  return (
    <div className={st === 'past' || st === 'cancelled' ? 'card tight meet-row past' : 'card tight meet-row'} onClick={onOpen}>
      <div className="meet-date">
        <div className="d">{tm ? tm.start.getDate() : '—'}</div>
        <div className="m">{tm ? tm.start.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short' }) : ''}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}><span className="id-tag">{m.id}</span>
          {st === 'cancelled' && <Chip color="var(--s-bl)">{t('cancelled')}</Chip>}
          {st === 'past' && m.notes && <Chip color="var(--s-done)">📝 {t('minutes')}</Chip>}
        </div>
        <div style={{ fontWeight: 700, marginTop: 2 }}>{m.title}</div>
        <MeetMeta m={m} lang={lang} />
        <MeetLink m={m} />
      </div>
      {(st === 'upcoming' || st === 'live') && (
        <div style={{ textAlign: 'end' }}>
          <div className={st === 'live' ? 'live-pill' : 'count-pill'}>{cd(m, now)}</div>
          <div style={{ marginTop: 8 }}><JoinButton m={m} /></div>
        </div>
      )}
    </div>
  );
}

const REMINDER_LABEL: Record<string, string> = { morning: '☀️', hour: '⏰', start: '🔴' };

function MeetingBody({ m, onClose }: { m: Row; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { update } = useStore();
  const s = (f: string) => String(m[f] ?? '');
  const save = (f: string) => (v: string) => update('meetings', m, { [f]: v });
  const sent = s('remindersSent').split(',').filter(Boolean);
  return (
    <>
      <DrawerHead onClose={onClose}>
        <div className="row"><span className="id-tag">{m.id}</span>{s('status') && <Chip>{t(('st' + s('status')) as 'stScheduled')}</Chip>}</div>
        <h3>{s('title')}</h3>
        <MeetMeta m={m} lang={lang} />
      </DrawerHead>
      <div className="drawer-body">
        <div className="row"><JoinButton m={m} big /></div>
        <MeetLink m={m} />
        <div className="muted small">📧 {t('remindersSent')}: {sent.length ? sent.map((k) => `${REMINDER_LABEL[k] ?? ''} ${t(('rem_' + k) as 'rem_morning')}`).join(' · ') : '—'}</div>
        <div className="fields">
          <Field full label={t('meetingTitle')} value={s('title')} onSave={save('title')} />
          <Field label={t('date')} type="date" value={s('date')} onSave={save('date')} />
          <Field label={t('startTime')} type="time" value={s('time')} onSave={save('time')} />
          <Field label={t('durationMin')} type="number" value={s('duration')} onSave={save('duration')} />
          <Field label={t('status')} type="select" options={['Scheduled', 'Done', 'Cancelled']} value={s('status')} onSave={save('status')} />
          <Field full label={t('meetingLink')} value={s('link')} onSave={save('link')} placeholder="https://meet.google.com/…" />
          <Field full label={t('location')} value={s('location')} onSave={save('location')} />
          <Field full label={t('agenda')} type="textarea" value={s('agenda')} onSave={save('agenda')} />
          <Field full label={t('minutes')} type="textarea" value={s('notes')} onSave={save('notes')} />
        </div>
        {s('createdBy') && <div className="muted small">{t('by')} {s('createdBy')}</div>}
      </div>
    </>
  );
}

function NewMeeting({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { add, busy } = useStore();
  const [f, setF] = useState<Record<string, string>>({ duration: '60' });
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const valid = !!f.title?.trim() && !!f.date && !!f.time;
  const submit = async () => { if (await add('meetings', f)) { setF({ duration: '60' }); onClose(); } };
  return (
    <Modal open={open} onClose={onClose} title={t('newMeeting')}>
      <div className="fields">
        <Field full live label={t('meetingTitle')} value={f.title || ''} onSave={set('title')} placeholder={t('meetingTitlePh')} />
        <Field label={t('date')} type="date" value={f.date || ''} onSave={set('date')} />
        <Field label={t('startTime')} type="time" value={f.time || ''} onSave={set('time')} />
        <Field live label={t('durationMin')} type="number" value={f.duration || ''} onSave={set('duration')} />
        <Field full live label={t('meetingLink')} value={f.link || ''} onSave={set('link')} placeholder="https://meet.google.com/…" />
        <Field full live label={t('location')} value={f.location || ''} onSave={set('location')} />
        <Field full live label={t('agenda')} type="textarea" value={f.agenda || ''} onSave={set('agenda')} />
      </div>
      <div className="muted small" style={{ marginTop: 12 }}>📧 {t('remindersInfo')}</div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn primary" disabled={busy || !valid} onClick={submit}><Plus size={15} /> {t('add')}</button>
      </div>
    </Modal>
  );
}


/** Home page strip: the next (or live) meeting with countdown and join button. Hidden when none is scheduled. */
export function NextMeetingCard({ onOpen }: { onOpen: () => void }) {
  const { t, lang } = useI18n();
  const { all } = useStore();
  const now = useNow();
  const cd = useCountdown();
  const next = (all!.data.meetings ?? [])
    .filter((m) => ['live', 'upcoming'].includes(meetingState(m, now)))
    .sort((a, b) => (meetingTimes(a)?.start.getTime() ?? 9e15) - (meetingTimes(b)?.start.getTime() ?? 9e15))[0];
  if (!next) return null;
  const live = meetingState(next, now) === 'live';
  return (
    <div className={live ? 'card meet-strip live' : 'card meet-strip'} onClick={onOpen}>
      <CalendarClock size={22} className="meet-strip-ic" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="case-label">{t('nextMeeting')}</div>
        <div style={{ fontWeight: 800, fontSize: 16, marginTop: 2 }}>{next.title}</div>
        <MeetMeta m={next} lang={lang} />
        <MeetLink m={next} />
      </div>
      <div style={{ textAlign: 'end' }}>
        <div className={live ? 'live-pill' : 'count-pill'}>{cd(next, now)}</div>
        <div style={{ marginTop: 8 }}><JoinButton m={next} /></div>
      </div>
    </div>
  );
}
