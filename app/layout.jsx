import './globals.css';
import { AppProvider, Header, Footer } from '@/components/App';

export const metadata = {
  title: 'SafeSafe · הזמנות וכרטיסים ביד שנייה, בהגנה מלאה',
  description: 'קונים ומוכרים הזמנות מלון, חופשות וכרטיסים שאי אפשר לנצל. הכסף נשמר בנאמנות ומשתחרר למוכר רק אחרי שהשתמשתם.',
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#15171B' };

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='1' y='1' width='30' height='30' rx='7' fill='%2315171B'/%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23F3EFE6' stroke-width='1.6'/%3E%3Cline x1='16' y1='16' x2='16' y2='9.5' stroke='%23E04A2B' stroke-width='2.2' stroke-linecap='round'/%3E%3C/svg%3E" />
      </head>
      <body>
        <AppProvider>
          <a href="#main" className="skip">דילוג לתוכן</a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
