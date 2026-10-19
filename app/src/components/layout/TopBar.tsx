'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sprout, Menu, X, MapPin, Archive, LogOut, Calendar, Sun, Moon } from 'lucide-react';
import { logoutAction } from '@/features/auth/actions';
import styles from './TopBar.module.css';

export const TopBar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('atp-theme');
        if (saved === 'dark' || saved === 'light') return saved;
      } catch {
        // ignore storage errors
      }
    }
    return 'light';
  });
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      window.localStorage.setItem('atp-theme', nextTheme);
    } catch {
      // ignore storage errors
    }
  };

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

  // No renderizar TopBar en /login
  if (pathname === '/login') {
    return null;
  }

  // Cerrar menú al cambiar de ruta durante el render
  if (pathname !== currentPath) {
    setCurrentPath(pathname);
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }

  const isHomeActive = pathname === '/';
  const isInventoryActive =
    pathname === '/inventory' ||
    (pathname.startsWith('/plants/') &&
      pathname !== '/plants/new' &&
      pathname !== '/plants/archived');
  const isNewActive = pathname === '/plants/new';
  const isLocationsActive = pathname.startsWith('/locations');
  const isArchivedActive = pathname.startsWith('/plants/archived');
  const isRegionalActive = pathname.startsWith('/regional');

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

        {/* Desktop Permanent Navigation (>= 1024px) */}
        <nav className={styles.desktopNav} aria-label="Navegación principal">
          <Link
            href="/"
            className={`${styles.desktopNavLink} ${isHomeActive ? styles.desktopNavActive : ''}`}
            aria-current={isHomeActive ? 'page' : undefined}
          >
            Inicio
          </Link>
          <Link
            href="/inventory"
            className={`${styles.desktopNavLink} ${isInventoryActive ? styles.desktopNavActive : ''}`}
            aria-current={isInventoryActive ? 'page' : undefined}
          >
            Inventario
          </Link>
          <Link
            href="/plants/new"
            className={`${styles.desktopNavLink} ${isNewActive ? styles.desktopNavActive : ''}`}
            aria-current={isNewActive ? 'page' : undefined}
          >
            Nueva Planta
          </Link>
          <Link
            href="/regional"
            className={`${styles.desktopNavLink} ${isRegionalActive ? styles.desktopNavActive : ''}`}
            aria-current={isRegionalActive ? 'page' : undefined}
          >
            Este mes
          </Link>
          <Link
            href="/locations"
            className={`${styles.desktopNavLink} ${isLocationsActive ? styles.desktopNavActive : ''}`}
            aria-current={isLocationsActive ? 'page' : undefined}
          >
            Ubicaciones
          </Link>
          <Link
            href="/plants/archived"
            className={`${styles.desktopNavLink} ${isArchivedActive ? styles.desktopNavActive : ''}`}
            aria-current={isArchivedActive ? 'page' : undefined}
          >
            Archivadas
          </Link>

          <button
            type="button"
            onClick={handleToggleTheme}
            className={styles.themeToggleBtn}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            data-testid="theme-toggle-desktop"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span className={styles.themeToggleLabel}>
              {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </span>
          </button>

          <form action={logoutAction} className={styles.logoutForm}>
            <button
              type="submit"
              className={styles.logoutBtn}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              data-testid="logout-btn-desktop"
            >
              <LogOut size={16} />
            </button>
          </form>
        </nav>

        {/* Mobile Secondary Navigation Menu Toggle (< 1024px) */}
        <div className={styles.menuWrapper} ref={menuRef}>
          <div className={styles.mobileActionsRow}>
            <button
              type="button"
              onClick={handleToggleTheme}
              className={styles.themeToggleMobileBtn}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              data-testid="theme-toggle-mobile"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              className={styles.menuTrigger}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Cerrar menú secundario' : 'Abrir menú secundario'}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {isMenuOpen && (
            <div className={styles.dropdownMenu} role="menu">
              <div className={styles.menuSectionHeader}>Gestión Secundaria</div>
              <Link
                href="/regional"
                role="menuitem"
                className={`${styles.menuItem} ${pathname === '/regional' ? styles.menuItemActive : ''}`}
              >
                <Calendar size={18} />
                <span>Este mes</span>
              </Link>
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

              <div className={styles.menuDivider} />

              <button
                type="button"
                role="menuitem"
                onClick={handleToggleTheme}
                className={styles.menuItemButton}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
              </button>

              <div className={styles.menuDivider} />

              <form action={logoutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className={styles.menuItemLogout}
                  data-testid="logout-btn-mobile"
                >
                  <LogOut size={18} />
                  <span>Cerrar sesión</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

