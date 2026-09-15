# ADR-020: Private App Hardening and Authorization Baseline (ATP-SEC-001)

## Estado
Aceptado

## Contexto
Atilio Plants nació como un monolito web local/homelab y fue migrado para su despliegue seguro en Vercel con PostgreSQL administrado (ADR-018) e integraciones M2M con Home Assistant (ATP-VOICE-001A / ATP-VOICE-001B).
Sin embargo, las rutas de usuario y server actions carecían de una barrera de autenticación humana, exponiendo el inventario y las acciones de mutación a accesos no autorizados si la URL quedaba expuesta.

Se requería implementar una arquitectura de seguridad integral, privada por defecto (*Default Deny*), sin romper las integraciones M2M de Home Assistant ni sobrecargar la experiencia del usuario único.

## Decisiones de Diseño

1. **Autenticación Humana Basada en Passcode y Cookie Firmada**:
   - Acceso humano protegido mediante passcode maestro (`APP_AUTH_PASSCODE`) configurado como secreto de entorno.
   - Generación de token de sesión compacto firmado con HMAC-SHA256 utilizando la API estándar de **Web Crypto** (`crypto.subtle`), garantizando 100% de compatibilidad con Next.js Edge Runtime y Node.js.
   - Emisión de cookie `atp_session` con flags `httpOnly: true`, `secure: true` (en producción), `sameSite: 'lax'`, `path: '/'` y expiración a 30 días.

2. **Next.js Middleware & Default Deny**:
   - Todo tráfico a rutas de UI (`/`, `/inventory`, `/plants/*`, `/locations`, etc.) es interceptado.
   - Si no existe sesión válida o el payload/firma es incorrecto, se redirige de forma determinista a `/login?from=<original_path>`.
   - APIs internas (`/api/integrations/plantbook/search`, `/api/photos/*`) requieren sesión humana activa y devuelven `401 Unauthorized` (JSON) en caso contrario.

3. **Aislamiento M2M Estricto (Machine-to-Machine)**:
   - Los endpoints de Home Assistant (`/api/integrations/home-assistant/events` y `/api/integrations/home-assistant/plants/[permanentCode]/care-context`) están explícitamente excluidos del middleware de sesión humana.
   - Su seguridad está garantizada a nivel de Route Handler mediante validación estricta de Bearer tokens independientes (`HOME_ASSISTANT_WEBHOOK_SECRET` y `HOME_ASSISTANT_READ_API_SECRET`).
   - Los intentos no autenticados devuelven `401 Unauthorized` de forma directa sin redirección a login.

4. **Defensa en Profundidad (Server Actions Gate)**:
   - Todas las Server Actions que realizan mutaciones (`createPlantAction`, `updatePlantAction`, `deletePlantAction`, `createLocationAction`, etc.) invocan `requireAuthenticatedUser()` antes de delegar a los casos de uso.
   - Lanza `UnauthorizedError`, impidiendo cualquier invocación no autorizada incluso si el middleware fuera eludido.

5. **Sanitización de Datos y Zero Leakage de Home Assistant**:
   - Los Server Components (RSC) que renderizan fichas de planta (`src/app/plants/[id]/page.tsx`) omiten intencionalmente campos de enlace técnico (`ha_binding`, `event_key`, `metadata`) antes de pasar los objetos a componentes de cliente, previniendo la fuga de IDs de entidades de Home Assistant en el HTML stream.

6. **Cabeceras de Seguridad y Protección contra Indexación**:
   - Inyección de cabeceras HTTP de endurecimiento:
     - `X-Robots-Tag: noindex, nofollow`
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
     - `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';`
   - Configuración de `robots.ts` devolviendo `Disallow: /` a nivel global.
   - Desactivación de `x-powered-by` en `next.config.js`.

## Consecuencias
- **Positivas**: Aplicación 100% privada y segura por defecto, cero exposición de datos o mutaciones a accesos anónimos, compatibilidad total con Edge Middleware sin dependencias de Node Crypto, y total preservación de integraciones con Home Assistant y Open Plantbook.
- **Negativas**: Requiere configurar `APP_AUTH_PASSCODE` y `AUTH_SECRET` en los entornos de ejecución (local, CI, Vercel).
