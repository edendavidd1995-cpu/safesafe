// Native (Capacitor) glue. Everything here is a no-op on the website.
// The app build sets NEXT_PUBLIC_APP=1 (see `npm run app:build`).
import { sb } from './supabase';

export const APP = process.env.NEXT_PUBLIC_APP === '1';
// Links that leave the app (email confirmation, password reset) must point at the real site,
// because inside the app location.origin is capacitor://localhost.
export const SITE = APP ? 'https://safesafe.co.il' : (typeof location !== 'undefined' ? location.origin + (process.env.NEXT_PUBLIC_BASE || '') : '');

export async function tap() {
  if (!APP) return;
  try { const { Haptics, ImpactStyle } = await import('@capacitor/haptics'); await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}

let started = false;
// Called once from AppProvider. `go` is router.push.
export async function initNative(go) {
  if (!APP || started) return; started = true;
  try {
    const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
      import('@capacitor/status-bar'), import('@capacitor/splash-screen'), import('@capacitor/app'),
    ]);
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {}); // light text on the violet header
    SplashScreen.hide().catch(() => {});
    // https://safesafe.co.il/order/?id=… opened from mail/WhatsApp → open inside the app
    App.addListener('appUrlOpen', ({ url }) => {
      try { const u = new URL(url); if (/safesafe\.co\.il$/.test(u.hostname)) go(u.pathname + u.search); } catch {}
    });
  } catch {}
}

// Registers this iPhone for push and stores the token for the signed-in user.
let pushUser = null;
export async function registerPush(uid, go) {
  if (!APP || !uid || pushUser === uid) return; pushUser = uid;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners();
    PushNotifications.addListener('registration', async ({ value }) => {
      try { localStorage.setItem('ss_push', value); } catch {}
      await sb.rpc('register_device', { p_token: value, p_platform: 'ios' });
    });
    // Tapping a notification opens the screen it points at (order page, etc.)
    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const link = notification?.data?.link; if (link) go(link);
    });
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PushNotifications.requestPermissions();
    if (perm.receive === 'granted') await PushNotifications.register();
  } catch {}
}

export async function unregisterPush() {
  if (!APP) return;
  pushUser = null;
  try { const t = localStorage.getItem('ss_push'); if (t) await sb.rpc('unregister_device', { p_token: t }); } catch {}
}

// ---- Face ID app lock (opt-in from the profile tab) ----
const LOCK_KEY = 'ss_faceid';
export const lockEnabled = () => { try { return APP && localStorage.getItem(LOCK_KEY) === '1'; } catch { return false; } };
export const setLockEnabled = on => { try { on ? localStorage.setItem(LOCK_KEY, '1') : localStorage.removeItem(LOCK_KEY); } catch {} };

export async function biometry() {
  if (!APP) return { available: false };
  try {
    const { BiometricAuth, BiometryType } = await import('@aparajita/capacitor-biometric-auth');
    const r = await BiometricAuth.checkBiometry();
    const name = r.biometryType === BiometryType.faceId ? 'Face ID' : r.biometryType === BiometryType.touchId ? 'Touch ID' : 'קוד המכשיר';
    return { available: r.isAvailable || r.deviceIsSecure, name };
  } catch { return { available: false }; }
}

export async function unlock() {
  const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
  await BiometricAuth.authenticate({ reason: 'פתיחת SafeSafe', cancelTitle: 'ביטול', allowDeviceCredential: true, iosFallbackTitle: 'קוד המכשיר' });
}

// Calls cb(true) when the app returns after more than `ms` in the background.
export async function onResumeAfter(ms, cb) {
  if (!APP) return () => {};
  const { App } = await import('@capacitor/app');
  let left = 0;
  const h = await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) left = Date.now(); else if (left && Date.now() - left > ms) cb(true);
  });
  return () => h.remove();
}
