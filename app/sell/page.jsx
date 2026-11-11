'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb, errText, uploadDoc } from '@/lib/supabase';
import { CATS, CAT_KEYS, ils, feeSplit } from '@/lib/util';
import { useApp } from '@/components/App';
import { Glyph, Loading, Field } from '@/components/Bits';
import { IdUpload } from '@/components/IdUpload';

const STAY = ['hotel', 'vacation', 'cruise'];

export default function Sell() {
  const { user, profile, toast, settings } = useApp();
  const router = useRouter();
  const [cat, setCat] = useState('hotel');
  const [f, setF] = useState({ title: '', venue: '', city: '', country: 'ישראל', region: 'il', starts_on: '', ends_on: '', quantity: 2, details: '', provider: '', original_price: '', price: '', reason: '' });
  const [file, setFile] = useState(null);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  if (user === undefined || (user && !profile)) return <Loading />;
  if (!user) return (
    <div className="wrap auth"><div className="card"><h1 style={{ fontSize: 30 }}>מכירה ב-SafeSafe</h1><p className="muted">כדי לפרסם צריך חשבון מאומת. זה מה שנותן לקונים ביטחון לקנות ממך.</p><Link className="btn block" href="/login/?next=/sell/">כניסה או הרשמה</Link></div></div>
  );

  const stay = STAY.includes(cat), p = +f.price || 0, o = +f.original_price || 0;
  const fs = feeSplit(p, settings || undefined);
  const needId = ['none', 'rejected'].includes(profile.id_status);

  const submit = async e => {
    e.preventDefault(); setErr('');
    if (needId) return setErr('קודם צריך להעלות תעודה מזהה (למעלה)');
    if (!f.title.trim() || !f.city.trim()) return setErr('חסר שם או עיר');
    if (!f.starts_on) return setErr('חסר תאריך');
    if (stay && (!f.ends_on || f.ends_on <= f.starts_on)) return setErr('תאריך הסיום צריך להיות אחרי תאריך ההתחלה');
    if (!(o > 0 && p > 0)) return setErr('צריך למלא כמה שילמת ומחיר מבוקש');
    if (!file) return setErr('צריך לצרף את אישור ההזמנה או הכרטיס המקורי');
    if (!ok) return setErr('צריך לאשר שהפריט ניתן להעברה');
    setBusy(true);
    const row = { seller_id: user.id, category: cat, title: f.title.trim(), venue: f.venue.trim() || null, city: f.city.trim(), country: f.country.trim() || 'ישראל', region: f.region,
      starts_on: f.starts_on, ends_on: stay ? f.ends_on : (f.ends_on || null), quantity: +f.quantity || 1, details: f.details.trim() || null, provider: f.provider.trim() || null,
      original_price: o, price: p, reason: f.reason.trim() || null, seller_confirmed_transferable: true, hue: Math.floor(Math.random() * 360) };
    const { data, error } = await sb.from('listings').insert(row).select('id').single();
    if (error) { setBusy(false); return setErr(errText(error)); }
    try { await uploadDoc(file, { kind: 'booking', listing_id: data.id }); }
    catch (e2) { setBusy(false); return setErr('המודעה נשמרה, אבל העלאת המסמך נכשלה: ' + errText(e2)); }
    setBusy(false); toast('נשלח לבדיקת הצוות', 'ok');
    router.push('/me/?tab=listings');
  };

  return (
    <div className="wrap">
      <div className="page-head"><span className="kicker">פרסום חינם · עמלה רק כשנמכר</span><h1>מכירת הזמנה או כרטיס</h1></div>
      <div className="item" style={{ paddingTop: 0 }}>
        <form className="stack" onSubmit={submit} noValidate style={{ gap: 22 }}>
          <section className="card stack">
            <h2>1. אימות זהות</h2>
            <IdUpload />
          </section>

          <section className="card stack">
            <h2>2. מה מוכרים</h2>
            <div className="filters" role="group" aria-label="קטגוריה" style={{ margin: 0 }}>
              {CAT_KEYS.map(k => <button type="button" key={k} className="fchip" aria-pressed={cat === k} onClick={() => setCat(k)}><Glyph cat={k} size={16} />{CATS[k].one}</button>)}
            </div>
            <div className="row2">
              <Field id="t" label={stay ? 'שם המלון או החבילה' : 'שם האירוע'}><input id="t" value={f.title} onChange={set('title')} placeholder={stay ? 'מלון הים התיכון' : 'הפועל נגד מכבי'} /></Field>
              <Field id="v" label={CATS[cat].place}><input id="v" value={f.venue} onChange={set('venue')} placeholder={cat === 'flight' ? 'אל על' : ''} /></Field>
            </div>
            <div className="row3">
              <Field id="c" label="עיר"><input id="c" value={f.city} onChange={set('city')} /></Field>
              <Field id="r" label="איפה"><select id="r" value={f.region} onChange={e => setF({ ...f, region: e.target.value, country: e.target.value === 'il' ? 'ישראל' : (f.country === 'ישראל' ? '' : f.country) })}><option value="il">בארץ</option><option value="abroad">בחו״ל</option></select></Field>
              <Field id="co" label="מדינה"><input id="co" value={f.country} onChange={set('country')} /></Field>
            </div>
            <div className="row3">
              <Field id="s" label={CATS[cat].dated}><input id="s" type="date" value={f.starts_on} onChange={set('starts_on')} /></Field>
              <Field id="e" label={stay ? 'סיום' : 'סיום (לא חובה)'}><input id="e" type="date" value={f.ends_on} onChange={set('ends_on')} /></Field>
              <Field id="q" label={stay ? 'אורחים' : 'כמות כרטיסים'}><input id="q" type="number" min="1" max="20" value={f.quantity} onChange={set('quantity')} /></Field>
            </div>
            <Field id="d" label={stay ? 'סוג חדר וארוחות' : 'יציע, שורה, מושבים'}><input id="d" value={f.details} onChange={set('details')} placeholder={stay ? 'חדר זוגי מול הים · ארוחת בוקר' : 'שער 5 · שורה 8 · מושבים 3–4'} /></Field>
            <div className="row2">
              <Field id="pr" label="נרכש דרך"><input id="pr" value={f.provider} onChange={set('provider')} placeholder="Booking.com, ישירות במלון, Leaan…" /></Field>
              <Field id="re" label="למה מוכרים" hint="קונים סומכים יותר כשיש סיבה"><input id="re" value={f.reason} onChange={set('reason')} /></Field>
            </div>
          </section>

          <section className="card stack">
            <h2>3. מחיר</h2>
            <div className="row2">
              <Field id="op" label="כמה שילמת (₪)"><input id="op" type="number" inputMode="numeric" min="1" value={f.original_price} onChange={set('original_price')} className="mono" /></Field>
              <Field id="pp" label="מחיר מבוקש (₪)" hint={p > o && o > 0 ? 'מחיר מעל המקור מסומן לצוות ובדרך כלל נדחה' : ''}><input id="pp" type="number" inputMode="numeric" min="1" value={f.price} onChange={set('price')} className="mono" /></Field>
            </div>
          </section>

          <section className="card stack">
            <h2>4. אסמכתא מקורית</h2>
            <div className={`drop ${file ? 'has' : ''}`}>
              <label htmlFor="bf" style={{ fontWeight: 600 }}>אישור ההזמנה או הכרטיס, כמו שקיבלת מהספק</label>
              <input id="bf" type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0] || null)} />
              <small className="hint">צילום מסך או PDF, עד 10MB. המסמך לא מוצג לקונים. אנחנו משווים אותו לכל המסמכים שהועלו כדי למנוע מכירה כפולה.</small>
            </div>
            <label className="check"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /><span>בדקתי מול הספק שאפשר להעברה לשם אחר, והפריט לא מוצע למכירה במקום אחר.</span></label>
          </section>
          <div className="err" role="alert">{err}</div>
          <button className="btn lg" disabled={busy} style={{ justifySelf: 'start' }}>{busy ? 'שולח…' : 'שליחה לבדיקה ופרסום'}</button>
        </form>

        <aside className="buybox">
          <div className="cert">
            <span className="kicker" style={{ margin: 0 }}>כמה תקבלו</span>
            <div className="sum">
              <div><span className="muted">מחיר מבוקש</span><span className="mono">{ils(p)}</span></div>
              <div><span className="muted">עמלת SafeSafe ({fs.sellerPct}%)</span><span className="mono">−{ils(fs.seller)}</span></div>
              <div className="total"><span>לחשבון הבנק</span><span className="mono" style={{ color: 'var(--vault)' }}>{ils(p - fs.seller)}</span></div>
              {o > 0 && p > 0 && <div><span className="muted">מתוך מה ששילמת</span><span className="mono">{Math.round((p - fs.seller) / o * 100)}%</span></div>}
            </div>
            <ul className="pledge-list">
              <li><span>01</span>הצוות בודק כל מודעה, בדרך כלל תוך כמה שעות</li>
              <li><span>02</span>כשנמכר, יש לך 48 שעות להעביר לשם הקונה</li>
              <li><span>03</span>הכסף משתחרר 24 שעות אחרי השימוש</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
