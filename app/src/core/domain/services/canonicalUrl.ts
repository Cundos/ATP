import { isValidPermanentCode } from '../permanent-code';

/**
 * Obtiene la URL base pública de la aplicación respetando la precedencia de variables:
 * 1. baseUrl explícito pasado por parámetro
 * 2. process.env.APP_PUBLIC_BASE_URL (server/build)
 * 3. process.env.NEXT_PUBLIC_APP_URL (client/public)
 * 4. Fallback a http://localhost:3000 (desarrollo/test) o https://atp-sigma.vercel.app
 */
export function getAppPublicBaseUrl(explicitBaseUrl?: string): string {
  const rawUrl =
    explicitBaseUrl ||
    process.env.APP_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://atp-sigma.vercel.app');

  // Normalizar: quitar espacios y trailing slashes
  const trimmed = rawUrl.trim().replace(/\/+$/, '');

  try {
    const parsed = new URL(trimmed);
    return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
  } catch {
    return trimmed;
  }
}

/**
 * Genera la URL canónica pública para un ejemplar dado su permanent_code (ej. AT-PL-007)
 */
export function getPlantCanonicalUrl(permanentCode: string, explicitBaseUrl?: string): string {
  const upperCode = permanentCode.trim().toUpperCase();
  if (!isValidPermanentCode(upperCode)) {
    throw new Error(`Código permanente inválido para generar URL canónica: "${permanentCode}"`);
  }

  const baseUrl = getAppPublicBaseUrl(explicitBaseUrl);
  return `${baseUrl}/plants/${upperCode}`;
}
