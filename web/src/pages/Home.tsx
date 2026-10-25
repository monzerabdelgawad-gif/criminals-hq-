import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Flame, Skull, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { useDisplayName, useMyRow, useStore } from '../store';
import { Avatar, Bar, Chip, Empty, Ring, StatusChip, WsChip } from '../components/ui';
import { TaskDrawer } from '../components/TaskDrawer';
import { DONE, WS_COLOR, daysBetween, isMine, isOverdue, parseDate, pct, today } from '../util';
import type { Page } from '../App';

const fade = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05, duration: 0.4 } });

export function Home({ go }: { go: (p: Page) => void }) {
  const { t, v } = useI18n();
  const { all } = useStore();
  const dn = useDisplayName();
  const [open, setOpen] = useState<string | null>(null);
  const { tasks, milestones, settings } = all!.data;
  const me = all!.me;
  const myRow = useMyRow();
  // roles from the USERS row update instantly after editing; the session copy waits for the next refresh
  const myRoles = myRow ? String(myRow.taskRoles ?? '').split(',').map((s) => s.trim()).filter(Boolean) : me.taskRoles;

  const stats = useMemo(() => {
    const active = tasks.filter((x) => x.status !== 'Cancelled');
    const c = (s: string) => tasks.filter((x) => x.status === s).length;
    return {
      total: active.length, done: c('Completed'), prog: c('In Progress'), blocked: c('Blocked'),
      review: c('Under Review'), overdue: tasks.filter(isOverdue).length,
      pct: pct(c('Completed'), active.length),
    };
  }, [tasks]);

  const wsList = all!.dropdowns.Workstreams ?? [];
  const compRaw = String(settings.find((s) => /competition date/i.test(String(s.label)))?.value ?? '');
  const comp = parseDate(compRaw);
  const days = comp ? daysBetween(today(), comp) : null;

  const mine = tasks.filter((x) => isMine(x, me) && !DONE.includes(String(x.status)))
    .sort((a, b) => (parseDate(a.plannedDeadline)?.getTime() ?? 9e15) - (parseDate(b.plannedDeadline)?.getTime() ?? 9e15))
    .slice(0, 6);
  const upcoming = milestones.filter((m) => m.status !== 'Completed' && parseDate(m.targetDate))
    .sort((a, b) => parseDate(a.targetDate)!.getTime() - parseDate(b.targetDate)!.getTime()).slice(0, 5);

  const h = new Date().getHours();
  const greet = h < 12 ? t('greetingMorning') : h < 18 ? t('greetingAfternoon') : t('greetingEvening');
  const vibe = stats.blocked > 0 ? `${stats.blocked} ${t('blocked').toLowerCase()} 💀` : stats.prog > 0 ? "you're cooking 🔥" : "let's get it 🚀";

  return (
    <div className="stack">
      <motion.div className="card hero" {...fade(0)}>
        <div className="hero-grid">
          <div>
            <div className="hero-me">
              <Avatar name={dn(me.name)} size={46} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{greet}, <bdi>{dn(me.name)}</bdi> 👋</div>
                <div className="row" style={{ gap: 5, marginTop: 4 }}>
                  <Chip color={me.teamRole === 'Instructor' ? 'var(--accent-2)' : 'var(--accent)'}>{v(me.teamRole || 'Student')}</Chip>
                  {myRoles.length > 0
                    ? myRoles.map((r) => <Chip key={r}>{r}</Chip>)
                    : <button className="btn sm ghost" onClick={() => go('team')}>⚠ {t('setRoles')}</button>}
                </div>
              </div>
            </div>
            <div className="muted small" style={{ fontWeight: 600, marginTop: 14 }}><bdi>{vibe}</bdi></div>
            <h2 style={{ marginTop: 8 }}>criminals <span className="grad">bioglow</span> season</h2>
            <div className="muted" style={{ marginTop: 8 }}>{t('heroSub')}</div>
          </div>
          <div style={{ textAlign: 'end' }}>
            {days !== null ? (
              <>
                <div className="countdown mono">{days}</div>
                <div className="muted small" style={{ fontWeight: 600 }}>{t('daysToComp')}</div>
              </>
            ) : (
              <button className="btn sm" onClick={() => go('settings')}>⚠ {t('compDateMissing')}</button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid g-4">
        {[
          { k: t('done'), v: stats.done, icon: <CheckCircle2 size={14} color="var(--s-done)" />, sub: `/ ${stats.total}` },
          { k: t('inProgress'), v: stats.prog, icon: <Flame size={14} color="var(--s-ip)" /> },
          { k: t('blocked'), v: stats.blocked, icon: <Skull size={14} color="var(--s-bl)" /> },
          { k: t('overdue'), v: stats.overdue, icon: <AlertTriangle size={14} color="var(--s-ur)" /> },
        ].map((s, i) => (
          <motion.div key={s.k} className="card stat" {...fade(i + 1)} onClick={() => go('tasks')} style={{ cursor: 'pointer' }}>
            <div className="k">{s.icon}{s.k}</div>
            <div className="v mono">{s.v} {s.sub && <small>{s.sub}</small>}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid g-home">
        <div className="stack">
          <motion.div className="card" {...fade(5)}>
            <div className="card-title">{t('workstreams')} <span className="sub">{t('overall')} {stats.pct}%</span></div>
            <div className="row" style={{ gap: 22, alignItems: 'center', flexWrap: 'nowrap' }}>
              <Ring value={stats.pct} size={124}>
                <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>{stats.pct}%</div><div className="muted small">{t('done').toLowerCase()}</div></div>
              </Ring>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                {wsList.map((ws) => {
                  const list = tasks.filter((x) => x.workstream === ws && x.status !== 'Cancelled');
                  const d = list.filter((x) => x.status === 'Completed').length;
                  const avg = list.length ? Math.round(list.reduce((a, x) => a + (Number(x.completion) || 0), 0) / list.length) : 0;
                  return (
                    <div key={ws}>
                      <div className="row small" style={{ justifyContent: 'space-between', marginBottom: 5, flexWrap: 'nowrap' }}>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(ws)}</span>
                        <span className="muted mono">{d}/{list.length} · {avg}%</span>
                      </div>
                      <Bar value={avg} color={WS_COLOR[ws]} />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div className="card" {...fade(6)}>
            <div className="card-title">{t('myTasks')} <button className="btn sm ghost" onClick={() => go('tasks')}>{t('seeAll')} <ArrowRight size={13} className="flip" /></button></div>
            {mine.length === 0 ? <Empty>{t('noMyTasks')}</Empty> : (
              <div className="list">
                {mine.map((x) => (
                  <div key={x.id} className="li" onClick={() => setOpen(x.id)}>
                    <span className="id-tag" style={{ width: 44 }}>{x.id}</span>
                    <div className="grow">
                      <div className="title">{x.task}</div>
                      <div className="meta">{x.owner} · <span className={isOverdue(x) ? 'overdue-txt' : ''}>{x.plannedDeadline}</span></div>
                    </div>
                    <StatusChip status={String(x.status)} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="stack">
          <motion.div className="card" {...fade(7)}>
            <div className="card-title">{t('upcoming')} <button className="btn sm ghost" onClick={() => go('milestones')}>{t('seeAll')}</button></div>
            <div className="list">
              {upcoming.map((m) => {
                const d = parseDate(m.targetDate)!;
                const left = daysBetween(today(), d);
                return (
                  <div key={m.id} className="li" onClick={() => go('milestones')}>
                    <div style={{ width: 46, textAlign: 'center', flex: 'none' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, lineHeight: 1 }}>{String(m.targetDate).slice(0, 2)}</div>
                      <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{String(m.targetDate).slice(3, 6)}</div>
                    </div>
                    <div className="grow">
                      <div className="title">{m.name}</div>
                      <div className="meta"><span className={left < 0 ? 'overdue-txt' : ''}>{left < 0 ? `${-left}d late` : left === 0 ? t('today') : `in ${left}d`}</span> · {m.id}</div>
                    </div>
                    <WsChip ws={String(m.workstream)} short />
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="card" {...fade(8)}>
            <div className="card-title">{t('recent')} <button className="btn sm ghost" onClick={() => go('activity')}>{t('seeAll')}</button></div>
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
        </div>
      </div>

      <TaskDrawer taskId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
