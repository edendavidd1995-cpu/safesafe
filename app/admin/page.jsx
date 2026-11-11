'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { sb, errText } from '@/lib/supabase';
import { ils, num, dateRange, dShort, dTime, orderStatus, steps, CATS, ACTION_HE, FLAG_HE, off, daysUntil, initials, ago, feeSplit } from '@/lib/util';
import { useApp } from '@/components/App';
import { Loading, Empty, Glyph } from '@/components/Bits';

const TABS = [['overview', 'סקירה'], ['review', 'מודעות לבדיקה'], ['listings', 'מודעות פעילות'], ['orders', 'עסקאות'], ['disputes', 'מחלוקות'], ['users', 'משתמשים'], ['support', 'פניות תמיכה'], ['log', 'יומן פעולות'], ['settings', 'הגדרות ועמלה']];
const REJECT = ['האסמכתא לא תואמת לפרטים', 'הפריט לא ניתן להעברה לפי תנאי הספק', 'מחיר גבוה ממה ששולם', 'מסמך שכבר הועלה בעבר', 'חשד להונאה', 'פרטים חסרים'];

export default function Page() { return <Suspense fallback={<Loading />}><Admin /></Suspense>; }

function Admin() {
  const { user, isAdmin, profile, toast, refreshStats } = useApp();
  const tab = useSearchParams().get('tab') || 'overview';
  const [d, setD] = useState(null);

  const load = useCallback(async () => {
    const O = '*, listing:listings(*), buyer:profiles!orders_buyer_id_fkey(id,display_name), seller:profiles!orders_seller_id_fkey(id,display_name,id_status)';
    const [l, o, ds, u, s, lg, docs] = await Promise.all([
      sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(*)').order('created_at', { ascending: false }),
      sb.from('orders').select(O).order('created_at', { ascending: false }),
      sb.from('disputes').select('*').order('created_at', { ascending: false }),
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('support_messages').select('*, who:profiles!support_messages_thread_user_fkey(display_name)').order('created_at'),
      sb.from('audit_log').select('*, actor:profiles!audit_log_actor_id_fkey(display_name)').order('created_at', { ascending: false }).limit(200),
      sb.from('documents').select('*').order('created_at', { ascending: false }),
    ]);
    setD({ listings: l.data || [], orders: o.data || [], disputes: ds.data || [], users: u.data || [], support: s.data || [], log: lg.data || [], docs: docs.data || [] });
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (user === undefined || (user && !profile)) return <Loading />;
  if (!isAdmin) return <div className="wrap" style={{ paddingTop: 40 }}><Empty>הדף הזה מיועד לצוות SafeSafe בלבד.</Empty></div>;
  if (!d) return <Loading label="טוען נתוני מערכת" />;

  const run = async (fn, args, msg) => { const { error } = await sb.rpc(fn, args); if (error) { toast(errText(error), 'bad'); return false; } toast(msg, 'ok'); refreshStats(); load(); return true; };
  const queue = d.listings.filter(l => l.status === 'pending_review');
  const open = d.disputes.filter(x => x.status === 'open');
  const idq = d.users.filter(u => u.id_status === 'pending');
  const unread = new Set(d.support.filter(m => !m.from_staff).map(m => m.thread_user));
  const lastStaff = {}; d.support.forEach(m => { if (m.from_staff) lastStaff[m.thread_user] = m.created_at; });
  const waiting = [...unread].filter(u => { const last = d.support.filter(m => m.thread_user === u).at(-1); return last && !last.from_staff; });
  const cnt = { listings: d.listings.filter(l => l.promoted && l.status === 'active').length, review: queue.length + idq.length, disputes: open.length, support: waiting.length, orders: d.orders.filter(o => flags(o).some(f => f[0] !== 'ok')).length };
  const ctx = { d, run, load, queue, open, idq, waiting };

  return (
    <div className="wrap dash">
      <nav className="side" aria-label="פאנל ניהול">
        <div className="me-id"><span className="avatar lg" style={{ background: 'var(--ink)' }}>⚙</span><div><b>פאנל ניהול</b><small>צוות SafeSafe</small></div></div>
        {TABS.map(([k, t]) => <Link key={k} href={`/admin/?tab=${k}`} aria-current={tab === k ? 'page' : undefined}><span>{t}</span>{cnt[k] ? <span className={`pill ${['review', 'disputes', 'support'].includes(k) ? 'hot' : ''}`}>{cnt[k]}</span> : null}</Link>)}
      </nav>
      <div className="dash-main">
        {tab === 'overview' && <Overview {...ctx} />}
        {tab === 'review' && <Review {...ctx} />}
        {tab === 'orders' && <Orders {...ctx} />}
        {tab === 'disputes' && <Disputes {...ctx} />}
        {tab === 'users' && <Users {...ctx} />}
        {tab === 'support' && <SupportAdmin {...ctx} />}
        {tab === 'log' && <Log {...ctx} />}
        {tab === 'listings' && <ActiveListings {...ctx} />}
        {tab === 'settings' && <Settings />}
      </div>
    </div>
  );
}

function flags(o) {
  const l = o.listing, f = []; if (!l || o.refunded || o.step >= 4) return f;
  const until = daysUntil(l.starts_on), age = (Date.now() - new Date(o.created_at)) / 864e5;
  if (o.frozen) f.push(['bad', o.frozen_reason || 'מוקפא']);
  if (o.step === 0 && age >= 2) f.push(['bad', `המוכר לא העביר כבר ${Math.floor(age)} ימים`]);
  if (o.step < 2 && until <= 3 && until >= 0) f.push(['warn', 'קרוב לתאריך ועוד לא אומת']);
  if (until < 0 && o.step < 3) f.push(['warn', 'התאריך עבר בלי אישור שימוש']);
  if (o.step === 3) f.push(['ok', 'ממתין לשחרור']);
  return f;
}

function Overview({ d, queue, open, idq, waiting }) {
  const live = d.orders.filter(o => !o.refunded && o.step < 4);
  const done = d.orders.filter(o => !o.refunded && o.step >= 4);
  const att = d.orders.filter(o => flags(o).some(f => f[0] !== 'ok'));
  const month = done.filter(o => new Date(o.released_at) > new Date(Date.now() - 30 * 864e5));
  return <>
    <div><h1>בוקר טוב</h1><p className="muted">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })} · זה מה שמחכה לטיפול.</p></div>
    <div className="stats">
      <div className="stat vault"><small>כסף בנאמנות כרגע</small><b className="mono">{ils(live.reduce((a, o) => a + o.price, 0))}</b><small>{live.length} עסקאות פתוחות</small></div>
      <div className="stat"><small>הכנסות מעמלות (מצטבר)</small><b className="mono">{ils(done.reduce((a, o) => a + o.fee, 0))}</b></div>
      <div className="stat"><small>עמלות ב-30 יום</small><b className="mono">{ils(month.reduce((a, o) => a + o.fee, 0))}</b></div>
      <div className="stat"><small>מחזור עסקאות</small><b className="mono">{ils(d.orders.filter(o => !o.refunded).reduce((a, o) => a + o.price, 0))}</b></div>
      <div className="stat"><small>מודעות פעילות</small><b className="mono">{num(d.listings.filter(l => l.status === 'active').length)}</b></div>
      <div className="stat"><small>משתמשים</small><b className="mono">{num(d.users.length)}</b></div>
    </div>
    <section className="card"><h3 style={{ marginBottom: 8 }}>דורש טיפול</h3>
      {queue.length > 0 && <div className="todo"><span><span className="chip warn">בדיקה</span> {queue.length} מודעות מחכות לאישור</span><Link className="btn sm ghost" href="/admin/?tab=review">לבדיקה</Link></div>}
      {idq.length > 0 && <div className="todo"><span><span className="chip warn">זהות</span> {idq.length} תעודות מזהות לאימות</span><Link className="btn sm ghost" href="/admin/?tab=review">לאימות</Link></div>}
      {open.map(x => { const o = d.orders.find(y => y.id === x.order_id); return <div className="todo" key={x.id}><span><span className="chip bad">מחלוקת</span> {o?.listing?.title}: {o?.buyer?.display_name} מול {o?.seller?.display_name}</span><Link className="btn sm ghost" href="/admin/?tab=disputes">להכרעה</Link></div>; })}
      {att.filter(o => !o.frozen).map(o => <div className="todo" key={o.id}><span><span className={`chip ${flags(o)[0][0]}`}>{flags(o)[0][1]}</span> {o.listing.title} · {o.ref}</span><Link className="btn sm ghost" href={`/order/?id=${o.id}`}>לעסקה</Link></div>)}
      {waiting.length > 0 && <div className="todo"><span><span className="chip signal">תמיכה</span> {waiting.length} פניות ממתינות לתשובה</span><Link className="btn sm ghost" href="/admin/?tab=support">למענה</Link></div>}
      {!queue.length && !idq.length && !open.length && !att.length && !waiting.length && <p className="muted">אין כרגע משהו שמחכה.</p>}
    </section>
  </>;
}

