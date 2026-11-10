'use client';
import Link from 'next/link';
import { CATS, ils, off, dateRange, nights, shortRef, daysUntil, steps, dTime } from '@/lib/util';

export function Mark({ size = 30 }) {
  // a safe-deposit dial
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--ink)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--paper)" strokeWidth="1.6" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2, r1 = 10.8, r2 = i % 3 === 0 ? 13 : 12;
        return <line key={i} x1={16 + r1 * Math.cos(a)} y1={16 + r1 * Math.sin(a)} x2={16 + r2 * Math.cos(a)} y2={16 + r2 * Math.sin(a)} stroke="var(--paper)" strokeWidth="1.1" />;
      })}
      <line x1="16" y1="16" x2="16" y2="9.5" stroke="var(--signal)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.2" fill="var(--paper)" />
    </svg>
  );
}

const G = {
  hotel: <><path d="M3 18v-7h18v7M3 14h18M6 11V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /><path d="M3 18v2M21 18v2" /></>,
  vacation: <><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M9 8V5h6v3M4 13h16" /></>,
  concert: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>,
  sports: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5l4 3-1.5 4.5h-5L8 10.5z" /><path d="M12 3.5v4M20 10l-4 .5M17 19l-2.5-4M7 19l2.5-4M4 10l4 .5" /></>,
  festival: <><path d="M3 20L12 4l9 16z" /><path d="M12 4v16M8.5 20l3.5-6 3.5 6" /></>,
  cruise: <><path d="M3 15l2 5h14l2-5z" /><path d="M6 15V9h12v6M9 9V6h6v3" /><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1" /></>,
  flight: <><path d="M21 15.5l-8-4.5V5a1.5 1.5 0 0 0-3 0v6l-7 4.5v2l7-2v4l-2 1.5V22l3.5-1 3.5 1v-1l-2-1.5v-4l7 2z" /></>,
};
export function Glyph({ cat, size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">{G[cat] || G.hotel}</svg>;
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
