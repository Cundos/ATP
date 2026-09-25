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

export const MIN_AUTH_SECRET_LENGTH = 32;

const KNOWN_INSECURE_PLACEHOLDERS = new Set([
  'placeholder',
  'changeme',
  'your_auth_secret',
  'your_auth_secret_here',
  'secret',
  'development_secret',
  'atp_dev_auth_secret_fallback_do_not_use_in_prod',
  'default_secret',
]);

/**
 * Validates if an auth secret meets the minimum security and entropy requirements.
 */
export function isValidAuthSecret(secret: string | null | undefined): boolean {
  if (!secret || typeof secret !== 'string') return false;
  const trimmed = secret.trim();
  if (trimmed.length < MIN_AUTH_SECRET_LENGTH) return false;
  if (KNOWN_INSECURE_PLACEHOLDERS.has(trimmed.toLowerCase())) return false;
  return true;
}

/**
 * Get secret for session HMAC signing exclusively from process.env.AUTH_SECRET.
 * Fails closed (throws an explicit error) if AUTH_SECRET is absent, empty,
 * has insufficient length (< 32 chars), or matches a known insecure placeholder.
 *
 * NEVER falls back to M2M secrets (HOME_ASSISTANT_READ_API_SECRET, HOME_ASSISTANT_WEBHOOK_SECRET, etc.).
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!isValidAuthSecret(secret)) {
    throw new Error(
      'AUTH_SECRET is not configured or has insufficient entropy (expected at least 32 characters, non-placeholder). Human session authentication is unavailable.'
    );
  }
  return secret!.trim();
}

/**
 * Create a signed session token using Web Crypto HMAC-SHA256
 */
export async function createSessionToken(
  secret?: string,
  maxAgeSeconds: number = SESSION_MAX_AGE
): Promise<string> {
  const resolvedSecret = secret !== undefined ? secret : getAuthSecret();
  if (!isValidAuthSecret(resolvedSecret)) {
    throw new Error('Cannot create session token: invalid or missing AUTH_SECRET.');
  }

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
    enc.encode(resolvedSecret),
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

export interface SessionVerificationResult {
  valid: boolean;
  reason: string;
  exp?: number;
  now?: number;
}

/**
 * Verify a signed session token using Web Crypto constant-time HMAC verification with detailed diagnostics
 */
export async function verifySessionTokenDetailed(
  token: string | null | undefined,
  secret?: string
): Promise<SessionVerificationResult> {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'TOKEN_EMPTY' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'TOKEN_INVALID_PARTS_COUNT' };
  }

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) {
    return { valid: false, reason: 'TOKEN_EMPTY_PARTS' };
  }

  try {
    let resolvedSecret: string;
    try {
      resolvedSecret = secret !== undefined ? secret : getAuthSecret();
    } catch (secErr) {
      return { valid: false, reason: `AUTH_SECRET_ERROR: ${(secErr as Error)?.message || String(secErr)}` };
    }

    if (!isValidAuthSecret(resolvedSecret)) {
      return { valid: false, reason: 'AUTH_SECRET_INVALID_ENTROPY' };
    }

    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(resolvedSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64UrlToBytes(signature);
    const isValidSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(payloadB64)
    );

    if (!isValidSignature) {
      return { valid: false, reason: 'SIGNATURE_MISMATCH' };
    }

    const payloadBytes = base64UrlToBytes(payloadB64);
    const payloadStr = dec.decode(payloadBytes);
    const payload = JSON.parse(payloadStr) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.authenticated) {
      return { valid: false, reason: 'PAYLOAD_NOT_AUTHENTICATED' };
    }
    if (typeof payload.exp !== 'number') {
      return { valid: false, reason: 'PAYLOAD_EXP_INVALID' };
    }
    if (payload.exp < now) {
      return { valid: false, reason: 'TOKEN_EXPIRED', exp: payload.exp, now };
    }

    return { valid: true, reason: 'OK', exp: payload.exp, now };
  } catch (err: unknown) {
    return { valid: false, reason: `EXCEPTION: ${(err as Error)?.name || 'Error'}: ${(err as Error)?.message || String(err)}` };
  }
}

/**
 * Verify a signed session token using Web Crypto constant-time HMAC verification
 */
export async function verifySessionToken(
  token: string | null | undefined,
  secret?: string
): Promise<boolean> {
  const result = await verifySessionTokenDetailed(token, secret);
  return result.valid;
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
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    expires,
  });
}

/**
 * Remove the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