function DocLinks({ docs }) {
  const openDoc = async p => { const { data, error } = await sb.storage.from('documents').createSignedUrl(p, 120); if (!error) window.open(data.signedUrl, '_blank', 'noopener'); };
  if (!docs.length) return <span className="muted" style={{ fontSize: 14 }}>לא צורפו מסמכים</span>;
  return <div className="actions">{docs.map(x => <button key={x.id} className="btn sm ghost" onClick={() => openDoc(x.path)}>{x.duplicate_of ? '⚠ ' : ''}{x.file_name || 'מסמך'}</button>)}</div>;
}

function Review({ d, run, queue, idq }) {
  const [rej, setRej] = useState(null);
  const [why, setWhy] = useState(REJECT[0]);
  return <>
    <h1>בדיקת מודעות וזהויות</h1>
    <p className="muted" style={{ marginTop: -8 }}>מודעה מתפרסמת רק אחרי אישור. הבדיקות האוטומטיות עוזרות, ההחלטה שלך.</p>
    {idq.length > 0 && <section className="card stack"><h3>תעודות מזהות לאימות</h3>
      {idq.map(u => <div className="lrow" key={u.id}><span className="avatar">{initials(u.display_name)}</span><div className="grow"><b>{u.display_name}</b><span className="muted">{u.city || ''} · נרשם {ago(u.created_at)}</span><DocLinks docs={d.docs.filter(x => x.owner_id === u.id && x.kind === 'identity')} /></div>
        <div className="end"><button className="btn sm vault" onClick={() => run('admin_set_user', { p_user: u.id, p_field: 'id_status', p_value: 'verified' }, 'הזהות אומתה')}>אימות</button><button className="btn sm danger" onClick={() => run('admin_set_user', { p_user: u.id, p_field: 'id_status', p_value: 'rejected' }, 'נדחה')}>דחייה</button></div></div>)}
    </section>}
    {queue.length ? queue.map(l => {
      const s = l.seller || {}, docs = d.docs.filter(x => x.listing_id === l.id), until = daysUntil(l.starts_on);
      const ck = [
        [docs.some(x => x.kind === 'booking'), docs.some(x => x.kind === 'booking') ? 'צורפה אסמכתא' : 'לא צורפה אסמכתא'],
        [!l.flags.includes('duplicate_document') && !docs.some(x => x.duplicate_of), 'המסמך לא הועלה בעבר', 'n', 'מסמך זהה כבר הועלה בעבר'],
        [l.price <= l.original_price, l.price <= l.original_price ? `מחיר מתחת למקור (${off(l)}% הנחה)` : `מחיר מעל המקור (${ils(l.price)} מול ${ils(l.original_price)})`],
        [until > 2, until > 2 ? `בעוד ${until} ימים` : `בעוד ${Math.max(0, until)} ימים בלבד`],
        [s.id_status === 'verified', s.id_status === 'verified' ? 'זהות המוכר אומתה' : 'זהות המוכר עוד לא אומתה', 'i'],
        [s.phone_verified, s.phone_verified ? 'טלפון מאומת' : 'טלפון לא מאומת', 'i'],
      ];
      const bad = ck.filter(c => !c[0] && c[2] !== 'i').length;
      return (
        <article className="order" key={l.id}>
          <div className="order-head"><div><span className="kicker" style={{ margin: 0 }}>{CATS[l.category].one} · הוגש {ago(l.created_at)}</span><h3>{l.title}, {l.city}</h3>
            <div className="meta"><span className="num">{dateRange(l)}</span><span>{l.details}</span><span>מוכר: {s.display_name} · {s.sales_count} מכירות</span><span>נרכש: {l.provider}</span></div></div>
            <div className="actions"><span className="chip mono">{ils(l.price)}</span>{bad ? <span className="chip bad">{bad} בעיות</span> : <span className="chip ok">כל הבדיקות עברו</span>}{l.info_requested && <span className="chip warn">נשלחה בקשה למוכר</span>}</div></div>
          <ul className="ck">{ck.map((c, i) => <li key={i} className={c[0] ? 'y' : c[2] === 'i' ? 'i' : 'n'}><i>{c[0] ? '✓' : c[2] === 'i' ? 'i' : '✕'}</i>{!c[0] && c[3] ? c[3] : c[1]}</li>)}</ul>
          <DocLinks docs={docs} />
          {l.reason && <p className="muted">סיבה: {l.reason}</p>}
          {rej === l.id ? <div className="actions"><select value={why} onChange={e => setWhy(e.target.value)} style={{ width: 'auto' }} aria-label="סיבת דחייה">{REJECT.map(r => <option key={r}>{r}</option>)}</select>
            <button className="btn sm danger" onClick={async () => { if (await run('admin_review_listing', { p_listing: l.id, p_action: 'reject', p_reason: why }, 'נדחה והמוכר עודכן')) setRej(null); }}>דחייה</button><button className="btn sm ghost" onClick={() => setRej(null)}>ביטול</button></div>
            : <div className="actions"><button className="btn sm vault" onClick={() => run('admin_review_listing', { p_listing: l.id, p_action: 'approve' }, 'אושר ופורסם')}>אישור ופרסום</button><button className="btn sm ghost" onClick={() => run('admin_review_listing', { p_listing: l.id, p_action: 'request_info' }, 'נשלחה בקשה למוכר')}>בקשת אישור מהספק</button><button className="btn sm danger" onClick={() => setRej(l.id)}>דחייה</button></div>}
        </article>);
    }) : <Empty>אין מודעות שמחכות לבדיקה.</Empty>}
  </>;
}

