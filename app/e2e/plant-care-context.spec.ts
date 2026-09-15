import { test, expect } from '@playwright/test';
import { authenticateContext } from './helpers/auth';
import { PrismaClient } from '@prisma/client';
import { createStorageService } from '../src/infrastructure/storage';

const prisma = new PrismaClient();
const storageService = createStorageService();

test.describe.serial('Plant Dynamic Care Context E2E (ATP-CARE-001)', () => {
  let isolatedPlantCode: string | null = null;

  test.afterAll(async () => {
    try {
      const testPlants = await prisma.plant.findMany({
        where: {
          common_name: {
            startsWith: '[E2E]',
          },
        },
        select: {
          id: true,
          photos: {
            select: { id: true, file_path: true },
          },
        },
      });

      const plantIds = testPlants.map((p) => p.id);
      const photosToDelete = testPlants.flatMap((p) => p.photos);

      for (const photo of photosToDelete) {
        if (photo.file_path) {
          try {
            await storageService.deleteFile(photo.file_path);
          } catch (storageErr) {
            console.warn('[E2E Care Context Cleanup] Could not delete file:', storageErr);
          }
        }
      }

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
      console.error('[E2E Care Context Cleanup] Error during cleanup:', err);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('renders care context section on AT-PL-007 detail page', async ({ page }) => {
    await page.goto('/plants/AT-PL-007');

    const careSection = page.getByTestId('care-context-section');
    await expect(careSection).toBeVisible();

    // Verify title and status badge
    await expect(careSection.getByRole('heading', { name: /Estado de Cuidado/i })).toBeVisible();
    await expect(page.getByTestId('care-status-badge')).toBeVisible();

    // Verify headline and summary
    await expect(page.getByTestId('care-headline')).toBeVisible();
    await expect(page.getByTestId('care-summary')).toBeVisible();

    // Verify conditions elements
    await expect(page.getByText(/Humedad de sustrato/i)).toBeVisible();
    await expect(page.getByText(/Sensor \/ Conexión/i)).toBeVisible();
    await expect(page.getByText(/Último registro visual/i)).toBeVisible();
  });

  test('renders DATA_INSUFFICIENT care context on a new plant without telemetry or botanical reference', async ({
    page,
  }) => {
    // 1. Create isolated plant via UI
    await page.goto('/plants/new');
    await page.locator('input#common_name').fill('[E2E] Planta Sin Referencia');
    const submitBtn = page.getByRole('button', { name: /registrar planta/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Wait for redirection to plant detail /plants/AT-PL-XXX
    await page.waitForURL(/\/plants\/AT-PL-/, { timeout: 15000 });
    const url = page.url();
    const match = url.match(/AT-PL-\d+/);
    expect(match).not.toBeNull();
    isolatedPlantCode = match![0];

    // 2. Open detail page
    await page.goto(`/plants/${isolatedPlantCode}`);

    // 3. Verify Care Context section shows DATA_INSUFFICIENT
    const careSection = page.getByTestId('care-context-section');
    await expect(careSection).toBeVisible();
    await expect(page.getByTestId('care-status-badge')).toContainText('Datos Insuficientes');
    await expect(page.getByText(/Datos insuficientes para evaluación automática/i)).toBeVisible();
    await expect(page.getByText(/Vincular ficha de referencia o sensor/i)).toBeVisible();
  });
});

test.beforeEach(async ({ context }) => {
  await authenticateContext(context);
});
