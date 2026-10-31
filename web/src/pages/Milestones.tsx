import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useI18n } from '../i18n';
import { useCan, useStore } from '../store';
import type { Row } from '../types';
import { Locked, Drawer, DrawerHead, Field, Modal, PageHead, StatusChip, WsChip } from '../components/ui';
import { daysBetween, parseDate, today } from '../util';

export function Milestones() {
  const { t } = useI18n();
  const { all } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const can = useCan()('milestones');
  const ms = all!.data.milestones;
  const sel = ms.find((m) => m.id === open) ?? null;
  const done = ms.filter((m) => m.status === 'Completed').length;

  return (
    <Locked section="milestones"><div>
      <PageHead title={t('milestones')} sub={`${done}/${ms.length} ${t('done').toLowerCase()}`}>
        {can && <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> {t('newMilestone')}</button>}
      </PageHead>
      <div className="stack" style={{ gap: 10 }}>
        {ms.map((m, i) => {
          const d = parseDate(m.targetDate);
          const left = d ? daysBetween(today(), d) : null;
          const late = left !== null && left < 0 && m.status !== 'Completed';
          return (
            <motion.div key={m.id} className="card tight" style={{ cursor: 'pointer' }} onClick={() => setOpen(m.id)}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
                <div style={{ width: 56, textAlign: 'center', flex: 'none' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{d ? String(m.targetDate).slice(0, 2) : '⚠'}</div>
                  <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{d ? String(m.targetDate).slice(3) : ''}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row"><span className="id-tag">{m.id}</span><WsChip ws={String(m.workstream)} short /></div>
                  <div style={{ fontWeight: 600, marginTop: 3 }}>{m.name}</div>
                  <div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description}</div>
                </div>
                <div style={{ textAlign: 'end', flex: 'none' }}>
                  <StatusChip status={String(m.status)} />
                  {left !== null && m.status !== 'Completed' && (
                    <div className={late ? 'overdue-txt small' : 'muted small'} style={{ marginTop: 4 }}>{late ? `${-left}d late` : `in ${left}d`}</div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <Drawer open={!!sel} onClose={() => setOpen(null)}>{sel && <MilestoneBody m={sel} onClose={() => setOpen(null)} />}</Drawer>
      <NewItem open={adding} onClose={() => setAdding(false)} entity="milestones" />
    </div></Locked>
  );
}

function MilestoneBody({ m, onClose }: { m: Row; onClose: () => void }) {
  const { t } = useI18n();
  const { all, update } = useStore();
  const dd = all!.dropdowns;
  const s = (f: string) => String(m[f] ?? '');
  const save = (f: string) => (v: string) => update('milestones', m, { [f]: v });
  return (
    <>
      <DrawerHead onClose={onClose}>
        <div className="row"><span className="id-tag">{m.id}</span><WsChip ws={s('workstream')} /><StatusChip status={s('status')} /></div>
        <h3>{s('name')}</h3>
      </DrawerHead>
      <div className="drawer-body">
        <div className="fields">
          <Field label={t('status')} type="select" options={dd.Status} translate value={s('status')} onSave={save('status')} />
          <Field label={t('workstream')} type="select" options={['All', ...(dd.Workstreams ?? [])]} translate value={s('workstream')} onSave={save('workstream')} />
          <Field label={t('targetDate')} type="date" value={s('targetDate')} onSave={save('targetDate')} />
          <Field label={t('actualDate')} type="date" value={s('actualDate')} onSave={save('actualDate')} />
          <Field label={t('responsible')} value={s('responsible')} onSave={save('responsible')} />
          <Field label={t('reviewer')} value={s('reviewer')} onSave={save('reviewer')} />
          <Field full label={t('milestone')} value={s('name')} onSave={save('name')} />
          <Field full label={t('description')} type="textarea" value={s('description')} onSave={save('description')} />
          <Field full label={t('requiredEvidence')} type="textarea" value={s('evidence')} onSave={save('evidence')} />
          <Field full label={t('acceptance')} type="textarea" value={s('acceptance')} onSave={save('acceptance')} />
          <Field full label={t('reviewNotes')} type="textarea" value={s('reviewNotes')} onSave={save('reviewNotes')} />
          <Field full label={t('relatedTasks')} value={s('relatedTasks')} onSave={save('relatedTasks')} placeholder="IP-04, RG-04" />
        </div>
      </div>
    </>
  );
}

/** Small "add" dialog for milestones and risks. */
export function NewItem({ open, onClose, entity }: { open: boolean; onClose: () => void; entity: 'milestones' | 'risks' }) {
  const { t } = useI18n();
  const { all, add, busy } = useStore();
  const dd = all!.dropdowns;
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const main = entity === 'milestones' ? 'name' : 'description';
  const submit = async () => {
    const base: Record<string, string> = entity === 'milestones'
      ? { workstream: 'All', status: 'Not Started' }
      : { workstream: 'All', likelihood: '3', impact: '3', status: 'Open', dateIdentified: new Date().toLocaleString('en', { month: 'short', year: 'numeric' }) };
    if (await add(entity, { ...base, ...f })) { setF({}); onClose(); }
  };
  return (
    <Modal open={open} onClose={onClose} title={entity === 'milestones' ? t('newMilestone') : t('newRisk')}>
      <div className="fields">
        <Field full live label={entity === 'milestones' ? t('milestone') : t('description')} value={f[main] || ''} onSave={set(main)} />
        <Field label={t('workstream')} type="select" options={['All', ...(dd.Workstreams ?? [])]} translate value={f.workstream || 'All'} onSave={set('workstream')} />
        {entity === 'milestones' ? (
          <>
            <Field label={t('targetDate')} type="date" value={f.targetDate || ''} onSave={set('targetDate')} />
            <Field full live label={t('description')} type="textarea" value={f.description || ''} onSave={set('description')} />
          </>
        ) : (
          <>
            <Field label={t('likelihood')} type="select" options={['1', '2', '3', '4', '5']} value={f.likelihood || '3'} onSave={set('likelihood')} />
            <Field label={t('impact')} type="select" options={['1', '2', '3', '4', '5']} value={f.impact || '3'} onSave={set('impact')} />
            <Field live label={t('owner')} value={f.owner || ''} onSave={set('owner')} />
            <Field full live label={t('mitigation')} type="textarea" value={f.mitigation || ''} onSave={set('mitigation')} />
          </>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn primary" disabled={busy || !f[main]?.trim()} onClick={submit}><Plus size={15} /> {t('add')}</button>
      </div>
    </Modal>
  );
}
