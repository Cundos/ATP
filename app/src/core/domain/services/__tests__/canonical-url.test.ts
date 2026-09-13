import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPlantCanonicalUrl } from '../canonicalUrl';

describe('Canonical URL Service (ATP-FEAT-001)', () => {
  const originalAppPublicBaseUrl = process.env.APP_PUBLIC_BASE_URL;
  const originalNextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    delete process.env.APP_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    process.env.APP_PUBLIC_BASE_URL = originalAppPublicBaseUrl;
    process.env.NEXT_PUBLIC_APP_URL = originalNextPublicAppUrl;
  });

  it('generates canonical plant URL using explicit baseUrl and strips trailing slashes', () => {
    const url = getPlantCanonicalUrl('AT-PL-007', 'https://atp-sigma.vercel.app///');
    expect(url).toBe('https://atp-sigma.vercel.app/plants/AT-PL-007');
  });

  it('uses APP_PUBLIC_BASE_URL when defined', () => {
    process.env.APP_PUBLIC_BASE_URL = 'https://atilio.plants.io/';
    const url = getPlantCanonicalUrl('AT-PL-001');
    expect(url).toBe('https://atilio.plants.io/plants/AT-PL-001');
  });

  it('falls back to NEXT_PUBLIC_APP_URL when APP_PUBLIC_BASE_URL is not set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.vercel.app';
    const url = getPlantCanonicalUrl('AT-PL-012');
    expect(url).toBe('https://preview.vercel.app/plants/AT-PL-012');
  });

  it('falls back to default production URL when no env vars are defined', () => {
    const url = getPlantCanonicalUrl('AT-PL-003');
    expect(url).toBe('https://atp-sigma.vercel.app/plants/AT-PL-003');
  });

  it('normalizes lowercase permanent codes to uppercase', () => {
    const url = getPlantCanonicalUrl('at-pl-007', 'https://atp-sigma.vercel.app');
    expect(url).toBe('https://atp-sigma.vercel.app/plants/AT-PL-007');
  });

  it('throws an error for invalid permanent_code values', () => {
    expect(() => getPlantCanonicalUrl('INVALID-CODE')).toThrow(
      /Código permanente inválido/
    );
    expect(() => getPlantCanonicalUrl('01a08350-25e1-74ea-a84a-53c196bd577e')).toThrow(
      /Código permanente inválido/
    );
  });
});
