import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1366', width: 1366, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'wide-1920', width: 1920, height: 1080 },
];

const routes = [
  { path: '/', name: 'dashboard' },
  { path: '/inventory', name: 'inventory' },
  { path: '/plants/AT-PL-001', name: 'plant-detail-001' },
];

test.describe('ATP-POST-004 Responsive Desktop Hardening Audit', () => {
  for (const vp of viewports) {
    for (const r of routes) {
      test(`${vp.name} - ${r.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(r.path);
        await page.waitForLoadState('networkidle');

        // Verify no horizontal overflow
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

        // Verify navigation rules
        if (vp.width >= 1024) {
          // Desktop: BottomNav should be hidden
          const bottomNav = page.locator('nav[aria-label="Navegación principal inferior"]');
          await expect(bottomNav).toBeHidden();

          // Desktop Topbar Nav links should be visible
          const desktopNav = page.locator('nav[aria-label="Navegación principal"]');
          await expect(desktopNav).toBeVisible();
        } else {
          // Mobile/Tablet: BottomNav should be visible
          const bottomNav = page.locator('nav[aria-label="Navegación principal inferior"]');
          await expect(bottomNav).toBeVisible();
        }

        // Capture screenshot
        await page.screenshot({
          path: `e2e/screenshots/${vp.name}-${r.name}.png`,
          fullPage: true,
        });
      });
    }
  }
});
