export const FEE = 0.10; // charged to the seller

export const CATS = {
  hotel:    { he: 'מלונות',        one: 'הזמנת מלון',     code: 'HTL', place: 'מלון',   dated: 'צ\'ק-אין' },
  vacation: { he: 'חבילות נופש',   one: 'חבילת נופש',     code: 'PKG', place: 'חבילה',  dated: 'יציאה' },
  concert:  { he: 'הופעות',        one: 'כרטיס להופעה',   code: 'CNC', place: 'מקום',   dated: 'תאריך' },
  sports:   { he: 'ספורט',         one: 'כרטיס למשחק',    code: 'SPT', place: 'אצטדיון', dated: 'תאריך' },
  festival: { he: 'פסטיבלים',      one: 'כרטיס לפסטיבל',  code: 'FST', place: 'מתחם',   dated: 'פתיחה' },
  cruise:   { he: 'הפלגות',        one: 'הפלגה',          code: 'CRS', place: 'אונייה',  dated: 'הפלגה' },
  flight:   { he: 'טיסות',         one: 'כרטיס טיסה',     code: 'FLT', place: 'חברה',   dated: 'המראה', soon: true },
};
export const CAT_KEYS = ['hotel', 'concert', 'sports', 'festival', 'vacation', 'cruise', 'flight'];

const isStay = c => ['hotel', 'vacation', 'cruise'].includes(c);

export function steps(cat) {
  const stay = isStay(cat);
  return [
    { t: 'שולם', d: 'הכסף מוחזק בנאמנות. המוכר לא יכול לגעת בו.' },
    { t: stay ? 'השם הועבר' : 'הכרטיס הועבר', d: stay ? 'המוכר העביר את ההזמנה לשם הקונה מול הספק' : 'המוכר העביר את הכרטיס לחשבון או לשם של הקונה' },
    { t: 'אומת', d: 'הקונה או הצוות וידאו שההזמנה רשומה על שם הקונה' },
    { t: stay ? 'צ\'ק-אין' : 'האירוע', d: stay ? 'הקונה הגיע ונכנס' : 'הקונה נכנס לאירוע' },
    { t: 'שוחרר', d: 'הכסף הועבר למוכר, פחות עמלה' },
  ];
}

export const ils = n => '₪' + Math.round(Number(n) || 0).toLocaleString('he-IL');
export const num = n => Math.round(Number(n) || 0).toLocaleString('he-IL');
const D = s => new Date(String(s).length <= 10 ? s + 'T12:00:00' : s);
const fShort = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });
const fLong = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fDT = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const dShort = s => s ? fShort.format(D(s)) : '';
export const dLong = s => s ? fLong.format(D(s)) : '';
export const dTime = s => s ? fDT.format(D(s)) : '';
export const nights = l => l.ends_on ? Math.max(1, Math.round((D(l.ends_on) - D(l.starts_on)) / 864e5)) : 0;
export const dateRange = l => l.ends_on && l.ends_on !== l.starts_on ? `${dShort(l.starts_on)} – ${dShort(l.ends_on)}` : dShort(l.starts_on);
export const off = l => Math.max(0, Math.round((1 - l.price / l.original_price) * 100));
export const daysUntil = s => Math.ceil((D(s) - new Date()) / 864e5);
export const ago = s => {
  const m = Math.round((Date.now() - new Date(s)) / 6e4);
  if (m < 60) return `לפני ${Math.max(1, m)} דק׳`;
  const h = Math.round(m / 60); if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.round(h / 24); return d < 30 ? `לפני ${d} ימים` : `לפני ${Math.round(d / 30)} חודשים`;
};
export const memberSince = s => { const m = Math.round((Date.now() - new Date(s)) / (864e5 * 30)); return m < 1 ? 'הצטרף החודש' : `חבר ${m} חודשים`; };
export const shortRef = id => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
export const initials = n => String(n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('');

export function orderStatus(o) {
  if (o.refunded) return { t: 'הוחזר לקונה', tone: 'bad' };
  if (o.partial_refund) return { t: 'הוכרע · החזר חלקי', tone: 'warn' };
  if (o.frozen) return { t: 'מוקפא לבדיקה', tone: 'bad' };
  if (o.step >= 4) return { t: 'הושלם', tone: 'ok' };
  return { t: 'בנאמנות', tone: 'vault' };
}

export const ACTION_HE = {
  paid: 'תשלום', transferred: 'העברה', verified: 'אימות', used: 'שימוש', released: 'שחרור כסף', refunded: 'החזר',
  partial_refund: 'החזר חלקי', dispute_opened: 'מחלוקת', dispute_response: 'תגובה', order_frozen: 'עצירה', order_unfrozen: 'שחרור עצירה',
  listing_approved: 'אישור מודעה', listing_rejected: 'דחיית מודעה', info_requested: 'בקשת מסמך', listing_removed: 'הורדת מודעה',
  user_blocked: 'חסימה', user_unblocked: 'הסרת חסימה', id_verified: 'אימות זהות', id_rejected: 'דחיית זהות', duplicate_document: 'מסמך כפול',
};
export const FLAG_HE = { price_above_original: 'מחיר גבוה מהמקור', duplicate_document: 'מסמך שכבר הועלה בעבר' };

export const SELLER_COLS = 'seller:profiles!listings_seller_id_fkey(id,display_name,rating_avg,rating_count,sales_count,id_status,phone_verified,created_at)';
