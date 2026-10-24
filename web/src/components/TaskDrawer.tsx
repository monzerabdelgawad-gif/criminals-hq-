import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { useI18n } from '../i18n';
import { useDisplayName, useStore } from '../store';
import type { Row } from '../types';
import { isOverdue, isoDate, today } from '../util';
import { Drawer, DrawerHead, Field, Linkify, PriorityChip, StatusChip, WsChip } from './ui';

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { all } = useStore();
  const task = all?.data.tasks.find((t) => t.id === taskId) ?? null;
  return (
    <Drawer open={!!task} onClose={onClose}>
      {task && <TaskBody task={task} onClose={onClose} />}
    </Drawer>
  );
}

/** Status side effects: keep dates and % consistent like the sheet's user guide asks. */
export function statusChanges(task: Row, status: string): Record<string, string> {
  const ch: Record<string, string> = { status };
  const now = isoDate(today());
  if (status === 'In Progress' && !task.actualStart) ch.actualStart = now;
  if (status === 'Completed') {
    if (!task.actualCompletion) ch.actualCompletion = now;
    if (!task.actualStart) ch.actualStart = now;
    ch.completion = '100';
  }
  return ch;
}

function TaskBody({ task, onClose }: { task: Row; onClose: () => void }) {
  const { t } = useI18n();
  const { all, update, upload } = useStore();
  const dn = useDisplayName();
  const fileRef = useRef<HTMLInputElement>(null);
  const dd = all!.dropdowns;
  const s = (f: string) => String(task[f] ?? '');
  const save = (f: string) => (v: string) => update('tasks', task, { [f]: v });

  return (
    <>
      <DrawerHead onClose={onClose}>
        <div className="row">
          <span className="id-tag">{task.id}</span>
          <WsChip ws={s('workstream')} />
          <StatusChip status={s('status')} />
          <PriorityChip p={s('priority')} />
        </div>
        <h3>{s('task')}</h3>
        <div className="muted small" style={{ marginTop: 4 }}>
          {s('subcategory')}
          {s('lastUpdated') && <> · {t('lastUpdated')} {s('lastUpdated')}{s('updatedBy') && <> {t('by')} <b>{dn(s('updatedBy'))}</b></>}</>}
        </div>
      </DrawerHead>
      <div className="drawer-body">
        {s('status') === 'Blocked' && !s('blocker') && <div className="hint">💀 {t('blockedHint')}</div>}
        {isOverdue(task) && <div className="hint">⏰ {t('overdue')} — {t('deadline')} {s('plannedDeadline')}</div>}

        <div className="fields">
          <Field label={t('status')} type="select" options={dd.Status} translate value={s('status')}
            onSave={(v) => update('tasks', task, statusChanges(task, v))} />
          <Field label={t('completion')} type="select" options={['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100']}
            value={s('completion')} onSave={save('completion')} />
          <Field label={t('owner')} type="select" options={dd.Owners} value={s('owner')} onSave={save('owner')} />
          <Field label={t('supporting')} type="select" options={['', ...(dd.Supporting ?? [])]} value={s('supporting')} onSave={save('supporting')} />
          <Field label={t('priority')} type="select" options={dd.Priority} translate value={s('priority')} onSave={save('priority')} />
          <Field label={t('reviewer')} value={s('reviewer')} onSave={save('reviewer')} />
          <Field label={t('plannedStart')} type="date" value={s('plannedStart')} onSave={save('plannedStart')} />
          <Field label={t('deadline')} type="date" value={s('plannedDeadline')} onSave={save('plannedDeadline')} />
          <Field label={t('actualStart')} type="date" value={s('actualStart')} onSave={save('actualStart')} />
          <Field label={t('actualCompletion')} type="date" value={s('actualCompletion')} onSave={save('actualCompletion')} />
          <Field full label={t('blocker')} type="textarea" value={s('blocker')} onSave={save('blocker')} />
          <Field full label={t('nextAction')} type="textarea" value={s('nextAction')} onSave={save('nextAction')} />

          <div className="full">
            <label className="lbl">{t('evidence')}</label>
            {s('evidence') && <div className="ro" style={{ marginBottom: 8 }}><Linkify text={s('evidence')} /></div>}
            <input ref={fileRef} type="file" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await upload(f, { workstream: s('workstream'), taskId: task.id });
              e.target.value = '';
            }} />
            <button className="btn sm" onClick={() => fileRef.current?.click()}><Paperclip size={14} /> {t('attachFile')}</button>
          </div>

          <Field full label={t('procedure')} type="textarea" value={s('procedure')} onSave={save('procedure')} />
          <Field full label={t('deliverable')} type="textarea" value={s('deliverable')} onSave={save('deliverable')} />
          <Field full label={t('acceptance')} type="textarea" value={s('acceptance')} onSave={save('acceptance')} />
          <Field label={t('dependency')} value={s('dependency')} onSave={save('dependency')} placeholder="IP-03, RG-02" />
          <Field label={t('review')} type="select" options={dd['Review Result']} translate value={s('review')} onSave={save('review')} />
          <Field full label={t('notes')} type="textarea" value={s('notes')} onSave={save('notes')} />
          <Field label={t('task')} value={s('task')} onSave={save('task')} />
          <Field label={t('subcategory')} value={s('subcategory')} onSave={save('subcategory')} />
        </div>
      </div>
    </>
  );
}
