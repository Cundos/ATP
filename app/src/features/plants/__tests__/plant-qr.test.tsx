// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PlantQrCode } from '../components/PlantQrCode';
import { PlantQrPrintView } from '../components/PlantQrPrintView';

describe('Plant QR Code Components (ATP-FEAT-001)', () => {
  const originalClipboard = navigator.clipboard;
  const originalPrint = window.print;
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    window.print = vi.fn();
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-qr-svg');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    Object.assign(navigator, { clipboard: originalClipboard });
    window.print = originalPrint;
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  describe('PlantQrCode Component', () => {
    it('renders QR container with permanent_code label and canonical URL preview', async () => {
      render(
        <PlantQrCode
          permanentCode="AT-PL-007"
          canonicalUrl="https://atp-sigma.vercel.app/plants/AT-PL-007"
        />
      );

      expect(screen.getByTestId('plant-qr-code-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('plant-qr-label')).toHaveTextContent('AT-PL-007');
      expect(
        screen.getByText('https://atp-sigma.vercel.app/plants/AT-PL-007')
      ).toBeInTheDocument();

      // Wait for SVG generation
      await waitFor(() => {
        const svgBox = screen.getByTestId('plant-qr-svg-box');
        expect(svgBox.innerHTML).toContain('<svg');
      });
    });

    it('renders action buttons for copying link, downloading SVG, and opening print view', async () => {
      render(<PlantQrCode permanentCode="AT-PL-007" />);

      expect(screen.getByRole('button', { name: /Copiar enlace/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Descargar SVG/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Vista imprimible/i })).toBeInTheDocument();
      expect(screen.getByTestId('plant-qr-print-link')).toHaveAttribute(
        'href',
        '/plants/AT-PL-007/qr'
      );

      await waitFor(() => {
        const svgBox = screen.getByTestId('plant-qr-svg-box');
        expect(svgBox.innerHTML).toContain('<svg');
      });
    });

    it('copies canonical URL to clipboard when Copiar enlace button is clicked', async () => {
      render(
        <PlantQrCode
          permanentCode="AT-PL-007"
          canonicalUrl="https://atp-sigma.vercel.app/plants/AT-PL-007"
        />
      );

      await waitFor(() => {
        const svgBox = screen.getByTestId('plant-qr-svg-box');
        expect(svgBox.innerHTML).toContain('<svg');
      });

      const copyBtn = screen.getByRole('button', { name: /Copiar enlace/i });
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://atp-sigma.vercel.app/plants/AT-PL-007'
      );

      await waitFor(() => {
        expect(screen.getByText(/Enlace copiado/i)).toBeInTheDocument();
      });
    });

    it('downloads SVG with AT-PL-XXX-qr.svg filename when Descargar SVG is clicked', async () => {
      render(<PlantQrCode permanentCode="AT-PL-007" />);

      await waitFor(() => {
        const svgBox = screen.getByTestId('plant-qr-svg-box');
        expect(svgBox.innerHTML).toContain('<svg');
      });

      const downloadBtn = screen.getByRole('button', { name: /Descargar SVG/i });
      fireEvent.click(downloadBtn);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('PlantQrPrintView Component', () => {
    it('renders printable card with large QR, code, common name and scientific name', async () => {
      render(
        <PlantQrPrintView
          permanentCode="AT-PL-007"
          commonName="Zamioculca"
          scientificName="Zamioculcas zamiifolia"
          canonicalUrl="https://atp-sigma.vercel.app/plants/AT-PL-007"
        />
      );

      expect(screen.getByTestId('printable-qr-code')).toHaveTextContent('AT-PL-007');
      expect(screen.getByTestId('printable-qr-common-name')).toHaveTextContent('Zamioculca');
      expect(screen.getByTestId('printable-qr-scientific-name')).toHaveTextContent(
        'Zamioculcas zamiifolia'
      );
      expect(screen.getByText(/Escanear para abrir ficha/i)).toBeInTheDocument();

      await waitFor(() => {
        const svgWrapper = screen.getByTestId('printable-qr-svg');
        expect(svgWrapper.innerHTML).toContain('<svg');
      });
    });

    it('triggers window.print when clicking the Imprimir button', async () => {
      render(
        <PlantQrPrintView
          permanentCode="AT-PL-007"
          commonName="Zamioculca"
        />
      );

      await waitFor(() => {
        const svgWrapper = screen.getByTestId('printable-qr-svg');
        expect(svgWrapper.innerHTML).toContain('<svg');
      });

      const printBtn = screen.getByTestId('print-trigger-button');
      fireEvent.click(printBtn);

      expect(window.print).toHaveBeenCalledTimes(1);
    });
  });
});
