import { isValidPermanentCode } from '@/core/domain/permanent-code';

export interface ParseQrResult {
  valid: boolean;
  permanentCode: string | null;
  targetPath: string | null;
  error?: string;
}

export const DEFAULT_ALLOWED_HOSTS = [
  'app-iota-three-66.vercel.app',
  'atp-sigma.vercel.app',
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
];

/**
 * Normaliza y valida el contenido de un código QR para identificar un ejemplar botánico de Atilio Plants.
 *
 * Acepta:
 * 1. URLs completas autorizadas: https://<allowed-host>/plants/AT-PL-XXX
 * 2. Códigos directos: AT-PL-XXX
 *
 * Rechaza esquemas no seguros (javascript:, intent:, file:) y dominios externos no autorizados.
 */
export function parseAtilioQr(
  rawContent: unknown,
  customAllowedHosts?: string[]
): ParseQrResult {
  if (typeof rawContent !== 'string') {
    return {
      valid: false,
      permanentCode: null,
      targetPath: null,
      error: 'Código QR vacío o no válido.',
    };
  }

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return {
      valid: false,
      permanentCode: null,
      targetPath: null,
      error: 'Código QR vacío o no válido.',
    };
  }

  // 1. Detección directa de permanent_code (ej. AT-PL-007)
  const upperTrimmed = trimmed.toUpperCase();
  if (isValidPermanentCode(upperTrimmed)) {
    return {
      valid: true,
      permanentCode: upperTrimmed,
      targetPath: `/plants/${upperTrimmed}`,
    };
  }

  // 2. Detección y bloqueo estricto de esquemas maliciosos o no http/https
  if (
    /^(javascript|intent|file|data|blob|tel|mailto|smsto|sms|market):/i.test(
      trimmed
    )
  ) {
    return {
      valid: false,
      permanentCode: null,
      targetPath: null,
      error: 'Este código no pertenece a Atilio Plants.',
    };
  }

  // 3. Parseo como URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    // Si no es URL válida ni código permanente
    return {
      valid: false,
      permanentCode: null,
      targetPath: null,
      error: 'El código escaneado no es un formato válido de Atilio Plants.',
    };
  }

  // Validar protocolo seguro
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      valid: false,
      permanentCode: null,
      targetPath: null,
      error: 'Este código no pertenece a Atilio Plants.',
    };
  }

  // 4. Validación de lista blanca de hosts
  const allowedHosts = [
    ...DEFAULT_ALLOWED_HOSTS,
    ...(customAllowedHosts || []),
  ];

  if (typeof window !== 'undefined' && window.location?.hostname) {
    allowedHosts.push(window.location.hostname);
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isAllowedHost = allowedHosts.some((allowed) => {
    const normAllowed = allowed.toLowerCase().split(':')[0];
    return (
      hostname === normAllowed ||
      (normAllowed.startsWith('*.') &&
        hostname.endsWith(normAllowed.slice(1))) ||
      (hostname.endsWith('.vercel.app') && normAllowed.endsWith('.vercel.app'))
    );
  });

  if (!isAllowedHost) {
    return {
      valid: false,
      permanentCode: null,
      targetPath: null,
      error: 'Este código no pertenece a Atilio Plants.',
    };
  }

  // 5. Validación de Pathname: debe coincidir con /plants/(AT-PL-\d{3,})
  const pathMatch = parsedUrl.pathname.match(
    /^\/plants\/(AT-PL-\d{3,})(?:\/.*)?$/i
  );

  if (!pathMatch || !pathMatch[1]) {
    return {
      valid: false,
      permanentCode: null,
      targetPath: null,
      error:
        'El código QR no corresponde a un ejemplar botánico de Atilio Plants.',
    };
  }

  const permanentCode = pathMatch[1].toUpperCase();
  if (!isValidPermanentCode(permanentCode)) {
    return {
      valid: false,
      permanentCode: null,
      targetPath: null,
      error: 'El código de ejemplar no cumple con el formato estándar AT-PL-XXX.',
    };
  }

  return {
    valid: true,
    permanentCode,
    targetPath: `/plants/${permanentCode}`,
  };
}
