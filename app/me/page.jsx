'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sb, errText } from '@/lib/supabase';
import { ils, dateRange, dShort, dTime, orderStatus, CATS, initials, steps, FLAG_HE } from '@/lib/util';
import { useApp } from '@/components/App';
import { Loading, Empty, Glyph } from '@/components/Bits';
import { IdUpload } from '@/components/IdUpload';
import { PhoneVerify } from '@/components/PhoneVerify';

const TABS = [['overview', 'סקירה'], ['notifications', 'התראות'], ['listings', 'המודעות שלי'], ['buys', 'הרכישות שלי'], ['sales', 'המכירות שלי'], ['wallet', 'ארנק'], ['profile', 'פרופיל ואימות'], ['support', 'צ׳אט תמיכה']];

export default function Page() { return <Suspense fallback={<Loading />}><Me /></Suspense>; }

function Me() {
  const { user, profile, priv, toast, unread } = useApp();
  const tab = useSearchParams().get('tab') || 'overview';
  const router = useRouter();
  const [d, setD] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: listings }, { data: orders }] = await Promise.all([
      sb.from('listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
      sb.from('orders').select('*, listing:listings(*), buyer:profiles!orders_buyer_id_fkey(display_name), seller:profiles!orders_seller_id_fkey(display_name)').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order('created_at', { ascending: false }),
    ]);
    setD({ listings: listings || [], buys: (orders || []).filter(o => o.buyer_id === user.id), sales: (orders || []).filter(o => o.seller_id === user.id) });
  }, [user]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (user === null) router.replace('/login/?next=/me/'); }, [user, router]);

  if (!user || !profile || !d) return <Loading />;
  const live = o => !o.refunded && o.step < 4;
  const todos = [];
  d.sales.filter(o => live(o) && !o.frozen && o.step === 0).forEach(o => todos.push([`להעביר את ${o.listing.title} לשם ${o.buyer_name}`, o.id]));
  d.buys.filter(o => live(o) && !o.frozen && [1, 2, 3].includes(o.step)).forEach(o => todos.push([`${o.listing.title}: ${['', 'לאשר שההזמנה רשומה על שמך', 'לאשר צ׳ק-אין או כניסה', 'לשחרר את הכסף למוכר'][o.step]}`, o.id]));
  const count = { listings: d.listings.filter(l => ['active', 'pending_review'].includes(l.status)).length, buys: d.buys.filter(live).length, sales: d.sales.filter(live).length, overview: todos.length, notifications: unread };

  const logout = async () => { await sb.auth.signOut(); toast('התנתקת'); router.push('/'); };

  return (
    <div className="wrap dash">
      <nav className="side" aria-label="אזור אישי">
        <div className="me-id"><span className="avatar lg">{initials(profile.display_name)}</span><div><b>{profile.display_name}</b><small dir="ltr">{priv?.email}</small></div></div>
        {TABS.map(([k, t]) => <Link key={k} href={`/me/?tab=${k}`} aria-current={tab === k ? 'page' : undefined}><span>{t}</span>{count[k] ? <span className={`pill ${k === 'overview' ? 'hot' : ''}`}>{count[k]}</span> : null}</Link>)}
        <button onClick={logout}>התנתקות</button>
      </nav>
      <div className="dash-main">
        {tab === 'overview' && <Overview d={d} todos={todos} profile={profile} />}
        {tab === 'listings' && <Listings d={d} reload={load} />}
        {tab === 'buys' && <Orders list={d.buys} role="buyer" />}
        {tab === 'sales' && <Orders list={d.sales} role="seller" />}
        {tab === 'wallet' && <Wallet d={d} />}
        {tab === 'profile' && <Profile />}
        {tab === 'support' && <Support />}
        {tab === 'notifications' && <Notifications />}
      </div>
    </div>
  );
}

