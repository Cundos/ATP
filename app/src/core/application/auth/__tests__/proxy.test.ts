import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy, config } from '../../../../proxy';
import { createSessionToken, SESSION_COOKIE_NAME } from '../session';
import fs from 'fs';
import path from 'path';

describe('Next.js 16 Proxy Authentication (ATP-SEC-001R)', () => {
  const testSecret = 'super_secret_auth_key_for_testing_1234567890';
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = testSecret;
  });

  afterEach(() => {
    process.env.AUTH_SECRET = originalSecret;
    vi.restoreAllMocks();
  });

  describe('File structure and convention', () => {
    it('ensures src/proxy.ts exists and src/middleware.ts is removed', () => {
      const proxyPath = path.resolve(process.cwd(), 'src/proxy.ts');
      const middlewarePath = path.resolve(process.cwd(), 'src/middleware.ts');

      expect(fs.existsSync(proxyPath)).toBe(true);
      expect(fs.existsSync(middlewarePath)).toBe(false);
    });

    it('exports matcher config', () => {
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
    });
  });

  describe('Unauthenticated Human Requests (Default Deny)', () => {
    it('redirects unauthenticated GET / to /login without from param', async () => {
      const req = new NextRequest('http://localhost:3000/');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBe('http://localhost:3000/login');
    });

    it('redirects unauthenticated GET /inventory to /login?from=%2Finventory', async () => {
      const req = new NextRequest('http://localhost:3000/inventory');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBe('http://localhost:3000/login?from=%2Finventory');
    });

    it('redirects unauthenticated GET /regional to /login?from=%2Fregional', async () => {
      const req = new NextRequest('http://localhost:3000/regional');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBe('http://localhost:3000/login?from=%2Fregional');
    });

    it('redirects unauthenticated GET /plants/AT-PL-007 to /login?from=%2Fplants%2FAT-PL-007', async () => {
      const req = new NextRequest('http://localhost:3000/plants/AT-PL-007');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBe('http://localhost:3000/login?from=%2Fplants%2FAT-PL-007');
    });

    it('returns 204 No Content for unauthenticated prefetch requests to prevent breaking client React tree (ATP-AUTH-001)', async () => {
      const req = new NextRequest('http://localhost:3000/plants/AT-PL-013/edit', {
        headers: {
          'next-router-prefetch': '1',
        },
      });
      const res = await proxy(req);

      expect(res.status).toBe(204);
      expect(res.headers.get('location')).toBeNull();
    });

    it('returns x-middleware-redirect header for unauthenticated RSC client navigation requests', async () => {
      const req = new NextRequest('http://localhost:3000/plants/AT-PL-013/edit', {
        headers: {
          rsc: '1',
        },
      });
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-middleware-redirect')).toBe('http://localhost:3000/login?from=%2Fplants%2FAT-PL-013%2Fedit');
    });

    it('returns 401 JSON for unauthenticated /api/photos/upload', async () => {
      const req = new NextRequest('http://localhost:3000/api/photos/upload', {
        method: 'POST',
      });
      const res = await proxy(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/No autorizado/);
    });

    it('returns 401 JSON for unauthenticated /api/integrations/plantbook/search', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/plantbook/search');
      const res = await proxy(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/No autorizado/);
    });
  });

  describe('Exempt & Machine-to-Machine Routes', () => {
    it('allows public access to /robots.txt', async () => {
      const req = new NextRequest('http://localhost:3000/robots.txt');
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    });

    it('allows public access to /favicon.ico', async () => {
      const req = new NextRequest('http://localhost:3000/favicon.ico');
      const res = await proxy(req);

      expect(res.status).toBe(200);
    });

    it('allows Home Assistant webhook/sync routes without human session cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/home-assistant/sync');
      const res = await proxy(req);

      expect(res.status).toBe(200);
    });

    it('allows unauthenticated access to /login page', async () => {
      const req = new NextRequest('http://localhost:3000/login');
      const res = await proxy(req);

      expect(res.status).toBe(200);
    });
  });

  describe('Authenticated Requests', () => {
    it('allows authenticated human request to /inventory', async () => {
      const token = await createSessionToken(testSecret);
      const req = new NextRequest('http://localhost:3000/inventory', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${token}`,
        },
      });

      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it('redirects authenticated human from /login to /', async () => {
      const token = await createSessionToken(testSecret);
      const req = new NextRequest('http://localhost:3000/login', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${token}`,
        },
      });

      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/');
    });
  });

  describe('Security Headers', () => {
    it('attaches all mandatory security headers on responses', async () => {
      const req = new NextRequest('http://localhost:3000/login');
      const res = await proxy(req);

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
      expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });
  });
});