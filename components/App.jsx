'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '@/lib/supabase';
import { ils, num, initials } from '@/lib/util';
import { Mark } from './Bits';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [priv, setPriv] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [stats, setStats] = useState(null);

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); setPriv(null); return; }
    const [{ data: p }, { data: q }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('profile_private').select('*').eq('id', uid).maybeSingle(),
    ]);
    setProfile(p); setPriv(q);
  }, []);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); loadProfile(data.session?.user?.id); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); loadProfile(s?.user?.id); });
    sb.rpc('trust_stats').then(({ data }) => data && setStats(data));
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const toast = useCallback((msg, tone = 'ink') => {
    const id = Math.random();
    setToasts(t => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [session, loadProfile]);
  const refreshStats = useCallback(() => sb.rpc('trust_stats').then(({ data }) => data && setStats(data)), []);

  return (
    <Ctx.Provider value={{ session, user: session?.user || null, profile, priv, refreshProfile, toast, stats, refreshStats, isAdmin: profile?.role === 'admin' }}>
      {children}
      <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast ${t.tone}`}>{t.msg}</div>)}</div>
    </Ctx.Provider>
  );
}

export function Header() {
  const { user, profile, stats, isAdmin } = useApp();
  const path = usePathname() || '/';
  const on = p => (path === p || path === p + '/' || (p !== '/' && path.startsWith(p))) ? 'page' : undefined;
  return (
    <>
      <div className="ledger" role="note">
        <div className="wrap ledger-in">
          <span className="ledger-dot" aria-hidden="true" />
          <span>מוחזק כרגע בנאמנות <b className="mono">{stats ? ils(stats.in_escrow) : '—'}</b></span>
          <span className="sep" aria-hidden="true">/</span>
          <span>עסקאות שהושלמו <b className="mono">{stats ? num(stats.completed) : '—'}</b></span>
          <span className="sep hide-sm" aria-hidden="true">/</span>
          <span className="hide-sm">הכסף עובר למוכר רק אחרי שהשתמשתם</span>
          <span className="ledger-demo">גרסת הדגמה · התשלום מדומה</span>
        </div>
      </div>
      <header className="top">
        <div className="wrap top-in">
          <Link href="/" className="brand" aria-label="SafeSafe, דף הבית"><Mark /><span className="brand-word" dir="ltr">Safe<i>Safe</i></span></Link>
          <nav className="nav" aria-label="ראשי">
            <Link href="/search/" aria-current={on('/search')}>כל הפריטים</Link>
            <Link href="/trust/" aria-current={on('/trust')}>איך מוגנים</Link>
            {isAdmin && <Link href="/admin/" aria-current={on('/admin')} className="nav-admin">ניהול</Link>}
          </nav>
          <div className="top-end">
            <Link href="/sell/" className="btn btn-sell">מכירה</Link>
            {user === null || user === undefined
              ? <Link href="/login/" className="who-login">כניסה</Link>
              : <Link href="/me/" className="who" aria-current={on('/me')} aria-label="האזור האישי"><span className="avatar">{initials(profile?.display_name)}</span></Link>}
          </div>
        </div>
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div className="foot-brand"><Mark /><div><b dir="ltr">SafeSafe</b><p>הזמנות וכרטיסים שמישהו לא יכול לנצל, בהגנה מלאה עד שהשתמשתם.</p></div></div>
        <div className="foot-cols">
          <div><h4>קונים</h4><Link href="/search/">כל הפריטים</Link><Link href="/trust/">הגנת קונה</Link><Link href="/me/?tab=buys">הרכישות שלי</Link></div>
          <div><h4>מוכרים</h4><Link href="/sell/">פרסום פריט</Link><Link href="/trust/#rules">כללי פרסום</Link><Link href="/me/?tab=wallet">ארנק</Link></div>
          <div><h4>עזרה</h4><Link href="/me/?tab=support">צ׳אט תמיכה</Link><Link href="/trust/#faq">שאלות נפוצות</Link><Link href="/trust/#disputes">מחלוקות והחזרים</Link></div>
        </div>
      </div>
      <div className="wrap foot-legal">
        <span>אב טיפוס. בגרסה החיה התשלומים יעברו דרך חברת סליקה מורשית שמחזיקה את הכסף בנאמנות.</span>
        <span className="mono">© 2026 SafeSafe</span>
      </div>
    </footer>
  );
}