function Orders({ d, run }) {
  const [f, setF] = useState('all');
  let list = d.orders;
  if (f === 'att') list = list.filter(o => flags(o).some(x => x[0] !== 'ok'));
  if (f === 'open') list = list.filter(o => !o.refunded && o.step < 4);
  if (f === 'done') list = list.filter(o => o.refunded || o.step >= 4);
  return <>
    <h1>כל העסקאות</h1>
    <div className="filters" style={{ margin: 0 }}>{[['all', 'הכל'], ['att', 'דורש טיפול'], ['open', 'בנאמנות'], ['done', 'הסתיימו']].map(([k, t]) => <button key={k} className="fchip" aria-pressed={f === k} onClick={() => setF(k)}>{t}</button>)}</div>
    <section className="card"><div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>עסקה</th><th>פריט</th><th>תאריך</th><th>קונה → מוכר</th><th>סכום</th><th>שלב</th><th>סטטוס</th><th>פעולות</th></tr></thead>
      <tbody>{list.map(o => {
        const l = o.listing, st = orderStatus(o), fl = flags(o), live = !o.refunded && o.step < 4;
        return <tr key={o.id}>
          <td><Link className="mono" href={`/order/?id=${o.id}`}>{o.ref}</Link></td>
          <td><b>{l?.title}</b><div className="muted" style={{ fontSize: 13 }}>{l?.city}</div></td>
          <td className="num">{l && dShort(l.starts_on)}</td>
          <td>{o.buyer?.display_name} → {o.seller?.display_name}</td>
          <td className="mono">{ils(o.price)}</td>
          <td>{l && steps(l.category)[Math.min(o.step, 4)].t}</td>
          <td><div className="actions">{fl.length ? fl.map((x, i) => <span key={i} className={`chip ${x[0]}`}>{x[1]}</span>) : <span className={`chip ${st.tone}`}>{st.t}</span>}</div></td>
          <td><div className="actions">{live && <>
            {!o.frozen && o.step === 1 && <button className="btn sm" onClick={() => run('advance_order', { p_order: o.id }, 'סומן: אומת מול הספק')}>אימתתי מול הספק</button>}
            {!o.frozen && o.step === 3 && <button className="btn sm vault" onClick={() => run('advance_order', { p_order: o.id }, 'הכסף שוחרר')}>שחרור</button>}
            {o.frozen ? <button className="btn sm ghost" onClick={() => run('admin_freeze_order', { p_order: o.id, p_freeze: false }, 'העצירה הוסרה')}>הסרת עצירה</button>
              : <button className="btn sm danger" onClick={() => { const r = prompt('סיבת העצירה:', 'חשד שנבדק'); r && run('admin_freeze_order', { p_order: o.id, p_freeze: true, p_reason: r }, 'העסקה נעצרה'); }}>עצירה</button>}
            <button className="btn sm danger" onClick={() => { const r = prompt(`להחזיר ${o.price} ₪ לקונה? כתבו נימוק:`); r && run('admin_refund', { p_order: o.id, p_note: r }, 'הוחזר לקונה'); }}>החזר</button>
          </>}</div></td>
        </tr>;
      })}</tbody>
    </table></div></section>
  </>;
}

