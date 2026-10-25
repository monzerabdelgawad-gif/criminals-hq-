import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { Avatar } from './ui';

const MAX_CHARS = 45000; // must match MAX_PHOTO_CHARS_ in Code.gs

/** Center-crop to a square and shrink to a small JPEG data URL that fits in one sheet cell. */
export async function toProfilePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
    for (const [px, q] of [[200, 0.85], [160, 0.8], [128, 0.75], [96, 0.7]] as const) {
      const c = document.createElement('canvas');
      c.width = c.height = px;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, px, px); // transparent PNGs get a dark background
      ctx.drawImage(img, sx, sy, side, side, 0, 0, px, px);
      const data = c.toDataURL('image/jpeg', q);
      if (data.length <= MAX_CHARS) return data;
    }
    throw new Error('too_big');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Big avatar with "change / remove photo" for your own profile; read-only for everyone else. */
export function PhotoPicker({ name, value, editable, onChange }: {
  name: string; value: string; editable: boolean; onChange: (dataUrl: string) => Promise<unknown>;
}) {
  const { t } = useI18n();
  const { toast } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast(t('badPhoto'), 'err'); return; }
    setBusy(true);
    try { await onChange(await toProfilePhoto(f)); toast(t('photoSaved'), 'ok'); }
    catch { toast(t('badPhoto'), 'err'); }
    finally { setBusy(false); }
  };

  return (
    <div className="photo-picker">
      <div style={{ opacity: busy ? 0.4 : 1, transition: 'opacity .2s' }}>
        <Avatar name={name} src={value || undefined} size={92} />
      </div>
      {editable && (
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <button type="button" className="btn sm primary" disabled={busy} onClick={() => input.current?.click()}>
            <Camera size={14} /> {busy ? t('saving') : t('changePhoto')}
          </button>
          {value && !value.startsWith('https://') && (
            <button type="button" className="btn sm ghost" disabled={busy} onClick={() => onChange('')}>
              <Trash2 size={14} /> {t('removePhoto')}
            </button>
          )}
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      )}
    </div>
  );
}