function Overview({ d, todos, profile }) {
  const escrow = d.sales.filter(o => !o.refunded && o.step < 4).reduce((a, o) => a + o.seller_payout, 0);
  const paid = d.sales.filter(o => !o.refunded && o.step >= 4).reduce((a, o) => a + o.seller_payout, 0);
  const held = d.buys.filter(o => !o.refunded && o.step < 4).reduce((a, o) => a + o.price, 0);
  const recent = [...d.buys, ...d.sales].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  return <>
    <h1>שלום, {profile.display_name.split(' ')[0]}</h1>
    {profile.id_status !== 'verified' && <div className="banner"><span>{profile.id_status === 'pending' ? 'התעודה המזהה בבדיקה. כסף ממכירות ישתחרר אחרי האימות.' : 'עוד לא אימתת זהות. בלי זה אי אפשר לפרסם או לקבל כסף.'}</span><Link className="btn sm" href="/me/?tab=profile">לאימות</Link></div>}
    <div className="stats">
      <div className="stat vault"><small>ממתין לך בנאמנות</small><b className="mono">{ils(escrow)}</b><small>ממכירות שעוד בתהליך</small></div>
      <div className="stat"><small>הועבר אליך</small><b className="mono">{ils(paid)}</b></div>
      <div className="stat"><small>שילמת ושמור בנאמנות</small><b className="mono">{ils(held)}</b></div>
      <div className="stat"><small>דירוג</small><b className="mono">{profile.rating_count ? `★ ${Number(profile.rating_avg).toFixed(1)}` : '—'}</b></div>
    </div>
    <section className="card"><h3 style={{ marginBottom: 8 }}>דורש פעולה ממך</h3>
      {todos.length ? todos.map(([t, id], i) => <div className="todo" key={i}><span>{t}</span><Link className="btn sm ghost" href={`/order/?id=${id}`}>לטיפול</Link></div>) : <p className="muted">הכול מטופל.</p>}
    </section>
    <section className="card"><h3 style={{ marginBottom: 8 }}>עסקאות אחרונות</h3>
      {recent.length ? <div className="rows">{recent.map(o => <OrderRow key={o.id} o={o} role={o.buyer_id === profile.id ? 'buyer' : 'seller'} />)}</div> : <p className="muted">עוד אין עסקאות. <Link href="/search/">לפריטים</Link></p>}
    </section>
  </>;
}

function OrderRow({ o, role }) {
  const st = orderStatus(o), l = o.listing;
  return (
    <div className="lrow">
      <span className="swatch" style={{ '--h': l.hue }}><Glyph cat={l.category} /></span>
      <div className="grow"><b>{l.title}</b><span className="meta"><span>{role === 'buyer' ? 'רכישה' : 'מכירה'}</span><span className="num">{dateRange(l)}</span><span>{steps(l.category)[Math.min(o.step, 4)].t}</span></span></div>
      <div className="end"><span className={`chip ${st.tone}`}>{st.t}</span><b className="mono">{ils(role === 'seller' ? o.seller_payout : o.price)}</b><Link className="btn sm ghost" href={`/order/?id=${o.id}`}>פרטים</Link></div>
    </div>
  );
}

function Orders({ list, role }) {
  return <>
    <h1>{role === 'buyer' ? 'הרכישות שלי' : 'המכירות שלי'}</h1>
    <p className="muted" style={{ marginTop: -8 }}>{role === 'buyer' ? 'הכסף שלך שמור בנאמנות עד שתאשר שימוש. בעיה? דווחו לפני כן והכסף יוקפא.' : 'ככל שתעבירו מהר יותר, הקונה רגוע יותר והכסף מגיע מוקדם יותר.'}</p>
    {list.length ? <div className="card rows">{list.map(o => <OrderRow key={o.id} o={o} role={role} />)}</div>
      : <Empty>{role === 'buyer' ? <>עוד לא קנית. <Link href="/search/">לפריטים</Link></> : <>עוד אין מכירות. <Link href="/sell/">לפרסום</Link></>}</Empty>}
  </>;
}

function Listings({ d, reload }) {
  const { toast } = useApp();
  const [prices, setPrices] = useState({});
  const [confirm, setConfirm] = useState(null);
  const badge = l => ({ active: ['פעיל', 'ok'], pending_review: [l.info_requested ? 'הצוות ביקש מסמך נוסף' : 'בבדיקת צוות', 'warn'], sold: ['נמכר', 'vault'], rejected: [`נדחה: ${l.reject_reason || ''}`, 'bad'], removed: ['הוסר', ''] }[l.status]);
  const rpc = async (fn, args, msg) => { const { error } = await sb.rpc(fn, args); if (error) return toast(errText(error), 'bad'); toast(msg, 'ok'); setConfirm(null); reload(); };
  return <>
    <div className="order-head"><h1 style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 900 }}>המודעות שלי</h1><Link className="btn" href="/sell/">מודעה חדשה</Link></div>
    {d.listings.length ? <div className="card rows">{d.listings.map(l => {
      const [t, tone] = badge(l), editable = ['active', 'pending_review'].includes(l.status);
      return (
        <div className="lrow" key={l.id}>
          <span className="swatch" style={{ '--h': l.hue }}><Glyph cat={l.category} /></span>
          <div className="grow"><Link href={`/item/?id=${l.id}`} style={{ fontWeight: 700, textDecoration: 'none' }}>{l.title}</Link><span className="meta"><span>{CATS[l.category].one}</span><span className="num">{dateRange(l)}</span></span>
            <div className="actions"><span className={`chip ${tone}`}>{t}</span>{l.flags?.map(f => <span key={f} className="chip bad">{FLAG_HE[f] || f}</span>)}</div></div>
          <div className="end">{editable ? <>
            <input type="number" aria-label="מחיר" className="mono" style={{ width: 110, minHeight: 38 }} value={prices[l.id] ?? l.price} onChange={e => setPrices({ ...prices, [l.id]: e.target.value })} />
            <button className="btn sm ghost" onClick={() => rpc('update_listing_price', { p_listing: l.id, p_price: +(prices[l.id] ?? l.price) }, 'המחיר עודכן')}>עדכון</button>
            {confirm === l.id ? <><button className="btn sm danger" onClick={() => rpc('remove_listing', { p_listing: l.id }, 'המודעה הוסרה')}>כן, להסיר</button><button className="btn sm ghost" onClick={() => setConfirm(null)}>ביטול</button></>
              : <button className="btn sm danger" onClick={() => setConfirm(l.id)}>הסרה</button>}
          </> : <b className="mono">{ils(l.price)}</b>}</div>
        </div>);
    })}</div> : <Empty>עוד לא פרסמת. <Link href="/sell/">לפרסום ראשון</Link></Empty>}
  </>;
}

