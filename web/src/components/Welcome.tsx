import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useI18n } from '../i18n';
import { getPicture, useDisplayName, useMyRow, useStore } from '../store';
import { RolesPicker } from '../pages/Team';
import { Avatar, Chip } from './ui';

const seenKey = (email: string) => `criminals.welcomed.${email.toLowerCase()}`;

/** Shown once per member per device, right after their first sign-in. */
export function Welcome() {
  const { t, v } = useI18n();
  const { all, update } = useStore();
  const dn = useDisplayName();
  const mine = useMyRow();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState('');

  const email = all?.me.email ?? '';
  useEffect(() => {
    if (!email) return;
    try { if (!localStorage.getItem(seenKey(email))) setOpen(true); } catch { /* storage blocked: skip */ }
  }, [email]);
  useEffect(() => { setRoles(String(mine?.taskRoles ?? '')); }, [mine?.taskRoles]);

  if (!all) return null;
  const me = all.me;
  const users = all.data.users;
  const idx = mine ? users.indexOf(mine) + 1 : 0;

  const finish = async () => {
    try { localStorage.setItem(seenKey(email), '1'); } catch { /* */ }
    setOpen(false);
    if (mine && roles !== String(mine.taskRoles ?? '')) await update('users', mine, { taskRoles: roles });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="modal welcome" initial={{ opacity: 0, scale: 0.94, x: '-50%', y: '-46%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-48%' }}>
            <div className="welcome-head">
              <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}>
                <Avatar name={dn(me.name)} src={getPicture()} size={84} />
              </motion.div>
              <div className="muted small" style={{ fontWeight: 600, marginTop: 14 }}>{t('welcomeTitle')} 🔴</div>
              <h2 className="welcome-name"><bdi>{dn(me.name)}</bdi></h2>
              <div className="muted">{t('welcomeSub')}</div>
              <div className="muted small" style={{ marginTop: 4 }}>{me.email}</div>
              <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 14 }}>
                <Chip color={me.teamRole === 'Instructor' ? 'var(--accent-2)' : 'var(--accent)'}>{v(me.teamRole || 'Student')}</Chip>
                {idx > 0 && <Chip>{t('memberNo')} #{idx} {t('ofTeam')} {users.length}</Chip>}
                <Chip>FLL BIOGLOW 2026–27</Chip>
              </div>
            </div>

            {mine && (
              <div className="welcome-roles">
                <div style={{ fontWeight: 700 }}>{t('pickRoles')}</div>
                <div className="muted small" style={{ margin: '4px 0 10px' }}>{t('pickRolesSub')}</div>
                <RolesPicker value={roles} onChange={setRoles} />
              </div>
            )}

            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }} onClick={finish}>
              {t('letsGo')} 🚀
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
