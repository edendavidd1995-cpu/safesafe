'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sb } from '@/lib/supabase';
import { initials, memberSince, dShort, SELLER_COLS } from '@/lib/util';
import { Loading, Empty, Ticket } from '@/components/Bits';

export default function Page() { return <Suspense fallback={<Loading />}><Seller /></Suspense>; }

function Seller() {
  const id = useSearchParams().get('id');
  const [p, setP] = useState(undefined);
  const [rev, setRev] = useState([]);
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!id) return setP(null);
    sb.from('profiles').select('*').eq('id', id).maybeSingle().then(({ data }) => setP(data));
    sb.from('reviews').select('*, author:profiles!reviews_author_id_fkey(display_name)').eq('target_id', id).order('created_at', { ascending: false }).then(({ data }) => setRev(data || []));
    sb.from('listings').select(`*, ${SELLER_COLS}`).eq('seller_id', id).eq('status', 'active').gte('starts_on', new Date().toISOString().slice(0, 10)).then(({ data }) => setItems(data || []));
  }, [id]);
  if (p === undefined) return <Loading />;
  if (!p) return <div className="wrap" style={{ paddingTop: 40 }}><Empty>המשתמש לא נמצא.</Empty></div>;
  return (
    <div className="wrap">
      <div className="page-head" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="avatar lg" style={{ width: 84, height: 84, fontSize: 30 }}>{initials(p.display_name)}</span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>{p.display_name}</h1>
          <div className="meta" style={{ marginTop: 8 }}>{p.city && <span>{p.city}</span>}<span>{memberSince(p.created_at)}</span><span>{p.sales_count} מכירות שהושלמו</span>{p.rating_count > 0 && <span className="mono">★ {Number(p.rating_avg).toFixed(1)} ({p.rating_count})</span>}</div>
          <div className="actions" style={{ marginTop: 10 }}>{p.id_status === 'verified' ? <span className="chip ok">✓ זהות מאומתת</span> : <span className="chip warn">זהות בבדיקה</span>}{p.phone_verified && <span className="chip ok">✓ טלפון מאומת</span>}{p.blocked && <span className="chip bad">חשבון מושעה</span>}</div>
          {p.bio && <p className="muted" style={{ marginTop: 10, maxWidth: '60ch' }}>{p.bio}</p>}
        </div>
      </div>
      {items.length > 0 && <section style={{ marginBottom: 40 }}><h2 style={{ fontSize: 28, marginBottom: 16 }}>מוכר עכשיו</h2><div className="tickets">{items.map(l => <Ticket key={l.id} l={l} seller={l.seller} />)}</div></section>}
      <h2 style={{ fontSize: 28, marginBottom: 16 }}>חוות דעת</h2>
      {rev.length ? <div className="quotes">{rev.map(r => <figure className="quote" key={r.id} style={{ margin: 0 }}><span className="stars">{'★'.repeat(r.stars)}<span style={{ color: 'var(--rule)' }}>{'★'.repeat(5 - r.stars)}</span></span>{r.body && <p>{r.body}</p>}<footer>{r.author?.display_name?.split(' ')[0]} · {dShort(r.created_at)} · עסקה מאומתת</footer></figure>)}</div> : <Empty>עוד אין חוות דעת.</Empty>}
    </div>
  );
}