function Disputes({ d, run, open }) {
  const [note, setNote] = useState({});
  const [amt, setAmt] = useState({});
  return <>
    <h1>מחלוקות</h1>
    <p className="muted" style={{ marginTop: -8 }}>כל עוד מחלוקת פתוחה הכסף מוקפא. כל הכרעה נרשמת ביומן ונשלחת לשני הצדדים עם הנימוק.</p>
    {open.length ? open.map(x => {
      const o = d.orders.find(y => y.id === x.order_id); if (!o) return null;
      const docs = d.docs.filter(z => z.order_id === o.id);
      const go = (kind) => run('admin_resolve_dispute', { p_dispute: x.id, p_kind: kind, p_note: note[x.id] || '', p_amount: kind === 'partial' ? +(amt[x.id] || 0) : null }, 'ההכרעה נשמרה');
      return (
        <article className="order" key={x.id} style={{ borderColor: 'var(--bad)' }}>
          <div className="order-head"><div><h3>{o.listing.title}, {o.listing.city}</h3><div className="meta"><span className="mono">{o.ref}</span><span className="mono">{ils(o.price)} מוקפאים</span><span>נפתחה {ago(x.created_at)}</span></div></div><span className="chip bad">מוקפא</span></div>
          <div className="sides">
            <div className="side-box"><small>{x.opened_by === o.buyer_id ? 'קונה' : 'מוכר'} · {x.opened_by === o.buyer_id ? o.buyer?.display_name : o.seller?.display_name}</small><p>{x.claim}</p></div>
            <div className="side-box"><small>{x.opened_by === o.buyer_id ? 'מוכר' : 'קונה'} · {x.opened_by === o.buyer_id ? o.seller?.display_name : o.buyer?.display_name}</small><p>{x.response || <span className="muted">עוד לא הגיב.</span>}</p></div>
          </div>
          <DocLinks docs={docs} />
          <div className="row2">
            <div className="field"><label htmlFor={'n' + x.id}>נימוק ההכרעה (חובה)</label><input id={'n' + x.id} value={note[x.id] || ''} onChange={e => setNote({ ...note, [x.id]: e.target.value })} placeholder="למשל: המוכר לא הציג אישור מהמלון על שינוי השם" /></div>
            <div className="field"><label htmlFor={'a' + x.id}>סכום להחזר חלקי (₪)</label><input id={'a' + x.id} type="number" className="mono" value={amt[x.id] || ''} onChange={e => setAmt({ ...amt, [x.id]: e.target.value })} placeholder={`עד ${o.price - 1}`} /></div>
          </div>
          <div className="actions"><button className="btn sm vault" onClick={() => go('seller')}>שחרור מלא למוכר</button><button className="btn sm ghost" onClick={() => go('partial')}>החזר חלקי לקונה</button><button className="btn sm danger" onClick={() => go('buyer')}>החזר מלא לקונה</button></div>
        </article>);
    }) : <Empty>אין מחלוקות פתוחות.</Empty>}
  </>;
}

