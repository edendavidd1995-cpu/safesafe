'use client';
import Link from 'next/link';
import { CATS, ils, off, dateRange, nights, shortRef, daysUntil, steps, dTime } from '@/lib/util';

export function Mark({ size = 30 }) {
  // a safe-deposit dial
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--vault)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#fff" strokeWidth="1.7" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2, r1 = 10.8, r2 = i % 3 === 0 ? 13 : 12;
        return <line key={i} x1={16 + r1 * Math.cos(a)} y1={16 + r1 * Math.sin(a)} x2={16 + r2 * Math.cos(a)} y2={16 + r2 * Math.sin(a)} stroke="#fff" strokeWidth="1.1" />;
      })}
      <line x1="16" y1="16" x2="16" y2="9.5" stroke="var(--signal)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.3" fill="#fff" />
    </svg>
  );
}

const G = {
  hotel: <><rect className="g2" x="5.5" y="7.2" width="6.5" height="4.3" rx="2.1" /><rect x="2" y="4.5" width="2.6" height="15" rx="1.3" /><path d="M4 11.2h14.5a3.5 3.5 0 0 1 3.5 3.5V17H4z" /><rect x="19.4" y="16" width="2.6" height="3.5" rx="1.3" /></>,
  concert: <><rect x="8.3" y="2" width="7.4" height="12.4" rx="3.7" /><path className="g2" d="M5.2 10.6a.9.9 0 0 1 1.8 0 5 5 0 0 0 10 0 .9.9 0 0 1 1.8 0 6.8 6.8 0 0 1-5.9 6.74V20h2.6a.95.95 0 0 1 0 1.9H8.5a.95.95 0 0 1 0-1.9h2.6v-2.66A6.8 6.8 0 0 1 5.2 10.6z" /></>,
  sports: <><circle className="g2" cx="12" cy="12" r="9.6" /><path d="M12 7.2l4.1 3-1.55 4.8h-5.1L7.9 10.2z" /><path className="g3" d="M12 2.4v4.8M21.1 9.2l-5 1M18 19.6l-3.45-4.6M6 19.6l3.45-4.6M2.9 9.2l5 1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  festival: <><path className="g2" d="M12 3.2l9.4 16.3a1 1 0 0 1-.87 1.5H3.47a1 1 0 0 1-.87-1.5z" /><path d="M12 9.5l4.7 11.5H7.3z" /><rect x="11.1" y="1" width="1.8" height="4.5" rx=".9" /><path d="M12.9 1.2l4 1.4-4 1.5z" /></>,
  vacation: <><path className="g2" d="M8.5 6.5V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5h-1.9V5.1h-3.2v1.4z" /><rect x="2.5" y="6.5" width="19" height="14" rx="3" /></>,
  cruise: <><rect className="g2" x="8" y="3" width="6" height="4.5" rx="1" /><path className="g2" d="M5.5 8.2a1.2 1.2 0 0 1 1.2-1.2h10.6a1.2 1.2 0 0 1 1.2 1.2v4H5.5z" /><path d="M2.3 12.5h19.4l-2.6 6.2H4.9z" /><path d="M2 21.2c1.7 0 1.7-1 3.33-1s1.67 1 3.34 1 1.66-1 3.33-1 1.67 1 3.33 1 1.67-1 3.34-1S20.3 21.2 22 21.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  flight: <><path d="M21.2 15.6l-8-4.7V4.6a1.7 1.7 0 0 0-3.4 0v6.3l-7.9 4.7a.9.9 0 0 0-.4.75v1.15l8.3-2.45v4.25l-2.1 1.55a.6.6 0 0 0-.25.5v.9l3.6-1 3.6 1v-.9a.6.6 0 0 0-.25-.5l-2.1-1.55v-4.25l8.3 2.45v-1.15a.9.9 0 0 0-.4-.75z" /></>,
};
export const CAT_HUE = { hotel: 212, concert: 330, sports: 145, festival: 28, vacation: 262, cruise: 190, flight: 245 };
export function Glyph({ cat, size = 22 }) {
  return <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{G[cat] || G.hotel}</svg>;
}
// iOS-style app icon: gradient squircle with a white glyph
export function AppIcon({ cat, size = 44 }) {
  return <span className="appicon" style={{ '--h': CAT_HUE[cat] ?? 250, width: size, height: size }}><Glyph cat={cat} size={Math.round(size * 0.52)} /></span>;
}


