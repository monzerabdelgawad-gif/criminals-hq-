import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { useCan, useStore } from '../store';
import type { Row } from '../types';
import { Field, Locked, PageHead } from '../components/ui';
import { parseDate, pct, today } from '../util';

export function Weekly() {
  const { t } = useI18n();
  const { all, update } = useStore();
  const can = useCan()('weekly');
  const weeks = all!.data.weekly;
  const current = useMemo(() => {
    const now = today().getTime();
    const i = weeks.findIndex((w) => { const s = parseDate(w.id), e = parseDate(w.weekEnd); return s && e && s.getTime() <= now && now <= e.getTime() + 864e5; });
    return i < 0 ? 0 : i;
  }, [weeks]);
  const [idx, setIdx] = useState(current);
  const w = weeks[idx];
  if (!w) return <PageHead title={t('weekly')} />;

  const s = (f: string) => String(w[f] ?? '');
  const save = (f: string) => (v: string) => update('weekly', w, { [f]: v });

  const autoFill = () => {
    const ws = parseDate(w.id)!, we = parseDate(w.weekEnd)!;
    we.setHours(23, 59);
    const tasks = all!.data.tasks;
    const inWeek = (d: Date | null) => !!d && d >= ws && d <= we;
    const planned = tasks.filter((x) => { const a = parseDate(x.plannedStart), b = parseDate(x.plannedDeadline); return a && b && a <= we && b >= ws; });
    const completed = tasks.filter((x) => x.status === 'Completed' && inWeek(parseDate(x.actualCompletion)));
    const plannedDue = planned.filter((x) => inWeek(parseDate(x.plannedDeadline)));
    const incomplete = plannedDue.filter((x) => x.status !== 'Completed' && x.status !== 'Cancelled');
    const blocked = tasks.filter((x) => x.status === 'Blocked');
    const ids = (xs: Row[]) => xs.map((x) => x.id).join(', ');
    const vals: Record<string, string> = {
      plannedTasks: ids(planned), completedTasks: ids(completed), incompleteTasks: ids(incomplete), blockedTasks: ids(blocked),
      completionRate: String(pct(plannedDue.length - incomplete.length, plannedDue.length)),
    };
    if (!w.reviewDate) vals.reviewDate = w.weekEnd as string;
    // only fill empty cells, never overwrite what someone wrote
    const toWrite = Object.fromEntries(Object.entries(vals).filter(([k]) => !String(w[k] ?? '').trim()));
    update('weekly', w, toWrite);
  };

  return (
    <Locked section="weekly"><div>
      <PageHead title={t('weekly')} sub={`${t('week')} ${idx + 1} / ${weeks.length}${idx === current ? ' · ' + t('thisWeek') : ''}`}>
        {can && <button className="btn" onClick={autoFill}><Wand2 size={15} /> {t('autoFill')}</button>}
      </PageHead>

      <div className="card tight row" style={{ marginBottom: 16, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <button className="btn icon" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft size={18} className="flip" /></button>
        <select className="select" style={{ width: 'auto', textAlign: 'center', fontWeight: 700, border: 0, background: 'transparent' }} value={idx} onChange={(e) => setIdx(+e.target.value)}>
          {weeks.map((x, i) => <option key={x.id} value={i}>{t('weekOf')} {x.id} → {x.weekEnd}{i === current ? ' ★' : ''}</option>)}
        </select>
        <button className="btn icon" disabled={idx === weeks.length - 1} onClick={() => setIdx(idx + 1)}><ChevronRight size={18} className="flip" /></button>
      </div>

      <div className="grid g-home">
        <div className="card">
          <div className="fields">
            <Field label={t('workstream')} type="select" options={['', 'All', ...(all!.dropdowns.Workstreams ?? [])]} translate value={s('workstream')} onSave={save('workstream')} />
            <Field label={t('responsible')} value={s('responsible')} onSave={save('responsible')} />
            <Field full label={t('objectives')} type="textarea" value={s('objectives')} onSave={save('objectives')} />
            <Field label={t('plannedTasks')} value={s('plannedTasks')} onSave={save('plannedTasks')} />
            <Field label={t('completedTasks')} value={s('completedTasks')} onSave={save('completedTasks')} />
            <Field label={t('incompleteTasks')} value={s('incompleteTasks')} onSave={save('incompleteTasks')} />
            <Field label={t('blockedTasks')} value={s('blockedTasks')} onSave={save('blockedTasks')} />
            <Field full label={t('evidenceReviewed')} type="textarea" value={s('evidence')} onSave={save('evidence')} />
            <Field full label={t('coachFeedback')} type="textarea" value={s('coachFeedback')} onSave={save('coachFeedback')} />
            <Field full label={t('decisions')} type="textarea" value={s('decisions')} onSave={save('decisions')} />
            <Field full label={t('corrective')} type="textarea" value={s('corrective')} onSave={save('corrective')} />
            <Field full label={t('nextPriorities')} type="textarea" value={s('nextPriorities')} onSave={save('nextPriorities')} />
            <Field label={t('reviewDate')} type="date" value={s('reviewDate')} onSave={save('reviewDate')} />
            <Field label={t('completionRate')} type="number" value={s('completionRate')} onSave={save('completionRate')} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">{t('keyQuestions')}</div>
          <div className="stack" style={{ gap: 12 }}>
            {all!.data.weeklyQ.map((q) => (
              <Field key={q.id} label={String(q.question)} type="textarea" value={String(q.answer ?? '')}
                onSave={(v) => update('weeklyQ', q, { answer: v })} />
            ))}
          </div>
        </div>
      </div>
    </div></Locked>
  );
}
