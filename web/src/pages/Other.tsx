import { useRef, useState } from 'react';
import { ExternalLink, FolderOpen, Plus, UploadCloud, FileText } from 'lucide-react';
import { useI18n, type Lang } from '../i18n';
import { useDisplayName, useStore } from '../store';
import type { Row } from '../types';
import { MAX_UPLOAD_MB } from '../config';
import { Avatar, Drawer, DrawerHead, Empty, Field, Modal, PageHead, WsChip } from '../components/ui';
import { cls } from '../util';

/* ---------------- Uploads ---------------- */
export function Uploads() {
  const { t, v } = useI18n();
  const { all, upload, busy } = useStore();
  const dn = useDisplayName();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [ws, setWs] = useState('');
  const [taskId, setTaskId] = useState('');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [big, setBig] = useState<File[]>([]);

  const send = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const limit = MAX_UPLOAD_MB * 1024 * 1024;
    setBig(list.filter((f) => f.size > limit));
    for (const f of list.filter((x) => x.size <= limit)) {
      setProgress(`${t('uploading')} ${f.name}`);
      await upload(f, { workstream: ws || t('general'), taskId, note });
    }
    setProgress(null); setNote('');
  };
  const tasks = all!.data.tasks.filter((x) => !ws || x.workstream === ws);

  return (
    <div>
      <PageHead title={t('uploads')} sub={`Google Drive · max ${MAX_UPLOAD_MB} MB`}>
        {all!.folderUrl && <a className="btn" href={all!.folderUrl} target="_blank" rel="noreferrer"><FolderOpen size={15} /> {t('openFolder')}</a>}
      </PageHead>
      <div className="grid g-home">
        <div className="card">
          <div className={cls('drop', over && 'over')} onClick={() => !busy && input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files); }}>
            <UploadCloud size={40} color="var(--accent)" />
            <div className="big">{progress ?? t('dropFiles')}</div>
            <div className="muted small" style={{ marginTop: 4 }}>PDF, images, docs, videos…</div>
            <input ref={input} type="file" multiple hidden onChange={(e) => { send(e.target.files); e.target.value = ''; }} />
          </div>
          {big.length > 0 && (
            <div className="warn-box" style={{ marginTop: 14, textAlign: 'start' }}>
              <div style={{ fontWeight: 700 }}>⚠ {t('bigFilesTitle')}</div>
              <div className="small" style={{ margin: '4px 0 6px' }}>{t('bigFilesSub')}</div>
              {big.map((f) => <div key={f.name} className="small mono">{f.name} · {(f.size / 1048576).toFixed(0)} MB</div>)}
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                {all!.folderUrl && <a className="btn primary sm" href={all!.folderUrl} target="_blank" rel="noreferrer"><FolderOpen size={14} /> {t('openFolder')}</a>}
                <button className="btn sm ghost" onClick={() => setBig([])}>{t('dismiss')}</button>
              </div>
            </div>
          )}
          <div className="fields" style={{ marginTop: 16 }}>
            <div>
              <label className="lbl">{t('uploadTo')}</label>
              <select className="select" value={ws} onChange={(e) => { setWs(e.target.value); setTaskId(''); }}>
                <option value="">{t('general')}</option>
                {(all!.dropdowns.Workstreams ?? []).map((w) => <option key={w} value={w}>{v(w)}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">{t('linkTask')}</label>
              <select className="select" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">—</option>
                {tasks.map((x) => <option key={x.id} value={x.id}>{x.id} · {String(x.task).slice(0, 40)}</option>)}
              </select>
            </div>
            <Field full live label={t('note')} value={note} onSave={setNote} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">{t('history')}</div>
          {all!.uploads.length === 0 ? <Empty>{t('noUploads')}</Empty> : (
            <div className="list">
              {all!.uploads.map((u, i) => (
                <a key={i} className="li" href={u.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <FileText size={20} color="var(--accent-2)" style={{ flex: 'none' }} />
                  <div className="grow">
                    <div className="title">{u.fileName}</div>
                    <div className="meta">{dn(u.name)} · {u.timestamp} · {u.folder}{u.taskId ? ` · ${u.taskId}` : ''}</div>
                  </div>
                  <ExternalLink size={14} className="muted" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Activity ---------------- */
export function Activity() {
  const { t, v } = useI18n();
  const { all } = useStore();
  const dn = useDisplayName();
  const [who, setWho] = useState('');
  const people = Array.from(new Set(all!.activity.map((a) => a.name)));
  const list = all!.activity.filter((a) => !who || a.name === who);
  return (
    <div>
      <PageHead title={t('activity')} sub={`${list.length}`}>
        <select className="select" style={{ width: 'auto', borderRadius: 99 }} value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">{t('all')}</option>
          {people.map((p) => <option key={p} value={p}>{dn(p)}</option>)}
        </select>
      </PageHead>
      <div className="card">
        {list.length === 0 ? <Empty>{t('noActivity')}</Empty> : (
          <div className="list">
            {list.map((a, i) => (
              <div key={i} className="li" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                <Avatar name={dn(a.name)} size={32} />
                <div className="grow">
                  <div className="small" style={{ lineHeight: 1.5 }}>
                    <b>{dn(a.name)}</b> <span className="muted">·</span> <span className="id-tag">{a.entity} {a.id}</span>{' '}
                    {a.field === '(new row)' ? <>{t('created')} <b>{a.newValue}</b></> : <>
                      <span className="muted">{a.field}</span>: {a.oldValue && <><s className="muted">{v(a.oldValue).slice(0, 60)}</s> → </>}<b>{v(a.newValue).slice(0, 80) || '—'}</b>
                    </>}
                  </div>
                  <div className="meta">{a.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Resources ---------------- */
export function Resources() {
  const { t } = useI18n();
  const { all, update, add, busy } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const list = all!.data.resources;
  const sel = list.find((r) => r.id === open) ?? null;
  const s = (r: Row, k: string) => String(r[k] ?? '');
  return (
    <div>
      <PageHead title={t('resources')}>
        <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> {t('addResource')}</button>
      </PageHead>
      <div className="grid g-2">
        {list.map((r) => (
          <div key={r.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpen(r.id)}>
            <div className="row" style={{ justifyContent: 'space-between' }}><WsChip ws={s(r, 'workstream')} /><span className="muted small">{s(r, 'version')}</span></div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 16, margin: '10px 0 6px' }}>{r.name}</div>
            {r.url && <a className="link small" href={s(r, 'url')} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{s(r, 'url')}</a>}
            <div className="muted small" style={{ marginTop: 8 }}>{t('lastChecked')}: {s(r, 'lastChecked') || '—'} · {s(r, 'verifiedBy')}</div>
          </div>
        ))}
      </div>
      <Drawer open={!!sel} onClose={() => setOpen(null)}>
        {sel && <>
          <DrawerHead onClose={() => setOpen(null)}><h3>{sel.name}</h3></DrawerHead>
          <div className="drawer-body"><div className="fields">
            <Field full label={t('resourceName')} value={s(sel, 'name')} onSave={(v) => update('resources', sel, { name: v })} />
            <Field full label="URL" value={s(sel, 'url')} onSave={(v) => update('resources', sel, { url: v })} />
            <Field label={t('workstream')} value={s(sel, 'workstream')} onSave={(v) => update('resources', sel, { workstream: v })} />
            <Field label={t('version')} value={s(sel, 'version')} onSave={(v) => update('resources', sel, { version: v })} />
            <Field label={t('lastChecked')} value={s(sel, 'lastChecked')} onSave={(v) => update('resources', sel, { lastChecked: v })} />
            <Field label={t('verifiedBy')} value={s(sel, 'verifiedBy')} onSave={(v) => update('resources', sel, { verifiedBy: v })} />
          </div></div>
        </>}
      </Drawer>
      <Modal open={adding} onClose={() => setAdding(false)} title={t('addResource')}>
        <div className="fields">
          <Field full live label={t('resourceName')} value={f.name || ''} onSave={(v) => setF({ ...f, name: v })} />
          <Field full live label="URL" value={f.url || ''} onSave={(v) => setF({ ...f, url: v })} />
          <Field live label={t('workstream')} value={f.workstream || ''} onSave={(v) => setF({ ...f, workstream: v })} />
          <Field live label={t('version')} value={f.version || ''} onSave={(v) => setF({ ...f, version: v })} />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn ghost" onClick={() => setAdding(false)}>{t('cancel')}</button>
          <button className="btn primary" disabled={busy || !f.name?.trim()} onClick={async () => { if (await add('resources', f)) { setF({}); setAdding(false); } }}>
            <Plus size={15} /> {t('add')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- Guide ---------------- */
export function Guide() {
  const { t } = useI18n();
  const { all } = useStore();
  const rows = all!.guide.slice(1); // first row = sheet title
  return (
    <div>
      <PageHead title={t('guide')} />
      <div className="card">
        {rows.map(([a, b], i) => b ? (
          <div key={i} className="li" style={{ cursor: 'default', alignItems: 'flex-start' }}>
            <div style={{ width: 170, flex: 'none', fontWeight: 700 }}>{a}</div>
            <div className="grow" style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{b}</div>
          </div>
        ) : <div key={i} className="guide-sec">{a}</div>)}
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */
export function Settings({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const { t, lang, setLang } = useI18n();
  const { all, update } = useStore();
  const isDateRow = (label: string) => /date|deadline/i.test(label);
  return (
    <div>
      <PageHead title={t('settings')} />
      <div className="grid g-home">
        <div className="card">
          <div className="card-title">{t('seasonSettings')}</div>
          <div className="fields">
            {all!.data.settings.map((r) => {
              const label = String(r.label).replace(/:$/, '');
              return (
                <div key={r.id}>
                  <Field label={label} value={String(r.value ?? '')} onSave={(v) => update('settings', r, { value: v })}
                    placeholder={isDateRow(label) ? '30 Apr 2027' : undefined} />
                  {r.hint && <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{r.hint}</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-title">{t('language')} / {t('theme')}</div>
          <div className="stack" style={{ gap: 14 }}>
            <div className="seg">
              {(['en', 'ar'] as Lang[]).map((l) => <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'عربي'}</button>)}
            </div>
            <div className="seg">
              {['dark', 'light'].map((m) => <button key={m} className={theme === m ? 'on' : ''} onClick={() => setTheme(m)}>{m === 'dark' ? '🌙 ' + t('dark') : '☀️ ' + t('light')}</button>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
