'use client';
import { useState } from 'react';
import { uploadDoc, errText, sb } from '@/lib/supabase';
import { useApp } from './App';

export function IdUpload() {
  const { profile, refreshProfile, toast, isAdmin } = useApp();
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const st = profile?.id_status;

  if (st === 'verified') return <div className="banner ok"><span><b>הזהות אומתה.</b> אפשר לפרסם ולקבל כסף ממכירות.</span></div>;
  if (st === 'pending') return <div className="banner"><span><b>התעודה התקבלה ונמצאת בבדיקה.</b> אפשר כבר לפרסם. הכסף ממכירות ישתחרר אחרי האימות.</span>{isAdmin && <button className="btn sm" onClick={async () => { await sb.rpc('admin_verify_self_id'); refreshProfile(); }}>אימות עצמי (מנהל)</button>}</div>;

  const send = async () => {
    setErr('');
    if (!file) return setErr('צריך לבחור קובץ');
    setBusy(true);
    try { await uploadDoc(file, { kind: 'identity' }); await refreshProfile(); toast('התעודה נשלחה לבדיקה', 'ok'); }
    catch (e) { setErr(errText(e)); }
    setBusy(false);
  };
  return (
    <div className="stack" style={{ gap: 10 }}>
      {st === 'rejected' && <div className="note bad">התעודה הקודמת נדחתה. העלו צילום ברור של כל התעודה.</div>}
      <p className="muted">לפי דרישות הרגולציה וחברת הסליקה, כל מוכר מאמת זהות פעם אחת. התעודה נשמרת בכספת מוצפנת ורק צוות הבדיקה רואה אותה.</p>
      <div className={`drop ${file ? 'has' : ''}`}>
        <label htmlFor="idf" style={{ fontWeight: 600 }}>צילום תעודת זהות, רישיון נהיגה או דרכון</label>
        <input id="idf" type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0] || null)} />
      </div>
      <div className="err" role="alert">{err}</div>
      <button className="btn vault" onClick={send} disabled={busy} style={{ justifySelf: 'start' }}>{busy ? 'מעלה…' : 'שליחה לאימות'}</button>
    </div>
  );
}
