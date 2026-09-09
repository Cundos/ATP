// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationListView } from '../components/LocationListView';
import { LocationFormSchema } from '../schemas/location-form.schema';
import { LocationEntity } from '@/core/domain/entities';
import {
  createLocationAction,
  renameLocationAction,
  archiveLocationAction,
  restoreLocationAction,
} from '../actions';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Server Actions
vi.mock('../actions', () => ({
  createLocationAction: vi.fn(),
  renameLocationAction: vi.fn(),
  archiveLocationAction: vi.fn(),
  restoreLocationAction: vi.fn(),
}));

describe('SCR-007: Administración de Ubicaciones', () => {
  describe('LocationFormSchema (Zod)', () => {
    it('debe validar nombres válidos entre 2 y 50 caracteres', () => {
      expect(LocationFormSchema.safeParse({ name: 'Balcón' }).success).toBe(true);
      expect(LocationFormSchema.safeParse({ name: 'Living Comedor Principal' }).success).toBe(true);
    });

    it('debe rechazar nombres vacíos, de 1 carácter o mayores a 50 caracteres', () => {
      expect(LocationFormSchema.safeParse({ name: '' }).success).toBe(false);
      expect(LocationFormSchema.safeParse({ name: 'A' }).success).toBe(false);
      expect(LocationFormSchema.safeParse({ name: 'A'.repeat(51) }).success).toBe(false);
    });
  });

  describe('LocationListView Component', () => {
    const mockLocations: LocationEntity[] = [
      {
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'loc-2',
        name: 'Patio Viejo',
        lifecycle_status: 'ARCHIVED',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const mockPlantCounts = {
      'loc-1': { total: 3, active: 3, archived: 0 },
      'loc-2': { total: 1, active: 0, archived: 1 },
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('debe renderizar la pestaña de Activas por defecto mostrando las ubicaciones y sus conteos de plantas', () => {
      render(
        <LocationListView
          initialLocations={mockLocations}
          plantCounts={mockPlantCounts}
        />
      );

      // Muestra Balcón (Activa)
      expect(screen.getByText('Balcón')).toBeDefined();
      expect(screen.getByText('3 ejemplares asociados')).toBeDefined();
      expect(screen.getByText('Activa')).toBeDefined();

      // No muestra Patio Viejo en pestaña Activas
      expect(screen.queryByText('Patio Viejo')).toBeNull();
    });

    it('debe filtrar por pestaña de Archivadas mostrando las ubicaciones dadas de baja', () => {
      render(
        <LocationListView
          initialLocations={mockLocations}
          plantCounts={mockPlantCounts}
        />
      );

      const archivedTab = screen.getByRole('tab', { name: /archivadas/i });
      fireEvent.click(archivedTab);

      expect(screen.getByText('Patio Viejo')).toBeDefined();
      expect(screen.getByText('1 ejemplar asociado')).toBeDefined();
      expect(screen.getByText('Archivada')).toBeDefined();
      expect(screen.queryByText('Balcón')).toBeNull();
    });

    it('debe abrir modal de Nueva Ubicación y enviar la Server Action al guardar', async () => {
      vi.mocked(createLocationAction).mockResolvedValue({
        success: true,
        message: 'Ubicación creada correctamente',
      });

      render(
        <LocationListView
          initialLocations={mockLocations}
          plantCounts={mockPlantCounts}
        />
      );

      const newBtn = screen.getByRole('button', { name: /nueva ubicación/i });
      fireEvent.click(newBtn);

      expect(screen.getByRole('heading', { name: 'Nueva Ubicación' })).toBeDefined();

      const input = screen.getByLabelText(/nombre de la ubicación/i);
      fireEvent.change(input, { target: { value: 'Galería' } });

      const saveBtn = screen.getByRole('button', { name: /crear ubicación/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(createLocationAction).toHaveBeenCalled();
      });
    });

    it('debe abrir modal de Renombrar con el nombre precargado y enviar la Server Action', async () => {
      vi.mocked(renameLocationAction).mockResolvedValue({
        success: true,
        message: 'Ubicación actualizada correctamente',
      });

      render(
        <LocationListView
          initialLocations={mockLocations}
          plantCounts={mockPlantCounts}
        />
      );

      const renameBtn = screen.getByRole('button', { name: /renombrar ubicación balcón/i });
      fireEvent.click(renameBtn);

      expect(screen.getByText('Renombrar Ubicación')).toBeDefined();
      const input = screen.getByLabelText(/nombre de la ubicación/i) as HTMLInputElement;
      expect(input.value).toBe('Balcón');

      fireEvent.change(input, { target: { value: 'Balcón Norte' } });
      const saveBtn = screen.getByRole('button', { name: /guardar nombre/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(renameLocationAction).toHaveBeenCalled();
      });
    });

    it('debe abrir modal de confirmación de Archivo con la advertencia explícita sobre conservación de plantas', async () => {
      vi.mocked(archiveLocationAction).mockResolvedValue({
        success: true,
        message: 'Ubicación archivada correctamente',
      });

      render(
        <LocationListView
          initialLocations={mockLocations}
          plantCounts={mockPlantCounts}
        />
      );

      const archiveBtn = screen.getByRole('button', { name: /archivar ubicación balcón/i });
      fireEvent.click(archiveBtn);

      expect(screen.getByText('¿Archivar esta ubicación?')).toBeDefined();
      expect(
        screen.getByText(
          /las plantas que ya usan esta ubicación conservarán la referencia, pero la ubicación dejará de estar disponible para nuevas asignaciones/i
        )
      ).toBeDefined();

      const confirmBtn = screen.getByRole('button', { name: /confirmar archivo/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(archiveLocationAction).toHaveBeenCalledWith('loc-1');
      });
    });

    it('debe permitir restaurar una ubicación archivada', async () => {
      vi.mocked(restoreLocationAction).mockResolvedValue({
        success: true,
        message: 'Ubicación restaurada correctamente',
      });

      render(
        <LocationListView
          initialLocations={mockLocations}
          plantCounts={mockPlantCounts}
        />
      );

      // Cambiar a pestaña Archivadas
      fireEvent.click(screen.getByRole('tab', { name: /archivadas/i }));

      const restoreBtn = screen.getByRole('button', { name: /restaurar ubicación patio viejo/i });
      fireEvent.click(restoreBtn);

      expect(screen.getByText('¿Restaurar esta ubicación?')).toBeDefined();

      const confirmBtn = screen.getByRole('button', { name: /confirmar restauración/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(restoreLocationAction).toHaveBeenCalledWith('loc-2');
      });
    });
  });
});