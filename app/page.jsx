'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase';
import { CATS, CAT_KEYS, ils, num, FEE, SELLER_COLS, dShort } from '@/lib/util';

const CAT_HUE = { hotel: 196, concert: 336, sports: 142, festival: 28, vacation: 218, cruise: 186, flight: 258 };
import { useApp } from '@/components/App';
import { Ticket, Glyph, Guilloche, Loading } from '@/components/Bits';

export default function Home() {
  const { stats } = useApp();
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [q, setQ] = useState('');
  const [calc, setCalc] = useState(2400);
  const [sel, setSel] = useState('hotel');

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    sb.from('listings').select(`*, ${SELLER_COLS}`).eq('status', 'active').gte('starts_on', today).order('starts_on')
      .then(({ data }) => setItems(data || []));
    sb.from('reviews').select('stars, body, created_at, author:profiles!reviews_author_id_fkey(display_name), order:orders(listing:listings(title, city))')
      .not('body', 'is', null).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setReviews(data || []));
  }, []);

  const counts = Object.fromEntries(CAT_KEYS.map(k => [k, (items || []).filter(l => l.category === k).length]));
  const go = e => { e.preventDefault(); const p = new URLSearchParams(); if (q.trim()) p.set('q', q.trim()); router.push('/search/?' + p.toString()); };

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>קונים מאנשים.<br />סומכים על <em>הכספת</em>.</h1>
            <p className="hero-sub">הזמנות מלון, חופשות וכרטיסים שמישהו כבר לא יכול לנצל, בהנחה אמיתית. התשלום נכנס לנאמנות ויוצא למוכר רק אחרי שעשיתם צ׳ק-אין או נכנסתם לאירוע.</p>
            <form className="search" onSubmit={go} role="search">
              <input type="search" placeholder="עיר, מלון, הופעה, קבוצה…" value={q} onChange={e => setQ(e.target.value)} aria-label="חיפוש" />
              <button className="btn signal" type="submit">חיפוש</button>
            </form>
            <div className="hero-proof">
              <span><Check />כל מוכר מאמת תעודה מזהה</span>
              <span><Check />כל מסמך נבדק ידנית</span>
              <span><Check />החזר מלא אם לא נכנסתם</span>
            </div>
          </div>
          <MoneyFlow />
        </div>
      </section>

      <section className="section wrap" aria-labelledby="now">
        <div className="section-head"><div><span className="kicker">מתעדכן בזמן אמת</span><h2 id="now">מה מוכרים עכשיו</h2></div><Link href="/search/" className="btn ghost sm">כל הפריטים</Link></div>
        {items === null ? <Loading /> : (
          <div className="acc">
            {CAT_KEYS.map(k => {
              const list = items.filter(l => l.category === k);
              const min = list.length ? Math.min(...list.map(l => l.price)) : null;
              const on = sel === k;
              return (
                <div key={k} className={`acc-row ${on ? 'on' : ''} ${!list.length ? 'none' : ''}`} style={{ '--h': CAT_HUE[k] }}>
                  <button className="acc-head" aria-expanded={on} aria-controls={`acc-${k}`} onClick={() => setSel(on ? null : k)}>
                    <span className="acc-ico"><Glyph cat={k} size={20} /></span>
                    <b className="acc-nm">{CATS[k].he}</b>
                    <span className="acc-meta">{list.length ? <>{list.length} פריטים · מ-<b className="num">{ils(min)}</b></> : CATS[k].soon ? 'בקרוב' : 'אין כרגע'}</span>
                    <svg className="acc-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <div className="acc-body" id={`acc-${k}`} role="region"><div><div className="acc-inner">
                    {list.length ? <>
                      <div className="tickets">{list.slice(0, 3).map(l => <Ticket key={l.id} l={l} seller={l.seller} />)}</div>
                      <div className="acc-more"><Link href={`/search/?cat=${k}`} className="btn ghost sm">{list.length > 3 ? `לכל ${list.length} הפריטים ב${CATS[k].he}` : `לעמוד ה${CATS[k].he}`} ←</Link></div>
                    </> : <div className="empty">{CATS[k].soon ? 'טיסות מתווספות בשלב הבא. כבר עכשיו אפשר לפרסם כרטיס טיסה שניתן להעברה.' : 'אין כרגע פריטים בקטגוריה הזו.'} <Link href="/sell/">יש לך משהו למכור?</Link></div>}
                  </div></div></div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section wrap" aria-labelledby="pledges">
        <div className="section-head"><div><span className="kicker">ההתחייבויות שלנו</span><h2 id="pledges">לא צריך לסמוך על המוכר.<br />צריך לסמוך על השיטה.</h2></div><Link href="/trust/" className="btn ghost sm">איך זה עובד בפירוט</Link></div>
        <div className="pledges">
          {[
            ['הכסף לא זז לפני שהשתמשתם', 'התשלום מוחזק בנאמנות אצל ספק סליקה מורשה. המוכר מקבל אותו רק 24 שעות אחרי הצ׳ק-אין או האירוע.'],
            ['כל מוכר הוא אדם מזוהה', 'תעודה מזהה, טלפון מאומת וחשבון בנק על אותו שם. בלי זה אי אפשר לפרסם או לקבל כסף.'],
            ['כל מסמך נבדק ומושווה', 'הצוות בודק את אישור ההזמנה, והמערכת משווה כל קובץ לכל מה שהועלה אי פעם, כדי לתפוס כפילויות.'],
            ['פריט אחד, קונה אחד', 'ברגע התשלום הפריט ננעל במסד הנתונים. אי אפשר למכור את אותה הזמנה פעמיים.'],
            ['בעיה? הכסף קופא', 'כל צד יכול לדווח. הכסף מוקפא עד שהצוות מכריע, וכל הכרעה נשלחת לשני הצדדים עם נימוק.'],
            ['כל פעולה נרשמת', 'היסטוריה מלאה של כל עסקה, עם שעה ומי ביצע. שקוף לקונה, למוכר ולצוות.'],
          ].map(([h, p], i) => <div className="pledge" key={i}><span className="n">{i + 1}</span><div><h3>{h}</h3><p>{p}</p></div></div>)}
        </div>
      </section>

      <section className="wrap" aria-labelledby="nums">
        <div className="section-head"><div><span className="kicker">מתעדכן בזמן אמת מהמערכת</span><h2 id="nums">המספרים, בלי ייפוי</h2></div></div>
        <div className="numbers">
          <div><b>{stats ? ils(stats.protected) : '—'}</b><small>עברו דרך הנאמנות עד היום</small></div>
          <div><b>{stats ? ils(stats.in_escrow) : '—'}</b><small>מוחזקים ממש עכשיו</small></div>
          <div><b>{stats ? num(stats.completed) : '—'}</b><small>עסקאות שהושלמו</small></div>
          <div><b>{stats?.rating ? `★ ${Number(stats.rating).toFixed(1)}` : '—'}</b><small>דירוג ממוצע מ-{stats?.reviews || 0} חוות דעת</small></div>
        </div>
        {reviews.length > 0 && (
          <div className="quotes" style={{ marginTop: 36 }}>
            {reviews.map((r, i) => (
              <figure className="quote" key={i} style={{ margin: 0 }}>
                <span className="stars" aria-label={`${r.stars} כוכבים`}>{'★'.repeat(r.stars)}</span>
                <p>{r.body}</p>
                <footer>{r.author?.display_name?.split(' ')[0]} · קנה/תה {r.order?.listing?.title}</footer>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="section wrap">
        <div className="band">
          <Guilloche seed="band" />
          <div style={{ position: 'relative' }}>
            <span className="kicker" style={{ color: 'rgba(255,255,255,.7)' }}>למוכרים</span>
            <h2>יש לך הזמנה שלא תנצל?</h2>
            <p>במקום להפסיד את כל הסכום, מכרו אותה למי שכן יכול לנסוע. פרסום חינם, עמלה של {FEE * 100}% רק כשנמכר.</p>
            <Link href="/sell/" className="btn lg" style={{ marginTop: 22, background: '#F3EFE6', color: '#15171B', borderColor: '#F3EFE6' }}>פרסום פריט</Link>
          </div>
          <div className="calc">
            <label htmlFor="calc" style={{ fontWeight: 600 }}>מחיר מבוקש</label>
            <input id="calc" type="number" inputMode="numeric" min="0" value={calc} onChange={e => setCalc(e.target.value)} className="mono" />
            <div className="sum" style={{ margin: 0 }}>
              <div><span className="muted">עמלת SafeSafe ({FEE * 100}%)</span><span className="mono">−{ils(calc * FEE)}</span></div>
            </div>
            <div className="out"><span>מגיע לחשבון שלך</span><b>{ils(calc * (1 - FEE))}</b></div>
          </div>
        </div>
      </section>
    </>
  );
}

function Check() { return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

function MoneyFlow() {
  return (
    <aside className="flow" aria-label="איך הכסף זז בעסקה">
      <Guilloche seed="hero-flow" />
      <div className="flow-title"><b>מסלול הכסף</b><span className="kicker" style={{ margin: 0 }}>דוגמה · מלון באילת</span></div>
      <div className="flow-steps">
        <span className="flow-line" aria-hidden="true" />
        <span className="coin" aria-hidden="true"><i>₪</i></span>
        <div className="fs first"><span className="fs-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" strokeWidth="2.4" /><path d="M6 15h4M13 15h2" /></svg></span><div><b>משלמים</b><small>בכרטיס אשראי, דרך האתר. לא למוכר.</small></div><span className="amt">{ils(3150)}</span></div>
        <div className="fs vaultrow"><span className="fs-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="4" /><path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16" /></svg></span><div><b>הכסף בכספת</b><small>המוכר מעביר את ההזמנה לשמכם. אנחנו מאמתים מול המלון.</small></div><span className="pill-anim lock">נעול 🔒</span></div>
        <div className="fs last"><span className="fs-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></svg></span><div><b>צ׳ק-אין + 24 שעות</b><small>הכול תקין? הכסף עובר למוכר.</small><span className="pill-anim ok">✓ הקונה אישר</span></div><span className="amt">{ils(3150)}</span></div>
      </div>
      <div className="flow-foot"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l6 3v4c0 3.5-2.6 6.3-6 7-3.4-.7-6-3.5-6-7V4z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>לא נתנו לכם להיכנס? כל הסכום חוזר אליכם.</div>
    </aside>
  );
}
