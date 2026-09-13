import { test, expect } from '@playwright/test';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe.serial('Plant Photo Timeline & Visual Evolution Isolated E2E (ATP-FEAT-002)', () => {
  let plantCode: string | null = null;
  const fixturePhotoPath = path.join(__dirname, 'fixtures', 'test-plant.jpg');

  // Clean up isolated test plant and its storage records after tests complete
  test.afterAll(async () => {
    try {
      const testPlants = await prisma.plant.findMany({
        where: {
          common_name: {
            startsWith: '[E2E]',
          },
        },
        select: { id: true },
      });

      const plantIds = testPlants.map((p) => p.id);

      if (plantIds.length > 0) {
        await prisma.photo.deleteMany({
          where: { plant_id: { in: plantIds } },
        });
        await prisma.plantCultivationProfile.deleteMany({
          where: { plant_id: { in: plantIds } },
        });
        await prisma.plant.deleteMany({
          where: { id: { in: plantIds } },
        });
      }
    } catch (err) {
      console.error('[E2E Cleanup] Error during test plant cleanup:', err);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('1. Creates isolated test plant with an initial photo', async ({ page }) => {
    await page.goto('/plants/new');
    await expect(page.getByRole('heading', { name: 'Nueva Planta' })).toBeVisible();

    // Fill form
    await page.locator('input#common_name').fill('[E2E] Evolución Test');
    await page.locator('input#scientific_name').fill('Philodendron scandens');
    await page.locator('select#health_status').selectOption('HEALTHY');

    // Attach initial photo
    const fileInput = page.locator('input[data-testid="photo-gallery-input"]');
    await fileInput.setInputFiles(fixturePhotoPath);

    // Submit
    const submitBtn = page.getByRole('button', { name: /registrar planta/i });
    await submitBtn.click();

    // Wait for redirect to /plants/AT-PL-XXX
    await page.waitForURL(/\/plants\/AT-PL-/, { timeout: 20000 });

    const url = page.url();
    const match = url.match(/\/plants\/([^/?#]+)/);
    expect(match).toBeTruthy();
    plantCode = match![1];

    // Verify visual evolution section shows initial photo
    const evolutionSection = page.getByTestId('section-evolution');
    await expect(evolutionSection).toBeVisible();
    await expect(evolutionSection.getByText('Foto principal')).toBeVisible();
  });

  test('2. Uploads a second photo with date & caption via visual evolution timeline', async ({
    page,
  }) => {
    expect(plantCode).toBeTruthy();
    await page.goto(`/plants/${plantCode}`);

    // Click "Agregar foto"
    const addPhotoBtn = page.getByTestId('add-evolution-photo-btn');
    await addPhotoBtn.click();

    // Verify modal is displayed
    await expect(
      page.getByRole('heading', { name: /Registrar Fotografía de Evolución/i })
    ).toBeVisible();

    // Attach second photo
    const modalFileInput = page.locator('input[data-testid="photo-gallery-input"]');
    await modalFileInput.setInputFiles(fixturePhotoPath);

    // Set caption and date
    await page.locator('textarea#photo-caption').fill('[E2E] Segundo registro de crecimiento');
    await page.locator('input#photo-taken-at').fill('2026-06-15');

    // Save photo (make_primary unchecked by default)
    const saveBtn = page.getByRole('button', { name: /Guardar Foto/i });
    await saveBtn.click();

    // Verify both photos are now in timeline
    const evolutionSection = page.getByTestId('section-evolution');
    await expect(
      evolutionSection.getByText('[E2E] Segundo registro de crecimiento')
    ).toBeVisible({ timeout: 15000 });

    // Initial photo is still present
    const cards = evolutionSection.locator('button[data-testid^="photo-timeline-card-"]');
    await expect(cards).toHaveCount(2);
  });

  test('3. Sets the second photo as primary and verifies the first photo remains in timeline', async ({
    page,
  }) => {
    expect(plantCode).toBeTruthy();
    await page.goto(`/plants/${plantCode}`);

    // Wait for the specific second photo card to be visible in the DOM
    const secondCard = page
      .locator('button[data-testid^="photo-timeline-card-"]')
      .filter({ hasText: '[E2E] Segundo registro de crecimiento' });
    await expect(secondCard).toBeVisible({ timeout: 15000 });
    await secondCard.click();

    // Lightbox modal opens
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Marcar como principal/i })).toBeVisible({
      timeout: 10000,
    });

    // Click "Marcar como principal"
    const markPrimaryBtn = page.getByRole('button', { name: /Marcar como principal/i });
    await markPrimaryBtn.click();

    // Verify toast or updated state
    await expect(page.getByText('Foto marcada como principal')).toBeVisible({ timeout: 10000 });

    // Close lightbox
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Confirm that the second photo now has the "Foto principal" badge
    await expect(secondCard.getByTestId('primary-photo-badge')).toBeVisible();

    // Confirm that the previous photo continues to be present in timeline
    const allCards = page.locator('button[data-testid^="photo-timeline-card-"]');
    await expect(allCards).toHaveCount(2);
  });

  test('4. Toggles comparison mode, selects both photos, and opens side-by-side comparison', async ({
    page,
  }) => {
    expect(plantCode).toBeTruthy();
    await page.goto(`/plants/${plantCode}`);

    // Wait for timeline to be stable
    const cards = page.locator('button[data-testid^="photo-timeline-card-"]');
    await expect(cards).toHaveCount(2, { timeout: 15000 });

    // Toggle comparison mode
    const toggleCompBtn = page.getByTestId('toggle-comparison-btn');
    await expect(toggleCompBtn).toBeVisible();
    await toggleCompBtn.click();

    await expect(page.getByText('Seleccioná 2 fotografías para comparar:')).toBeVisible();

    // Click both cards to select them
    await cards.nth(0).click();
    await cards.nth(1).click();

    await expect(page.getByText('2 / 2 seleccionadas')).toBeVisible();

    // Execute comparison
    const compareExecBtn = page.getByTestId('execute-comparison-btn');
    await expect(compareExecBtn).toBeEnabled();
    await compareExecBtn.click();

    // Verify comparison modal
    await expect(
      page.getByRole('heading', { name: /Comparación de Evolución/i })
    ).toBeVisible();
    await expect(page.getByText('Registro Anterior')).toBeVisible();
    await expect(page.getByText('Registro Posterior')).toBeVisible();

    // Close comparison modal
    await page.getByRole('button', { name: /Cerrar Comparación/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('5. Safe deletion: deletes primary photo and confirms automatic promotion of remaining photo to primary', async ({
    page,
  }) => {
    expect(plantCode).toBeTruthy();
    await page.goto(`/plants/${plantCode}`);

    // Wait for timeline to be stable
    const cards = page.locator('button[data-testid^="photo-timeline-card-"]');
    await expect(cards).toHaveCount(2, { timeout: 15000 });

    // Click the primary photo card to open lightbox
    const primaryCard = page
      .locator('button[data-testid^="photo-timeline-card-"]')
      .filter({ has: page.getByTestId('primary-photo-badge') });
    await expect(primaryCard).toBeVisible();
    await primaryCard.click();

    // Lightbox modal opens
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Click "Eliminar foto"
    const deleteBtn = page.getByRole('button', { name: /Eliminar foto/i });
    await deleteBtn.click();

    // Confirmation dialog appears with safe explanation
    await expect(page.getByRole('heading', { name: '¿Eliminar esta fotografía?' })).toBeVisible();
    await expect(
      page.getByText(/pasará a ser automáticamente la nueva foto principal/i)
    ).toBeVisible();

    // Confirm deletion
    const confirmDeleteBtn = page.getByRole('button', { name: /Confirmar Eliminación/i });
    await confirmDeleteBtn.click();

    // Verify photo was deleted and remaining photo is now primary
    await expect(page.getByText('Fotografía eliminada.')).toBeVisible({ timeout: 10000 });

    const remainingCards = page.locator('button[data-testid^="photo-timeline-card-"]');
    await expect(remainingCards).toHaveCount(1, { timeout: 10000 });
    await expect(remainingCards.first().getByTestId('primary-photo-badge')).toBeVisible();
  });
});
