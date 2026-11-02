import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Flame, ShieldCheck, Skull } from 'lucide-react';
import { useI18n, type TKey } from '../i18n';
import { useCan, useDisplayName, useMyRow, useSeeActivity, useStore } from '../store';
import { Avatar, Bar, Chip, Empty, StatusChip, WsChip } from '../components/ui';
import { TaskDrawer } from '../components/TaskDrawer';
import { Flap, Mark3D, Tilt } from '../components/Three';
import { JoinButton, MeetLink, meetingState, meetingTimes, useNow } from './Meetings';
import { DONE, WS_COLOR, daysBetween, isMine, isOverdue, parseDate, pct, today } from '../util';
import type { Row } from '../types';
import type { Page } from '../App';

const fade = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05, duration: 0.4 } });

/** One tap moves a task to its natural next step. Completing is left to instructors (they review first). */
const NEXT_STEP: Record<string, { to: string; key: TKey; admin?: boolean }> = {
  'Not Started': { to: 'In Progress', key: 'qStart' },
  'In Progress': { to: 'Under Review', key: 'qReview' },
  Blocked: { to: 'In Progress', key: 'qUnblock' },
  'Under Review': { to: 'Completed', key: 'qDone', admin: true },
};

const pad = (n: number, w = 2) => String(Math.max(0, n)).padStart(w, '0');

