# Atilio Plants (ATP) — v0.1.0

Sistema de gestión botánica doméstica de interior con arquitectura limpia (Clean Architecture / Hexagonal), enfoque *local-first*, trazabilidad física de ejemplares, procesamiento resiliente de fotografías y asistencia taxonómica desacoplada mediante Open Plantbook.

---

## 🌿 Características Principales

- **Gestión de Inventario & Ejemplares:**
  - Código permanente secuencial (`AT-PL-001`, `AT-PL-002`, etc.) generado de forma transaccional mediante secuencia PostgreSQL nativa (`plant_code_seq`).
  - Estados sanitarios (`HEALTHY`, `WARNING`, `CRITICAL`), estados de ciclo de vida (`ACTIVE`, `ARCHIVED`) y ubicaciones físicas configurables con protección de unicidad (`LOWER(name)`).
  - Vistas dedicadas: Dashboard con métricas sanitarias, inventario activo filtrable y buscable, historial de ejemplares archivados y detalle individual.

- **Fotografía & Procesamiento Resiliente:**
  - Redimensionamiento proporcional automático (máximo 1600px en lado mayor) y compresión optimizada en WebP mediante Sharp.
  - Almacenamiento desacoplado mediante contrato `IFileStorageService`: **Vercel Blob Storage** en producción en la nube o **Local Filesystem** en despliegues locales / Docker / Homelab.
  - Regla estricta de base de datos: máximo 1 foto primaria por planta garantizada por índice físico parcial único en PostgreSQL (`photos_single_primary_per_plant_idx`).

- **Integración Botánica Open Plantbook (Local-First):**
  - Búsqueda asistida desacoplada con debounce y degradación elegante ante caídas de red, timeouts o límites de tasa (HTTP 429).
  - Snapshot taxonómico persistido localmente en PostgreSQL (`plant_references`) con minimización de datos (los datos brutos `raw_data` y secretos nunca se exponen al cliente).
  - Ficha de detalle 100% offline respecto del proveedor externo: cero llamadas de red para consultar plantas ya vinculadas.

- **Diseño Mobile-First & Accesibilidad (WCAG AA):**
  - Targets táctiles $\ge 44\text{px}$, soporte completo de navegación por teclado, contraste verificado y diseño responsivo desde $320\text{px}$.

---

## 🛠️ Stack Tecnológico

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Turbopack)
- **Lenguaje:** [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Base de Datos & ORM:** [Neon PostgreSQL](https://neon.tech/) (Serverless Postgres 16+) / [Prisma ORM](https://www.prisma.io/)
- **Procesamiento de Imágenes:** [Sharp](https://sharp.pixelplumbing.com/)
- **Almacenamiento de Archivos:** `@vercel/blob` / Local FS Driver
- **Validación & Sanitización:** [Zod](https://zod.dev/)
- **Testing:** [Vitest 5](https://vitest.dev/) (Unit, Integration, E2E) + React Testing Library + MSW (Mock Service Worker)

---

## 🏗️ Arquitectura de la Aplicación

El proyecto sigue rigurosamente los principios de **Clean Architecture / Hexagonal Architecture**:

```
app/src/
├── core/
│   ├── domain/               # Entidades de negocio, Value Objects, contratos de repositorio
│   │   ├── entities/         # PlantEntity, LocationEntity, PlantReferenceEntity, PhotoEntity
│   │   └── repositories/     # IPlantRepository, ILocationRepository, etc.
│   └── application/          # Casos de uso de negocio y DTOs
│       ├── use-cases/        # CreatePlantUseCase, UpdatePlantUseCase, SyncReferenceUseCase, etc.
│       └── error-handler.ts  # Mapeo centralizado de errores controlados
├── infrastructure/           # Implementaciones técnicas y adaptadores externos
│   ├── db/                   # Prisma Client, repositorios PostgreSQL y migraciones
│   ├── storage/              # Vercel Blob y Local Filesystem Storage Drivers
│   ├── image/                # Procesador Sharp de imágenes
│   ├── open-plantbook/       # Cliente HTTP resiliente, OAuth2 Token Manager, Mappers
│   └── logging/              # Logger seguro con sanitización recursiva de secretos
└── features/ / app/          # Vistas UI (Server/Client Components), Server Actions y Route Handlers
```

---

## ⚙️ Configuración del Entorno

### 1. Variables de Entorno

Copiar el archivo de plantilla `.env.example` a `.env.local` dentro de la carpeta `app/`:

```bash
cd app
cp .env.example .env.local
```

Configurar las siguientes variables en `.env.local`:

```env
# Conexión a Base de Datos (Neon PostgreSQL)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST/DB?sslmode=require

# Almacenamiento de Fotos (Vercel Blob en producción)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx

# Integración Open Plantbook (Server-Side Only)
OPEN_PLANTBOOK_CLIENT_ID=tu_client_id
OPEN_PLANTBOOK_CLIENT_SECRET=tu_client_secret
```

---

## 🚀 Instalación y Ejecución

### Desarrollo Local (Host)

```bash
# 1. Navegar a la carpeta de la aplicación
cd app

# 2. Instalar dependencias exactas
npm ci

# 3. Generar cliente Prisma
npx prisma generate

# 4. Iniciar servidor de desarrollo (Turbopack)
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🧪 Suite de Pruebas Automatizadas

La aplicación cuenta con una suite completa de pruebas unitarias, de integración con PostgreSQL real y flujos E2E:

```bash
# Ejecutar toda la suite de pruebas (449+ tests)
npm run test:all

# Ejecutar únicamente pruebas unitarias (dominio, casos de uso, componentes aislados)
npm run test:unit

# Ejecutar pruebas de integración con base de datos real y storage
npm run test:integration

# Ejecutar pruebas de flujos E2E completos
npm run test:e2e

# Verificación de tipos TypeScript
npx tsc --noEmit

# Verificación de linter (ESLint)
npm run lint

# Compilación de producción
npm run build
```

---

## 🐳 Despliegue Local con Docker Compose

Para levantar PostgreSQL y la aplicación en un entorno de homelab / contenedor:

```bash
# Iniciar servicios en segundo plano
docker compose up -d

# Verificar estado y healthchecks
docker compose ps

# Detener servicios preservando el volumen de datos
docker compose down
```

---

## 📄 Licencia y Estado de Release

- **Versión:** `v0.1.0` (MVP Release)
- **Estado:** Milestone 1 a Milestone 4 completados y aprobados (`GATE-4` y `RELEASE-GATE` certificados).
