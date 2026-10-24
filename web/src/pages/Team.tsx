import { useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { useI18n } from '../i18n';
import { useDisplayName, useStore } from '../store';
import type { Row } from '../types';
import { Avatar, Chip, Drawer, DrawerHead, Empty, Field, Modal, PageHead } from '../components/ui';
import { DONE, isMine } from '../util';

export function Team() {
  const { t, v } = useI18n();
  const { all } = useStore();
  const dn = useDisplayName();
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [openDir, setOpenDir] = useState<string | null>(null);
  const [adding, setAdding] = useState<'users' | 'team' | null>(null);
  const { users, team, tasks } = all!.data;
  const selU = users.find((u) => u.id === openUser) ?? null;
  const selD = team.find((u) => u.id === openDir) ?? null;

  const countFor = (u: Row) => {
    const me = { email: String(u.email), name: String(u.name), teamRole: String(u.teamRole), lang: 'en',
      taskRoles: String(u.taskRoles).split(',').map((s) => s.trim()).filter(Boolean) };
    return tasks.filter((x) => isMine(x, me) && !DONE.includes(String(x.status))).length;
  };

  return (
    <div>
      <PageHead title={t('team')} sub={`${users.length} ${t('membersCount')}`}>
        <button className="btn primary" onClick={() => setAdding('users')}><UserPlus size={16} /> {t('addMember')}</button>
      </PageHead>

      <div className="card-title" style={{ marginTop: 4 }}>{t('members')}</div>
      <div className="grid g-3" style={{ marginBottom: 26 }}>
        {users.map((u) => (
          <div key={u.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpenUser(u.id)}>
            <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}>
              <Avatar name={dn(u.name) || String(u.email)} size={44} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 16 }}>{dn(u.name) || '—'}</div>
                <div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email || t('noEmail')}</div>
              </div>
              <Chip color={u.teamRole === 'Instructor' ? 'var(--accent-2)' : 'var(--c-rd)'}>{v(u.teamRole || 'Student')}</Chip>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              {String(u.taskRoles || '').split(',').map((r) => r.trim()).filter(Boolean).map((r) => <Chip key={r}>{r}</Chip>)}
              <span className="muted small" style={{ marginInlineStart: 'auto' }}>{countFor(u)} {t('tasksOwned')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card-title">
        {t('directory')}
        <button className="btn sm" onClick={() => setAdding('team')}><Plus size={14} /> {t('addPerson')}</button>
      </div>
      <div className="card" style={{ padding: 6 }}>
        {team.length === 0 ? <Empty>—</Empty> : (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>{t('name')}</th><th>{t('responsibilities')}</th><th>{t('supportingRoles')}</th><th>{t('skills')}</th><th>{t('mentor')}</th><th>{t('availability')}</th></tr></thead>
              <tbody>
                {team.map((p) => (
                  <tr key={p.id} className="click" onClick={() => setOpenDir(p.id)}>
                    <td style={{ fontWeight: 600 }}>{dn(p.name)}</td><td>{p.responsibilities}</td><td>{p.supporting}</td>
                    <td>{p.skills}</td><td>{p.mentor}</td><td>{p.availability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={!!selU} onClose={() => setOpenUser(null)}>{selU && <UserBody u={selU} onClose={() => setOpenUser(null)} />}</Drawer>
      <Drawer open={!!selD} onClose={() => setOpenDir(null)}>{selD && <DirBody p={selD} onClose={() => setOpenDir(null)} />}</Drawer>
      <AddPerson kind={adding} onClose={() => setAdding(null)} />
    </div>
  );
}

function RolesPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { all } = useStore();
  const roles = (all!.dropdowns.Owners ?? []).filter((r) => r !== 'All Students');
  const sel = value.split(',').map((s) => s.trim()).filter(Boolean);
  const toggle = (r: string) => onChange((sel.includes(r) ? sel.filter((x) => x !== r) : [...sel, r]).join(', '));
  return (
    <div className="row" style={{ gap: 6 }}>
      {roles.map((r) => (
        <button key={r} type="button" className="chip" onClick={() => toggle(r)}
          style={{ cursor: 'pointer', ['--c' as string]: sel.includes(r) ? 'var(--accent)' : undefined, opacity: sel.includes(r) ? 1 : 0.6 }}>
          {sel.includes(r) ? '✓ ' : ''}{r}
        </button>
      ))}
    </div>
  );
}

function UserBody({ u, onClose }: { u: Row; onClose: () => void }) {
  const { t } = useI18n();
  const { update } = useStore();
  const dn = useDisplayName();
  const s = (f: string) => String(u[f] ?? '');
  const save = (f: string) => (v: string) => update('users', u, { [f]: v });
  return (
    <>
      <DrawerHead onClose={onClose}><h3>{dn(s('name')) || s('email')}</h3><div className="muted small">{s('email')}</div></DrawerHead>
      <div className="drawer-body">
        <div className="fields">
          <Field label={t('name')} value={s('name')} onSave={save('name')} />
          <Field label={t('nameAr')} value={s('nameAr')} onSave={save('nameAr')} />
          <Field label={t('email')} value={s('email')} onSave={save('email')} />
          <Field label={t('teamRole')} type="select" options={['Student', 'Instructor']} translate value={s('teamRole')} onSave={save('teamRole')} />
          <Field label={t('language')} type="select" options={['en', 'ar']} value={s('lang')} onSave={save('lang')} />
          <div className="full">
            <label className="lbl">{t('taskRoles')}</label>
            <RolesPicker value={s('taskRoles')} onChange={save('taskRoles')} />
          </div>
        </div>
      </div>
    </>
  );
}

function DirBody({ p, onClose }: { p: Row; onClose: () => void }) {
  const { t } = useI18n();
  const { update } = useStore();
  const s = (f: string) => String(p[f] ?? '');
  const save = (f: string) => (v: string) => update('team', p, { [f]: v });
  return (
    <>
      <DrawerHead onClose={onClose}><h3>{s('name')}</h3></DrawerHead>
      <div className="drawer-body">
        <div className="fields">
          <Field full label={t('name')} value={s('name')} onSave={save('name')} />
          <Field full label={t('responsibilities')} value={s('responsibilities')} onSave={save('responsibilities')} />
          <Field full label={t('supportingRoles')} value={s('supporting')} onSave={save('supporting')} />
          <Field full label={t('skills')} value={s('skills')} onSave={save('skills')} />
          <Field label={t('mentor')} value={s('mentor')} onSave={save('mentor')} />
          <Field label={t('availability')} value={s('availability')} onSave={save('availability')} />
        </div>
      </div>
    </>
  );
}

function AddPerson({ kind, onClose }: { kind: 'users' | 'team' | null; onClose: () => void }) {
  const { t } = useI18n();
  const { add, busy } = useStore();
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const valid = kind === 'users' ? /\S+@\S+\.\S+/.test(f.email || '') : !!f.name?.trim();
  const submit = async () => {
    const vals = kind === 'users' ? { teamRole: 'Student', lang: 'ar', ...f, email: (f.email || '').trim().toLowerCase() } : f;
    if (await add(kind!, vals)) { setF({}); onClose(); }
  };
  return (
    <Modal open={!!kind} onClose={onClose} title={kind === 'users' ? t('addMember') : t('addPerson')}>
      <div className="fields">
        <Field full live label={t('name')} value={f.name || ''} onSave={set('name')} />
        {kind === 'users' ? (
          <>
            <Field full live label={t('nameAr')} value={f.nameAr || ''} onSave={set('nameAr')} />
            <Field full live label={t('email') + ' (Gmail)'} value={f.email || ''} onSave={set('email')} placeholder="name@gmail.com" />
            <Field label={t('teamRole')} type="select" options={['Student', 'Instructor']} translate value={f.teamRole || 'Student'} onSave={set('teamRole')} />
            <Field label={t('language')} type="select" options={['ar', 'en']} value={f.lang || 'ar'} onSave={set('lang')} />
            <div className="full"><label className="lbl">{t('taskRoles')}</label><RolesPicker value={f.taskRoles || ''} onChange={set('taskRoles')} /></div>
          </>
        ) : (
          <>
            <Field full live label={t('responsibilities')} value={f.responsibilities || ''} onSave={set('responsibilities')} />
            <Field full live label={t('skills')} value={f.skills || ''} onSave={set('skills')} />
          </>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn primary" disabled={busy || !valid} onClick={submit}><Plus size={15} /> {t('add')}</button>
      </div>
    </Modal>
  );
}
