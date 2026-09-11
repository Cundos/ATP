import { test, expect } from '@playwright/test';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe.serial('Atilio Plants Real Playwright E2E Test Suite (ATP-IMP-027)', () => {
  let createdPlantCode: string | null = null;

  // Cleanup all E2E test data after tests complete
  test.afterAll(async () => {
    try {
      // Find all E2E test plants
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
        // Delete profiles and photos
        await prisma.plantCultivationProfile.deleteMany({
          where: { plant_id: { in: plantIds } },
        });
        await prisma.photo.deleteMany({
          where: { plant_id: { in: plantIds } },
        });
        await prisma.plant.deleteMany({
          where: { id: { in: plantIds } },
        });
      }

      // Delete test locations
      await prisma.location.deleteMany({
        where: {
          name: {
            startsWith: '[E2E]',
          },
        },
      });
    } catch (err) {
      console.error('Error during E2E cleanup:', err);
    } finally {
      await prisma.$disconnect();
    }
  });

  // ---------------------------------------------------------------------------
  // Flow A: Dashboard Carga
  // ---------------------------------------------------------------------------
  test('Flow A: Dashboard carga con métricas sanitarias y accesos rápidos', async ({ page }) => {
    await page.goto('/');

    // Check main title
    await expect(page.getByRole('heading', { name: 'Mi Jardín Botánico' })).toBeVisible();

    // Check metric cards exist
    await expect(page.getByText('Total Colección Activa')).toBeVisible();
    await expect(page.getByRole('link', { name: /Saludables:/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Atención:/i })).toBeVisible();

    // Check quick action CTA link
    const newPlantLink = page.getByRole('link', { name: 'Nueva Planta', exact: true });
    await expect(newPlantLink).toBeVisible();

    const inventoryLink = page.getByRole('link', { name: /inventario completo/i });
    await expect(inventoryLink).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Flow B: Inventario Carga y Filtros
  // ---------------------------------------------------------------------------
  test('Flow B: Inventario carga y permite búsqueda reactiva por texto', async ({ page }) => {
    await page.goto('/inventory');

    // Verify baseline plants are rendered
    await expect(page.locator('span[class*="permanentCode"]').filter({ hasText: 'AT-PL-001' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gomero' })).toBeVisible();

    // Search filter
    const searchInput = page.locator('input#inventory-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Monstera');

    // Check filtered results
    await expect(page.getByRole('heading', { name: 'Monstera adansonii' })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Flow C: Alta Manual de Planta (SCR-004)
  // ---------------------------------------------------------------------------
  test('Flow C: Alta manual de planta crea ejemplar con código permanente y redirige a ficha', async ({ page }) => {
    await page.goto('/plants/new');

    await expect(page.getByRole('heading', { name: 'Nueva Planta' })).toBeVisible();

    // Fill common name and scientific name
    await page.locator('input#common_name').fill('[E2E] Pothos Test');
    await page.locator('input#scientific_name').fill('Epipremnum aureum');

    // Select health status
    await page.locator('select#health_status').selectOption('HEALTHY');

    // Fill notes
    await page.locator('textarea#notes').fill('Ejemplar creado durante prueba E2E Playwright.');

    // Submit form
    const submitBtn = page.getByRole('button', { name: /registrar planta/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Wait for redirect to /plants/AT-PL-XXX
    await page.waitForURL(/\/plants\/AT-PL-/, { timeout: 15000 });

    // Verify we are on the plant detail page
    await expect(page.getByRole('heading', { name: /\[E2E\] Pothos Test/i })).toBeVisible();
    await expect(page.getByText('Epipremnum aureum').first()).toBeVisible();
    await expect(page.getByText(/Saludable/i).first()).toBeVisible();

    // Extract created plant code from URL
    const url = page.url();
    const match = url.match(/\/plants\/([^/?#]+)/);
    if (match) {
      createdPlantCode = match[1];
    }
  });

  // ---------------------------------------------------------------------------
  // Flow D: Edición de Planta (SCR-005)
  // ---------------------------------------------------------------------------
  test('Flow D: Edición de planta actualiza atributos mutables y preserva código inmutable', async ({ page }) => {
    expect(createdPlantCode).toBeTruthy();

    await page.goto(`/plants/${createdPlantCode}/edit`);

    // Verify permanent code is immutable / blocked
    await expect(page.getByText(/inmutable/i)).toBeVisible();

    // Update common name and notes
    await page.locator('input#common_name').fill('[E2E] Pothos Test Editado');
    await page.locator('textarea#notes').fill('Notas actualizadas por Playwright E2E.');

    // Submit changes
    const saveBtn = page.getByRole('button', { name: /guardar cambios/i });
    await saveBtn.click();

    // Wait for redirect back to detail view
    await page.waitForURL(`/plants/${createdPlantCode}`, { timeout: 15000 });

    // Verify updated data is visible
    await expect(page.getByRole('heading', { name: /\[E2E\] Pothos Test Editado/i })).toBeVisible();
    await expect(page.getByText('Notas actualizadas por Playwright E2E.').first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Flow E: Archivar y Restaurar Ejemplar (SCR-006)
  // ---------------------------------------------------------------------------
  test('Flow E: Archivar ejemplar lo traslada a históricas y restaurar lo devuelve al inventario', async ({ page }) => {
    expect(createdPlantCode).toBeTruthy();

    await page.goto(`/plants/${createdPlantCode}`);

    // Click Archivar ejemplar
    const archiveBtn = page.getByRole('button', { name: /archivar ejemplar/i });
    await archiveBtn.click();

    // Confirm in modal
    const confirmBtn = page.getByRole('button', { name: /confirmar archivo/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Wait for redirect to archived list
    await page.waitForURL('/plants/archived', { timeout: 15000 });

    // Verify plant appears in archived list
    await expect(page.getByText('[E2E] Pothos Test Editado').first()).toBeVisible();

    // Click Restaurar
    const restoreBtn = page.getByRole('button', { name: /restaurar/i }).first();
    await restoreBtn.click();

    // Confirm restoration in modal
    const confirmRestoreBtn = page.getByRole('button', { name: /confirmar restauración/i });
    await expect(confirmRestoreBtn).toBeVisible();
    await confirmRestoreBtn.click();

    // Wait for success toast / feedback
    await expect(page.getByText(/restaurado correctamente/i)).toBeVisible({ timeout: 10000 });

    // Verify it is restored and navigates or refreshes
    await page.goto('/inventory');
    await expect(page.getByText('[E2E] Pothos Test Editado').first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Flow F: Subida y Visualización de Fotografía Real
  // ---------------------------------------------------------------------------
  test('Flow F: Alta de planta con subida de fotografía real y visualización en ficha', async ({ page }) => {
    await page.goto('/plants/new');

    await page.locator('input#common_name').fill('[E2E] Planta Con Foto Real');

    // Upload real image fixture
    const fixturePath = path.join(__dirname, 'fixtures', 'test-plant.jpg');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);

    // Verify preview is rendered
    await expect(page.locator('img[alt="Vista previa de la fotografía seleccionada"]')).toBeVisible();

    // Submit form
    const submitBtn = page.getByRole('button', { name: /registrar planta/i });
    await submitBtn.click();

    // Wait for redirect to detail
    await page.waitForURL(/\/plants\/AT-PL-/, { timeout: 20000 });

    // Verify plant title and rendered image
    await expect(page.getByRole('heading', { name: /\[E2E\] Planta Con Foto Real/i })).toBeVisible();
    const heroImage = page.locator('img[alt*="[E2E] Planta Con Foto Real"]').first();
    await expect(heroImage).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Flow G: Open Plantbook Resiliencia y Fallback (429 Rate Limit)
  // ---------------------------------------------------------------------------
  test('Flow G: Búsqueda botánica degrada limpiamente ante 429 y permite continuar alta manual', async ({ page }) => {
    // Mock the external search API to return HTTP 429
    await page.route('**/api/integrations/plantbook/search*', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Límite de peticiones alcanzado. Reintentá en unos minutos.',
          code: 'RATE_LIMIT_EXCEEDED',
        }),
      });
    });

    await page.goto('/plants/new');

    // Search for botanical reference
    const botanicalInput = page.getByLabel(/buscar especie botánica/i);
    await botanicalInput.fill('Monstera');

    // Verify warning banner appears
    await expect(page.getByText(/límite de peticiones alcanzado/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /continuar sin referencia/i })).toBeVisible();

    // Dismiss banner
    await page.getByRole('button', { name: /continuar sin referencia/i }).click();

    // Continue manual creation
    await page.locator('input#common_name').fill('[E2E] Planta Degradada 429');
    const submitBtn = page.getByRole('button', { name: /registrar planta/i });
    await submitBtn.click();

    // Wait for redirect to detail
    await page.waitForURL(/\/plants\/AT-PL-/, { timeout: 15000 });

    // Verify plant created without reference section
    await expect(page.getByRole('heading', { name: /\[E2E\] Planta Degradada 429/i })).toBeVisible();
    await expect(page.locator('text=Conocimiento Botánico de Referencia')).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Flow H: Catálogo de Ubicaciones
  // ---------------------------------------------------------------------------
  test('Flow H: Catálogo de ubicaciones permite crear nueva ubicación y listarla', async ({ page }) => {
    await page.goto('/locations');

    // Click Nueva Ubicación
    const newLocBtn = page.getByRole('button', { name: /nueva ubicación/i });
    await newLocBtn.click();

    // Fill name in modal
    const locNameInput = page.locator('input#location_name');
    await expect(locNameInput).toBeVisible();
    await locNameInput.fill('[E2E] Balcón Playwright');

    // Submit modal
    const createBtn = page.getByRole('button', { name: /crear ubicación/i });
    await createBtn.click();

    // Verify location appears in the active list
    await expect(page.getByText('[E2E] Balcón Playwright').first()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Flow I: Navegación Móvil Viewport
  // ---------------------------------------------------------------------------
  test('Flow I: Navegación móvil con viewport reducido y BottomNav', async ({ page }) => {
    // Set mobile viewport (iPhone 13 / Pixel)
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/');

    // Check BottomNav is visible
    const bottomNav = page.getByRole('navigation', { name: /navegación principal inferior/i });
    await expect(bottomNav).toBeVisible();

    // Navigate to Inventory via BottomNav
    const inventoryNav = bottomNav.getByRole('link', { name: /inventario/i });
    await inventoryNav.click();
    await page.waitForURL('/inventory');
    await expect(page.getByRole('heading', { name: 'Inventario de Plantas' })).toBeVisible();

    // Navigate to New Plant via central BottomNav button
    const newPlantNav = bottomNav.getByRole('link', { name: /registrar nueva planta/i });
    await newPlantNav.click();
    await page.waitForURL('/plants/new');
    await expect(page.getByRole('heading', { name: 'Nueva Planta' })).toBeVisible();
  });
});