'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { sb, errText, uploadDoc } from '@/lib/supabase';
import { ils, dateRange, dTime, orderStatus, steps, ACTION_HE, CATS } from '@/lib/util';
import { useApp } from '@/components/App';
import { Rail, Loading, Empty, Guilloche } from '@/components/Bits';

export default function Page() { return <Suspense fallback={<Loading />}><Order /></Suspense>; }

function Order() {
  const id = useSearchParams().get('id');
  const { user, isAdmin, toast, refreshStats } = useApp();
  const [o, setO] = useState(undefined);
  const [ev, setEv] = useState([]);
  const [disp, setDisp] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const { data } = await sb.from('orders').select('*, listing:listings(*), buyer:profiles!orders_buyer_id_fkey(display_name), seller:profiles!orders_seller_id_fkey(display_name,id_status)').eq('id', id).maybeSingle();
    setO(data);
    if (!data) return;
    const [{ data: e }, { data: d }, { data: r }] = await Promise.all([
      sb.from('audit_log').select('*').eq('order_id', id).order('created_at'),
      sb.from('disputes').select('*').eq('order_id', id).order('created_at', { ascending: false }).limit(1),
      sb.from('reviews').select('*').eq('order_id', id).eq('author_id', user.id).maybeSingle(),
    ]);
    setEv(e || []); setDisp(d?.[0] || null); setMyReview(r);
  }, [id, user]);
  useEffect(() => { load(); }, [load]);

  if (user === undefined) return <Loading />;
  if (!user) return <div className="wrap" style={{ paddingTop: 40 }}><Empty>צריך להתחבר כדי לראות עסקה. <Link href="/login/">כניסה</Link></Empty></div>;
  if (o === undefined) return <Loading />;
  if (!o) return <div className="wrap" style={{ paddingTop: 40 }}><Empty>העסקה לא נמצאה.</Empty></div>;

  const l = o.listing, role = o.buyer_id === user.id ? 'buyer' : o.seller_id === user.id ? 'seller' : 'admin';
  const S = steps(l.category), st = orderStatus(o), stay = ['hotel', 'vacation', 'cruise'].includes(l.category);
  const live = !o.refunded && o.step < 4;

  const act = async (fn, args, msg) => {
    setBusy(true);
    const { error } = await sb.rpc(fn, args);
    setBusy(false);
    if (error) return toast(errText(error), 'bad');
    toast(msg, 'ok'); refreshStats(); load();
  };

  let msg, primary = null;
  if (o.refunded) msg = `העסקה בוטלה. ${ils(o.price)} הוחזרו לקונה במלואם.`;
  else if (o.partial_refund) msg = `הוכרע: ${ils(o.partial_refund)} הוחזרו לקונה, ${ils(o.seller_payout)} הועברו למוכר.`;
  else if (o.frozen) msg = `העסקה מוקפאת: ${o.frozen_reason || 'בבדיקה'}. הכסף לא יעבור לאף צד עד שהצוות יכריע.`;
  else if (o.step >= 4) msg = role === 'seller' ? `${ils(o.seller_payout)} הועברו לחשבון הבנק שלך. עמלה: ${ils(o.seller_fee ?? o.fee)}.` : 'העסקה הושלמה. הכסף שוחרר למוכר.';
  else if (role === 'seller') {
    msg = [`הקונה שילם. עכשיו ${stay ? 'מעבירים את ההזמנה לשם' : 'מעבירים את הכרטיס ל'} ${o.buyer_name} מול ${l.provider || 'הספק'}. יש לך 48 שעות.`,
      'מחכים שהקונה יאשר שזה רשום על שמו, או שהצוות יאמת מול הספק.', `הכול מוכן. מחכים ל${stay ? 'צ׳ק-אין' : 'אירוע'}.`,
      'הקונה השתמש. הכסף ישתחרר אלייך תוך 24 שעות אם לא ייפתח דיווח.'][o.step];
    if (o.step === 0) primary = <button className="btn vault" disabled={busy} onClick={() => act('advance_order', { p_order: o.id }, 'עודכן: ההעברה בוצעה')}>{stay ? 'העברתי את השם לקונה' : 'העברתי את הכרטיס'}</button>;
    if (o.seller?.id_status !== 'verified') msg += ' שימו לב: כדי לקבל את הכסף צריך לאמת תעודה מזהה באזור האישי.';
  } else if (role === 'buyer') {
    msg = ['הכסף שלך נעול בנאמנות. מחכים שהמוכר יעביר.', `המוכר סימן שהעביר. בדקו מול ${l.provider || 'הספק'} שזה רשום על שמכם ואשרו כאן.`,
      `הכול רשום על שמך. ${stay ? 'צ׳ק-אין נעים!' : 'הנאה באירוע!'} אחרי הכניסה, אשרו כאן.`, 'אישרת שימוש. אם הכול תקין, אפשר לשחרר את הכסף עכשיו, או שהוא ישתחרר אוטומטית בעוד 24 שעות.'][o.step];
    if (o.step === 1) primary = <button className="btn vault" disabled={busy} onClick={() => act('advance_order', { p_order: o.id }, 'אישרת שההעברה התקבלה')}>זה רשום על שמי</button>;
    if (o.step === 2) primary = <button className="btn vault" disabled={busy} onClick={() => act('advance_order', { p_order: o.id }, 'נרשם')}>{stay ? 'עשיתי צ׳ק-אין' : 'נכנסתי לאירוע'}</button>;
    if (o.step === 3) primary = <button className="btn vault" disabled={busy} onClick={() => act('advance_order', { p_order: o.id }, 'הכסף שוחרר למוכר')}>הכול תקין, לשחרר למוכר</button>;
  } else msg = 'צפייה כמנהל. הפעולות נמצאות בפאנל הניהול.';

  return (
    <div className="wrap">
      <nav className="crumbs"><Link href={role === 'seller' ? '/me/?tab=sales' : role === 'buyer' ? '/me/?tab=buys' : '/admin/?tab=orders'}>{role === 'seller' ? 'המכירות שלי' : role === 'buyer' ? 'הרכישות שלי' : 'עסקאות'}</Link><span>/</span><span className="mono">עסקה {o.ref}</span></nav>
      <div className="item">
        <div className="stack" style={{ gap: 20 }}>
          <div className="order">
            <div className="order-head">
              <div><span className="kicker" style={{ margin: 0 }}>{CATS[l.category].one} · עסקה {o.ref}</span><h1 style={{ fontSize: 34, marginTop: 4 }}>{l.title}</h1>
                <div className="meta"><span>{l.city}</span><span className="num">{dateRange(l)}</span><span>{role === 'seller' ? `קונה: ${o.buyer?.display_name}` : `מוכר: ${o.seller?.display_name}`}</span><span>על שם: {o.buyer_name}</span></div></div>
              <span className={`chip ${st.tone}`}>{st.t}</span>
            </div>
            <Rail order={o} cat={l.category} events={ev} />
            <div className={`note ${o.frozen || o.refunded ? 'bad' : o.step >= 4 ? 'ok' : ''}`}>{msg}</div>
            {live && !o.frozen && (role !== 'admin') && <div className="actions">{primary}<DisputeBtn o={o} onDone={load} /></div>}
            {role === 'seller' && live && o.step <= 1 && <ProofUpload o={o} onDone={load} />}
          </div>

          {disp && <div className="card stack">
            <h3>מחלוקת {disp.status === 'open' ? <span className="chip bad">פתוחה</span> : <span className="chip">הוכרעה</span>}</h3>
            <div className="sides">
              <div className="side-box"><small>{disp.opened_by === o.buyer_id ? 'הקונה' : 'המוכר'} · פתח/ה</small><p>{disp.claim}</p></div>
              <div className="side-box"><small>{disp.opened_by === o.buyer_id ? 'המוכר' : 'הקונה'} · תגובה</small><p>{disp.response || <span className="muted">עוד לא הגיב.</span>}</p></div>
            </div>
            {disp.status === 'open' && !disp.response && user.id !== disp.opened_by && role !== 'admin' && <Respond d={disp} onDone={load} />}
            {disp.note && <div className="note">הכרעת הצוות: {disp.note}</div>}
          </div>}

          {(o.step >= 4 || o.refunded) && role !== 'admin' && <ReviewBox o={o} role={role} mine={myReview} onDone={load} />}

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>היסטוריית העסקה</h3>
            <div className="feed">{ev.map(e => <div key={e.id}><time>{dTime(e.created_at)}</time><span><b>{ACTION_HE[e.action] || e.action}</b> · {e.detail}</span></div>)}</div>
          </div>
        </div>

        <aside className="buybox">
          <div className="cert">
            <Guilloche seed={o.ref} />
            <span className="kicker" style={{ margin: 0 }}>קבלה · {o.ref}</span>
            <div className="sum">
              <div><span className="muted">מחיר הפריט</span><span className="mono">{ils(o.price)}</span></div>
              {o.buyer_fee > 0 && role !== 'seller' && <div><span className="muted">עמלת שירות לקונה</span><span className="mono">{ils(o.buyer_fee)}</span></div>}
              {role !== 'buyer' && <div><span className="muted">עמלת SafeSafe</span><span className="mono">−{ils(o.seller_fee ?? o.fee)}</span></div>}
              {o.partial_refund && <div><span className="muted">הוחזר לקונה</span><span className="mono">{ils(o.partial_refund)}</span></div>}
              <div className="total"><span>{role === 'buyer' ? 'מצב הכסף' : 'למוכר'}</span><span className="mono" style={{ fontSize: role === 'buyer' ? 20 : 30 }}>{role === 'buyer' ? st.t : ils(o.refunded ? 0 : o.seller_payout)}</span></div>
            </div>
            <ul className="pledge-list">{S.map((s, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><span><b>{s.t}.</b> {s.d}</span></li>)}</ul>
          </div>
          <Link href="/me/?tab=support" className="btn ghost block">שאלה על העסקה? לצ׳אט תמיכה</Link>
        </aside>
      </div>
    </div>
  );
}

