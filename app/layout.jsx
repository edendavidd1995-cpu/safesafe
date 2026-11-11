import './globals.css';
import { AppProvider, Header, Footer } from '@/components/App';
import { APP } from '@/lib/native';

export const metadata = {
  title: 'SafeSafe · הזמנות וכרטיסים ביד שנייה, בהגנה מלאה',
  description: 'קונים ומוכרים הזמנות מלון, חופשות וכרטיסים שאי אפשר לנצל. הכסף נשמר בנאמנות ומשתחרר למוכר רק אחרי שהשתמשתם.',
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#5B3DF5', viewportFit: 'cover', ...(APP ? { maximumScale: 1, userScalable: false } : {}) };

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={APP ? 'app' : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='1' y='1' width='30' height='30' rx='7' fill='%235B3DF5'/%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23F3EFE6' stroke-width='1.6'/%3E%3Cline x1='16' y1='16' x2='16' y2='9.5' stroke='%2319C39B' stroke-width='2.2' stroke-linecap='round'/%3E%3C/svg%3E" />
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
