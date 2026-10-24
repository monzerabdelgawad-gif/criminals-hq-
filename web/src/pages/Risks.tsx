import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import type { Row } from '../types';
import { Chip, Drawer, DrawerHead, Field, PageHead, WsChip } from '../components/ui';
import { NewItem } from './Milestones';

export const scoreColor = (s: number) => (s >= 15 ? 'var(--s-bl)' : s >= 9 ? 'var(--s-ur)' : 'var(--s-done)');

export function Risks() {
  const { t } = useI18n();
  const { all } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const risks = [...all!.data.risks].sort((a, b) => Number(b.score) - Number(a.score));
  const openRisks = risks.filter((r) => r.status !== 'Closed');
  const sel = risks.find((r) => r.id === open) ?? null;

  return (
    <div>
      <PageHead title={t('risks')} sub={`${openRisks.length} ${t('riskOpen')}`}>
        <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> {t('newRisk')}</button>
      </PageHead>
      <div className="grid g-home">
        <div className="card" style={{ padding: 6 }}>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>ID</th><th>{t('description')}</th><th>{t('workstream')}</th><th>{t('score')}</th><th>{t('owner')}</th><th>{t('status')}</th></tr></thead>
              <tbody>
                {risks.map((r) => (
                  <tr key={r.id} className="click" onClick={() => setOpen(r.id)}>
                    <td className="id-tag">{r.id}</td>
                    <td style={{ fontWeight: 600, minWidth: 220 }}>{r.description}</td>
                    <td><WsChip ws={String(r.workstream)} short /></td>
                    <td><Chip color={scoreColor(Number(r.score))}>{r.score}</Chip></td>
                    <td className="small">{r.owner}</td>
                    <td className="small">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-title">{t('heatmap')} <span className="sub">{t('likelihood')} × {t('impact')}</span></div>
          <div className="heat">
            {[5, 4, 3, 2, 1].map((imp) => (
              <Heat key={imp} imp={imp} risks={openRisks} onPick={setOpen} />
            ))}
            <div />
            {[1, 2, 3, 4, 5].map((l) => <div key={l} className="ax">{l}</div>)}
          </div>
          <div className="row muted small" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span>↑ {t('impact')}</span><span>{t('likelihood')} →</span>
          </div>
        </div>
      </div>
      <Drawer open={!!sel} onClose={() => setOpen(null)}>{sel && <RiskBody r={sel} onClose={() => setOpen(null)} />}</Drawer>
      <NewItem open={adding} onClose={() => setAdding(false)} entity="risks" />
    </div>
  );
}

function Heat({ imp, risks, onPick }: { imp: number; risks: Row[]; onPick: (id: string) => void }) {
  return (
    <>
      <div className="ax">{imp}</div>
      {[1, 2, 3, 4, 5].map((l) => {
        const here = risks.filter((r) => Number(r.likelihood) === l && Number(r.impact) === imp);
        const c = scoreColor(l * imp);
        return (
          <div key={l} className="cell" title={here.map((r) => `${r.id}: ${r.description}`).join('\n')}
            onClick={() => here[0] && onPick(here[0].id)}
            style={{ background: `color-mix(in srgb, ${c} ${here.length ? 38 : 9}%, transparent)`, cursor: here.length ? 'pointer' : 'default' }}>
            {here.length || ''}
          </div>
        );
      })}
    </>
  );
}

function RiskBody({ r, onClose }: { r: Row; onClose: () => void }) {
  const { t } = useI18n();
  const { all, update } = useStore();
  const s = (f: string) => String(r[f] ?? '');
  const save = (f: string) => (v: string) => update('risks', r, { [f]: v });
  const lv = ['1', '2', '3', '4', '5'];
  return (
    <>
      <DrawerHead onClose={onClose}>
        <div className="row"><span className="id-tag">{r.id}</span><WsChip ws={s('workstream')} /><Chip color={scoreColor(Number(r.score))}>{t('score')} {s('score')}</Chip></div>
        <h3>{s('description')}</h3>
      </DrawerHead>
      <div className="drawer-body">
        <div className="fields">
          <Field label={t('likelihood')} type="select" options={lv} value={s('likelihood')} onSave={save('likelihood')} />
          <Field label={t('impact')} type="select" options={lv} value={s('impact')} onSave={save('impact')} />
          <Field label={t('status')} type="select" options={['Open', 'Monitoring', 'Closed']} translate value={s('status')} onSave={save('status')} />
          <Field label={t('owner')} value={s('owner')} onSave={save('owner')} />
          <Field label={t('workstream')} type="select" options={['All', ...(all!.dropdowns.Workstreams ?? [])]} translate value={s('workstream')} onSave={save('workstream')} />
          <Field label={t('reviewDate')} value={s('reviewDate')} onSave={save('reviewDate')} />
          <Field full label={t('description')} type="textarea" value={s('description')} onSave={save('description')} />
          <Field full label={t('warning')} type="textarea" value={s('warning')} onSave={save('warning')} />
          <Field full label={t('mitigation')} type="textarea" value={s('mitigation')} onSave={save('mitigation')} />
          <Field full label={t('contingency')} type="textarea" value={s('contingency')} onSave={save('contingency')} />
        </div>
      </div>
    </>
  );
}
