import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, FilePlus2, LayoutGrid, List, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { call } from '../api';
import { useI18n } from '../i18n';
import { useCan, useStore } from '../store';
import { Chip, Drawer, DrawerHead, Empty, PageHead } from '../components/ui';
import { cls } from '../util';

type ContentPage = { id: string; title: string; status: string; assignees: string[]; assigneeNames?: string[]; editedAt: string; url: string };
type NotionUser = { id: string; name: string };
type ContentList = { pages: ContentPage[]; statuses: string[]; users: NotionUser[]; syncedAt: string };
type Draft = ContentPage & { markdown: string };
const NO_STATUS = '__no_status__';
const DEFAULT_STATUSES = ['IDEA', 'TO SCRIPT', 'TO FILM', 'TO EDIT', 'DONE'];
const STATUS_TONES: Record<string, string> = {
  IDEA: '#e45b61', 'TO SCRIPT': '#d8a52c', 'TO FILM': '#4b8ad8', 'TO EDIT': '#9b68ce', DONE: '#37a875',
};
const blank: Draft = { id: '', title: '', status: 'IDEA', assignees: [], editedAt: '', url: '', markdown: '' };

export function Content() {
  const { t, lang } = useI18n();
  const { toast } = useStore();
  const canEdit = useCan()('content');
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES);
  const [people, setPeople] = useState<NotionUser[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const selectedRef = useRef<Draft | null>(null);
  const dirtyRef = useRef(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'board' | 'list'>(() => window.innerWidth < 860 ? 'list' : 'board');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [syncedAt, setSyncedAt] = useState('');
  const [conflict, setConflict] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const setDraft = (next: Draft | null) => { selectedRef.current = next; setSelected(next); };
  const markDirty = (next: boolean) => { dirtyRef.current = next; setDirty(next); };

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const r = await call<ContentList>('contentList');
    if (r.ok) {
      const rows = r.pages || [];
      setPages(rows);
      setStatuses(r.statuses?.length ? r.statuses : DEFAULT_STATUSES);
      const knownPeople = new Map((r.users || []).map((p) => [p.id, p]));
      rows.forEach((p) => p.assignees.forEach((id, i) => { if (!knownPeople.has(id)) knownPeople.set(id, { id, name: p.assigneeNames?.[i] || id }); }));
      setPeople(Array.from(knownPeople.values()));
      setSyncedAt(r.syncedAt || new Date().toISOString()); setError(''); setErrorDetail('');

      // If Notion changed the page while it is open, refresh it automatically when there are no local edits.
      const current = selectedRef.current;
      const remote = current?.id ? rows.find((p) => p.id === current.id) : undefined;
      if (current?.id && remote && remote.editedAt !== current.editedAt) {
        if (dirtyRef.current) setConflict(true);
        else {
          const body = await call<{ markdown: string }>('contentGet', { id: current.id });
          if (body.ok && selectedRef.current?.id === current.id && !dirtyRef.current) {
            setDraft({ ...remote, markdown: body.markdown || '' });
            setConflict(false);
          }
        }
      }
    } else {
      setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : '');
    }
    if (!quiet) setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const tick = () => { if (!document.hidden) void load(true); };
    const timer = window.setInterval(tick, 20000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [load]);

  const visible = useMemo(() => pages.filter((p) => `${p.title} ${p.status} ${(p.assigneeNames || []).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())), [pages, search]);
  const columns = useMemo(() => {
    const allStatuses = statuses.length ? statuses : DEFAULT_STATUSES;
    return pages.some((p) => !p.status) ? [...allStatuses, NO_STATUS] : allStatuses;
  }, [pages, statuses]);

  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    const current = selectedRef.current;
    if (!current) return;
    setDraft({ ...current, [key]: value }); markDirty(true);
  };

  const open = async (page: ContentPage) => {
    if (dirtyRef.current && !window.confirm(lang === 'ar' ? 'في تغييرات لسه متحفظتش. تفتح الصفحة دي؟' : 'You have unsaved changes. Open this page?')) return;
    setDraft({ ...page, markdown: '' }); markDirty(false); setBodyDirty(false); setConflict(false); setError(''); setErrorDetail('');
    const r = await call<{ markdown: string }>('contentGet', { id: page.id });
    if (r.ok && selectedRef.current?.id === page.id) setDraft({ ...page, markdown: r.markdown || '' });
    else if (!r.ok) { setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : ''); }
  };

  const create = () => {
    if (dirtyRef.current && !window.confirm(lang === 'ar' ? 'في تغييرات لسه متحفظتش. تبدأ صفحة جديدة؟' : 'You have unsaved changes. Start a new page?')) return;
    setDraft({ ...blank }); markDirty(true); setBodyDirty(true); setConflict(false); setError(''); setErrorDetail('');
  };

  const requestSave = (draft: Draft, bodyChanged: boolean, allowUnsupportedReplace = false) => call<{ page: ContentPage }>('contentSave', {
    id: draft.id || undefined, title: draft.title, status: draft.status,
    assignees: draft.assignees, markdown: draft.markdown, bodyChanged,
    allowUnsupportedReplace, expectedEditedAt: draft.editedAt || undefined,
  });

  const save = async () => {
    const draft = selectedRef.current;
    if (!draft?.title.trim()) { setError('missing_title'); setErrorDetail(''); return; }
    if (conflict) { setError('content_conflict'); setErrorDetail(''); return; }
    setSaving(true); setError(''); setErrorDetail('');
    let r = await requestSave(draft, !draft.id || bodyDirty);
    if (!r.ok && r.error === 'content_has_unsupported') {
      if (window.confirm(t('contentUnsupported'))) r = await requestSave(draft, true, true);
      else { setSaving(false); return; }
    }
    setSaving(false);
    if (r.ok) {
      const saved = { ...r.page, markdown: draft.markdown };
      setDraft(saved); markDirty(false); setBodyDirty(false); setConflict(false);
      setPages((old) => [...old.filter((p) => p.id !== saved.id), r.page].sort((a, b) => a.title.localeCompare(b.title)));
      toast(lang === 'ar' ? 'اتحفظ واتزامن مع Notion ✓' : 'Saved and synced with Notion ✓', 'ok');
    } else {
      setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : '');
      if (r.error === 'content_conflict') { setConflict(true); void load(true); }
    }
  };

  const setStatus = async (page: ContentPage, status: string) => {
    if (!canEdit || saving || page.status === status) return;
    setDragId(null); setOverCol(null); setSaving(true); setError('');
    const draft: Draft = { ...page, status, markdown: '' };
    setPages((old) => old.map((p) => p.id === page.id ? { ...p, status } : p));
    const r = await requestSave(draft, false);
    setSaving(false);
    if (r.ok) {
      setPages((old) => old.map((p) => p.id === page.id ? r.page : p));
      if (selectedRef.current?.id === page.id && !dirtyRef.current) setDraft({ ...selectedRef.current, ...r.page });
      toast(lang === 'ar' ? 'الحالة اتحدّثت في Notion ✓' : 'Status updated in Notion ✓', 'ok');
    } else {
      setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : '');
      void load(true);
    }
  };

  const archive = async () => {
    const current = selectedRef.current;
    if (!current?.id || !window.confirm(t('contentArchiveConfirm'))) return;
    setSaving(true);
    const r = await call<{ id: string }>('contentArchive', { id: current.id });
    setSaving(false);
    if (r.ok) {
      setPages((old) => old.filter((p) => p.id !== current.id)); setDraft(null); markDirty(false); setBodyDirty(false);
      toast(lang === 'ar' ? 'اتنقلت لسلة Notion' : 'Moved to Notion trash', 'ok');
    } else { setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : ''); }
  };

  const close = () => {
    if (dirtyRef.current && !window.confirm(lang === 'ar' ? 'تقفل من غير ما تحفظ التغييرات؟' : 'Close without saving your changes?')) return;
    setDraft(null); markDirty(false); setBodyDirty(false); setConflict(false);
  };

  const insert = (prefix: string, suffix = '') => {
    const el = editorRef.current, current = selectedRef.current;
    if (!el || !current) return;
    const start = el.selectionStart, end = el.selectionEnd, value = current.markdown;
    const next = value.slice(0, start) + prefix + value.slice(start, end) + suffix + value.slice(end);
    change('markdown', next); setBodyDirty(true);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + prefix.length, end + prefix.length); });
  };

  const errText = (code: string, detail: string) => ({
    content_not_configured: t('contentSetup'), notion_unauthorized: lang === 'ar' ? 'مفتاح Notion غير صحيح.' : 'The Notion token is invalid.',
    notion_forbidden: lang === 'ar' ? 'التكامل محتاج صلاحية على قاعدة البيانات.' : 'The integration needs access to this database.',
    notion_not_found: lang === 'ar' ? 'قاعدة البيانات مش ظاهرة للتكامل. اتأكد إنك شاركتها معاه.' : 'The database is unavailable to the integration. Share it with the integration.',
    no_permission: t('noPermission'), content_conflict: t('contentConflict'), missing_title: lang === 'ar' ? 'اكتب عنوان للصفحة الأول.' : 'Add a title first.',
    content_has_unsupported: t('contentUnsupported'),
  } as Record<string, string>)[code] || (code === 'network' ? t('offline') : `${t('error')}: ${detail || code}`);

  return <div>
    <PageHead title={t('content')} sub={`${visible.length} / ${pages.length}`}>
      <button className="btn" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> {t('contentRefresh')}</button>
      {canEdit && <button className="btn primary" onClick={create}><FilePlus2 size={15} /> {t('contentNew')}</button>}
    </PageHead>

    <div className="content-controls row">
      <div className="search"><Search size={15} /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('contentSearch')} /></div>
      <div className="content-sync-note"><span className="sync-pulse" />{syncedAt ? `${t('contentSynced')} · ${new Date(syncedAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : t('contentSyncing')}</div>
      <div className="spacer" />
      <div className="seg">
        <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')} aria-label={t('board')}><LayoutGrid size={15} /></button>
        <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label={t('list')}><List size={15} /></button>
      </div>
    </div>

    {error && <div className="card content-alert" role="status">{errText(error, errorDetail)}</div>}

    {view === 'board' ? <div className="board content-board" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(245px, 1fr))` }}>
      {columns.map((col) => {
        const status = col === NO_STATUS ? '' : col;
        const items = visible.filter((p) => p.status === status);
        return <div key={col} className={cls('col', overCol === col && 'over')}
          onDragOver={(e) => { if (canEdit) { e.preventDefault(); setOverCol(col); } }}
          onDragLeave={() => setOverCol((c) => c === col ? null : c)}
          onDrop={() => { const page = pages.find((p) => p.id === dragId); if (page) void setStatus(page, status); }}>
          <div className="col-head"><span className="content-status-dot" style={{ background: STATUS_TONES[status] || 'var(--text-3)' }} />{status || t('contentNoStatus')}<span className="n">{items.length}</span></div>
          {items.map((p, i) => <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.02 }}>
            <ContentCard page={p} canEdit={canEdit} dragging={dragId === p.id} emptyLabel={t('contentNoStatus')} locale={lang === 'ar' ? 'ar-EG' : 'en-GB'} onOpen={() => void open(p)} onDrag={setDragId} />
          </motion.div>)}
          {!items.length && <div className="content-column-empty">—</div>}
        </div>;
      })}
    </div> : <div className="card content-table-card">
      {loading && pages.length === 0 ? <Empty>{t('loading')}</Empty> : visible.length === 0 ? <Empty>{pages.length ? t('search') : t('contentEmpty')}</Empty> :
        <div className="table-wrap"><table className="t mc"><thead><tr>
          <th>{t('contentTitle')}</th><th>{t('contentStatus')}</th><th>{t('contentAssign')}</th><th>{t('lastUpdated')}</th>
        </tr></thead><tbody>{visible.map((p) => <tr key={p.id} className="click" onClick={() => void open(p)}>
          <td className="content-table-title">{p.title || 'Untitled'}</td>
          <td><ContentStatus status={p.status} emptyLabel={t('contentNoStatus')} /></td>
          <td className="small">{p.assigneeNames?.join(', ') || '—'}</td>
          <td className="small mono">{p.editedAt ? new Date(p.editedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB') : '—'}</td>
        </tr>)}</tbody></table></div>}
    </div>}

    <Drawer open={!!selected} onClose={close}>
      {selected && <>
        <DrawerHead onClose={close}>
          <div className="content-drawer-top">
            <ContentStatus status={selected.status} emptyLabel={t('contentNoStatus')} />
            <div className="row">
              {selected.url && <a className="btn sm" href={selected.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {t('contentOpenNotion')}</a>}
              {canEdit && selected.id && <button className="btn sm" onClick={() => void archive()} disabled={saving}><Trash2 size={14} /> {t('contentArchive')}</button>}
            </div>
          </div>
          <input className="input content-title-input" value={selected.title} readOnly={!canEdit} onChange={(e) => change('title', e.target.value)} placeholder={t('contentTitle')} />
          {selected.editedAt && <div className="muted small">{t('lastUpdated')} · {new Date(selected.editedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</div>}
        </DrawerHead>
        <div className="drawer-body content-drawer-body">
          {conflict && <div className="content-conflict">{t('contentConflict')} <button className="btn sm" onClick={() => { const p = pages.find((x) => x.id === selected.id); if (p) { markDirty(false); void open(p); } }}>{t('contentRefresh')}</button></div>}
          <div className="content-meta-fields">
            <div><label className="lbl" htmlFor="content-status">{t('contentStatus')}</label><select id="content-status" className="select" value={selected.status} disabled={!canEdit} onChange={(e) => change('status', e.target.value)}>
              <option value="">{t('contentNoStatus')}</option>{statuses.map((s) => <option key={s}>{s}</option>)}
            </select></div>
            <div><label className="lbl" htmlFor="content-assign">{t('contentAssign')}</label><select id="content-assign" className="select content-people" multiple value={selected.assignees} disabled={!canEdit} onChange={(e) => change('assignees', Array.from(e.currentTarget.selectedOptions, (o) => o.value))}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          </div>
          <label className="lbl" htmlFor="content-body">{t('contentBody')}</label>
          {canEdit && <div className="content-toolbar">
            <button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('# ')}>H1</button>
            <button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('## ')}>H2</button>
            <button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('- ')}>• {t('list')}</button>
            <button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('> ')}>❝</button>
            <button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('**', '**')}><b>B</b></button>
            <button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('*', '*')}><i>I</i></button>
          </div>}
          <textarea ref={editorRef} id="content-body" className="textarea content-body" value={selected.markdown} readOnly={!canEdit} onChange={(e) => { change('markdown', e.target.value); setBodyDirty(true); }} dir="auto" placeholder={canEdit ? (lang === 'ar' ? 'اكتب المحتوى هنا…' : 'Write your content here…') : ''} />
          <div className="content-editor-foot"><span className="muted small">{t('contentFormat')}{conflict ? ` · ${t('contentConflict')}` : ''}</span>
            {canEdit && <button className="btn primary" onClick={() => void save()} disabled={saving || !dirty}><Save size={15} />{saving ? t('contentSaving') : t('contentSave')}</button>}
          </div>
        </div>
      </>}
    </Drawer>
  </div>;
}

function ContentCard({ page, canEdit, dragging, emptyLabel, locale, onOpen, onDrag }: { page: ContentPage; canEdit: boolean; dragging: boolean; emptyLabel: string; locale: string; onOpen: () => void; onDrag: (id: string | null) => void }) {
  return <div className={cls('tcard content-card', dragging && 'dragging')} draggable={canEdit}
    onDragStart={() => canEdit && onDrag(page.id)} onDragEnd={() => onDrag(null)} onClick={onOpen} role="button" tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}>
    <div className="content-card-status"><ContentStatus status={page.status} emptyLabel={emptyLabel} /></div>
    <div className="t content-card-title">{page.title || 'Untitled'}</div>
    <div className="foot"><span>👤 {page.assigneeNames?.length ? page.assigneeNames.join(', ') : '—'}</span>
      <span>·</span><span>🕒 {page.editedAt ? new Date(page.editedAt).toLocaleDateString(locale) : '—'}</span></div>
  </div>;
}

function ContentStatus({ status, emptyLabel }: { status: string; emptyLabel: string }) {
  if (!status) return <Chip className="content-status-chip">{emptyLabel}</Chip>;
  return <Chip className="content-status-chip" color={STATUS_TONES[status] || 'var(--text-3)'} dot>{status}</Chip>;
}
