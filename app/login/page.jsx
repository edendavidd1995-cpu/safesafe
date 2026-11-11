'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SITE } from '@/lib/native';
import { sb, errText } from '@/lib/supabase';
import { useApp } from '@/components/App';
import { Loading, Mark } from '@/components/Bits';

export default function Page() { return <Suspense fallback={<Loading />}><Login /></Suspense>; }

function Login() {
  const { user, toast } = useApp();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/me/';
  const [mode, setMode] = useState('in');
  const [f, setF] = useState({ name: '', email: '', pass: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (user && mode !== 'forgot') router.replace(next); }, [user, next, router, mode]);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setErr('');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('כתובת האימייל לא תקינה');
    if (mode === 'forgot') {
      setBusy(true);
      const { error } = await sb.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: SITE + '/reset/' });
      setBusy(false);
      if (error) return setErr(errText(error));
      return setSent('reset');
    }
    if (f.pass.length < 8) return setErr('הסיסמה צריכה להיות באורך 8 תווים לפחות');
    setBusy(true);
    if (mode === 'up') {
      if (f.name.trim().split(/\s+/).length < 2) { setBusy(false); return setErr('צריך שם פרטי ושם משפחה'); }
      const redirect = SITE + '/me/';
      const { data, error } = await sb.auth.signUp({ email: f.email.trim(), password: f.pass, options: { data: { display_name: f.name.trim() }, emailRedirectTo: redirect } });
      setBusy(false);
      if (error) return setErr(errText(error));
      if (!data.session) return setSent(true);
      toast('החשבון נפתח', 'ok');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: f.email.trim(), password: f.pass });
      setBusy(false);
      if (error) return setErr(errText(error));
      toast('התחברת', 'ok');
    }
  };

  if (sent) return (
    <div className="wrap auth"><div className="card"><h1 style={{ fontSize: 30 }}>בדקו את המייל</h1><p className="muted">{sent === 'reset' ? <>אם יש חשבון עם <span dir="ltr">{f.email}</span>, שלחנו אליו קישור לבחירת סיסמה חדשה. הקישור תקף לשעה.</> : <>שלחנו קישור לאישור החשבון ל-<span dir="ltr">{f.email}</span>. אחרי האישור תחזרו לכאן מחוברים.</>}</p><button className="link" onClick={() => { setSent(false); setMode('in'); }}>חזרה לכניסה</button></div></div>
  );

  return (
    <div className="wrap auth">
      <form className="card" onSubmit={submit} noValidate>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Mark size={38} /><h1 style={{ fontSize: 30 }}>{mode === 'in' ? 'כניסה' : mode === 'up' ? 'פתיחת חשבון' : 'שכחתי סיסמה'}</h1></div>
        {mode !== 'forgot' && <div className="tabs2" role="group" aria-label="סוג פעולה">
          <button type="button" aria-pressed={mode === 'in'} onClick={() => { setMode('in'); setErr(''); }}>יש לי חשבון</button>
          <button type="button" aria-pressed={mode === 'up'} onClick={() => { setMode('up'); setErr(''); }}>חשבון חדש</button>
        </div>}
        {mode === 'forgot' && <p className="muted">כתבו את האימייל של החשבון, ונשלח קישור לבחירת סיסמה חדשה.</p>}
        {mode === 'up' && <div className="field"><label htmlFor="n">שם מלא, כמו בתעודה</label><input id="n" autoComplete="name" value={f.name} onChange={set('name')} /></div>}
        <div className="field"><label htmlFor="e">אימייל</label><input id="e" type="email" dir="ltr" autoComplete="email" value={f.email} onChange={set('email')} /></div>
        {mode !== 'forgot' && <div className="field"><label htmlFor="p">סיסמה</label><input id="p" type="password" dir="ltr" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={f.pass} onChange={set('pass')} />{mode === 'in' && <button type="button" className="link" style={{ justifySelf: 'start', fontSize: 14 }} onClick={() => { setMode('forgot'); setErr(''); }}>שכחתי סיסמה</button>}</div>}
        <div className="err" role="alert">{err}</div>
        <button className="btn lg block" disabled={busy}>{busy ? 'רגע…' : mode === 'in' ? 'כניסה' : mode === 'up' ? 'פתיחת חשבון' : 'שליחת קישור'}</button>
        {mode === 'forgot' && <button type="button" className="link" style={{ justifySelf: 'center' }} onClick={() => { setMode('in'); setErr(''); }}>חזרה לכניסה</button>}
        <p className="muted" style={{ fontSize: 13 }}>בפתיחת חשבון את/ה מאשר/ת את <Link href="/terms/" className="link">התקנון</Link> ואת <Link href="/privacy/" className="link">מדיניות הפרטיות</Link>. פרטים אישיים ומסמכים נשמרים מוצפנים ונגישים רק לך ולצוות הבדיקה.</p>
      </form>
    </div>
  );
}
