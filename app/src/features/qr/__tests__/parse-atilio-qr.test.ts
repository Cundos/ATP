import { describe, it, expect } from 'vitest';
import { parseAtilioQr } from '../utils/parseAtilioQr';

describe('parseAtilioQr utility (ATP-MOB-003)', () => {
  it('parses valid production canonical URLs', () => {
    const result = parseAtilioQr('https://atp-sigma.vercel.app/plants/AT-PL-007');
    expect(result.valid).toBe(true);
    expect(result.permanentCode).toBe('AT-PL-007');
    expect(result.targetPath).toBe('/plants/AT-PL-007');
    expect(result.error).toBeUndefined();
  });

  it('parses valid canonical URL with trailing slash or query params', () => {
    const result = parseAtilioQr('https://atp-sigma.vercel.app/plants/AT-PL-001/?source=qr&campaign=spring#overview');
    expect(result.valid).toBe(true);
    expect(result.permanentCode).toBe('AT-PL-001');
    expect(result.targetPath).toBe('/plants/AT-PL-001');
  });

  it('parses valid canonical URL on alternative atp-sigma domain', () => {
    const result = parseAtilioQr('https://atp-sigma.vercel.app/plants/AT-PL-014');
    expect(result.valid).toBe(true);
    expect(result.permanentCode).toBe('AT-PL-014');
    expect(result.targetPath).toBe('/plants/AT-PL-014');
  });

  it('parses local development and emulator URLs', () => {
    expect(parseAtilioQr('http://localhost:3000/plants/AT-PL-002').valid).toBe(true);
    expect(parseAtilioQr('http://127.0.0.1:3000/plants/AT-PL-003').valid).toBe(true);
    expect(parseAtilioQr('http://10.0.2.2:3000/plants/AT-PL-004').valid).toBe(true);
  });

  it('parses direct permanent codes without URL', () => {
    const result = parseAtilioQr('AT-PL-007');
    expect(result.valid).toBe(true);
    expect(result.permanentCode).toBe('AT-PL-007');
    expect(result.targetPath).toBe('/plants/AT-PL-007');
  });

  it('normalizes lowercase codes to uppercase', () => {
    const result = parseAtilioQr('at-pl-005');
    expect(result.valid).toBe(true);
    expect(result.permanentCode).toBe('AT-PL-005');
  });

  it('rejects external or unapproved domains with clear message', () => {
    const result = parseAtilioQr('https://google.com/plants/AT-PL-007');
    expect(result.valid).toBe(false);
    expect(result.permanentCode).toBeNull();
    expect(result.error).toBe('Este código no pertenece a Atilio Plants.');
  });

  it('rejects other unapproved vercel.app domains (ATP-MOB-003.1)', () => {
    // evil.vercel.app
    const evilResult = parseAtilioQr('https://evil.vercel.app/plants/AT-PL-007');
    expect(evilResult.valid).toBe(false);
    expect(evilResult.error).toBe('Este código no pertenece a Atilio Plants.');

    // atilio-fake.vercel.app
    const fakeResult = parseAtilioQr('https://atilio-fake.vercel.app/plants/AT-PL-007');
    expect(fakeResult.valid).toBe(false);
    expect(fakeResult.error).toBe('Este código no pertenece a Atilio Plants.');

    // atp-sigma.vercel.app.evil.com (subdomain spoofing)
    const spoofResult = parseAtilioQr('https://atp-sigma.vercel.app.evil.com/plants/AT-PL-007');
    expect(spoofResult.valid).toBe(false);
    expect(spoofResult.error).toBe('Este código no pertenece a Atilio Plants.');
  });

  it('rejects malicious or non-http schemes (ATP-MOB-003.1)', () => {
    expect(parseAtilioQr('javascript:alert(1)').valid).toBe(false);
    expect(parseAtilioQr('intent://plants/AT-PL-007').valid).toBe(false);
    expect(parseAtilioQr('file:///sdcard/exploit.txt').valid).toBe(false);
    expect(parseAtilioQr('data:text/html,<html>').valid).toBe(false);
  });

  it('rejects non-plant URLs on Atilio domain', () => {
    const result = parseAtilioQr('https://atp-sigma.vercel.app/inventory');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('El código QR no corresponde a un ejemplar botánico de Atilio Plants.');
  });

  it('rejects malformed plant codes', () => {
    expect(parseAtilioQr('AT-PL-1').valid).toBe(false);
    expect(parseAtilioQr('AT-PL-XX').valid).toBe(false);
    expect(parseAtilioQr('AT-PL-').valid).toBe(false);
    expect(parseAtilioQr('PLANT-001').valid).toBe(false);
    expect(parseAtilioQr('random-text').valid).toBe(false);
  });

  it('rejects null, undefined, empty or whitespace strings', () => {
    expect(parseAtilioQr(null).valid).toBe(false);
    expect(parseAtilioQr(undefined).valid).toBe(false);
    expect(parseAtilioQr('').valid).toBe(false);
    expect(parseAtilioQr('   ').valid).toBe(false);
  });

  it('allows custom allowed hosts', () => {
    const result = parseAtilioQr('https://my-custom-atilio-domain.com/plants/AT-PL-009', ['my-custom-atilio-domain.com']);
    expect(result.valid).toBe(true);
    expect(result.permanentCode).toBe('AT-PL-009');
  });
});
