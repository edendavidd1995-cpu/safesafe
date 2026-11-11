'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb, errText } from '@/lib/supabase';
import { useApp } from '@/components/App';
import { Mark } from '@/components/Bits';

// Landing page for the "forgot password" email link. Supabase puts a recovery session in the URL.
export default function Reset() {
  const { toast } = useApp();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = sb.auth.onAuthStateChange((ev, s) => { if (ev === 'PASSWORD_RECOVERY' || s) setReady(true); });
    sb.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    const t = setTimeout(() => setReady(r => r || 'expired'), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const save = async e => {
    e.preventDefault(); setErr('');
    if (p1.length < 8) return setErr('הסיסמה צריכה להיות באורך 8 תווים לפחות');
    if (p1 !== p2) return setErr('הסיסמאות לא זהות');
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) return setErr(errText(error));
    toast('הסיסמה עודכנה', 'ok');
    router.replace('/me/');
  };

  return (
    <div className="wrap auth">
      <form className="card" onSubmit={save} noValidate>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Mark size={38} /><h1 style={{ fontSize: 30 }}>סיסמה חדשה</h1></div>
        {ready === 'expired' ? <>
          <p className="muted">הקישור לא תקין או שפג תוקפו. אפשר לבקש קישור חדש.</p>
          <Link href="/login/" className="btn block">חזרה לכניסה</Link>
        </> : !ready ? <p className="muted">בודקים את הקישור…</p> : <>
          <div className="field"><label htmlFor="p1">סיסמה חדשה</label><input id="p1" type="password" dir="ltr" autoComplete="new-password" value={p1} onChange={e => setP1(e.target.value)} /><small className="hint">לפחות 8 תווים</small></div>
          <div className="field"><label htmlFor="p2">שוב, לאימות</label><input id="p2" type="password" dir="ltr" autoComplete="new-password" value={p2} onChange={e => setP2(e.target.value)} /></div>
          <div className="err" role="alert">{err}</div>
          <button className="btn lg block" disabled={busy}>{busy ? 'שומר…' : 'שמירת הסיסמה'}</button>
        </>}
      </form>
    </div>
  );
}