function Wallet({ d }) {
  const { priv, toast } = useApp();
  const [bank, setBank] = useState(priv?.bank_name || '');
  const [acc, setAcc] = useState('');
  const [edit, setEdit] = useState(!priv?.bank_last4);
  const escrow = d.sales.filter(o => !o.refunded && o.step < 4).reduce((a, o) => a + o.seller_payout, 0);
  const done = d.sales.filter(o => !o.refunded && o.step >= 4);
  const save = async () => {
    const digits = acc.replace(/\D/g, '');
    if (!bank.trim() || digits.length < 4) return toast('צריך שם בנק וסניף ומספר חשבון', 'bad');
    const { error } = await sb.from('profile_private').update({ bank_name: bank.trim(), bank_last4: digits.slice(-4) }).eq('id', priv.id);
    if (error) return toast(errText(error), 'bad');
    toast('החשבון נשמר', 'ok'); setEdit(false); location.reload();
  };
  return <>
    <h1>ארנק</h1>
    <div className="stats">
      <div className="stat vault"><small>ממתין בנאמנות</small><b className="mono">{ils(escrow)}</b></div>
      <div className="stat"><small>הועבר לחשבון</small><b className="mono">{ils(done.reduce((a, o) => a + o.seller_payout, 0))}</b></div>
      <div className="stat"><small>עמלות ששולמו</small><b className="mono">{ils(done.reduce((a, o) => a + (o.seller_fee ?? o.fee), 0))}</b></div>
    </div>
    <section className="card stack"><h3>לאן מעבירים לך כסף</h3>
      {!edit ? <div className="lrow" style={{ padding: 0 }}><div className="grow"><b>{priv.bank_name}</b><span className="muted mono">חשבון ••••{priv.bank_last4}</span></div><button className="btn sm ghost" onClick={() => setEdit(true)}>החלפה</button></div>
        : <><div className="row2"><div className="field"><label htmlFor="bk">בנק וסניף</label><input id="bk" value={bank} onChange={e => setBank(e.target.value)} placeholder="לאומי, סניף 800" /></div><div className="field"><label htmlFor="ac">מספר חשבון</label><input id="ac" dir="ltr" inputMode="numeric" value={acc} onChange={e => setAcc(e.target.value)} /></div></div>
          <p className="hint">החשבון חייב להיות על שם בעל התעודה המזהה. אנחנו שומרים רק את 4 הספרות האחרונות.</p>
          <button className="btn" style={{ justifySelf: 'start' }} onClick={save}>שמירה</button></>}
    </section>
    <section className="card"><h3 style={{ marginBottom: 8 }}>תשלומים שהתקבלו</h3>
      {done.length ? <div className="rows">{done.map(o => <div className="lrow" key={o.id}><div className="grow"><b>{o.listing.title}</b><span className="muted num">{dShort(o.released_at)} · מחיר {ils(o.price)} · עמלה {ils(o.seller_fee ?? o.fee)}</span></div><b className="mono">{ils(o.seller_payout)}</b></div>)}</div> : <p className="muted">עוד לא התקבלו תשלומים.</p>}
    </section>
  </>;
}

