# SafeSafe לאייפון

האפליקציה עוטפת את האתר (Next.js static export) עם Capacitor 8.

## מה יש בה
- סרגל לשוניות תחתון: בית, חיפוש, מכירה, עסקאות, החשבון
- התראות Push (APNs) דרך פונקציית `push` ב-Supabase
- נעילה עם Face ID (מופעלת מ"פרופיל ואימות")
- מצלמה וגלריה להעלאת תעודה ואישור הזמנה
- אייקון ומסך פתיחה סגולים, מסך אנכי בלבד, אייפון בלבד

## בנייה על ה-Mac
```bash
npm ci                 # מתקין את הפלאגינים ש-Xcode צריך (Swift Package Manager)
npm run app:build      # בונה את האתר במצב אפליקציה ומעתיק ל-ios/App/App/public
npm run app:open       # פותח את הפרויקט ב-Xcode
```
ב-Xcode: Signing & Capabilities → בוחרים Team. Bundle ID: `il.co.safesafe.app`.
להעלאה: Product → Archive → Distribute App → App Store Connect.

## התראות Push
1. ב-developer.apple.com → Keys → מפתח חדש עם Apple Push Notifications service. מורידים את קובץ ה-p8.
2. ב-Supabase → Edge Functions → Secrets: `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_ENV`.
