'use client';
import { useState } from 'react';
import { sb, errText } from '@/lib/supabase';
import { useApp } from './App';

// WhatsApp OTP is simulated in the prototype (code 1234). In production: send via WhatsApp Business API from a server function.
export function PhoneVerify({ onDone }) {
  const { refreshProfile, toast } = useApp();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const send = () => {
    setErr('');
    if (!/^05\d{8}$/.test(phone.replace(/[\s-]/g, ''))) return setErr('צריך מספר נייד ישראלי, למשל 052-1234567');
    setStep('code');
  };
  const verify = async () => {
    if (code.trim() !== '1234') return setErr('הקוד לא נכון. בהדגמה הקוד הוא 1234');
    const { error } = await sb.rpc('mark_phone_verified', { p_phone: phone });
    if (error) return setErr(errText(error));
    await refreshProfile(); toast('הטלפון אומת', 'ok'); onDone && onDone();
  };

  return step === 'phone' ? (
    <div className="stack" style={{ gap: 10 }}>
      <div className="field"><label htmlFor="ph">מספר נייד עם וואטסאפ</label><input id="ph" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="050-0000000" value={phone} onChange={e => setPhone(e.target.value)} /></div>
      <div className="err" role="alert">{err}</div>
      <button className="btn vault" onClick={send}>שליחת קוד בוואטסאפ</button>
    </div>
  ) : (
    <div className="stack" style={{ gap: 10 }}>
      <div className="note ok">שלחנו קוד ל-<span dir="ltr">{phone}</span>. בהדגמה הקוד הוא <b className="mono">1234</b>.</div>
      <div className="field"><label htmlFor="pc">קוד</label><input id="pc" className="mono" inputMode="numeric" maxLength={4} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} style={{ letterSpacing: '.5em', textAlign: 'center', fontSize: 22 }} autoFocus /></div>
      <div className="err" role="alert">{err}</div>
      <div className="actions"><button className="btn vault" onClick={verify}>אימות</button><button className="btn ghost" onClick={() => { setStep('phone'); setErr(''); }}>שינוי מספר</button></div>
    </div>
  );
}
