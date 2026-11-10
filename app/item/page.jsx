'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sb, errText } from '@/lib/supabase';
import { CATS, ils, off, dLong, nights, shortRef, memberSince, initials, SELLER_COLS, daysUntil } from '@/lib/util';
import { useApp } from '@/components/App';
import { Guilloche, Stamp, Glyph, Loading, Empty } from '@/components/Bits';
import { PhoneVerify } from '@/components/PhoneVerify';

export default function Page() { return <Suspense fallback={<Loading />}><Item /></Suspense>; }

function Item() {
  const id = useSearchParams().get('id');
  const { user, profile, priv } = useApp();
  const [l, setL] = useState(undefined);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!id) { setL(null); return; }
    sb.from('listings').select(`*, ${SELLER_COLS}`).eq('id', id).maybeSingle().then(({ data }) => setL(data));
  }, [id, user]);

  if (l === undefined) return <Loading />;
  if (!l) return <div className="wrap" style={{ paddingTop: 40 }}><Empty>הפריט לא נמצא, או שכבר נמכר. <Link href="/search/">לכל הפריטים</Link></Empty></div>;

  const c = CATS[l.category], s = l.seller || {}, n = nights(l), mine = user && l.seller_id === user.id;
  const available = l.status === 'active' && daysUntil(l.starts_on) >= 0;
  const checks = [
    [s.id_status === 'verified', s.id_status === 'verified' ? 'תעודה מזהה של המוכר אומתה' : 'תעודה מזהה של המוכר בבדיקה'],
    [s.phone_verified, 'טלפון המוכר אומת'],
    [l.doc_verified, l.doc_verified ? 'אישור ההזמנה המקורי נבדק על ידי הצוות' : 'אישור ההזמנה עדיין בבדיקה'],
    [l.seller_confirmed_transferable, 'המוכר הצהיר שהפריט ניתן להעברה לפי תנאי הספק'],
    [!l.flags?.includes('duplicate_document'), 'המסמך לא הופיע אצל מוכר אחר'],
  ];

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="מיקום"><Link href="/search/">כל הפריטים</Link><span>/</span><Link href={`/search/?cat=${l.category}`}>{c.he}</Link><span>/</span><span className="mono">№ {shortRef(l.id)}</span></nav>
      <div className="item">
        <div className="stack" style={{ gap: 26 }}>
          <div className="item-head">
            <span className="chip" style={{ justifySelf: 'start', gap: 6 }}><Glyph cat={l.category} size={14} />{c.one}</span>
            <h1>{l.title}</h1>
            <p className="muted" style={{ fontSize: 18 }}>{l.venue && l.venue !== l.title ? `${l.venue} · ` : ''}{l.city}, {l.country}</p>
          </div>
          <div className="facts">
            <div><small>{c.dated}</small><b>{dLong(l.starts_on)}</b></div>
            {l.ends_on && l.ends_on !== l.starts_on && <div><small>{l.category === 'hotel' ? 'צ\'ק-אאוט' : 'חזרה'}</small><b>{dLong(l.ends_on)}</b></div>}
            {n > 0 && <div><small>לילות</small><b className="mono">{n}</b></div>}
            <div><small>{n ? 'אורחים' : 'כרטיסים'}</small><b className="mono">{l.quantity}</b></div>
            {l.details && <div style={{ gridColumn: '1 / -1' }}><small>פרטים</small><b>{l.details}</b></div>}
            {l.provider && <div><small>נרכש דרך</small><b>{l.provider}</b></div>}
            <div><small>פורסם</small><b className="mono">{new Date(l.created_at).toLocaleDateString('he-IL')}</b></div>
          </div>
          {l.reason && <div><span className="kicker">למה המוכר מוכר</span><p style={{ fontFamily: 'var(--f-d)', fontSize: 24, lineHeight: 1.3 }}>״{l.reason}״</p></div>}

          <div className="card stack">
            <div className="seller-card">
              <span className="avatar lg">{initials(s.display_name)}</span>
              <div className="grow"><b style={{ fontSize: 18 }}>{s.display_name}</b>
                <div className="meta">{s.rating_count ? <span className="mono">★ {Number(s.rating_avg).toFixed(1)} ({s.rating_count})</span> : <span>מוכר חדש</span>}<span>{s.sales_count || 0} מכירות שהושלמו</span><span>{memberSince(s.created_at)}</span></div>
              </div>
              <Link href={`/seller/?id=${s.id}`} className="btn ghost sm">פרופיל וחוות דעת</Link>
            </div>
            <hr className="rule" />
            <ul className="vchecks">{checks.map(([ok, t], i) => <li key={i} className={ok ? '' : 'no'}><i>{ok ? '✓' : '…'}</i>{t}</li>)}</ul>
          </div>

          <div>
            <span className="kicker">מה קורה אחרי התשלום</span>
            <ol className="rules" style={{ margin: 0 }}>
              <li><span>הכסף נכנס לנאמנות. המוכר מקבל הודעה ויש לו 48 שעות להעביר את {l.category === 'hotel' ? 'ההזמנה לשמך' : 'הכרטיס אלייך'}.</span></li>
              <li><span>את מאשרת שזה רשום על שמך, או שהצוות מאמת מול {l.category === 'hotel' ? 'המלון' : 'הספק'}.</span></li>
              <li><span>{n ? 'עושים צ׳ק-אין' : 'נכנסים לאירוע'}. אחרי 24 שעות בלי דיווח על בעיה, הכסף עובר למוכר.</span></li>
              <li><span>לא העביר בזמן? לא הכניסו אותך? פותחים מחלוקת, הכסף קופא, ומקבלים החזר.</span></li>
            </ol>
          </div>
        </div>

        <aside className="buybox">
          <div className="cert">
            <Guilloche seed={l.id} />
            <div className="cert-head">
              <div><span className="kicker" style={{ margin: 0 }}>תעודת הגנה · № {shortRef(l.id)}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}><span className="mono" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{ils(l.price)}</span></div>
                {l.original_price > l.price && <div className="meta" style={{ marginTop: 6 }}><s className="mono">{ils(l.original_price)}</s><span className="save num">חוסכים {ils(l.original_price - l.price)} · {off(l)}%</span></div>}
              </div>
              {l.doc_verified && <Stamp />}
            </div>
            <div className="sum">
              {n > 0 && <div><span className="muted">מחיר ללילה</span><span className="mono">{ils(l.price / n)}</span></div>}
              <div><span className="muted">עמלת שירות לקונה</span><span className="mono">₪0</span></div>
              <div className="total"><span>סך הכול לתשלום</span><span className="mono">{ils(l.price)}</span></div>
            </div>
            {mine ? <Link href="/me/?tab=listings" className="btn ghost block">המודעה שלך · לניהול</Link>
              : available ? <button className="btn vault lg block" onClick={() => setBuying(true)}>רכישה מוגנת</button>
              : <button className="btn block" disabled>{l.status === 'sold' ? 'נמכר' : 'לא זמין'}</button>}
            <ul className="pledge-list" style={{ marginTop: 16 }}>
              <li><span>01</span>הכסף מוחזק בנאמנות עד 24 שעות אחרי {n ? 'הצ׳ק-אין' : 'האירוע'}</li>
              <li><span>02</span>החזר מלא אם הפריט לא הועבר לשמך</li>
              <li><span>03</span>אפשר לדווח על בעיה בכל שלב, והכסף קופא מיד</li>
            </ul>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>{l.category === 'flight' ? 'בטיסות, שינוי שם כפוף לתנאי חברת התעופה ולעיתים כרוך בתשלום לחברה.' : 'העברת הפריט כפופה לתנאי הספק המקורי. המוכר אחראי לוודא שההעברה אפשרית.'}</p>
        </aside>
      </div>
      {buying && <BuyModal l={l} onClose={() => setBuying(false)} user={user} profile={profile} priv={priv} />}
    </div>
  );
}

