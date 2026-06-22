import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

// Poppins is the typeface from the launch landing-page design.
// Self-hosted via next/font (zero external request from the browser).
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'JoinEvents.in — Find Events. Book Stalls. Grow Your Business.',
    template: '%s · JoinEvents.in',
  },
  description:
    'JoinEvents is the upcoming hyperlocal platform where event organizers and stall owners connect — society fairs, carnivals, exhibitions and pop-up markets across Delhi NCR.',
  manifest: '/manifest.json',
  applicationName: 'JoinEvents',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JoinEvents',
  },
  openGraph: {
    title: 'JoinEvents.in — Launching Soon in Delhi NCR',
    description:
      'Find events. Book stalls. Grow your business. The upcoming home for society events and stall vendors.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#ff6b35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="min-h-screen overflow-x-hidden bg-cream-100 font-sans text-ink-700 antialiased">
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
