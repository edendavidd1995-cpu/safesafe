import Link from 'next/link';

export function LegalPage({ kicker, title, updated, children }) {
  return (
    <div className="wrap">
      <div className="page-head"><span className="kicker">{kicker}</span><h1>{title}</h1><p className="muted" style={{ marginTop: 8 }}>עודכן לאחרונה: {updated}</p></div>
      <div className="prose legal">
        <div className="note warn" style={{ marginBottom: 24 }}>נוסח ראשוני של אב טיפוס. לפני השקה מסחרית הנוסח ייבדק על ידי עורך דין ויושלמו פרטי החברה.</div>
        {children}
        <p style={{ marginTop: 36 }}>שאלות? <Link href="/me/?tab=support" className="link">כתבו לנו בצ׳אט התמיכה</Link>.</p>
      </div>
    </div>
  );
}