function BuyModal({ l, onClose, user, profile, priv }) {
  const router = useRouter();
  const { toast, refreshStats } = useApp();
  const [name, setName] = useState(priv?.legal_name || profile?.display_name || '');
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { const k = e => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);

  const pay = async () => {
    setErr('');
    if (name.trim().split(/\s+/).length < 2) return setErr('צריך שם פרטי ושם משפחה, בדיוק כמו בתעודה. ' + (l.category === 'hotel' ? 'המלון יבדוק אותו בצ׳ק-אין.' : 'ייתכן שיבדקו אותו בכניסה.'));
    if (!agree) return setErr('צריך לאשר את תנאי ההגנה');
    setBusy(true);
    const { data, error } = await sb.rpc('buy_listing', { p_listing: l.id, p_buyer_name: name.trim() });
    setBusy(false);
    if (error) return setErr(errText(error));
    toast('שולם. הכסף נעול בנאמנות', 'ok'); refreshStats();
    router.push(`/order/?id=${data}`);
  };

  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bt">
        <h2 id="bt">רכישה מוגנת</h2>
        <p className="muted">{l.title} · <span className="mono">{ils(l.price)}</span></p>
        {!user ? <>
          <p>כדי לקנות צריך חשבון. זה לוקח פחות מדקה.</p>
          <Link className="btn block" href={`/login/?next=${encodeURIComponent('/item/?id=' + l.id)}`}>כניסה או הרשמה</Link>
        </> : !profile?.phone_verified ? <>
          <p className="muted">לפני רכישה ראשונה מאמתים מספר טלפון. לשם יישלחו כל העדכונים על העסקה.</p>
          <PhoneVerify />
        </> : <>
          <div className="field"><label htmlFor="bn">השם שיירשם על {l.category === 'hotel' ? 'ההזמנה' : 'הכרטיס'}</label><input id="bn" value={name} onChange={e => setName(e.target.value)} autoFocus /><small className="hint">בדיוק כמו בתעודה המזהה</small></div>
          <div className="paycard">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>תשלום</b><span className="chip warn">הדמיה</span></div>
            <p className="muted" style={{ fontSize: 14 }}>בגרסה החיה ייפתח כאן דף תשלום מאובטח של חברת סליקה מורשית, והכסף יוחזק אצלה בנאמנות. בהדגמה לא מזינים פרטי אשראי.</p>
          </div>
          <label className="check"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /><span>הבנתי שהכסף יוחזק בנאמנות ויועבר למוכר רק אחרי {nights(l) ? 'הצ׳ק-אין' : 'האירוע'}, ושאפשר לבקש החזר אם הפריט לא הועבר לשמי.</span></label>
          <div className="err" role="alert">{err}</div>
          <button className="btn vault lg block" onClick={pay} disabled={busy}>{busy ? 'מעבד…' : `תשלום ${ils(l.price)} לנאמנות`}</button>
        </>}
        <button className="btn ghost block" onClick={onClose}>ביטול</button>
      </div>
    </div>
  );
}
