import { test, expect } from '@playwright/test';
import { authenticateContext } from './helpers/auth';

test.describe.serial('Private App Hardening & Security Baseline E2E (ATP-SEC-001)', () => {
  const testPasscode = process.env.APP_AUTH_PASSCODE || 'atilio2026';

  // ---------------------------------------------------------------------------
  // 1. Anonymous Access Redirection (Default Deny)
  // ---------------------------------------------------------------------------
  test('Anonymous: accessing protected UI routes redirects to /login', async ({ page }) => {
    // A. Root
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    // B. Inventory
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login\?from=%2Finventory/);

    // C. Plant Detail
    await page.goto('/plants/AT-PL-007');
    await expect(page).toHaveURL(/\/login\?from=%2Fplants%2FAT-PL-007/);

    // D. New Plant Form
    await page.goto('/plants/new');
    await expect(page).toHaveURL(/\/login\?from=%2Fplants%2Fnew/);

    // E. Locations
    await page.goto('/locations');
    await expect(page).toHaveURL(/\/login\?from=%2Flocations/);
  });

  // ---------------------------------------------------------------------------
  // 2. Anonymous SSR/RSC Zero-Leakage Verification
  // ---------------------------------------------------------------------------
  test('Anonymous: raw HTTP GET responses contain no private plant data', async ({ request }) => {
    const resInventory = await request.get('/inventory', { maxRedirects: 0 });
    // Expect redirect status 307 or 302
    expect(resInventory.status()).toBeGreaterThanOrEqual(300);
    expect(resInventory.status()).toBeLessThan(400);

    const resPlant = await request.get('/plants/AT-PL-007', { maxRedirects: 0 });
    expect(resPlant.status()).toBeGreaterThanOrEqual(300);
    expect(resPlant.status()).toBeLessThan(400);

    // Even if body is inspected, it must not leak specimen details
    const body = await resPlant.text();
    expect(body).not.toContain('Zamioculcas zamiifolia');
  });

  // ---------------------------------------------------------------------------
  // 3. Human Login Flow (Passcode Verification)
  // ---------------------------------------------------------------------------
  test('Login Flow: rejects invalid passcode and accepts valid passcode', async ({ page }) => {
    await page.goto('/login');

    // Verify login UI elements
    await expect(page.getByRole('heading', { name: 'Atilio Plants' })).toBeVisible();
    await expect(page.getByTestId('passcode-input')).toBeVisible();

    // 1. Invalid Passcode
    await page.getByTestId('passcode-input').fill('wrong_passcode_123');
    await page.getByTestId('login-submit-btn').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).toContainText('Código de acceso incorrecto');
    await expect(page).toHaveURL(/\/login/);

    // 2. Valid Passcode with returnTo preservation
    await page.goto('/login?from=%2Finventory');
    await page.getByTestId('passcode-input').fill(testPasscode);
    await page.getByTestId('login-submit-btn').click();

    // Redirection to preserved target /inventory
    await page.waitForURL(/\/inventory/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Inventario de Plantas/i })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 4. Logout Flow
  // ---------------------------------------------------------------------------
  test('Logout Flow: logs out user and redirects to /login', async ({ page, context }) => {
    await authenticateContext(context);
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /Inventario de Plantas/i })).toBeVisible();

    // Find and trigger logout button
    const logoutBtn = page.getByTestId('logout-btn-desktop');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      await page.goto('/login');
    }

    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.getByTestId('login-form')).toBeVisible();

    // Verify navigating back is denied
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login/);
  });

  // ---------------------------------------------------------------------------
  // 5. Machine-to-Machine Integration Isolation
  // ---------------------------------------------------------------------------
  test('M2M: Home Assistant endpoints are not redirected to /login and enforce Bearer auth', async ({ request }) => {
    // Care Context endpoint without Bearer token -> 401 Unauthorized (NOT 307 redirect to login)
    const resCare = await request.get('/api/integrations/home-assistant/plants/AT-PL-007/care-context', {
      maxRedirects: 0,
    });
    expect(resCare.status()).toBe(401);
    const careJson = await resCare.json();
    expect(careJson.error).toBe('No autorizado');

    // Events endpoint without Bearer token -> 401 Unauthorized
    const resEvent = await request.post('/api/integrations/home-assistant/events', {
      maxRedirects: 0,
      data: { event_type: 'TEST' },
    });
    expect(resEvent.status()).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // 6. Internal API Protection
  // ---------------------------------------------------------------------------
  test('Internal APIs: reject anonymous requests with 401 Unauthorized', async ({ request }) => {
    const resSearch = await request.get('/api/integrations/plantbook/search?q=ficus', {
      maxRedirects: 0,
    });
    expect(resSearch.status()).toBe(401);

    const resUpload = await request.post('/api/photos/upload', {
      maxRedirects: 0,
    });
    expect(resUpload.status()).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // 7. Security Headers & Anti-Indexation
  // ---------------------------------------------------------------------------
  test('Security Headers: verifies presence of security headers and absence of X-Powered-By', async ({ request }) => {
    const response = await request.get('/login');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=(self)');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-robots-tag']).toContain('noindex, nofollow');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 8. Sanitization of Home Assistant Internal Bindings
  // ---------------------------------------------------------------------------
  test('Data Leakage Prevention: authenticated plant detail does not expose internal entity IDs', async ({ page, context }) => {
    await authenticateContext(context);
    await page.goto('/plants/AT-PL-007');

    await expect(page.getByRole('heading', { name: 'Zamioculca', exact: true })).toBeVisible();

    // Inspect page source
    const pageContent = await page.content();
    expect(pageContent).not.toContain('sensor.humedad_suelo');
    expect(pageContent).not.toContain('sensor.bateria_sensor_humedad_beta');
    expect(pageContent).not.toContain('binary_sensor.sensor_humedad_beta_online');
    expect(pageContent).not.toContain('binary_sensor.sensor_humedad_beta_lectura_desactualizada');
    expect(pageContent).not.toContain('sensor.humedad_suelo_estado_visual');
  });
});
