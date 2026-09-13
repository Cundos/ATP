import { test, expect } from '@playwright/test';

test.describe('Plant Photo Timeline & Visual Evolution E2E (ATP-FEAT-002)', () => {
  test('opens /plants/AT-PL-007, finds Visual Evolution section, and checks controls', async ({
    page,
  }) => {
    await page.goto('/plants/AT-PL-007');

    // 1. Verify "Evolución visual" section is rendered
    const evolutionSection = page.getByTestId('section-evolution');
    await expect(evolutionSection).toBeVisible();
    await expect(
      evolutionSection.getByRole('heading', { name: /Evolución visual/i })
    ).toBeVisible();

    // 2. Check "Agregar foto" button is visible
    const addPhotoBtn = page.getByTestId('add-evolution-photo-btn');
    await expect(addPhotoBtn).toBeVisible();

    // 3. Open Upload Modal
    await addPhotoBtn.click();
    await expect(
      page.getByRole('heading', { name: /Registrar Fotografía de Evolución/i })
    ).toBeVisible();
    await expect(page.getByLabel(/Fecha de la toma/i)).toBeVisible();
    await expect(page.getByLabel(/Nota u observación breve/i)).toBeVisible();

    // 4. Close modal
    await page.getByRole('button', { name: /Cancelar/i }).click();
  });

  test('toggles comparison mode when multiple photos are available', async ({ page }) => {
    await page.goto('/plants/AT-PL-007');

    const toggleBtn = page.getByTestId('toggle-comparison-btn');
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await expect(page.getByText(/Seleccioná 2 fotografías para comparar/i)).toBeVisible();
      await expect(page.getByTestId('execute-comparison-btn')).toBeDisabled();

      // Exit comparison mode
      await page.getByRole('button', { name: /Salir de Comparar/i }).click();
    }
  });
});