// Banknote-style rosette. Deterministic per seed so each certificate is unique.
export function Guilloche({ seed = 'x', className = '', lines = 18 }) {
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = 7 + (h % 5), m = 3 + ((h >> 3) % 4);
  const paths = [];
  for (let k = 0; k < lines; k++) {
    const R = 46 + k * 2.4, a = 6 + (k % 4) * 1.2, ph = (k / lines) * Math.PI * 2 / n;
    let d = '';
    for (let i = 0; i <= 360; i++) {
      const t = (i / 360) * Math.PI * 2;
      const r = R + a * Math.sin(n * t + ph) + 3 * Math.cos(m * t);
      d += (i ? 'L' : 'M') + (120 + r * Math.cos(t)).toFixed(1) + ' ' + (120 + r * Math.sin(t)).toFixed(1);
    }
    paths.push(<path key={k} d={d + 'Z'} />);
  }
  return <svg className={`guilloche ${className}`} viewBox="0 0 240 240" aria-hidden="true" fill="none" strokeWidth=".45">{paths}</svg>;
}

export function Stamp({ small }) {
  return (
    <svg className={`stamp ${small ? 'sm' : ''}`} viewBox="0 0 120 120" aria-label="המסמך נבדק על ידי הצוות" role="img">
      <defs><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" /><feDisplacementMap in="SourceGraphic" scale="2.4" /></filter></defs>
      <g filter="url(#rough)" fill="none" stroke="currentColor">
        <circle cx="60" cy="60" r="56" strokeWidth="3" />
        <circle cx="60" cy="60" r="48" strokeWidth="1.2" strokeDasharray="3 3" />
        <text x="60" y="34" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="700" letterSpacing="2" fontFamily="Rubik, sans-serif">SAFESAFE</text>
        <path d="M42 58l12 12 24-24" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="60" y="96" textAnchor="middle" fill="currentColor" stroke="none" fontSize="17" fontWeight="700" fontFamily="Rubik, sans-serif">נבדק</text>
      </g>
    </svg>
  );
}

export function Ticket({ l, seller }) {
  const c = CATS[l.category] || CATS.hotel;
  const n = nights(l), soon = daysUntil(l.starts_on);
  return (
    <Link href={`/item/?id=${l.id}`} className="ticket" style={{ '--h': l.hue }}>
      <div className="t-main">
        <div className="t-code mono"><span className="t-cat"><Glyph cat={l.category} size={15} />{c.one}</span><span>№ {shortRef(l.id)}</span></div>
        <h3 className="t-title">{l.title}</h3>
        <div className="t-meta"><span>{l.city}{l.region === 'abroad' ? `, ${l.country}` : ''}</span><span className="num">{dateRange(l)}</span></div>
        <div className="t-perf" aria-hidden="true" />
        <div className="t-price">
          <span className="price mono">{ils(l.price)}</span>
          {l.original_price > l.price && <><s className="mono">{ils(l.original_price)}</s><span className="save mono">−{off(l)}%</span></>}
        </div>
        <div className="t-trust">
          {l.doc_verified ? <span className="chip ok">מסמך נבדק</span> : <span className="chip">בבדיקת מסמך</span>}
          {seller && <span className="t-seller">{seller.display_name?.split(' ')[0]}{seller.rating_count ? <> · <b className="mono">★{Number(seller.rating_avg).toFixed(1)}</b></> : ' · מוכר חדש'}</span>}
        </div>
      </div>
      <div className="t-stub">
        {n ? <><b className="mono">{n}</b><span>{n === 1 ? 'לילה' : 'לילות'}</span></> : <><b className="mono">{l.quantity}</b><span>{l.quantity === 1 ? 'כרטיס' : 'כרטיסים'}</span></>}
        {soon <= 14 && soon >= 0 && <em className="t-soon">{soon === 0 ? 'היום' : `בעוד ${soon} ימים`}</em>}
      </div>
    </Link>
  );
}

export function Rail({ order, cat, events = [] }) {
  const S = steps(cat), done = order.step >= 4;
  const when = a => events.find(e => e.action === a)?.created_at;
  const keys = ['paid', 'transferred', 'verified', 'used', 'released'];
  return (
    <ol className={`rail ${order.frozen ? 'frozen' : ''} ${order.refunded ? 'refunded' : ''}`} aria-label="שלבי העסקה">
      {S.map((s, i) => {
        const st = i < order.step || (done && i === 4) ? 'done' : i === order.step && !order.refunded ? 'now' : '';
        const t = when(keys[i]);
        return (
          <li key={i} className={st} title={s.d}>
            <span className="rail-dot mono">{st === 'done' ? '✓' : i + 1}</span>
            <span className="rail-t">{s.t}</span>
            {t && <span className="rail-when mono">{dTime(t)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function Loading({ label = 'טוען' }) { return <div className="loading" role="status"><span className="dial" aria-hidden="true" />{label}…</div>; }
export function Empty({ children }) { return <div className="empty">{children}</div>; }
export function Field({ label, hint, children, id }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}{hint && <small className="hint">{hint}</small>}</div>;
}