function Profile() {
  const { profile, priv, refreshProfile, toast } = useApp();
  const [f, setF] = useState({ display_name: profile.display_name, city: profile.city || '', bio: profile.bio || '', legal_name: priv?.legal_name || '' });
  const save = async () => {
    if (f.display_name.trim().length < 2) return toast('חסר שם', 'bad');
    const a = await sb.from('profiles').update({ display_name: f.display_name.trim(), city: f.city.trim() || null, bio: f.bio.trim() || null }).eq('id', profile.id);
    const b = await sb.from('profile_private').update({ legal_name: f.legal_name.trim() || null }).eq('id', profile.id);
    if (a.error || b.error) return toast(errText(a.error || b.error), 'bad');
    refreshProfile(); toast('נשמר', 'ok');
  };
  return <>
    <h1>פרופיל ואימות</h1>
    <section className="card stack"><h3>אימות זהות</h3><IdUpload /></section>
    <section className="card stack"><h3>טלפון</h3>
      {profile.phone_verified ? <div className="banner ok"><span><b dir="ltr">{priv?.phone}</b> · מאומת. עדכוני עסקאות יגיעו לכאן.</span></div> : <PhoneVerify />}
    </section>
    <section className="card stack"><h3>פרטים</h3>
      <div className="row2"><div className="field"><label htmlFor="dn">שם שמוצג לאחרים</label><input id="dn" value={f.display_name} onChange={e => setF({ ...f, display_name: e.target.value })} /></div><div className="field"><label htmlFor="ln">שם מלא כמו בתעודה (פרטי)</label><input id="ln" value={f.legal_name} onChange={e => setF({ ...f, legal_name: e.target.value })} /></div></div>
      <div className="row2"><div className="field"><label htmlFor="ct">עיר</label><input id="ct" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></div><div className="field"><label htmlFor="em">אימייל</label><input id="em" dir="ltr" value={priv?.email || ''} disabled /></div></div>
      <div className="field"><label htmlFor="bi">כמה מילים עליך (מוצג בפרופיל)</label><textarea id="bi" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></div>
      <button className="btn" style={{ justifySelf: 'start' }} onClick={save}>שמירה</button>
      <Link href={`/seller/?id=${profile.id}`} className="link">איך הפרופיל שלי נראה לאחרים</Link>
    </section>
  </>;
}

function Support() {
  const { user, toast } = useApp();
  const [msgs, setMsgs] = useState(null);
  const [t, setT] = useState('');
  const box = useRef(null);
  const load = useCallback(async () => {
    const { data } = await sb.from('support_messages').select('*').eq('thread_user', user.id).order('created_at');
    setMsgs(data || []);
  }, [user]);
  useEffect(() => {
    load();
    const ch = sb.channel('sup-' + user.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_user=eq.${user.id}` }, load).subscribe();
    const iv = setInterval(load, 15000);
    return () => { sb.removeChannel(ch); clearInterval(iv); };
  }, [load, user]);
  useEffect(() => { box.current && (box.current.scrollTop = box.current.scrollHeight); }, [msgs]);
  const send = async e => {
    e.preventDefault(); if (!t.trim()) return;
    const { error } = await sb.from('support_messages').insert({ thread_user: user.id, sender_id: user.id, body: t.trim() });
    if (error) return toast(errText(error), 'bad');
    setT(''); load();
  };
  return <>
    <h1>צ׳אט תמיכה</h1>
    <section className="card stack">
      <div className="chat" ref={box}>
        <div className="bubble staff">שלום! כאן צוות SafeSafe. כתבו לנו כל שאלה על קנייה, מכירה או עסקה פתוחה. אם זה דחוף ויש לכם צ׳ק-אין היום, ציינו את מספר העסקה.<time>צוות SafeSafe</time></div>
        {msgs === null ? <Loading /> : msgs.map(m => <div key={m.id} className={`bubble ${m.from_staff ? 'staff' : 'me'}`}>{m.body}<time>{dTime(m.created_at)}{m.from_staff ? ' · צוות' : ''}</time></div>)}
      </div>
      <form className="composer" onSubmit={send}><input value={t} onChange={e => setT(e.target.value)} placeholder="כתבו הודעה…" aria-label="הודעה" maxLength={2000} /><button className="btn">שליחה</button></form>
    </section>
  </>;
}

function Notifications() {
  const { user, refreshUnread } = useApp();
  const [list, setList] = useState(null);
  useEffect(() => {
    sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
      .then(async ({ data }) => { setList(data || []); await sb.rpc('mark_notifications_read'); refreshUnread(); });
  }, [user, refreshUnread]);
  return <>
    <h1>התראות</h1>
    <p className="muted" style={{ marginTop: -8 }}>כל מה שקורה בעסקאות ובמודעות שלך. בגרסה החיה ההתראות יישלחו גם בוואטסאפ ובמייל.</p>
    {list === null ? <Loading /> : list.length ? <section className="card"><div className="notif-list">{list.map(n => (
      <Link key={n.id} href={n.link || '/me/'} className={`notif ${n.read ? '' : 'new'}`}>
        <span className="notif-dot" aria-hidden="true" />
        <span className="notif-txt"><b>{n.title}</b>{n.body && <span>{n.body}</span>}</span>
        <time className="num">{dTime(n.created_at)}</time>
      </Link>))}</div></section> : <Empty>אין עדיין התראות. כשמישהו יקנה ממך או כשהמוכר יעביר לך, זה יופיע כאן.</Empty>}
  </>;
}