function Users({ d, run }) {
  const [q, setQ] = useState('');
  const list = d.users.filter(u => !q || u.display_name.includes(q) || (u.city || '').includes(q));
  return <>
    <h1>משתמשים</h1>
    <input type="search" placeholder="חיפוש לפי שם או עיר" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 360 }} aria-label="חיפוש משתמש" />
    <section className="card"><div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>משתמש</th><th>הצטרף</th><th>זהות</th><th>טלפון</th><th>מכירות</th><th>דירוג</th><th>מצב</th><th></th></tr></thead>
      <tbody>{list.map(u => <tr key={u.id}>
        <td><Link href={`/seller/?id=${u.id}`}><b>{u.display_name}</b></Link>{u.role === 'admin' && <span className="chip" style={{ marginInlineStart: 6 }}>מנהל</span>}<div className="muted" style={{ fontSize: 13 }}>{u.city}</div></td>
        <td className="num">{dShort(u.created_at)}</td>
        <td><span className={`chip ${{ verified: 'ok', pending: 'warn', rejected: 'bad' }[u.id_status] || ''}`}>{{ verified: 'מאומת', pending: 'בבדיקה', rejected: 'נדחה', none: 'לא הועלה' }[u.id_status]}</span></td>
        <td>{u.phone_verified ? '✓' : '—'}</td>
        <td className="mono">{u.sales_count}</td>
        <td className="mono">{u.rating_count ? `★${Number(u.rating_avg).toFixed(1)}` : '—'}</td>
        <td>{u.blocked ? <span className="chip bad">חסום</span> : <span className="chip ok">פעיל</span>}</td>
        <td>{u.role !== 'admin' && (u.blocked ? <button className="btn sm ghost" onClick={() => run('admin_set_user', { p_user: u.id, p_field: 'blocked', p_value: 'false' }, 'החסימה הוסרה')}>שחרור</button>
          : <button className="btn sm danger" onClick={() => confirm(`לחסום את ${u.display_name}? המודעות שלו יורדו.`) && run('admin_set_user', { p_user: u.id, p_field: 'blocked', p_value: 'true' }, 'המשתמש נחסם')}>חסימה</button>)}</td>
      </tr>)}</tbody>
    </table></div></section>
  </>;
}

