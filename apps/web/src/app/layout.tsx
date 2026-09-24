import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { CartProvider } from '../context/CartContext';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';

export const metadata: Metadata = {
  title: 'SRK Canteen — Smart College Canteen & Fast Food Order System',
  description: 'SRK Canteen — Order online, pickup at your counter with instant UPI verification',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-orange-50/20 text-gray-900 min-h-screen flex flex-col antialiased selection:bg-orange-200">
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <Navbar />
              <main className="flex-1 pb-24">{children}</main>
              <BottomNav />
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