function DisputeBtn({ o, onDone }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState('');
  const [err, setErr] = useState('');
  if (!open) return <button className="btn danger" onClick={() => setOpen(true)}>דיווח על בעיה</button>;
  const send = async () => {
    const { error } = await sb.rpc('open_dispute', { p_order: o.id, p_claim: t });
    if (error) return setErr(errText(error));
    toast('הדיווח התקבל. הכסף הוקפא', 'ok'); setOpen(false); onDone();
  };
  return (
    <div className="stack" style={{ width: '100%', gap: 8 }}>
      <label htmlFor="dc" style={{ fontWeight: 600 }}>מה קרה?</label>
      <textarea id="dc" value={t} onChange={e => setT(e.target.value)} placeholder="למשל: הגעתי למלון וההזמנה עדיין על שם המוכר" />
      <div className="err">{err}</div>
      <div className="actions"><button className="btn danger" onClick={send}>פתיחת מחלוקת והקפאת הכסף</button><button className="btn ghost" onClick={() => setOpen(false)}>ביטול</button></div>
    </div>
  );
}

function Respond({ d, onDone }) {
  const [t, setT] = useState('');
  const { toast } = useApp();
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label htmlFor="rs" style={{ fontWeight: 600 }}>התגובה שלך</label>
      <textarea id="rs" value={t} onChange={e => setT(e.target.value)} />
      <button className="btn" style={{ justifySelf: 'start' }} onClick={async () => { const { error } = await sb.rpc('respond_dispute', { p_dispute: d.id, p_text: t }); if (error) return toast(errText(error), 'bad'); toast('התגובה נשלחה לצוות', 'ok'); onDone(); }}>שליחה</button>
    </div>
  );
}

