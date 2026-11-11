// Sends an iPhone push (APNs) for every row inserted into public.notifications.
// Called by the database trigger `notifications_push` (see migrations/…_push_devices.sql).
//
// Secrets (set in Supabase → Edge Functions → Secrets once the Apple key exists):
//   APNS_KEY          contents of the AuthKey_XXXX.p8 file
//   APNS_KEY_ID       the 10-character key id
//   APNS_TEAM_ID      Apple developer team id
//   APNS_BUNDLE_ID    il.co.safesafe.app
//   APNS_ENV          "production" for TestFlight / App Store, "sandbox" for Xcode runs
import { createClient } from 'jsr:@supabase/supabase-js@2';

const env = (k: string) => Deno.env.get(k) ?? '';
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ''; bytes.forEach(x => s += String.fromCharCode(x));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let cached: { jwt: string; at: number } | null = null;
async function apnsJwt() {
  if (cached && Date.now() - cached.at < 40 * 60 * 1000) return cached.jwt; // Apple: refresh at most every 20–60 min
  const pem = env('APNS_KEY').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: env('APNS_KEY_ID') }));
  const body = b64url(JSON.stringify({ iss: env('APNS_TEAM_ID'), iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${body}`));
  cached = { jwt: `${head}.${body}.${b64url(sig)}`, at: Date.now() };
  return cached.jwt;
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  // the caller must be our database trigger: it sends the vault secret, which only the DB can check
  const hook = req.headers.get('x-hook-secret') ?? '';
  const { data: ok } = hook ? await db.rpc('check_push_secret', { p_secret: hook }) : { data: false };
  if (!ok) return new Response('forbidden', { status: 403 });
  if (!env('APNS_KEY') || !env('APNS_KEY_ID') || !env('APNS_TEAM_ID')) return Response.json({ skipped: 'apns not configured' });

  const { notification_id } = await req.json().catch(() => ({}));
  if (!notification_id) return new Response('bad request', { status: 400 });

  const { data: n } = await db.from('notifications').select('id,user_id,title,body,link').eq('id', notification_id).maybeSingle();
  if (!n) return Response.json({ skipped: 'no notification' });
  const [{ data: devices }, { count }] = await Promise.all([
    db.from('device_tokens').select('token').eq('user_id', n.user_id).eq('platform', 'ios'),
    db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', n.user_id).eq('read', false),
  ]);
  if (!devices?.length) return Response.json({ sent: 0 });

  const host = env('APNS_ENV') === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const jwt = await apnsJwt();
  const payload = JSON.stringify({ aps: { alert: { title: n.title, body: n.body ?? '' }, sound: 'default', badge: count ?? 1 }, link: n.link ?? '/me/?tab=notifications' });
  let sent = 0;
  for (const { token } of devices) {
    const r = await fetch(`https://${host}/3/device/${token}`, {
      method: 'POST', body: payload,
      headers: { authorization: `bearer ${jwt}`, 'apns-topic': env('APNS_BUNDLE_ID') || 'il.co.safesafe.app', 'apns-push-type': 'alert', 'apns-priority': '10' },
    });
    if (r.ok) sent++;
    else if (r.status === 410 || r.status === 400) {
      const why = (await r.json().catch(() => ({}))).reason;
      if (r.status === 410 || why === 'BadDeviceToken' || why === 'DeviceTokenNotForTopic') await db.from('device_tokens').delete().eq('token', token);
    }
  }
  return Response.json({ sent });
});
