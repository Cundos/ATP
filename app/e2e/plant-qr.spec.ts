import { test, expect } from '@playwright/test';
import { authenticateContext } from './helpers/auth';

test.describe('Plant QR Identification & Print View E2E (ATP-FEAT-001)', () => {
  test('opens /plants/AT-PL-007, finds QR section, and verifies canonical link and actions', async ({
    page,
  }) => {
    await page.goto('/plants/AT-PL-007');

    // Verify QR Section is rendered in plant detail
    const qrSection = page.getByTestId('section-qr');
    await expect(qrSection).toBeVisible();
    await expect(qrSection.getByRole('heading', { name: /Identificación QR/i })).toBeVisible();

    // Verify QR code container and label
    await expect(page.getByTestId('plant-qr-label')).toHaveText('AT-PL-007');
    await expect(page.getByTestId('plant-qr-svg-box')).toBeVisible();

    // Verify actions
    await expect(page.getByRole('button', { name: /Copiar enlace/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Descargar SVG/i })).toBeVisible();
    await expect(page.getByTestId('plant-qr-print-link')).toBeVisible();
  });

  test('navigates to /plants/AT-PL-007/qr and verifies printable card layout', async ({ page }) => {
    await page.goto('/plants/AT-PL-007/qr');

    // Verify printable card elements
    await expect(page.getByTestId('plant-qr-print-card')).toBeVisible();
    await expect(page.getByTestId('printable-qr-code')).toHaveText('AT-PL-007');
    await expect(page.getByTestId('printable-qr-common-name')).toContainText('Zamioculca');
    await expect(page.getByTestId('printable-qr-svg')).toBeVisible();
    await expect(page.getByTestId('print-trigger-button')).toBeVisible();

    // Verify back navigation link returns to plant detail
    const backLink = page.getByRole('link', { name: /Volver a la ficha/i });
    await expect(backLink).toHaveAttribute('href', '/plants/AT-PL-007');
  });

  test('renders not-found view for non-existent plant QR view (/plants/AT-PL-999/qr)', async ({ page }) => {
    await page.goto('/plants/AT-PL-999/qr');
    await expect(page.getByRole('heading', { name: /Ejemplar No Encontrado/i })).toBeVisible();
    await expect(page.getByText(/Planta inexistente o desvinculada/i)).toBeVisible();
  });
});

test.beforeEach(async ({ context }) => {
  await authenticateContext(context);
});
