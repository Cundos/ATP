# ADR-022: Android Client Architecture with Capacitor (ATP-MOB-001)

## Estado
Aceptado

## Contexto
Atilio Plants cuenta con una aplicación web responsiva y optimizada para dispositivos móviles basada en Next.js 16 (App Router), Node.js, PostgreSQL (Neon) y Vercel Blob. Para extender la experiencia a una aplicación instalable en el sistema operativo Android sin duplicar la lógica de negocio, los modelos de dominio ni fragmentar la arquitectura en múltiples codebases (ej: React Native o Flutter), se requiere establecer una base de cliente nativo Android con Capacitor.

Se establecieron los siguientes principios rectores:
1. **Un Solo Producto, Dos Clientes**: La versión Android y la versión Web comparten el 100% del backend (APIs, Server Actions, PostgreSQL, autenticación y storage de fotos).
2. **Reutilización Total sin Reescritura**: Aprovechar las vistas móviles ya diseñadas (`SCR-001` a `SCR-007`), tokens de diseño y componentes React existentes.
3. **Seguridad y Cero Fuga de Secretos**: Ninguna credencial de backend (`AUTH_SECRET`, `APP_AUTH_PASSCODE`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `HOME_ASSISTANT_READ_API_SECRET`) debe empaquetarse en el artefacto nativo de Android.
4. **Respeto a las Capacidades de Hardware**: Integración nativa con ciclo de vida de la app, botón físico de retroceso (*hardware back button*) y permisos de red/cámara.

---

## Opciones Evaluadas

### Opción A: Contenedor Remoto Seguro con Capacitor (Seleccionada)
- La aplicación nativa Android se configura mediante Capacitor para cargar como origen seguro la URL de producción canónica (`https://atp-sigma.vercel.app`), o el host de desarrollo local (`http://10.0.2.2:3000` / IP local) mediante la variable `CAPACITOR_SERVER_URL`.
- **Ventajas**:
  - Soporte nativo y transparente de Server Actions, Server Components (RSC) y Edge Proxy de Next.js 16 sin modificaciones.
  - Manejo estándar y seguro de cookies de sesión (`atp_session` con `SameSite=Lax` y `HttpOnly`).
  - Actualizaciones instantáneas (Over-The-Air) sin necesidad de recompilar el APK para cambios en UI o lógica web.
  - Acceso a plugins nativos de Capacitor (cámara, push notifications, ciclo de vida, botón de atrás).
- **Desventajas**: Requiere conectividad a internet para cargar los recursos dinámicos.

### Opción B: Exportación Estática SPA (`output: 'export'`)
- Requeriría transformar Next.js a una Single Page Application estática servida desde los assets locales del APK.
- **Desventajas**: Incompatible con Server Actions de Next.js, Server Components dinámicos, `proxy.ts` en Edge y middleware de autenticación por cookie. Requeriría reescribir la capa de transporte a REST puro para todas las mutaciones. Descartada.

---

## Decisiones de Diseño

### 1. Identificadores y Nomenclatura
- **Application ID / Package Name**: `com.cundolabs.atilioplants`
- **Application Name**: `Atilio Plants`
- **Configuración Principal**: `capacitor.config.ts` en el directorio `app/`.

### 2. Configuración de Seguridad en WebView
- `cleartext: false` en producción (sólo comunicación HTTPS cifrada).
- `allowMixedContent: false` para evitar contenido inseguro.
- `androidScheme: 'https'` para el esquema nativo de la vista web.
- `webContentsDebuggingEnabled: false` en compilaciones de producción.

### 3. Integración con Hardware y Experiencia Nativa
- **Hardware Back Button**: Integración con `@capacitor/app` para gestionar el historial de navegación web y evitar el cierre accidental de la app al presionar atrás.
- **Permisos en `AndroidManifest.xml`**:
  - `android.permission.INTERNET`: Comunicación de red con el backend.
  - `android.permission.ACCESS_NETWORK_STATE`: Detección de conectividad.

---

## Consecuencias
- **Positivas**:
  - Base técnica de Android lista y completamente alineada con la arquitectura Next.js 16 del proyecto.
  - No hay duplicación de código ni riesgo de divergencia de reglas de negocio.
  - Proceso de compilación y empaquetado nativo estándar con Gradle y Android Studio.
  - Facilita la incorporación futura de capacidades nativas dedicadas (escáner QR nativo en `ATP-MOB-003`, selector nativo de fotos en `ATP-MOB-002`).
- **Negativas / Consideraciones**:
  - El primer arranque requiere conexión de red hacia el backend.
