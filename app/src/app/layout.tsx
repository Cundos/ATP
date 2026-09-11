import type { Metadata } from 'next';
import { Lora, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout';

const serifFont = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const sansFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Atilio Plants — Herbario Contemporáneo',
  description: 'Catálogo botánico contemporáneo y seguimiento de colección botánica doméstica.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${serifFont.variable} ${sansFont.variable} ${monoFont.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}


