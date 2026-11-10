import { createClient } from '@supabase/supabase-js';

// Public, browser-safe values. Data is protected by Row Level Security in the database.
export const SUPABASE_URL = 'https://wcehymtzglfokcgdrlcs.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_SB0863yvIFyGP9aCzlZTOg_CLKR0_us';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Turns Postgres / auth errors into readable Hebrew
export function errText(e) {
  const m = (e && (e.message || e.error_description)) || String(e || '');
  if (/Invalid login credentials/i.test(m)) return 'האימייל או הסיסמה לא נכונים';
  if (/User already registered/i.test(m)) return 'כבר יש חשבון עם האימייל הזה. נסו להתחבר.';
  if (/Password should be at least/i.test(m)) return 'הסיסמה צריכה להיות באורך 6 תווים לפחות';
  if (/Email not confirmed/i.test(m)) return 'צריך לאשר את האימייל. בדקו את תיבת הדואר.';
  if (/rate limit/i.test(m)) return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.';
  if (/orders_one_live_per_listing/.test(m)) return 'מישהו אחר כבר קנה את הפריט הזה';
  if (/duplicate key value.*reviews/.test(m)) return 'כבר דירגת את העסקה הזו';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.';
  return m;
}

export async function sha256(file) {
  const buf = await file.arrayBuffer();
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Upload a file to the private bucket and register it (duplicate detection happens in the DB)
export async function uploadDoc(file, { kind, listing_id = null, order_id = null }) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('צריך להתחבר');
  if (file.size > 10 * 1024 * 1024) throw new Error('הקובץ גדול מ-10MB');
  const hash = await sha256(file);
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${user.id}/${kind}/${Date.now()}-${hash.slice(0, 10)}.${ext}`;
  const up = await sb.storage.from('documents').upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw up.error;
  const { data, error } = await sb.from('documents')
    .insert({ owner_id: user.id, kind, listing_id, order_id, path, file_name: file.name, sha256: hash })
    .select().single();
  if (error) throw error;
  return data;
}
