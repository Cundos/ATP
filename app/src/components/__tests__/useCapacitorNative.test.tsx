// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCapacitorNative } from '../layout/useCapacitorNative';

describe('useCapacitorNative hook (ATP-MOB-001)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no ejecuta listeners en entorno web no nativo', async () => {
    const removeMock = vi.fn();
    const addListenerMock = vi.fn().mockResolvedValue({ remove: removeMock });

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));

    vi.doMock('@capacitor/app', () => ({
      App: {
        addListener: addListenerMock,
      },
    }));

    renderHook(() => useCapacitorNative());

    // Allow any async import to resolve
    await new Promise((r) => setTimeout(r, 20));

    expect(addListenerMock).not.toHaveBeenCalled();
  });

  it('registra y limpia el listener de backButton cuando corre en plataforma nativa', async () => {
    const removeMock = vi.fn();
    const addListenerMock = vi.fn().mockResolvedValue({ remove: removeMock });

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor/app', () => ({
      App: {
        addListener: addListenerMock,
        exitApp: vi.fn(),
      },
    }));

    const { unmount } = renderHook(() => useCapacitorNative());

    // Allow async import to resolve
    await new Promise((r) => setTimeout(r, 20));

    expect(addListenerMock).toHaveBeenCalledWith('backButton', expect.any(Function));

    unmount();
    expect(removeMock).toHaveBeenCalled();
  });
});
