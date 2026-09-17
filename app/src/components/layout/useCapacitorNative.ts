'use client';

import { useEffect } from 'react';

/**
 * Hook to handle native Capacitor integration on mobile platforms.
 * Handles hardware back button navigation safely without breaking web/SSR.
 */
export function useCapacitorNative() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { App } = await import('@capacitor/app');
          const handle = await App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack || window.history.length > 1) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
          cleanup = () => {
            handle.remove();
          };
        }
      } catch {
        // Safe graceful degradation if running outside native Capacitor context
      }
    };

    setup();

    return () => {
      cleanup?.();
    };
  }, []);
}