function SupportAdmin({ d, load }) {
  const { user, toast } = useApp();
  const threads = [...new Set(d.support.map(m => m.thread_user))];
  const [sel, setSel] = useState(threads[0] || null);
  const [t, setT] = useState('');
  const msgs = d.support.filter(m => m.thread_user === sel);
  const send = async e => {
    e.preventDefault(); if (!t.trim()) return;
    const { error } = await sb.from('support_messages').insert({ thread_user: sel, sender_id: user.id, from_staff: true, body: t.trim() });
    if (error) return toast(errText(error), 'bad'); setT(''); load();
  };
  return <>
    <h1>פניות תמיכה</h1>
    {threads.length ? <div className="row2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', alignItems: 'start' }}>
      <section className="card rows" style={{ padding: 12 }}>{threads.map(u => { const last = d.support.filter(m => m.thread_user === u).at(-1); return (
        <button key={u} className="lrow" style={{ background: sel === u ? 'var(--paper-2)' : 'none', border: 0, textAlign: 'start', cursor: 'pointer', padding: 10, borderRadius: 4 }} onClick={() => setSel(u)}>
          <div className="grow"><b>{last.who?.display_name}</b><span className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last.body}</span></div>{!last.from_staff && <span className="pill hot">!</span>}</button>); })}</section>
      <section className="card stack">
        <div className="chat">{msgs.map(m => <div key={m.id} className={`bubble ${m.from_staff ? 'me' : 'staff'}`}>{m.body}<time>{dTime(m.created_at)}</time></div>)}</div>
        <form className="composer" onSubmit={send}><input value={t} onChange={e => setT(e.target.value)} placeholder="תשובה…" aria-label="תשובה" /><button className="btn">שליחה</button></form>
      </section>
    </div> : <Empty>אין פניות.</Empty>}
  </>;
}

function Log({ d }) {
  return <>
    <h1>יומן פעולות</h1>
    <p className="muted" style={{ marginTop: -8 }}>כל פעולה במערכת נרשמת כאן. חשוב לשקיפות, וגם אם תהיה פנייה משפטית.</p>
    <section className="card"><div className="feed">{d.log.map(e => <div key={e.id} style={{ gridTemplateColumns: '120px 1fr' }}><time>{dTime(e.created_at)}</time><span><b>{ACTION_HE[e.action] || e.action}</b> · {e.detail}{e.actor ? <span className="muted"> · {e.actor.display_name}</span> : ''}</span></div>)}</div></section>
  </>;
}

