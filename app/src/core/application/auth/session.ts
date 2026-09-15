import { cookies } from 'next/headers';
import { UnauthorizedError } from '../errors';

export const SESSION_COOKIE_NAME = 'atp_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export interface SessionPayload {
  authenticated: boolean;
  iat: number;
  exp: number;
}

/**
 * Helper to encode Uint8Array to base64url string
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Helper to decode base64url string to Uint8Array
 */
function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get secret for session HMAC signing from environment
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.HOME_ASSISTANT_READ_API_SECRET || 'atp_dev_auth_secret_fallback_do_not_use_in_prod';
  return secret;
}

/**
 * Create a signed session token using Web Crypto HMAC-SHA256
 */
export async function createSessionToken(
  secret: string = getAuthSecret(),
  maxAgeSeconds: number = SESSION_MAX_AGE
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    authenticated: true,
    iat: now,
    exp: now + maxAgeSeconds,
  };

  const enc = new TextEncoder();
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = bytesToBase64Url(enc.encode(payloadStr));

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(payloadB64)
  );

  const signature = bytesToBase64Url(new Uint8Array(signatureBuffer));
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a signed session token using Web Crypto constant-time HMAC verification
 */
export async function verifySessionToken(
  token: string | null | undefined,
  secret: string = getAuthSecret()
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return false;

  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64UrlToBytes(signature);
    const isValidSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes.buffer as ArrayBuffer,
      enc.encode(payloadB64)
    );

    if (!isValidSignature) {
      return false;
    }

    const payloadBytes = base64UrlToBytes(payloadB64);
    const payloadStr = dec.decode(payloadBytes);
    const payload = JSON.parse(payloadStr) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.authenticated || typeof payload.exp !== 'number' || payload.exp < now) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Compare entered passcode with server-side configured passcode in constant time
 */
export async function verifyPasscode(enteredPasscode: string): Promise<boolean> {
  const configuredPasscode = process.env.APP_AUTH_PASSCODE;
  if (!configuredPasscode || configuredPasscode.trim().length === 0) {
    // Fail-closed if no passcode configured
    return false;
  }

  try {
    const enc = new TextEncoder();
    const enteredHash = await crypto.subtle.digest('SHA-256', enc.encode(enteredPasscode.trim()));
    const configuredHash = await crypto.subtle.digest('SHA-256', enc.encode(configuredPasscode.trim()));

    const enteredBytes = new Uint8Array(enteredHash);
    const configuredBytes = new Uint8Array(configuredHash);

    if (enteredBytes.byteLength !== configuredBytes.byteLength) {
      return false;
    }

    let diff = 0;
    for (let i = 0; i < enteredBytes.byteLength; i++) {
      diff |= enteredBytes[i] ^ configuredBytes[i];
    }

    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Server Action / API Helper to enforce authentication.
 * Checks the incoming atp_session cookie. Throws or returns failure if unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const isAuthenticated = await verifySessionToken(sessionCookie);
  if (!isAuthenticated) {
    throw new UnauthorizedError('No autorizado. Se requiere iniciar sesión.');
  }
}

/**
 * Set the session cookie on the response
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Remove the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

