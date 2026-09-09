'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Trees, Plus } from 'lucide-react';
import styles from './BottomNav.module.css';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  const isHomeActive = pathname === '/';
  const isInventoryActive = pathname.startsWith('/inventory') || (pathname.startsWith('/plants') && pathname !== '/plants/new' && pathname !== '/plants/archived');
  const isNewPlantActive = pathname === '/plants/new';

  return (
    <nav className={styles.nav} aria-label="Navegación principal inferior">
      <div className={styles.inner}>
        {/* Inicio / Dashboard */}
        <Link
          href="/"
          className={`${styles.item} ${isHomeActive ? styles.active : ''}`}
          aria-current={isHomeActive ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <LayoutDashboard size={22} />
          </span>
          <span className={styles.label}>Inicio</span>
        </Link>

        {/* Center Action: Nueva Planta */}
        <Link
          href="/plants/new"
          className={`${styles.centerAction} ${isNewPlantActive ? styles.centerActionActive : ''}`}
          aria-label="Registrar nueva planta"
          aria-current={isNewPlantActive ? 'page' : undefined}
        >
          <span className={styles.centerIconWrapper}>
            <Plus size={26} strokeWidth={2.5} />
          </span>
          <span className={styles.centerLabel}>Nueva</span>
        </Link>

        {/* Inventario */}
        <Link
          href="/inventory"
          className={`${styles.item} ${isInventoryActive ? styles.active : ''}`}
          aria-current={isInventoryActive ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <Trees size={22} />
          </span>
          <span className={styles.label}>Inventario</span>
        </Link>
      </div>
    </nav>
  );
};
