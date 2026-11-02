/**
 * Light "3D" pieces built with CSS transforms (no WebGL, so they stay fast on phones):
 *  - Mark3D: the C10 mark extruded into a solid badge that follows the pointer
 *  - Tilt: a card that leans toward the pointer
 *  - Flap: a split-flap counter whose digits flip when they change
 * All of them sit still when the person has "reduce motion" turned on.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mark } from './Brand';
import { cls } from '../util';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/** The C10 mark as a solid, extruded badge. Leans toward the mouse, sways gently when idle, can be dragged on touch. */
export function Mark3D({ size = 180, depth = 14 }: { size?: number; depth?: number }) {
  const rot = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rot.current;
    if (!el) return;
    el.style.transform = 'rotateX(8deg) rotateY(-22deg)';
    if (reduced()) return;
    let raf = 0;
    let tx = 0, ty = 0, x = 0, y = 0;
    let last = performance.now() - 5000;
    const onMove = (e: PointerEvent) => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      ty = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2))) * 38;
      tx = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2))) * -24;
      last = performance.now();
    };
    const tick = (now: number) => {
      // after 2.5s without movement, drift back into a slow idle sway
      if (now - last > 2500) { ty = Math.sin(now / 1600) * 26; tx = Math.sin(now / 2300) * 8 + 6; }
      x += (tx - x) * 0.07; y += (ty - y) * 0.07;
      el.style.transform = `rotateX(${x.toFixed(2)}deg) rotateY(${y.toFixed(2)}deg)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, []);

  const layers = Array.from({ length: depth });
  return (
    <div className="m3d" ref={wrap} style={{ width: size, height: size * 0.83 }} aria-hidden>
      <div className="m3d-rot" ref={rot} style={{ width: size, height: size * 0.83 }}>
        {layers.map((_, i) => (
          <div key={i} className={cls('m3d-layer', i === depth - 1 && 'front')}
            style={{ transform: `translateZ(${(i - depth / 2) * 1.6}px)`, opacity: i === depth - 1 ? 1 : 0.55 + (i / depth) * 0.45 }}>
            <Mark size={size} />
          </div>
        ))}
        <div className="m3d-shadow" />
      </div>
    </div>
  );
}

/** A card that leans toward the pointer (desktop only). Children with class "pop" float above the surface. */
export function Tilt({ children, className, max = 7, onClick, style }: { children: ReactNode; className?: string; max?: number; onClick?: () => void; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !finePointer() || reduced()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg) translateZ(0)`;
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <div ref={ref} className={cls('card tilt', className)} onPointerMove={move} onPointerLeave={leave} onClick={onClick} style={style}>
      <div className="tilt-glare" />
      {children}
    </div>
  );
}

/** Split-flap counter: "128" or "02:14:09". Each digit flips over when it changes. */
export function Flap({ value, size = 'md', units }: { value: string; size?: 'sm' | 'md' | 'lg'; units?: string[] }) {
  const groups = value.split(':');
  return (
    <div className={cls('flap', size)} role="timer" aria-label={value}>
      {groups.map((g, gi) => (
        <div key={gi} className="flap-group-wrap">
          {gi > 0 && <span className="flap-sep">:</span>}
          <div className="flap-group">
            <div className="flap-cells">
              {g.split('').map((c, i) => (
                <span key={i} className="flap-cell">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span key={c} initial={reduced() ? false : { rotateX: -90, opacity: 0.2 }} animate={{ rotateX: 0, opacity: 1 }}
                      exit={{ rotateX: 90, opacity: 0 }} transition={{ duration: 0.38, ease: [0.3, 0.7, 0.3, 1] }}>
                      {c}
                    </motion.span>
                  </AnimatePresence>
                </span>
              ))}
            </div>
            {units?.[gi] && <div className="flap-unit">{units[gi]}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
