import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Atilio Plants — Registro y Cuidados Botánicos',
  description: 'Aplicación mobile-first para registro, seguimiento y cuidados de colección botánica doméstica.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}


