import React from 'react';
import { Metadata } from 'next';
import { Sprout } from 'lucide-react';
import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: 'Acceso Privado | Atilio Plants',
  description: 'Ingreso al herbario y catálogo botánico privado de Atilio Plants',
  robots: {
    index: false,
    follow: false,
  },
};

interface LoginPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from } = await searchParams;

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Sprout size={36} className={styles.logoIcon} aria-hidden="true" />
          <h1 className={styles.title}>Atilio Plants</h1>
          <p className={styles.subtitle}>
            Herbario botánico y gestión de ejemplares. Aplicación privada.
          </p>
        </header>

        <LoginForm returnTo={from || '/'} />

        <p className={styles.footerNote}>
          Atilio Plants &copy; 2026 &middot; Acceso protegido
        </p>
      </div>
    </main>
  );
}
