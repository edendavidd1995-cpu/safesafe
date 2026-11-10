# SafeSafe

מרקטפלייס ישראלי לקנייה ומכירה של הזמנות מלון, חופשות וכרטיסים שאי אפשר לנצל, עם כסף בנאמנות עד אחרי השימוש.

- **Frontend:** Next.js (static export) · GitHub Pages
- **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security)
- **Escrow logic:** פונקציות SQL (`buy_listing`, `advance_order`, `open_dispute`, `admin_resolve_dispute`…) כך שהלקוח לא יכול לשנות סטטוס עסקה ישירות.
- **הגנות:** אימות זהות, בדיקת מודעות ידנית, זיהוי מסמכים כפולים (SHA-256), נעילת פריט אחד לקונה אחד, הקפאת כסף במחלוקת, יומן פעולות מלא.

אב טיפוס: התשלום מדומה. בגרסה החיה יחובר ספק סליקה מורשה שמחזיק את הכסף בנאמנות.

```bash
npm install
npm run dev
```
