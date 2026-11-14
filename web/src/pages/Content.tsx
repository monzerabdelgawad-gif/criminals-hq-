import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, FilePlus2, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { call } from '../api';
import { useI18n } from '../i18n';
import { useCan, useStore } from '../store';
import { Chip, Empty, PageHead } from '../components/ui';

type ContentPage = { id: string; title: string; status: string; assignees: string[]; assigneeNames?: string[]; editedAt: string; url: string };
type NotionUser = { id: string; name: string };
type ContentList = { pages: ContentPage[]; statuses: string[]; users: NotionUser[]; syncedAt: string };
type Draft = ContentPage & { markdown: string };
const blank: Draft = { id: '', title: '', status: '', assignees: [], editedAt: '', url: '', markdown: '' };

export function Content() {
  const { t, lang } = useI18n();
  const { toast } = useStore();
  const canEdit = useCan()('content');
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [people, setPeople] = useState<NotionUser[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [syncedAt, setSyncedAt] = useState('');
  const [conflict, setConflict] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const r = await call<ContentList>('contentList');
    if (r.ok) {
      setPages(r.pages || []); setStatuses(r.statuses || []);
      const knownPeople = new Map((r.users || []).map((p) => [p.id, p]));
      (r.pages || []).forEach((p) => p.assignees.forEach((id, i) => { if (!knownPeople.has(id)) knownPeople.set(id, { id, name: p.assigneeNames?.[i] || id }); }));
      setPeople(Array.from(knownPeople.values()));
      setSyncedAt(r.syncedAt || new Date().toISOString()); setError(''); setErrorDetail('');
      const current = selected?.id ? (r.pages || []).find((p) => p.id === selected.id) : undefined;
      setConflict(!!current && !!selected?.editedAt && current.editedAt !== selected.editedAt);
    } else {
      setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : '');
    }
    if (!quiet) setLoading(false);
  }, [selected]);

  useEffect(() => { void load(); }, []); // initial load
  useEffect(() => {
    const tick = () => { if (!document.hidden) void load(true); };
    const timer = window.setInterval(tick, 20000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [load]);

  const visible = useMemo(() => pages.filter((p) => `${p.title} ${p.status}`.toLowerCase().includes(search.trim().toLowerCase())), [pages, search]);
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSelected((s) => s ? { ...s, [key]: value } : s);
    setDirty(true);
  };

  const open = async (page: ContentPage) => {
    if (dirty && !window.confirm(lang === 'ar' ? 'في تغييرات لسه متحفظتش. تفتح الصفحة دي؟' : 'You have unsaved changes. Open this page?')) return;
    setSelected({ ...page, markdown: '' }); setDirty(false); setBodyDirty(false); setConflict(false); setError(''); setErrorDetail('');
    const r = await call<{ markdown: string }>('contentGet', { id: page.id });
    if (r.ok) setSelected((s) => s?.id === page.id ? { ...s, markdown: r.markdown || '' } : s);
    else { setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : ''); }
  };

  const create = () => {
    if (dirty && !window.confirm(lang === 'ar' ? 'في تغييرات لسه متحفظتش. تبدأ صفحة جديدة؟' : 'You have unsaved changes. Start a new page?')) return;
    setSelected({ ...blank }); setDirty(true); setBodyDirty(true); setConflict(false); setError(''); setErrorDetail('');
  };

  const save = async () => {
    if (!selected?.title.trim()) { setError('missing_title'); setErrorDetail(''); return; }
    if (conflict) { setError('content_conflict'); setErrorDetail(''); return; }
    setSaving(true); setError(''); setErrorDetail('');
    const saveToNotion = (allowUnsupportedReplace = false) => call<{ page: ContentPage }>('contentSave', {
      id: selected.id || undefined, title: selected.title, status: selected.status,
      assignees: selected.assignees, markdown: selected.markdown, bodyChanged: !selected.id || bodyDirty,
      allowUnsupportedReplace, expectedEditedAt: selected.editedAt || undefined,
    });
    let r = await saveToNotion();
    if (!r.ok && r.error === 'content_has_unsupported') {
      if (window.confirm(t('contentUnsupported'))) r = await saveToNotion(true);
      else { setSaving(false); return; }
    }
    setSaving(false);
    if (r.ok) {
      const saved = { ...r.page, markdown: selected.markdown };
      setSelected(saved); setDirty(false); setBodyDirty(false); setConflict(false);
      setPages((old) => [...old.filter((p) => p.id !== saved.id), r.page].sort((a, b) => a.title.localeCompare(b.title)));
      toast(lang === 'ar' ? 'اتحفظ واتزامن مع Notion ✓' : 'Saved and synced with Notion ✓', 'ok');
    } else {
      setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : '');
      if (r.error === 'content_conflict') { setConflict(true); void load(true); }
    }
  };

  const archive = async () => {
    if (!selected?.id || !window.confirm(t('contentArchiveConfirm'))) return;
    setSaving(true);
    const r = await call<{ id: string }>('contentArchive', { id: selected.id });
    setSaving(false);
    if (r.ok) { setPages((old) => old.filter((p) => p.id !== selected.id)); setSelected(null); setDirty(false); toast(lang === 'ar' ? 'اتنقلت لسلة Notion' : 'Moved to Notion trash', 'ok'); }
    else { setError(r.error || 'network'); setErrorDetail(typeof r.message === 'string' ? r.message : ''); }
  };

  const insert = (prefix: string, suffix = '') => {
    const el = editorRef.current;
    if (!el || !selected) return;
    const start = el.selectionStart, end = el.selectionEnd, value = selected.markdown;
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
    <PageHead title={t('content')} sub={t('contentSub')}>
      <button className="btn" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> {t('contentRefresh')}</button>
      {canEdit && <button className="btn primary" onClick={create}><FilePlus2 size={15} /> {t('contentNew')}</button>}
    </PageHead>

    {error && <div className="card content-alert" role="status">{errText(error, errorDetail)}</div>}
    <div className="content-layout">
      <section className="card content-list-card">
        <div className="content-search"><Search size={16} /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('contentSearch')} /></div>
        <div className="content-sync-note"><span className="sync-pulse" />{syncedAt ? t('contentSynced') : t('contentSyncing')}</div>
        <div className="content-list">
          {loading && pages.length === 0 ? <Empty>{t('loading')}</Empty> : visible.length === 0 ? <Empty>{pages.length ? t('search') : t('contentEmpty')}</Empty> : visible.map((p) => (
            <button key={p.id} className={`content-list-row ${selected?.id === p.id ? 'active' : ''}`} onClick={() => void open(p)}>
              <span className="content-row-title">{p.title || 'Untitled'}</span>
              <span className="content-row-meta">{p.status ? <Chip>{p.status}</Chip> : <span className="muted">{t('contentNoStatus')}</span>}</span>
            </button>
          ))}
        </div>
        <div className="content-list-foot">{pages.length} · {syncedAt ? new Date(syncedAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
      </section>

      <section className="card content-editor-card">
        {!selected ? <Empty>{t('contentChoose')}</Empty> : <>
          <div className="content-editor-head">
            <div className="content-editor-label">{selected.id ? 'NOTION PAGE' : t('contentNew')}</div>
            <div className="row">
              {selected.url && <a className="btn sm" href={selected.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {t('contentOpenNotion')}</a>}
              {canEdit && selected.id && <button className="btn sm" onClick={() => void archive()} disabled={saving}><Trash2 size={14} /> {t('contentArchive')}</button>}
            </div>
          </div>
          {conflict && <div className="content-conflict">{t('contentConflict')} <button className="btn sm" onClick={() => void open(pages.find((p) => p.id === selected.id)!)}>{t('contentRefresh')}</button></div>}
          <label className="lbl" htmlFor="content-title">{t('contentTitle')}</label>
          <input id="content-title" className="input content-title-input" value={selected.title} onChange={(e) => change('title', e.target.value)} readOnly={!canEdit} />
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
        </>}
      </section>
    </div>
  </div>;
}
