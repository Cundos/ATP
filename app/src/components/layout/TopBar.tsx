'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sprout, Menu, X, MapPin, Archive } from 'lucide-react';
import styles from './TopBar.module.css';

export const TopBar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al cambiar de ruta durante el render
  if (pathname !== currentPath) {
    setCurrentPath(pathname);
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }

  // Cerrar menú al presionar Escape o hacer click fuera

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Brand */}
        <Link href="/" className={styles.brand} aria-label="Atilio Plants Inicio">
          <span className={styles.brandIcon}>
            <Sprout size={24} />
          </span>
          <span className={styles.brandName}>Atilio Plants</span>
        </Link>

        {/* Secondary Navigation Menu Toggle */}
        <div className={styles.menuWrapper} ref={menuRef}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Cerrar menú secundario' : 'Abrir menú secundario'}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {isMenuOpen && (
            <div className={styles.dropdownMenu} role="menu">
              <div className={styles.menuSectionHeader}>Gestión Secundaria</div>
              <Link
                href="/locations"
                role="menuitem"
                className={`${styles.menuItem} ${pathname === '/locations' ? styles.menuItemActive : ''}`}
              >
                <MapPin size={18} />
                <span>Ubicaciones</span>
              </Link>
              <Link
                href="/plants/archived"
                role="menuitem"
                className={`${styles.menuItem} ${pathname === '/plants/archived' ? styles.menuItemActive : ''}`}
              >
                <Archive size={18} />
                <span>Plantas Archivadas</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