function ProofUpload({ o, onDone }) {
  const { toast } = useApp();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className={`drop ${file ? 'has' : ''}`}>
      <label htmlFor="tp" style={{ fontWeight: 600 }}>אישור מהספק על העברת השם (מאיץ את שחרור הכסף)</label>
      <input id="tp" type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0] || null)} />
      {file && <button className="btn sm" disabled={busy} onClick={async () => { setBusy(true); try { await uploadDoc(file, { kind: 'transfer_proof', order_id: o.id }); toast('האישור הועלה', 'ok'); setFile(null); onDone(); } catch (e) { toast(errText(e), 'bad'); } setBusy(false); }}>העלאה</button>}
    </div>
  );
}

function ReviewBox({ o, role, mine, onDone }) {
  const { toast } = useApp();
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState('');
  if (mine) return <div className="card"><h3>הדירוג שלך</h3><p className="stars" style={{ fontSize: 20 }}>{'★'.repeat(mine.stars)}</p>{mine.body && <p>{mine.body}</p>}</div>;
  return (
    <div className="card stack">
      <h3>איך היה עם {role === 'buyer' ? 'המוכר' : 'הקונה'}?</h3>
      <div className="actions" role="radiogroup" aria-label="דירוג">{[1, 2, 3, 4, 5].map(n => <button key={n} role="radio" aria-checked={stars === n} className="fchip" aria-pressed={n <= stars} onClick={() => setStars(n)}>★ {n}</button>)}</div>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="כמה מילים שיעזרו לאחרים (לא חובה)" aria-label="חוות דעת" />
      <button className="btn" style={{ justifySelf: 'start' }} onClick={async () => { const { error } = await sb.rpc('leave_review', { p_order: o.id, p_stars: stars, p_body: body }); if (error) return toast(errText(error), 'bad'); toast('תודה על הדירוג', 'ok'); onDone(); }}>שליחת דירוג</button>
    </div>
  );
}
