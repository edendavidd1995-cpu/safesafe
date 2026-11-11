'use client';
import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { sb } from '@/lib/supabase';
import { ils, num, initials } from '@/lib/util';
import { Mark } from './Bits';
import { APP, initNative, registerPush, tap, lockEnabled, unlock, onResumeAfter } from '@/lib/native';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [priv, setPriv] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [unread, setUnread] = useState(0);
  const router = useRouter();
  useEffect(() => { initNative(p => router.push(p)); }, [router]);
  useEffect(() => { if (session?.user?.id) registerPush(session.user.id, p => router.push(p)); }, [session, router]);

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
    sb.from('app_settings').select('fee_pct,fee_payer').eq('id', 1).maybeSingle().then(({ data }) => data && setSettings(data));
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const toast = useCallback((msg, tone = 'ink') => {
    const id = Math.random();
    setToasts(t => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [session, loadProfile]);
  const refreshUnread = useCallback(async () => {
    const uid = session?.user?.id; if (!uid) { setUnread(0); return; }
    const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false);
    setUnread(count || 0);
  }, [session]);
  useEffect(() => {
    const uid = session?.user?.id; if (!uid) { setUnread(0); return; }
    refreshUnread();
    const ch = sb.channel('notif-' + uid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => { refreshUnread(); }).subscribe();
    const iv = setInterval(refreshUnread, 60000);
    return () => { sb.removeChannel(ch); clearInterval(iv); };
  }, [session, refreshUnread]);
  const refreshStats = useCallback(() => sb.rpc('trust_stats').then(({ data }) => data && setStats(data)), []);

  return (
    <Ctx.Provider value={{ session, user: session === undefined ? undefined : (session?.user || null), profile, priv, refreshProfile, toast, stats, refreshStats, settings, setSettings, unread, refreshUnread, isAdmin: profile?.role === 'admin' }}>
      {children}
      {APP && <AppLock />}
      <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast ${t.tone}`}>{t.msg}</div>)}</div>
    </Ctx.Provider>
  );
}

export function Header() {
  const { user, profile, stats, isAdmin, unread } = useApp();
  const path = usePathname() || '/';
  const on = p => (path === p || path === p + '/' || (p !== '/' && path.startsWith(p))) ? 'page' : undefined;
  return (
    <>
      {!APP && <div className="ledger" role="note">
        <div className="wrap ledger-in">
          <span className="ledger-dot" aria-hidden="true" />
          <span>מוחזק כרגע בנאמנות <b className="mono">{stats ? ils(stats.in_escrow) : '—'}</b></span>
          <span className="sep" aria-hidden="true">/</span>
          <span>עסקאות שהושלמו <b className="mono">{stats ? num(stats.completed) : '—'}</b></span>
          <span className="sep hide-sm" aria-hidden="true">/</span>
          <span className="hide-sm">הכסף עובר למוכר רק אחרי שהשתמשתם</span>
          <span className="ledger-demo">גרסת הדגמה · התשלום מדומה</span>
        </div>
      </div>}
      <header className="top">
        <div className="wrap top-in">
          <Link href="/" className="brand" aria-label="SafeSafe, דף הבית"><Mark /><span className="brand-word" dir="ltr">Safe<i>Safe</i></span></Link>
          <nav className="nav" aria-label="ראשי">
            <Link href="/search/" aria-current={on('/search')}>כל הפריטים</Link>
            <Link href="/trust/" aria-current={on('/trust')}>איך מוגנים</Link>
            {isAdmin && <Link href="/admin/" aria-current={on('/admin')} className="nav-admin">ניהול</Link>}
          </nav>
          <div className="top-end">
            {!APP && <Link href="/sell/" className="btn btn-sell">מכירה</Link>}
            {user === null || user === undefined
              ? <Link href="/login/" className="who-login">כניסה</Link>
              : <>
                <Link href="/me/?tab=notifications" className="bell" aria-label={unread ? `${unread} התראות חדשות` : 'התראות'}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                  {unread > 0 && <span className="bell-n">{unread > 9 ? '9+' : unread}</span>}
                </Link>
                <Link href="/me/" className="who" aria-current={on('/me')} aria-label="האזור האישי"><span className="avatar">{initials(profile?.display_name)}</span></Link>
              </>}
          </div>
        </div>
      </header>
    </>
  );
}

export function Footer() {
  if (APP) return <TabBar />;
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div className="foot-brand"><Mark /><div><b dir="ltr">SafeSafe</b><p>הזמנות וכרטיסים שמישהו לא יכול לנצל, בהגנה מלאה עד שהשתמשתם.</p></div></div>
        <div className="foot-cols">
          <div><h4>קונים</h4><Link href="/search/">כל הפריטים</Link><Link href="/trust/">הגנת קונה</Link><Link href="/me/?tab=buys">הרכישות שלי</Link></div>
          <div><h4>מוכרים</h4><Link href="/sell/">פרסום פריט</Link><Link href="/trust/#rules">כללי פרסום</Link><Link href="/me/?tab=wallet">ארנק</Link></div>
          <div><h4>עזרה</h4><Link href="/me/?tab=support">צ׳אט תמיכה</Link><Link href="/trust/#faq">שאלות נפוצות</Link><Link href="/trust/#disputes">מחלוקות והחזרים</Link></div>
          <div><h4>מידע משפטי</h4><Link href="/terms/">תקנון</Link><Link href="/privacy/">מדיניות פרטיות</Link><Link href="/accessibility/">הצהרת נגישות</Link></div>
        </div>
      </div>
      <div className="wrap foot-legal">
        <span>אב טיפוס. בגרסה החיה התשלומים יעברו דרך חברת סליקה מורשית שמחזיקה את הכסף בנאמנות.</span>
        <span className="mono">© 2026 SafeSafe</span>
      </div>
    </footer>
  );
}

const TABS = [
  ['/', 'בית', <path key="h" d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />],
  ['/search/', 'חיפוש', <><circle key="a" cx="11" cy="11" r="6.5" /><path key="b" d="m20 20-4.2-4.2" /></>],
  ['/sell/', 'מכירה', null],
  ['/me/?tab=buys', 'עסקאות', <><rect key="a" x="5" y="4" width="14" height="16" rx="2.5" /><path key="b" d="M9 9h6M9 13h6M9 17h3" /></>],
  ['/me/', 'החשבון', <><circle key="a" cx="12" cy="9" r="3.6" /><path key="b" d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2" /></>],
];

function TabBarInner() {
  const path = usePathname() || '/';
  const tab = useSearchParams()?.get('tab');
  const isOn = href => {
    if (href === '/') return path === '/';
    if (href === '/me/?tab=buys') return path.startsWith('/me') && (tab === 'buys' || tab === 'sales') || path.startsWith('/order');
    if (href === '/me/') return path.startsWith('/me') && tab !== 'buys' && tab !== 'sales';
    return path.startsWith(href.replace(/\/$/, ''));
  };
  return (
    <nav className="tabbar" aria-label="ניווט ראשי">
      {TABS.map(([href, label, icon]) => icon === null
        ? <Link key={href} href={href} className="tb-sell" onClick={tap} aria-current={isOn(href) ? 'page' : undefined}>
            <span className="tb-plus" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
            <span>{label}</span>
          </Link>
        : <Link key={href} href={href} onClick={tap} aria-current={isOn(href) ? 'page' : undefined}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
            <span>{label}</span>
          </Link>)}
    </nav>
  );
}

function TabBar() { return <Suspense fallback={null}><TabBarInner /></Suspense>; }

function AppLock() {
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState('');
  const go = useCallback(async () => {
    setErr('');
    try { await unlock(); setLocked(false); } catch { setErr('לא נפתח. נסו שוב.'); }
  }, []);
  useEffect(() => {
    if (lockEnabled()) { setLocked(true); go(); }
    let off = () => {};
    onResumeAfter(60000, () => { if (lockEnabled()) { setLocked(true); go(); } }).then(f => { off = f; });
    return () => off();
  }, [go]);
  if (!locked) return null;
  return (
    <div className="applock" role="dialog" aria-modal="true" aria-label="האפליקציה נעולה">
      <Mark />
      <b dir="ltr" className="brand-word">Safe<i>Safe</i></b>
      <p>האפליקציה נעולה</p>
      <button className="btn lg" onClick={go}>פתיחה</button>
      {err && <small>{err}</small>}
    </div>
  );
}
