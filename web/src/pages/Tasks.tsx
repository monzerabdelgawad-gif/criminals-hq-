import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Plus, Search } from 'lucide-react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import type { Row } from '../types';
import { Bar, Chip, Empty, Field, Modal, PageHead, PriorityChip, STATUS_COLOR, StatusChip, WsChip } from '../components/ui';
import { TaskDrawer, statusChanges } from '../components/TaskDrawer';
import { STATUS_EMOJI, WS_COLOR, cls, isMine, isOverdue } from '../util';

const COLS = ['Not Started', 'In Progress', 'Blocked', 'Under Review', 'Completed'];

export function Tasks() {
  const { t, v } = useI18n();
  const { all, update } = useStore();
  const [view, setView] = useState<'board' | 'list'>(() => (window.innerWidth < 860 ? 'list' : 'board'));
  const [q, setQ] = useState('');
  const [ws, setWs] = useState('');
  const [who, setWho] = useState<'all' | 'mine'>('all');
  const [showCx, setShowCx] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const tasks = all!.data.tasks;
  const me = all!.me;
  const filtered = useMemo(() => tasks.filter((x) => {
    if (ws && x.workstream !== ws) return false;
    if (who === 'mine' && !isMine(x, me, true)) return false;
    if (!showCx && x.status === 'Cancelled') return false;
    if (q) {
      const hay = `${x.id} ${x.task} ${x.owner} ${x.subcategory} ${x.notes}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [tasks, ws, who, showCx, q, me]);

  const drop = (status: string) => {
    const task = tasks.find((x) => x.id === dragId);
    setDragId(null); setOverCol(null);
    if (task && task.status !== status) update('tasks', task, statusChanges(task, status));
  };

  const cols = showCx ? [...COLS, 'Cancelled'] : COLS;

  return (
    <div>
      <PageHead title={t('tasks')} sub={`${filtered.length} / ${tasks.length}`}>
        <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> {t('newTask')}</button>
      </PageHead>

      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <div className="search"><Search size={15} /><input className="input" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">
          <button className={who === 'all' ? 'on' : ''} onClick={() => setWho('all')}>{t('all')}</button>
          <button className={who === 'mine' ? 'on' : ''} onClick={() => setWho('mine')}>{t('mine')}</button>
        </div>
        <select className="select" style={{ width: 'auto', borderRadius: 99 }} value={ws} onChange={(e) => setWs(e.target.value)}>
          <option value="">{t('workstreams')}: {t('all')}</option>
          {(all!.dropdowns.Workstreams ?? []).map((w) => <option key={w} value={w}>{v(w)}</option>)}
        </select>
        <label className="row small muted" style={{ cursor: 'pointer', gap: 6 }}>
          <input type="checkbox" checked={showCx} onChange={(e) => setShowCx(e.target.checked)} /> {t('showCancelled')}
        </label>
        <div style={{ flex: 1 }} />
        <div className="seg">
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')} aria-label={t('board')}><LayoutGrid size={15} /></button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label={t('list')}><List size={15} /></button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="board" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(250px, 1fr))` }}>
          {cols.map((col) => {
            const items = filtered.filter((x) => x.status === col);
            return (
              <div key={col} className={cls('col', overCol === col && 'over')}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
                onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
                onDrop={() => drop(col)}>
                <div className="col-head">
                  <span style={{ width: 9, height: 9, borderRadius: 9, background: STATUS_COLOR[col] }} />
                  {STATUS_EMOJI[col]} {v(col)} <span className="n">{items.length}</span>
                </div>
                {items.map((x, i) => (
                  <motion.div key={x.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.02 }}>
                    <TaskCard task={x} dragging={dragId === x.id} onOpen={() => setOpen(x.id)} onDrag={setDragId} />
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 6 }}>
          {filtered.length === 0 ? <Empty>—</Empty> : (
            <div className="table-wrap">
              <table className="t">
                <thead><tr>
                  <th>ID</th><th>{t('task')}</th><th>{t('workstream')}</th><th>{t('owner')}</th><th>{t('deadline')}</th>
                  <th>{t('priority')}</th><th>{t('status')}</th><th style={{ minWidth: 90 }}>%</th>
                </tr></thead>
                <tbody>
                  {filtered.map((x) => (
                    <tr key={x.id} className="click" onClick={() => setOpen(x.id)}>
                      <td className="id-tag">{x.id}</td>
                      <td style={{ fontWeight: 600, minWidth: 220 }}>{x.task}</td>
                      <td><WsChip ws={String(x.workstream)} short /></td>
                      <td className="small">{x.owner}</td>
                      <td className={cls('small mono', isOverdue(x) && 'overdue-txt')} style={{ whiteSpace: 'nowrap' }}>{x.plannedDeadline}</td>
                      <td><PriorityChip p={String(x.priority)} /></td>
                      <td><StatusChip status={String(x.status)} /></td>
                      <td><Bar value={Number(x.completion) || 0} color={WS_COLOR[String(x.workstream)]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <TaskDrawer taskId={open} onClose={() => setOpen(null)} />
      <NewTask open={adding} onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); setOpen(id); }} />
    </div>
  );
}

function TaskCard({ task, onOpen, onDrag, dragging }: { task: Row; onOpen: () => void; onDrag: (id: string | null) => void; dragging: boolean }) {
  const overdue = isOverdue(task);
  return (
    <div className={cls('tcard', dragging && 'dragging')} draggable onDragStart={() => onDrag(task.id)} onDragEnd={() => onDrag(null)} onClick={onOpen}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="id-tag">{task.id}</span>
        <WsChip ws={String(task.workstream)} short />
      </div>
      <div className="t">{task.task}</div>
      {Number(task.completion) > 0 && <div style={{ marginBottom: 8 }}><Bar value={Number(task.completion)} color={WS_COLOR[String(task.workstream)]} /></div>}
      <div className="foot">
        <span>👤 {task.owner}</span>
        <span>·</span>
        <span className={overdue ? 'overdue-txt' : ''}>📅 {task.plannedDeadline}</span>
        {task.priority === 'Critical' && <Chip color="var(--s-bl)">⚡</Chip>}
        {task.blocker && <Chip color="var(--s-bl)">💀 {String(task.blocker).slice(0, 18)}</Chip>}
      </div>
    </div>
  );
}

function NewTask({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { t, v } = useI18n();
  const { all, add, busy } = useStore();
  const dd = all!.dropdowns;
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (val: string) => setF((x) => ({ ...x, [k]: val }));
  const ws = f.workstream || dd.Workstreams?.[0] || '';
  const submit = async () => {
    if (!f.task?.trim()) return;
    const row = await add('tasks', { priority: 'Medium', owner: 'All Students', ...f, workstream: ws });
    if (row) { setF({}); onCreated(row.id); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('newTask')}>
      <div className="fields">
        <Field full live label={t('task')} value={f.task || ''} onSave={set('task')} />
        <div>
          <label className="lbl">{t('workstream')}</label>
          <select className="select" value={ws} onChange={(e) => set('workstream')(e.target.value)}>
            {(dd.Workstreams ?? []).map((w) => <option key={w} value={w}>{v(w)}</option>)}
          </select>
        </div>
        <Field live label={t('subcategory')} value={f.subcategory || ''} onSave={set('subcategory')} />
        <Field label={t('owner')} type="select" options={dd.Owners} value={f.owner || 'All Students'} onSave={set('owner')} />
        <Field label={t('priority')} type="select" options={dd.Priority} translate value={f.priority || 'Medium'} onSave={set('priority')} />
        <Field label={t('plannedStart')} type="date" value={f.plannedStart || ''} onSave={set('plannedStart')} />
        <Field label={t('deadline')} type="date" value={f.plannedDeadline || ''} onSave={set('plannedDeadline')} />
        <Field full live label={t('procedure')} type="textarea" value={f.procedure || ''} onSave={set('procedure')} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn primary" disabled={busy || !f.task?.trim()} onClick={submit}><Plus size={15} /> {t('add')}</button>
      </div>
    </Modal>
  );
}
