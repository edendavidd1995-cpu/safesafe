'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sb } from '@/lib/supabase';
import { CATS, CAT_KEYS, off, SELLER_COLS } from '@/lib/util';
import { Ticket, Glyph, Loading, Empty } from '@/components/Bits';

export default function Page() { return <Suspense fallback={<Loading />}><Search /></Suspense>; }

function Search() {
  const sp = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState(null);
  const cat = sp.get('cat') || '';
  const [q, setQ] = useState(sp.get('q') || '');
  const [region, setRegion] = useState(sp.get('region') || 'all');
  const [sort, setSort] = useState('soon');
  const [maxPrice, setMaxPrice] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    sb.from('listings').select(`*, ${SELLER_COLS}`).eq('status', 'active').gte('starts_on', today)
      .then(({ data }) => setItems(data || []));
  }, []);

  const setCat = k => { const p = new URLSearchParams(sp.toString()); k ? p.set('cat', k) : p.delete('cat'); router.replace('/search/?' + p.toString(), { scroll: false }); };

  const list = useMemo(() => {
    if (!items) return null;
    const t = q.trim().toLowerCase();
    let r = items.filter(l => (!cat || l.category === cat) && (region === 'all' || l.region === region)
      && (!t || [l.title, l.city, l.country, l.venue, l.details].join(' ').toLowerCase().includes(t))
      && (!maxPrice || l.price <= +maxPrice) && (!verifiedOnly || l.doc_verified));
    const s = { soon: (a, b) => a.starts_on.localeCompare(b.starts_on), cheap: (a, b) => a.price - b.price, save: (a, b) => off(b) - off(a), new: (a, b) => b.created_at.localeCompare(a.created_at) }[sort];
    return r.sort(s);
  }, [items, q, cat, region, sort, maxPrice, verifiedOnly]);

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">{list ? `${list.length} פריטים זמינים` : 'טוען'}</span>
        <h1>{cat ? CATS[cat].he : 'כל הפריטים'}</h1>
      </div>
      <div className="filters" role="group" aria-label="קטגוריה">
        <button className="fchip" aria-pressed={!cat} onClick={() => setCat('')}>הכל</button>
        {CAT_KEYS.map(k => <button key={k} className="fchip" aria-pressed={cat === k} onClick={() => setCat(k)}><Glyph cat={k} size={16} />{CATS[k].he}</button>)}
      </div>
      <div className="filters">
        <input type="search" placeholder="חיפוש חופשי" value={q} onChange={e => setQ(e.target.value)} aria-label="חיפוש חופשי" />
        <select value={region} onChange={e => setRegion(e.target.value)} aria-label="אזור"><option value="all">בארץ ובחו״ל</option><option value="il">בארץ</option><option value="abroad">בחו״ל</option></select>
        <input type="number" inputMode="numeric" placeholder="מחיר עד ₪" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} aria-label="מחיר מקסימלי" style={{ width: 140 }} />
        <label className="check" style={{ fontSize: 14 }}><input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />רק מסמך שנבדק</label>
        <span className="grow" />
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="מיון">
          <option value="soon">הקרובים ביותר</option><option value="cheap">המחיר הנמוך</option><option value="save">ההנחה הגדולה</option><option value="new">פורסמו לאחרונה</option>
        </select>
      </div>
      {list === null ? <Loading /> : list.length
        ? <div className="tickets">{list.map(l => <Ticket key={l.id} l={l} seller={l.seller} />)}</div>
        : <Empty>{CATS[cat]?.soon ? 'טיסות יתווספו בשלב הבא. בינתיים אפשר לפרסם כרטיס טיסה שניתן להעברה.' : 'לא מצאנו פריטים שמתאימים לחיפוש. נסו להרחיב את הסינון.'}</Empty>}
    </div>
  );
}