export function Home({ go }: { go: (p: Page) => void }) {
  const { t, v, lang } = useI18n();
  const { all, update, toast } = useStore();
  const can = useCan();
  const seeActivity = useSeeActivity();
  const dn = useDisplayName();
  const [open, setOpen] = useState<string | null>(null);
  const { tasks, milestones, settings } = all!.data;
  const me = all!.me;
  const myRow = useMyRow();
  const myRoles = myRow ? String(myRow.taskRoles ?? '').split(',').map((s) => s.trim()).filter(Boolean) : me.taskRoles;

  const stats = useMemo(() => {
    const active = tasks.filter((x) => x.status !== 'Cancelled');
    const c = (s: string) => tasks.filter((x) => x.status === s).length;
    return {
      total: active.length, done: c('Completed'), prog: c('In Progress'), blocked: c('Blocked'),
      overdue: tasks.filter(isOverdue).length, pct: pct(c('Completed'), active.length),
    };
  }, [tasks]);

  const wsList = all!.dropdowns.Workstreams ?? [];
  const comp = parseDate(String(settings.find((s) => /competition date/i.test(String(s.label)))?.value ?? ''));
  const days = comp ? daysBetween(today(), comp) : null;

  const byDeadline = (a: Row, b: Row) => (parseDate(a.plannedDeadline)?.getTime() ?? 9e15) - (parseDate(b.plannedDeadline)?.getTime() ?? 9e15);
  const meNow = { ...me, taskRoles: myRoles };
  const mine = tasks.filter((x) => isMine(x, meNow) && !DONE.includes(String(x.status))).sort(byDeadline).slice(0, 7);
  const myLate = tasks.filter((x) => isMine(x, meNow) && isOverdue(x)).length;
  const attention = tasks.filter((x) => x.status === 'Blocked' || isOverdue(x))
    .sort((a, b) => Number(b.status === 'Blocked') - Number(a.status === 'Blocked') || byDeadline(a, b)).slice(0, 5);
  const upcoming = milestones.filter((m) => m.status !== 'Completed' && parseDate(m.targetDate))
    .sort((a, b) => parseDate(a.targetDate)!.getTime() - parseDate(b.targetDate)!.getTime()).slice(0, 5);

  const h = new Date().getHours();
  const greet = h < 12 ? t('greetingMorning') : h < 18 ? t('greetingAfternoon') : t('greetingEvening');
  const hi = lang === 'en' ? `Good ${greet}` : greet;

  const canEditTasks = can('tasks');
  const quick = async (x: Row) => {
    const step = NEXT_STEP[String(x.status)];
    if (!step) return;
    const ok = await update('tasks', x, { status: step.to });
    if (ok) toast(`${x.id} ${t('movedTo')} ${v(step.to)}`, 'ok');
  };
  const due = (x: Row) => {
    const d = parseDate(x.plannedDeadline);
    if (!d) return '';
    const left = daysBetween(today(), d);
    if (left < 0) return `${-left}${lang === 'ar' ? ' يوم ' : 'd '}${t('lateBy')}`;
    if (left === 0) return t('dueToday');
    return `${t('dueIn')} ${left}${lang === 'ar' ? ' يوم' : 'd'}`;
  };

  return (
    <div className="stack">
      {/* ---------- the case file ---------- */}
      <motion.section className="card case-hero" {...fade(0)}>
        <div className="ch-main">
          <div className={myLate ? 'stamp' : 'stamp ok'}>{myLate ? `${myLate} ${t('stampLate')}` : t('stampOk')}</div>
          <div className="case-label">CASE NO. 2627 // {lang === 'ar' ? 'عملية BIOGLOW' : 'Operation BIOGLOW'}</div>
          <h1 className="ch-greet">
            <span className="hi">{hi},</span>
            <span className="who"><bdi>{dn(me.name)}</bdi></span>
          </h1>
          <div className="ch-roles">
            <Avatar name={dn(me.name)} size={34} />
            <Chip color={me.teamRole === 'Instructor' ? 'var(--accent-2)' : 'var(--accent)'}>{v(me.teamRole || 'Student')}</Chip>
            {myRoles.length > 0
              ? myRoles.map((r) => <Chip key={r}>{r}</Chip>)
              : <button className="btn sm" onClick={() => go('team')}>⚠ {t('setRoles')}</button>}
          </div>
          <div className="ch-sub">{t('heroSub')}</div>
        </div>
        <div className="ch-side">
          <Mark3D size={170} />
          <div className="ch-count">
            {days !== null ? (
              <>
                <Flap value={pad(days, 3)} size="lg" />
                <div className="lbl2">{t('daysToComp')}</div>
              </>
            ) : <button className="btn sm" onClick={() => go('settings')}>⚠ {t('compDateMissing')}</button>}
          </div>
        </div>
      </motion.section>

      {/* ---------- today's brief ---------- */}
      <div className="brief">
        <motion.div className="card" {...fade(1)}>
          <div className="card-title"><span>{t('yourJobs')}</span>
            <button className="btn sm ghost" onClick={() => go('tasks')}>{t('seeAll')} <ArrowRight size={13} className="flip" /></button>
          </div>
          {mine.length === 0 ? <Empty>{t('noMyTasks')}</Empty> : (
            <div className="list">
              {mine.map((x) => {
                const step = NEXT_STEP[String(x.status)];
                const showQuick = canEditTasks && step && (!step.admin || me.isAdmin);
                return (
                  <div key={x.id} className={isOverdue(x) ? 'job late' : 'job'} onClick={() => setOpen(x.id)}>
                    <div className="grow">
                      <div className="title">{x.task}</div>
                      <div className="meta">
                        <span className="id-tag">{x.id}</span>
                        <StatusChip status={String(x.status)} />
                        <span className={isOverdue(x) ? 'overdue-txt' : ''}>{due(x)}</span>
                      </div>
                    </div>
                    {showQuick && (
                      <div className="quick">
                        <button className={step.to === 'Completed' ? 'btn sm glow' : 'btn sm'} onClick={(e) => { e.stopPropagation(); quick(x); }}>
                          {t(step.key)} <ArrowRight size={13} className="flip" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <div className="stack">
          <motion.div {...fade(2)}><MeetingBrief onOpen={() => go('meetings')} /></motion.div>
          <motion.div className="card attn" {...fade(3)}>
            <div className="card-title"><span>{t('needsAttention')}</span><span className="sub">{attention.length}</span></div>
            {attention.length === 0 ? (
              <div className="all-clear"><ShieldCheck size={20} /> {t('allClear')}</div>
            ) : (
              <div className="list">
                {attention.map((x) => (
                  <div key={x.id} className="li" onClick={() => setOpen(x.id)}>
                    {x.status === 'Blocked' ? <Skull size={16} className="ic" /> : <AlertTriangle size={16} className="ic" style={{ color: 'var(--s-ur)' }} />}
                    <div className="grow">
                      <div className="title">{x.task}</div>
                      <div className="meta"><span className="id-tag">{x.id}</span> · {x.owner} · <span className="overdue-txt">{x.status === 'Blocked' ? v('Blocked') : due(x)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ---------- the numbers ---------- */}
      <div className="grid g-4">
        {[
          { k: t('done'), v: stats.done, icon: <CheckCircle2 size={14} color="var(--s-done)" />, sub: `/ ${stats.total}` },
          { k: t('inProgress'), v: stats.prog, icon: <Flame size={14} color="var(--s-ip)" /> },
          { k: t('blocked'), v: stats.blocked, icon: <Skull size={14} color="var(--s-bl)" /> },
          { k: t('overdue'), v: stats.overdue, icon: <AlertTriangle size={14} color="var(--s-ur)" /> },
        ].map((s, i) => (
          <motion.div key={s.k} {...fade(i + 4)}>
            <Tilt className="stat" onClick={() => go('tasks')} style={{ cursor: 'pointer' }}>
              <div className="k">{s.icon}{s.k}</div>
              <div className="v mono pop">{s.v} {s.sub && <small>{s.sub}</small>}</div>
            </Tilt>
          </motion.div>
        ))}
      </div>

      <div className="grid g-home">
        <motion.div className="card" {...fade(8)}>
          <div className="card-title"><span>{t('seasonProgress')}</span><span className="sub">{stats.done}/{stats.total}</span></div>
          <div className="big-pct">{stats.pct}%<small>{t('done').toLowerCase()}</small></div>
          <div style={{ margin: '14px 0 22px' }}><Bar value={stats.pct} /></div>
          {wsList.map((ws) => {
            const list = tasks.filter((x) => x.workstream === ws && x.status !== 'Cancelled');
            const d = list.filter((x) => x.status === 'Completed').length;
            const avg = list.length ? Math.round(list.reduce((a, x) => a + (Number(x.completion) || 0), 0) / list.length) : 0;
            return (
              <div key={ws} className="ws-row">
                <div className="row small" style={{ justifyContent: 'space-between', marginBottom: 6, flexWrap: 'nowrap' }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(ws)}</span>
                  <span className="muted mono">{d}/{list.length} · {avg}%</span>
                </div>
                <Bar value={avg} color={WS_COLOR[ws]} />
              </div>
            );
          })}
        </motion.div>

        <div className="stack">
          <motion.div className="card" {...fade(9)}>
            <div className="card-title"><span>{t('upcoming')}</span><button className="btn sm ghost" onClick={() => go('milestones')}>{t('seeAll')}</button></div>
            <div className="list">
              {upcoming.map((m) => {
                const left = daysBetween(today(), parseDate(m.targetDate)!);
                return (
                  <div key={m.id} className="li" onClick={() => go('milestones')}>
                    <div className="meet-date">
                      <div className="d">{String(m.targetDate).slice(0, 2)}</div>
                      <div className="m">{String(m.targetDate).slice(3, 6)}</div>
                    </div>
                    <div className="grow">
                      <div className="title">{m.name}</div>
                      <div className="meta"><span className={left < 0 ? 'overdue-txt' : ''}>{left < 0 ? `${-left}d ${t('lateBy')}` : left === 0 ? t('today') : `${t('dueIn')} ${left}d`}</span> · {m.id}</div>
                    </div>
                    <WsChip ws={String(m.workstream)} short />
                  </div>
                );
              })}
            </div>
          </motion.div>

          {seeActivity && (
            <motion.div className="card" {...fade(10)}>
              <div className="card-title"><span>{t('recent')}</span><button className="btn sm ghost" onClick={() => go('activity')}>{t('seeAll')}</button></div>
              {all!.activity.length === 0 ? <Empty>{t('noActivity')}</Empty> : (
                <div className="list">
                  {all!.activity.slice(0, 6).map((a, i) => (
                    <div key={i} className="li" style={{ cursor: 'default' }}>
                      <Avatar name={dn(a.name)} size={28} />
                      <div className="grow">
                        <div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <b>{dn(a.name)}</b> · <span className="id-tag">{a.id}</span> {a.field} → <b>{v(a.newValue) || '—'}</b>
                        </div>
                        <div className="meta">{a.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <TaskDrawer taskId={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Next meeting with a live split-flap countdown (days:hours:min, or hours:min:sec on the day). */
function MeetingBrief({ onOpen }: { onOpen: () => void }) {
  const { t, lang } = useI18n();
  const { all } = useStore();
  const now = useNow(1000);
  const next = (all!.data.meetings ?? [])
    .filter((m) => ['live', 'upcoming'].includes(meetingState(m, now)))
    .sort((a, b) => (meetingTimes(a)?.start.getTime() ?? 9e15) - (meetingTimes(b)?.start.getTime() ?? 9e15))[0];

  if (!next) {
    return (
      <div className="card mbrief" onClick={onOpen}>
        <div className="mb-top">
          <div className="case-label">{t('nextMeeting')}</div>
          <div className="muted" style={{ marginTop: 8 }}>{t('noMeetingSoon')}</div>
        </div>
      </div>
    );
  }
  const tm = meetingTimes(next)!;
  const live = meetingState(next, now) === 'live';
  const secs = Math.max(0, Math.floor((tm.start.getTime() - now.getTime()) / 1000));
  const d = Math.floor(secs / 86400), hh = Math.floor((secs % 86400) / 3600), mm = Math.floor((secs % 3600) / 60), ss = secs % 60;
  const value = d > 0 ? `${pad(d)}:${pad(hh)}:${pad(mm)}` : `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  const units = d > 0 ? [t('cdD'), t('cdH'), t('cdM')] : [t('cdH'), t('cdM'), t('cdS')];
  const when = tm.start.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className={live ? 'card mbrief live' : 'card mbrief'} onClick={onOpen}>
      <div className="mb-top">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="case-label"><CalendarClock size={12} style={{ verticalAlign: '-2px' }} /> {t('nextMeeting')}</span>
          {live && <span className="live-pill">{t('liveNow')}</span>}
        </div>
        <div className="mb-title">{next.title}</div>
        <div className="muted small" style={{ marginTop: 4 }}>{when}{next.location ? ` · ${next.location}` : ''}</div>
        <MeetLink m={next} />
      </div>
      <div className="mb-foot">
        {live ? <span className="muted small">{t('liveNow')}</span> : <Flap value={value} size="sm" units={units} />}
        <JoinButton m={next} />
      </div>
    </div>
  );
}
