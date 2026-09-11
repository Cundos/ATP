// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Input, Select, Textarea, Modal, HealthBadge } from '../ui';
import { BottomNav, TopBar } from '../layout';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Mobile & A11y Hardening Verification (ATP-IMP-026)', () => {
  describe('Touch Targets and Form Controls A11y', () => {
    it('Button renders accessible name, left/right icons and handles click', () => {
      const handleClick = vi.fn();
      render(
        <Button
          size="sm"
          leftIcon={<span data-testid="left-icon">🌱</span>}
          rightIcon={<span data-testid="right-icon">→</span>}
          onClick={handleClick}
        >
          Acción Botánica
        </Button>
      );

      const btn = screen.getByRole('button', { name: /acción botánica/i });
      expect(btn).toBeDefined();
      expect(screen.getByTestId('left-icon')).toBeDefined();
      expect(screen.getByTestId('right-icon')).toBeDefined();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('Input maintains accessibility relation with helper text and error message', () => {
      const { rerender } = render(
        <Input
          id="custom-input-id"
          label="Nombre de Especie"
          helperText="Escribí al menos 2 letras para buscar"
        />
      );

      const input = screen.getByLabelText(/nombre de especie/i);
      expect(input.getAttribute('aria-invalid')).toBe('false');
      expect(input.getAttribute('aria-describedby')).toBe('custom-input-id-helper');
      expect(screen.getByText('Escribí al menos 2 letras para buscar')).toBeDefined();

      rerender(
        <Input
          id="custom-input-id"
          label="Nombre de Especie"
          error="Este campo es obligatorio"
        />
      );

      const errorInput = screen.getByLabelText(/nombre de especie/i);
      expect(errorInput.getAttribute('aria-invalid')).toBe('true');
      expect(errorInput.getAttribute('aria-describedby')).toBe('custom-input-id-error');
      expect(screen.getByRole('alert')).toBeDefined();
    });

    it('Select component links label, placeholder, options and error alerts', () => {
      render(
        <Select
          id="custom-select-id"
          label="Ubicación en el hogar"
          placeholder="Seleccionar ambiente"
          options={[
            { value: 'loc-1', label: 'Balcón terraza' },
            { value: 'loc-2', label: 'Living comedor' },
          ]}
          error="Debes seleccionar una ubicación"
        />
      );

      const select = screen.getByLabelText(/ubicación en el hogar/i);
      expect(select.getAttribute('aria-invalid')).toBe('true');
      expect(select.getAttribute('aria-describedby')).toBe('custom-select-id-error');
      expect(screen.getByRole('alert').textContent).toContain('Debes seleccionar una ubicación');
    });

    it('Textarea component supports accessible label, error alert and helper text', () => {
      render(
        <Textarea
          id="custom-notes-id"
          label="Notas de cultivo"
          helperText="Detalles sobre trasplantes y sustrato"
        />
      );

      const textarea = screen.getByLabelText(/notas de cultivo/i);
      expect(textarea.getAttribute('aria-invalid')).toBe('false');
      expect(textarea.getAttribute('aria-describedby')).toBe('custom-notes-id-helper');
      expect(screen.getByText('Detalles sobre trasplantes y sustrato')).toBeDefined();
    });
  });

  describe('Modal Dialog A11y and Keyboard Trap', () => {
    it('Modal renders dialog with title, description, and accessible close button', () => {
      const handleClose = vi.fn();
      render(
        <Modal
          isOpen={true}
          onClose={handleClose}
          title="Confirmar Archivo"
          description="La planta no será visible en el catálogo principal."
        >
          <p>¿Deseas continuar?</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(screen.getByText('Confirmar Archivo')).toBeDefined();
      expect(screen.getByText('La planta no será visible en el catálogo principal.')).toBeDefined();

      const closeBtn = screen.getByRole('button', { name: /cerrar modal/i });
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation Landmark Roles and Labels', () => {
    it('BottomNav has semantic navigation landmark and active item status', () => {
      render(<BottomNav />);
      const nav = screen.getByRole('navigation', { name: /navegación principal inferior/i });
      expect(nav).toBeDefined();
      const homeLink = screen.getByRole('link', { name: /inicio/i });
      expect(homeLink.getAttribute('aria-current')).toBe('page');
    });

    it('TopBar has semantic menu with expanded state toggle and keyboard accessibility', () => {
      render(<TopBar />);
      const menuTrigger = screen.getByRole('button', { name: /abrir menú secundario/i });
      expect(menuTrigger.getAttribute('aria-expanded')).toBe('false');

      fireEvent.click(menuTrigger);
      expect(menuTrigger.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByRole('menu')).toBeDefined();
      expect(screen.getByRole('menuitem', { name: /ubicaciones/i })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: /plantas archivadas/i })).toBeDefined();

      // Pressing Escape closes menu
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(menuTrigger.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('HealthBadge provides non-color dependent accessibility status', () => {
      const { rerender } = render(<HealthBadge status="HEALTHY" />);
      expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Estado sanitario: Saludable');

      rerender(<HealthBadge status="ATTENTION" />);
      expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Estado sanitario: Atención');

      rerender(<HealthBadge status="RECOVERY" />);
      expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Estado sanitario: Recuperación');

      rerender(<HealthBadge status="UNKNOWN" />);
      expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Estado sanitario: Sin evaluar');
    });
  });
});
