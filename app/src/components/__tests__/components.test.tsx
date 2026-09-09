// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, HealthBadge, EmptyState, Modal, Input, Select } from '../ui';
import { BottomNav, TopBar } from '../layout';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('UI Base Components (ATP-IMP-010)', () => {
  describe('Button Component', () => {
    it('debe renderizar el contenido de texto correctamente', () => {
      render(<Button>Guardar Planta</Button>);
      expect(screen.getByRole('button', { name: /guardar planta/i })).toBeDefined();
    });

    it('debe deshabilitar el click cuando disabled es true', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Acción</Button>);
      const button = screen.getByRole('button', { name: /acción/i }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('debe mostrar estado de carga (loading) y deshabilitarse', () => {
      render(<Button isLoading>Cargando</Button>);
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });
  });

  describe('HealthBadge Component', () => {
    it('debe renderizar correctamente los 4 estados semánticos', () => {
      const { rerender } = render(<HealthBadge status="HEALTHY" />);
      expect(screen.getByText('Saludable')).toBeDefined();

      rerender(<HealthBadge status="ATTENTION" />);
      expect(screen.getByText('Atención')).toBeDefined();

      rerender(<HealthBadge status="RECOVERY" />);
      expect(screen.getByText('Recuperación')).toBeDefined();

      rerender(<HealthBadge status="UNKNOWN" />);
      expect(screen.getByText('Sin evaluar')).toBeDefined();
    });

    it('debe incluir accesibilidad mediante role status y aria-label', () => {
      render(<HealthBadge status="HEALTHY" />);
      const badge = screen.getByRole('status');
      expect(badge.getAttribute('aria-label')).toBe('Estado sanitario: Saludable');
    });
  });

  describe('EmptyState Component', () => {
    it('debe renderizar título, descripción y acción opcional', () => {
      render(
        <EmptyState
          title="Sin resultados"
          description="No se encontraron ejemplares"
          action={<Button>Crear uno nuevo</Button>}
        />
      );
      expect(screen.getByText('Sin resultados')).toBeDefined();
      expect(screen.getByText('No se encontraron ejemplares')).toBeDefined();
      expect(screen.getByRole('button', { name: /crear uno nuevo/i })).toBeDefined();
    });
  });

  describe('Input Component', () => {
    it('debe renderizar label, input y asociar id accesible', () => {
      render(<Input label="Nombre Común" placeholder="Ej. Monstera" />);
      expect(screen.getByLabelText(/nombre común/i)).toBeDefined();
    });

    it('debe mostrar mensaje de error con role alert y aria-invalid', () => {
      render(<Input label="Nombre" error="Campo obligatorio" />);
      const input = screen.getByLabelText(/nombre/i);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Campo obligatorio')).toBeDefined();
    });
  });

  describe('Select Component', () => {
    it('debe renderizar label, placeholder y opciones', () => {
      render(
        <Select
          label="Ubicación"
          placeholder="Seleccionar..."
          options={[
            { value: 'loc-1', label: 'Balcón' },
            { value: 'loc-2', label: 'Living' },
          ]}
        />
      );
      expect(screen.getByLabelText(/ubicación/i)).toBeDefined();
      expect(screen.getByText('Seleccionar...')).toBeDefined();
      expect(screen.getByText('Balcón')).toBeDefined();
      expect(screen.getByText('Living')).toBeDefined();
    });
  });

  describe('Modal Component', () => {
    it('no debe renderizarse si isOpen es false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          Contenido
        </Modal>
      );
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('debe renderizarse cuando isOpen es true y cerrar con botón de cierre o Esc', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Editar Planta">
          <p>Cuerpo del modal</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Editar Planta')).toBeDefined();
      expect(screen.getByText('Cuerpo del modal')).toBeDefined();

      // Cerrar por botón
      const closeBtn = screen.getByRole('button', { name: /cerrar modal/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Cerrar por Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Layout Navigation Components', () => {
    it('BottomNav debe renderizar accesos a Inicio, Inventario y botón central Nueva', () => {
      render(<BottomNav />);
      expect(screen.getByRole('link', { name: /inicio/i })).toBeDefined();
      expect(screen.getByRole('link', { name: /inventario/i })).toBeDefined();
      expect(screen.getByRole('link', { name: /registrar nueva planta/i })).toBeDefined();
    });

    it('TopBar debe renderizar el branding Atilio Plants y el botón de menú secundario', () => {
      render(<TopBar />);
      expect(screen.getByText('Atilio Plants')).toBeDefined();
      const menuButton = screen.getByRole('button', { name: /abrir menú secundario/i });
      expect(menuButton).toBeDefined();

      // Abrir menú y verificar links secundarios
      fireEvent.click(menuButton);
      expect(screen.getByRole('menuitem', { name: /ubicaciones/i })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: /plantas archivadas/i })).toBeDefined();
    });
  });
});