function ActiveListings({ d, run }) {
  const [q, setQ] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const list = d.listings.filter(l => l.status === 'active' && l.starts_on >= today && (!q || (l.title + l.city).includes(q)))
    .sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0) || a.starts_on.localeCompare(b.starts_on));
  return <>
    <h1>מודעות פעילות</h1>
    <p className="muted" style={{ marginTop: -8 }}>מודעה מקודמת מופיעה ראשונה בקטגוריה ובחיפוש, עם תווית "מקודם". זה הבסיס לשירות קידום בתשלום בעתיד.</p>
    <input type="search" placeholder="חיפוש לפי שם או עיר" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 360 }} aria-label="חיפוש מודעה" />
    <section className="card"><div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>מודעה</th><th>קטגוריה</th><th>תאריך</th><th>מוכר</th><th>מחיר</th><th>סטטוס</th><th></th></tr></thead>
      <tbody>{list.map(l => <tr key={l.id}>
        <td><Link href={`/item/?id=${l.id}`}><b>{l.title}</b></Link><div className="muted" style={{ fontSize: 13 }}>{l.city}</div></td>
        <td>{CATS[l.category].he}</td>
        <td className="num">{dShort(l.starts_on)}</td>
        <td>{l.seller?.display_name}</td>
        <td className="num">{ils(l.price)}</td>
        <td><div className="actions">{l.promoted && <span className="chip vault">מקודם</span>}{l.doc_verified ? <span className="chip ok">מסמך נבדק</span> : <span className="chip warn">מסמך בבדיקה</span>}</div></td>
        <td><div className="actions">
          <button className="btn sm ghost" onClick={() => run('admin_promote_listing', { p_listing: l.id, p_on: !l.promoted }, l.promoted ? 'הקידום הוסר' : 'המודעה קודמה')}>{l.promoted ? 'הסרת קידום' : 'קידום'}</button>
          <button className="btn sm danger" onClick={() => confirm(`להוריד את "${l.title}" מהאתר?`) && run('admin_review_listing', { p_listing: l.id, p_action: 'unpublish' }, 'המודעה הורדה')}>הורדה</button>
        </div></td>
      </tr>)}</tbody>
    </table></div></section>
  </>;
}

function Settings() {
  const { settings, setSettings, toast } = useApp();
  const [pct, setPct] = useState(settings?.fee_pct ?? 10);
  const [payer, setPayer] = useState(settings?.fee_payer ?? 'seller');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (settings) { setPct(settings.fee_pct); setPayer(settings.fee_payer); } }, [settings]);
  const ex = feeSplit(1000, { fee_pct: pct, fee_payer: payer });
  const save = async () => {
    setBusy(true);
    const { error } = await sb.rpc('admin_update_settings', { p_fee_pct: +pct, p_fee_payer: payer });
    setBusy(false);
    if (error) return toast(errText(error), 'bad');
    setSettings({ fee_pct: +pct, fee_payer: payer }); toast('העמלה עודכנה', 'ok');
  };
  return <>
    <h1>הגדרות ועמלה</h1>
    <section className="card stack">
      <h3>עמלת עסקה</h3>
      <p className="muted">השינוי חל רק על עסקאות חדשות. עסקאות שכבר שולמו נשארות עם העמלה שהייתה בזמן התשלום.</p>
      <div className="row2">
        <div className="field"><label htmlFor="fp">אחוז עמלה</label><input id="fp" type="number" min="0" max="30" step="0.5" className="mono" value={pct} onChange={e => setPct(e.target.value)} /></div>
        <div className="field"><label htmlFor="fw">מי משלם</label><select id="fw" value={payer} onChange={e => setPayer(e.target.value)}><option value="seller">המוכר</option><option value="buyer">הקונה</option><option value="split">חצי-חצי</option></select></div>
      </div>
      <div className="note">דוגמה לפריט במחיר ₪1,000: הקונה משלם <b className="num">{ils(1000 + ex.buyer)}</b>, המוכר מקבל <b className="num">{ils(1000 - ex.seller)}</b>, וההכנסה שלך <b className="num">{ils(ex.total)}</b>.</div>
      <button className="btn" style={{ justifySelf: 'start' }} disabled={busy} onClick={save}>{busy ? 'שומר…' : 'שמירה'}</button>
    </section>
    <section className="card stack">
      <h3>תהליכים אוטומטיים</h3>
      <p className="muted">רצים כל 15 דקות, גם כשאף אחד לא מחובר:</p>
      <ul className="vchecks">
        <li><i>✓</i>המוכר לא העביר תוך 48 שעות מהתשלום: החזר מלא אוטומטי לקונה.</li>
        <li><i>✓</i>התאריך עבר, ההעברה אומתה ולא דווחה בעיה: השימוש נרשם אוטומטית.</li>
        <li><i>✓</i>24 שעות אחרי השימוש בלי מחלוקת: הכסף משתחרר למוכר (רק אם הזהות שלו אומתה).</li>
      </ul>
    </section>
  </>;
}
