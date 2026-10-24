import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { PageHead } from '../components/ui';
import { TaskDrawer } from '../components/TaskDrawer';
import { WS_COLOR, parseDate, today } from '../util';

/** Gantt built from task dates (replaces the static SEASON CALENDAR grid, so it never goes stale). */
export function Timeline() {
  const { t, v, lang } = useI18n();
  const { all } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [ws, setWs] = useState('');
  const tasks = all!.data.tasks.filter((x) => x.status !== 'Cancelled' && (!ws || x.workstream === ws));

  const { start, end, months } = useMemo(() => {
    const ds = all!.data.tasks.flatMap((x) => [parseDate(x.plannedStart), parseDate(x.plannedDeadline)]).filter(Boolean) as Date[];
    const min = new Date(Math.min(...ds.map((d) => d.getTime()), today().getTime()));
    const max = new Date(Math.max(...ds.map((d) => d.getTime()), today().getTime()));
    const s = new Date(min.getFullYear(), min.getMonth(), 1);
    const e = new Date(max.getFullYear(), max.getMonth() + 1, 1);
    const ms: Date[] = [];
    for (let d = new Date(s); d < e; d.setMonth(d.getMonth() + 1)) ms.push(new Date(d));
    return { start: s, end: e, months: ms };
  }, [all]);

  const span = end.getTime() - start.getTime();
  const pos = (d: Date) => ((d.getTime() - start.getTime()) / span) * 100;
  const side = lang === 'ar' ? 'right' : 'left';
  const todayPos = pos(today());
  const groups = (all!.dropdowns.Workstreams ?? []).filter((w) => !ws || w === ws);

  return (
    <div>
      <PageHead title={t('timeline')} sub="Oct 2026 → May 2027">
        <select className="select" style={{ width: 'auto', borderRadius: 99 }} value={ws} onChange={(e) => setWs(e.target.value)}>
          <option value="">{t('workstreams')}: {t('all')}</option>
          {(all!.dropdowns.Workstreams ?? []).map((w) => <option key={w} value={w}>{v(w)}</option>)}
        </select>
      </PageHead>
      <div className="card gantt">
        <div className="gantt-inner">
          <div className="g-row" style={{ minHeight: 26 }}>
            <div />
            <div className="g-track" style={{ height: 26 }}>
              {months.map((m) => (
                <div key={m.toISOString()} className="g-month" style={{ [side]: `${pos(m)}%` }}>
                  {m.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en', { month: 'short' })} {String(m.getFullYear()).slice(2)}
                </div>
              ))}
            </div>
          </div>
          {groups.map((g) => (
            <div key={g}>
              <div className="g-group" style={{ color: WS_COLOR[g] }}>{v(g)}</div>
              {tasks.filter((x) => x.workstream === g).map((x) => {
                const s = parseDate(x.plannedStart), e = parseDate(x.plannedDeadline);
                return (
                  <div key={x.id} className="g-row">
                    <div className="g-label"><span className="id-tag">{x.id}</span> {x.task}</div>
                    <div className="g-track">
                      <div className="g-today" style={{ [side]: `${todayPos}%` }} />
                      {s && e && (
                        <div className="g-bar" title={`${x.task}\n${x.plannedStart} → ${x.plannedDeadline}\n${v(x.status)}`}
                          onClick={() => setOpen(x.id)}
                          style={{ ['--c' as string]: x.status === 'Blocked' ? 'var(--s-bl)' : WS_COLOR[g], [side]: `${pos(s)}%`, width: `${Math.max(0.8, pos(e) - pos(s) + 100 / (span / 864e5))}%` }}>
                          <i style={{ width: `${Number(x.completion) || 0}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <TaskDrawer taskId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
