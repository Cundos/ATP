# Arquitectura del Sistema — Atilio Plants MVP v0.1

> **Estado:** Documento de Especificación Técnica Aprobado para Sprint 0 (ATP-007)  
> **Alcance:** Arquitectura de software, infraestructura de ejecución, principios de diseño, stack tecnológico, contratos entre capas y decisiones técnicas del MVP v0.1.

---

## 1. Principios y Metas Arquitectónicas

La arquitectura técnica de Atilio Plants se deriva de la visión de producto (`00_PROJECT/PRODUCT_VISION.md`), los requerimientos (`01_REQUIREMENTS/`), el modelo de datos (`02_DATA/`) y los lineamientos de integración (`04_ARCHITECTURE/OPEN_PLANTBOOK_INTEGRATION.md`).

### Metas Primarias:
1. **Soberanía y Local-First Pragmático:** Capacidad operativa autónoma en red doméstica/homelab, persistencia local (PostgreSQL local y almacenamiento de archivos local) sin dependencias bloqueantes de la nube (`ADR-005`).
2. **Navegación Mobile-First:** Arquitectura de entrega web responsiva optimizada para interacción táctil y rápida en dispositivos móviles hogareños (`SCR-001` a `SCR-007`).
3. **Simplicidad Operativa Unificada (Monolito Modular):** Evitar microservicios, brokers de colas o servicios de background innecesarios en v0.1. Mantenible de forma ágil por un único desarrollador.
4. **Desacoplamiento Estructural para Evolución Futura:**
   - Almacenamiento de fotos aislado tras una interfaz (`FileStorageService`), permitiendo transición transparente de sistema de archivos local a Object Storage S3/MinIO (`ADR-006`, `ADR-011`).
   - Acceso a datos encapsulado en Repositorios que aíslan al ORM de la lógica de dominio.
   - Integración con Open Plantbook desacoplada y ejecutada exclusivamente server-side (`ADR-012`, `ADR-013`).
   - Preparación para futura telemetría con Home Assistant (`ADR-001`, `ADR-003`) sin contaminar las entidades centrales.
   - Portabilidad directa entre entorno local (Docker Compose) y nube gestionada (Vercel + Postgres serverless + S3).

---

## 2. Evaluación y Selección del Stack Tecnológico

### 2.1 Decisión Full-Stack: Monolito Next.js vs Frontend/Backend Separado

| Opción | Ventajas | Desventajas | Veredicto |
| :--- | :--- | :--- | :--- |
| **A) Next.js Full-stack Monolítico** | • Código y tipos TypeScript compartidos de extremo a extremo.<br>• Simplifica enormemente despliegue local y orquestación.<br>• Ejecución server-side nativa para secretos OAuth2 (`ADR-013`) y proxy de API.<br>• Soporte nativo para Server Actions y API Routes.<br>• Transición directa e inmediata hacia Vercel/Node runtime. | • Acoplamiento de la entrega UI al ciclo de vida del servidor web.<br>• Requiere disciplina modular interna para no mezclar capas. | **RECOMENDADA (ADR-014)** |
| **B) Frontend Next.js + Backend Separado (FastAPI / NestJS / Express)** | • Separación de procesos físicos.<br>• Facilidad teórica para escalar backend independientemente. | • Duplicación de modelos, DTOs y tipos.<br>• Doble pipeline, doble contenedor Docker, configuración de CORS y red interna.<br>• Complejidad y sobrecarga operativa innecesaria para uso personal (1 usuario). | **Descartada** |
| **C) SPA pura (Vite/React) + Backend** | • Frontend estático puro. | • Expone secretos de Open Plantbook si consulta directo, o fuerza crear un backend proxy dedicado adicional de todos modos. | **Descartada** |

**Decisión:** Se adopta **Next.js Full-stack Monolítico con TypeScript** como runtime y framework unificado.

### 2.2 Base de Datos: Confirmación de PostgreSQL

Se confirma formalmente **PostgreSQL** (versión 16+) como motor de persistencia relacional:
- **Adecuación al Modelo Relacional:** Garantiza integridad referencial estricta (claves foráneas entre `Plant`, `Location`, `Photo`, `PlantCultivationProfile` y `PlantReference`), checks, valores únicos y transacciones ACID.
- **Soporte Nativo JSONB:** El atributo `raw_data` y `reference_care` de `PlantReference` se modelan de forma natural e indexable mediante `JSONB` sin sacrificar el esquema relacional central.
- **Portabilidad:** Idéntico motor en contenedor local (`postgres:16-alpine`), en servidores homelab o en proveedores gestionados (Neon, Supabase, AWS RDS).
- **Tooling y Ecosistema:** Madurez total, respaldos sencillos mediante `pg_dump`, observabilidad y compatibilidad universal con ORMs TypeScript.

### 2.3 ORM: Prisma vs Drizzle vs SQL Directo

| Herramienta | Evaluación para Atilio Plants | Veredicto |
| :--- | :--- | :--- |
| **Prisma ORM** | • Migraciones declarativas robustas y reproducibles (`prisma migrate`).<br>• Type-safety end-to-end auto-generado.<br>• Prisma Studio integrado para inspección directa y depuración de datos locales.<br>• Abstracción estándar probada para PostgreSQL local y cloud. | **ACEPTADO (ADR-015)** |
| **Drizzle ORM** | • Excelente rendimiento, menor overhead de runtime.<br>• Requiere mayor configuración manual de migraciones y queries relacionales más verbosas. | Alternativa viable secundaria, pero Prisma ofrece mayor agilidad y simplicidad operativa para el perfil del proyecto. |
| **SQL Directo (pg/slonik)** | • Control absoluto sobre SQL físico.<br>• Mantenimiento manual de migraciones y pérdida de generación automática de tipos en TypeScript. | Sobrecarga de desarrollo innecesaria. |

**Decisión:** Se adopta **Prisma ORM** para el modelado físico, sistema de migraciones y cliente tipado de base de datos.
**Regla de Arquitectura Obligatoria:** Prisma debe permanecer estrictamente encapsulado detrás de los repositorios y adaptadores de la capa de infraestructura. Las capas de Dominio y Aplicación no deben depender directamente de los tipos generados por Prisma ni de su cliente.

---

## 3. Arquitectura Lógica y Capas del Sistema

Para garantizar que el monolito permanezca limpio, testeable y preparado para cambios de infraestructura, se adopta un diseño en capas con inversión de dependencias:

```mermaid
graph TD
    subgraph "Presentation Layer (UI)"
        P1[Server Components / Pages]
        P2[Client Components / Forms]
        P3[Server Actions / Route Handlers]
    end

    subgraph "Application Layer (Use Cases)"
        UC1[CreatePlantUseCase]
        UC2[ListPlantsUseCase]
        UC3[UploadPlantPhotoUseCase]
        UC4[SearchBotanicalReferenceUseCase]
        UC5[ManageLocationsUseCase]
    end

    subgraph "Domain Layer (Core Business Rules)"
        D1[Entities: Plant, Photo, Location...]
        D2[Value Objects & Enums: PermanentCode, HealthStatus...]
        D3[Domain Events / Business Invariants]
        D4[Repository Interfaces: IPlantRepository...]
        D5[Storage Interface: IFileStorageService]
    end

    subgraph "Infrastructure & Persistence Layer"
        I1[PrismaPlantRepository]
        I2[PrismaLocationRepository]
        I3[PrismaPhotoRepository]
        I4[Prisma Client -> PostgreSQL]
        I5[LocalFileStorageService -> Host FS]
    end

    subgraph "External Integrations Layer"
        EXT1[OpenPlantbookClient]
        EXT2[OAuth2TokenManager]
        EXT3[External APIs: open.plantbook.io]
    end

    P1 --> UC2
    P2 --> P3
    P3 --> UC1
    P3 --> UC3
    P3 --> UC4
    P3 --> UC5
    
    UC1 --> D4
    UC1 --> D1
    UC3 --> D5
    UC3 --> D4
    UC4 --> EXT1
    
    I1 -. implements .-> D4
    I2 -. implements .-> D4
    I3 -. implements .-> D4
    I5 -. implements .-> D5
    
    I1 --> I4
    EXT1 --> EXT2
    EXT1 --> EXT3
```

### Reglas de Dependencia e Invariantes de Aislamiento:
1. **La UI no accede directamente a la base de datos:** Los componentes visuales y formularios interactúan exclusivamente mediante Server Actions o llamadas a Casos de Uso en la capa de aplicación.
2. **El dominio no conoce Prisma ni el filesystem:** Las entidades y tipos de dominio definen interfaces abstractas (`IPlantRepository`, `IFileStorageService`). La infraestructura implementa estas interfaces.
3. **Open Plantbook no contamina el modelo interno:** Las respuestas de la API externa son transformadas por mappers en la capa de integración antes de persistirse como un snapshot en `PlantReference` (`ADR-012`). El payload crudo `raw_data` no atraviesa la UI como contrato primario.
4. **Almacenamiento de archivos desacoplado:** El Caso de Uso solicita guardar el archivo procesado a `IFileStorageService`, obteniendo una clave lógica (`storage_key`). Dicha clave es lo único que se persiste en `Photo.file_path` (`ADR-006`, `ADR-011`).

---

## 4. Estructura Propuesta del Proyecto (`app/`)

Se diseña una estructura física modular basada en Next.js App Router, manteniendo código organizado por dominio y capas:

```text
app/
├── .env.example                     # Plantilla documentada de variables de entorno
├── docker-compose.yml               # Orquestación de entorno local (App + DB)
├── Dockerfile                       # Multi-stage build con Node.js LTS soportado
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma                # Definición del esquema físico relacional
│   ├── migrations/                  # Historial de migraciones SQL gestionadas
│   └── seed.ts                      # Script para sembrar inventario inicial (ATP-006)
├── public/                          # Assets estáticos del frontend (iconos, logos)
├── storage/                         # Directorio local montado para archivos (uploads)
│   └── photos/                      # photos/{permanent_code}/<uuid>.<ext>
└── src/
    ├── app/                         # Rutas, layouts y páginas (Next.js App Router)
    │   ├── layout.tsx               # Layout general con Shell de navegación y BottomNav
    │   ├── page.tsx                 # Dashboard principal (SCR-001)
    │   ├── plants/
    │   │   ├── page.tsx             # Inventario Activo (SCR-002)
    │   │   ├── new/
    │   │   │   └── page.tsx         # Alta de ejemplar (SCR-004)
    │   │   ├── archived/
    │   │   │   └── page.tsx         # Plantas Archivadas (SCR-006)
    │   │   └── [id]/
    │   │       ├── page.tsx         # Ficha individual de ejemplar (SCR-003)
    │   │       └── edit/
    │   │           └── page.tsx     # Edición de ejemplar (SCR-005)
    │   ├── locations/
    │   │   └── page.tsx             # Administración de Ubicaciones (SCR-007)
    │   └── api/                     # Route Handlers para necesidades HTTP reales
    │       ├── photos/              # Serving de fotos / upload de binarios
    │       └── integrations/
    │           └── plantbook/
    │               └── search/route.ts  # Proxy seguro server-side para búsqueda
    ├── components/                  # Componentes de UI reutilizables
    │   ├── ui/                      # Átomos y moléculas base (Button, Badge, Modal, Input)
    │   ├── layout/                  # Shell, TopBar, BottomNav
    │   └── feedback/                # Toasts, ConfirmDialog, EmptyStates
    ├── features/                    # Módulos cohesivos por entidad/dominio
    │   ├── plants/
    │   │   ├── components/          # PlantCard, HealthBadge, PlantGrid
    │   │   ├── actions.ts           # Server Actions para mutaciones de plantas
    │   │   └── types.ts             # DTOs y view models específicos
    │   ├── locations/
    │   │   ├── components/          # LocationList, LocationModal
    │   │   └── actions.ts
    │   └── photos/
    │       ├── components/          # PhotoUploader, PrimaryPhotoView
    │       └── actions.ts
    ├── core/                        # Núcleo de Lógica de Negocio y Dominio
    │   ├── domain/
    │   │   ├── entities/            # Modelos puros: Plant, Location, Photo, CultivationProfile
    │   │   ├── repositories/        # Interfaces abstractas: IPlantRepository, etc.
    │   │   └── errors/              # Excepciones de dominio tipadas (DomainError, NotFoundError)
    │   └── application/
    │       └── use-cases/           # Casos de uso (CreatePlant, ArchivePlant, etc.)
    ├── infrastructure/              # Implementaciones concretas de Persistencia y Storage
    │   ├── db/
    │   │   ├── prisma.ts            # Cliente singleton de Prisma
    │   │   └── repositories/        # PrismaPlantRepository, PrismaLocationRepository...
    │   └── storage/
    │       ├── storage.interface.ts # Contrato IFileStorageService
    │       ├── local-storage.ts     # Implementación LocalFileStorageService (v0.1)
    │       └── s3-storage.ts        # Adaptador futuro S3/Object Storage
    └── integrations/                # Clientes de servicios externos
        └── open-plantbook/
            ├── client.ts            # OpenPlantbookClient (HTTP, OAuth2, retries)
            ├── token-manager.ts     # Gestión y cache de token Bearer en memoria
            ├── mapper.ts            # Conversión de payload API externa a PlantReference
            └── types.ts             # Tipado del esquema de respuesta de Open Plantbook
```

---

## 5. Identificadores Internos y Código Permanente (`permanent_code`)

### 5.1 Identificadores Técnicos de Entidades: UUIDv7
Para todas las entidades internas del sistema (`Plant`, `Location`, `Photo`, `PlantCultivationProfile`, `PlantReference`), se adopta definitivamente como clave primaria técnica:
- **Tipo:** `UUIDv7` (`ADR-016`).
- **Justificación:** 
  - Unicidad global y distribuida sin colisiones.
  - Orden cronológico/temporal natural que optimiza la eficiencia de los índices B-tree en PostgreSQL frente al orden aleatorio de UUIDv4.
  - No expone secuencias de negocio en URLs ni a clientes.
  - Desacoplamiento total entre la identidad de la fila relacional y las reglas de dominio.
- **Separación Conceptual Tajante:**
  - El **Technical ID** (`id: UUIDv7`) es la clave primaria técnica relacional para índices, joins y relaciones foráneas.
  - El **Permanent Code** (`permanent_code: String`) es un identificador de negocio humano, inmutable, asignado exclusivamente a `Plant` para etiquetado físico y consulta cotidiana (`AT-PL-XXX`). Jamás se deriva de `id`.

### 5.2 Estrategia Definitiva de Generación de `permanent_code` (`AT-PL-XXX`)

En cumplimiento con `ADR-002`, `ATP-006` y `ADR-017`:
- El componente numérico se genera en el servidor mediante una **secuencia dedicada nativa de PostgreSQL** (ej. `CREATE SEQUENCE plant_code_seq`).
- **Principios Obligatorios:**
  - Generación 100% server-side.
  - Operación atómica y segura ante concurrencia a nivel de motor de base de datos.
  - Valor nunca reutilizado, permanente e independiente del `lifecycle_status` (incluso tras archivar).
  - Independiente del UUIDv7 técnico de la planta.
  - Los eventuales *gaps* o saltos numéricos (si una transacción consume el valor y luego se cancela) son plenamente aceptables en favor de garantizar unicidad absoluta sin contención.
- **Portabilidad de la Secuencia:** Esta decisión asume formalmente a PostgreSQL como motor relacional aprobado del proyecto. Cualquier servicio PostgreSQL gestionado en la nube (Neon, Supabase, AWS RDS) soporta esta misma semántica nativa. No se introduce ninguna abstracción artificial para otros motores fuera del alcance.
- **Implementación Física:** No se crean migraciones ni scripts SQL en el Sprint 0; la definición física de la secuencia se realizará durante la inicialización de la base de datos en el Sprint 1.

---

## 6. Arquitectura de Almacenamiento de Fotos (`StorageService`)

En consonancia con `ADR-006`, `ADR-008`, `ADR-010` y `ADR-011`:

### 6.1 Contrato de la Abstracción (`IFileStorageService`)

```typescript
export interface FileMetadata {
  storageKey: string;      // Clave lógica: "photos/AT-PL-013/550e8400...webp"
  sizeBytes: number;
  mimeType: string;
  originalFilename?: string;
}

export interface IFileStorageService {
  /**
   * Guarda un archivo binario optimizado a partir de un buffer.
   * @param permanentCode Código de la planta para particionado jerárquico
   * @param fileBuffer Buffer del archivo validado y procesado
   * @param extension Extensión normalizada (ej: 'webp')
   * @returns Metadata con la storageKey lógica generada
   */
  saveFile(permanentCode: string, fileBuffer: Buffer, extension: string): Promise<FileMetadata>;

  /**
   * Resuelve la URL pública o ruta relativa accesible por el cliente para visualizar la imagen.
   * La UI JAMÁS construye URLs directamente ni asume "/api/photos/".
   * En LocalFileStorage: devuelve la URL controlada por la aplicación (ej: "/api/photos/...").
   * En ObjectStorage futuro: devuelve URL pública o signed URL según configuración.
   */
  resolveUrl(storageKey: string): Promise<string>;

  /**
   * Verifica la existencia física del archivo.
   */
  fileExists(storageKey: string): Promise<boolean>;

  /**
   * Elimina un archivo físico (solo para operaciones administrativas de mantenimiento).
   */
  deleteFile(storageKey: string): Promise<void>;
}
```

### 6.2 Implementaciones de Almacenamiento: `LocalFileStorageService` y `VercelBlobStorageService`
- **Contrato Común:** Ambas implementaciones satisfacen la interfaz `IFileStorageService` (`saveFile`, `readFile`, `fileExists`, `deleteFile`, `resolveUrl`), manteniendo desacopladas las capas de Dominio y Aplicación.
- **Jerarquía Lógica:** `photos/{permanent_code}/{unique-file-id}.{extension}`.
  - La clave `storage_key` lógica es relativa (ej: `photos/AT-PL-013/0191aa10-pho1...webp`) y es lo único que se almacena en `Photo.file_path`. **Nunca es una ruta absoluta del host ni una URL externa acoplada**.
  - `unique-file-id` es un identificador único (UUIDv7) que garantiza no sobreescribir archivos históricos (`ADR-008`).
- **Implementación Local / Docker / Homelab (`LocalFileStorageService`):**
  - Escribe en el sistema de archivos del host montado bajo `STORAGE_LOCAL_PATH` (ej: `/app/storage/photos/...`).
- **Implementación Producción Vercel (`VercelBlobStorageService`):**
  - Persiste los binarios de forma duradera en **Vercel Blob Object Storage** mediante `@vercel/blob` (`put`, `get`, `head`, `del`) utilizando `BLOB_READ_WRITE_TOKEN`.
- **Resolución en `serviceContainer`:**
  - Si existe `BLOB_READ_WRITE_TOKEN` o `STORAGE_DRIVER=blob`, instancia `VercelBlobStorageService`.
  - Si corre en Vercel (`process.env.VERCEL`) sin almacenamiento en la nube configurado, lanza `StorageUnavailableError` (evitando escrituras en el filesystem efímero de Vercel).
  - En entorno local / Docker / pruebas, instancia `LocalFileStorageService`.
- **Resolución de Serving:** La Presentation/UI obtiene el recurso utilizable exclusivamente mediante `storageService.resolveUrl(photo.file_path)`. El endpoint `/api/photos/view/[...storageKey]` lee los bytes a través de `IFileStorageService.readFile(storageKey)` garantizando abstracción uniforme y control de caché `immutable`.

### 6.3 Preprocesamiento de Imágenes Server-Side
Durante la subida de fotografías de ejemplares, el servidor procesará la imagen mediante una biblioteca apropiada como **`sharp`**:
- **Objetivos:** Normalizar orientación EXIF automática, reducir dimensiones excesivas provenientes de cámaras móviles modernas, optimizar compresión y producir formato web eficiente (**WebP** como formato preferido).
- **Parámetros Concretos:** Los límites exactos de resolución (píxeles), peso máximo de upload y factor de calidad WebP no se fijan rígidamente en la arquitectura; serán definidos como configuración parametrizable durante la implementación mediante pruebas reales con fotos móviles.

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario (Browser)
    participant Server as Next.js API / Action
    participant Processor as ImageProcessor (sharp)
    participant Storage as LocalFileStorageService
    participant DB as Prisma (PostgreSQL)

    User->>Server: POST /api/photos/upload (FormData: file, plant_id, is_primary)
    Server->>Server: 1. Validar MIME (JPEG, PNG, WebP)
    Server->>Processor: 2. Preprocesar (auto-orientación, resize máx, conversión WebP)
    Processor-->>Server: Buffer optimizado WebP
    Server->>DB: 3. Obtener permanent_code del ejemplar
    Server->>Storage: 4. saveFile(permanent_code, bufferWebP, 'webp')
    Storage->>Storage: Escribir en disk: photos/{code}/{uuid}.webp
    Storage-->>Server: storageKey lógica ("photos/AT-PL-001/uuid.webp")
    
    rect rgb(240, 248, 255)
    Note over Server,DB: Transacción Atómica
    opt is_primary == true
        Server->>DB: 5. UPDATE Photo SET is_primary = false WHERE plant_id = X
    end
    Server->>DB: 6. INSERT INTO Photo (id, plant_id, file_path, is_primary, captured_at)
    end
    
    Server->>Storage: 7. resolveUrl(storageKey)
    Storage-->>Server: Resolved URL
    Server-->>User: 201 Created (Photo DTO con resolved URL)
```

---

## 7. Arquitectura de Integración con Open Plantbook

En concordancia con `ADR-012`, `ADR-013` y `04_ARCHITECTURE/OPEN_PLANTBOOK_INTEGRATION.md`:

### 7.1 Componentes y Flujo de Datos

```mermaid
graph LR
    subgraph "Browser / Client"
        UI[UI Modal / Search Input]
    end

    subgraph "Next.js Server"
        EP["Route Handler: /api/integrations/plantbook/search"]
        SVC[PlantReferenceService]
        CLIENT[OpenPlantbookClient]
        TOKEN[OAuth2TokenManager (In-Memory Cache)]
        MAPPER[OpenPlantbookMapper]
    end

    subgraph "Data Storage"
        REPO[PrismaReferenceRepository]
        PG[(PostgreSQL - PlantReference)]
    end

    subgraph "External Provider"
        OPB["API: open.plantbook.io"]
    end

    UI -->|GET ?q=monstera| EP
    EP --> SVC
    SVC --> CLIENT
    CLIENT -->|Check / Renew Token| TOKEN
    CLIENT -->|GET /api/v1/plant/search| OPB
    OPB -->> CLIENT: Results (pids)
    CLIENT -->> SVC: Raw API Results
    SVC -->> EP: Normalized Results List
    EP -->> UI: Results (JSON normalizado)

    UI -->|Select Species (pid)| SVC
    SVC --> CLIENT
    CLIENT -->|GET /api/v1/plant/detail/pid| OPB
    OPB -->> CLIENT: Detailed botanical payload
    CLIENT --> MAPPER
    MAPPER -->|Map to Domain Entity / Snapshot| SVC
    SVC --> REPO
    REPO -->|Persist Snapshot| PG
```

### 7.2 Separación Estricta:
- El payload crudo `raw_data` devuelto por el proveedor queda contenido y encapsulado dentro del repositorio de infraestructura y de la entidad `PlantReference`. **`raw_data` no atraviesa la UI como contrato primario**.
- `OAuth2TokenManager` gestiona en memoria el `access_token` de Client Credentials sin exponer credenciales al cliente.

### 7.3 Clarificación del Snapshot de Dominio (`PlantReference`):
- **Significado de Snapshot en Atilio Plants:** Significa que el registro persistido localmente **no desaparece ni se modifica automáticamente** a causa de caídas, cambios de esquema, rate limits o indisponibilidad en los servidores de Open Plantbook.
- **Evolución Futura:** Esto **no significa** que `PlantReference` jamás pueda actualizarse; en etapas posteriores se podrá implementar mecanismos explícitos de refresco o versionado conservando trazabilidad histórica.

---

## 8. Estrategia Local-First y Seguridad

### 8.1 Definición de Local-First en Atilio Plants
El término **Local-First** en Atilio Plants significa:
1. **Soberanía Completa de Datos:** Todos los datos del inventario, perfiles de cultivo, historial de ubicaciones y metadatos residen en la base de datos PostgreSQL local.
2. **Archivos Locales:** Los binarios de las imágenes fotográficas se escriben en el almacenamiento del sistema local.
3. **Autonomía Operativa:** El sistema opera al 100% en una red local sin requerir acceso a internet para sus funciones primarias (creación, edición, consulta y archivo de plantas). Solo la búsqueda de nuevas especies en Open Plantbook requiere conexión externa.
4. **Resiliencia ante Desconexión:** Los snapshots locales de `PlantReference` garantizan que la información botánica vinculada siga disponible sin conexión a internet.
5. **No es Offline-First de Navegador:** El usuario accede mediante navegador al servidor web local (a través de `localhost:3000` o IP LAN `192.168.x.x:3000`). No se requiere Service Workers PWA con IndexedDB completo en v0.1.

### 8.2 Seguridad y Protección de Datos
- **Gestión de Secretos:** Variables sensibles (`DATABASE_URL`, `OPEN_PLANTBOOK_CLIENT_ID`, `OPEN_PLANTBOOK_CLIENT_SECRET`) se configuran únicamente vía variables de entorno en el servidor (`.env.local` / Docker env) y nunca con prefijo `NEXT_PUBLIC_`.
- **Validación Estricta de Archivos:**
  - Inspección obligatoria de tipo MIME en servidor (`image/jpeg`, `image/png`, `image/webp`).
  - Generación de nombre físico aleatorio (`UUID` + `.webp`). Se descarta el nombre de archivo original enviado por el cliente para prevenir ataques de Directory Traversal (`../../`).
- **Sanitización de Inputs:** Parámetros de consulta y campos de texto de usuario son normalizados (`trim`, longitud máxima validada con esquemas Zod).
- **Enmascaramiento en Logs:** Las credenciales y tokens jamás se imprimen en consola ni en logs.

---

## 9. Estrategia de Entorno y Docker

Para garantizar reproducibilidad total en desarrollo y despliegue hogareño, el entorno se orquesta mediante **Docker Compose**:

### Runtime Node.js:
- **Regla:** Utilizar una versión **Node.js LTS oficialmente soportada al momento de la implementación**.
- La versión concreta será fijada al inicializar el proyecto según la compatibilidad con la versión estable de Next.js y las dependencias seleccionadas (evitando versiones deprecadas como Node.js 20).

### Servicios Mínimos v0.1:
1. **`postgres`:**
   - Imagen oficial: `postgres:16-alpine`.
   - Volumen de persistencia: `postgres_data:/var/lib/postgresql/data`.
   - Variables de inicialización: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
2. **`app`:**
   - Construcción multi-stage mediante `Dockerfile` (Node.js LTS soportado).
   - Volumen montado para almacenamiento de fotos: `./storage:/app/storage`.
   - Dependencia de servicio: `depends_on: postgres`.
   - Exposición de puerto: `3000:3000`.

*Nota de Simplicidad Operativa:* No se incorporan contenedores adicionales como Redis, MinIO, reverse proxies Nginx ni message brokers en v0.1.

---

## 10. Estrategia de Despliegue: Local/Homelab vs. Futuro Cloud

```mermaid
graph TB
    subgraph "Escenario A: Local / Homelab (v0.1)"
        C1[Navegador Móvil / Desktop] -->|HTTP LAN:3000| N1[Atilio Plants - Monolito Next.js en Docker]
        N1 -->|TCP 5432| DB1[(PostgreSQL Container)]
        N1 -->|Local Filesystem Mount| FS1[(Directorio ./storage/photos)]
        N1 -.->|HTTPS Saliente| EXT1[Open Plantbook API]
    end

    subgraph "Escenario B: Future Cloud (Evolución)"
        C2[Navegador Móvil / Desktop] -->|HTTPS| N2[Atilio Plants - Vercel / Cloud Container]
        N2 -->|Connection Pool| DB2[(PostgreSQL Gestionado: Supabase / Neon / RDS)]
        N2 -->|S3 SDK / Presigned URLs| FS2[(Object Storage: Cloudflare R2 / AWS S3)]
        N2 -.->|HTTPS Saliente| EXT2[Open Plantbook API]
        HA[Home Assistant / Sensores] -.->|API Adapter / Webhooks| N2
    end
```

### Matriz de Transición de Componentes:

| Componente | Escenario A: Local / Homelab | Escenario B: Futuro Cloud | Impacto del Cambio |
| :--- | :--- | :--- | :--- |
| **Código de Aplicación y UI** | Idéntico (Next.js App Router) | Idéntico | Cero cambios en lógica de negocio ni componentes. |
| **Modelos y Repositorios** | Prisma ORM | Prisma ORM | Cero cambios en queries o esquemas. |
| **Base de Datos** | Contenedor local `postgres:16` | PostgreSQL gestionado en la nube | Solo cambia la variable `DATABASE_URL`. |
| **Almacenamiento de Fotos** | `LocalFileStorageService` | `S3ObjectStorageService` | Implementa la interfaz `IFileStorageService`. Cero cambios en entidades. |
| **Secretos e Integración** | Variables `.env` en host | Environment Variables en panel cloud | Mismo contrato de lectura server-side. |

---

## 11. Frontera Futura con Home Assistant y Telemetría

En cumplimiento estricto con `ADR-001` y `ADR-003`:
- **El MVP v0.1 no contiene entidades de dispositivos, sensores ni telemetría.**
- En etapas futuras (Etapa 4 del Roadmap), la integración con Home Assistant se resolverá como un **Adapter externo** (`HomeAssistantAdapter`) que consultará o recibirá métricas (temperatura, humedad de suelo) mapeándolas a un subsistema desacoplado de lecturas temporales (`PlantTelemetryReading`), correlacionado por `plant_id`.
- La arquitectura actual garantiza que la eliminación, falla o ausencia de Home Assistant no altera el funcionamiento del inventario.

---

## 12. Logging y Gestión de Errores

Se adopta una taxonomía de errores simple, estandarizada y tipada:

```text
               ┌────────────────────────┐
               │        AppError        │ (Clase base de error)
               └───────────┬────────────┘
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│   DomainError   │ │ InfraError  │ │ ExternalService │
│ (Reglas negocio,│ │ (DB, disco, │ │      Error      │
│ validaciones)   │ │ corrupción) │ │ (Plantbook API) │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

- **Errores de Dominio (`DomainError`):** Manejados de forma previsible; devuelven mensajes amigables y códigos comprensibles para la UI (ej. *"El código permanente ya existe"*, *"Ubicación archivada no asignable"*).
- **Errores de Infraestructura (`InfraError`):** Errores de conexión de DB o fallas de I/O de disco; se registran en servidor con stack trace completo y devuelven un mensaje genérico de error a la UI.
- **Errores de Proveedor Externo (`ExternalServiceError`):** Capturan timeouts, 429 o respuestas inválidas de Open Plantbook; activan degradación elegante en la UI sin bloquear la aplicación.
- **Formato de Logs:** Salida estándar estructurada en formato texto/JSON legible en consola del servidor (`[TIMESTAMP] [LEVEL] [CONTEXT] Message`).

---

## 13. Variables de Configuración del Sistema

| Variable | Descripción | Entorno Requerido | Ejemplo / Valor Predeterminado |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Modo de ejecución de Node.js | Todos | `development` \| `production` |
| `DATABASE_URL` | Cadena de conexión JDBC/Postgres para Prisma | Servidor | `postgresql://atilio:secret@localhost:5432/atilio_plants` |
| `STORAGE_DRIVER` | Driver de almacenamiento de archivos | Servidor | `local` (v0.1) \| `s3` (futuro) |
| `STORAGE_LOCAL_PATH` | Ruta base del filesystem para subida de fotos | Servidor | `./storage` o `/app/storage` |
| `MAX_UPLOAD_SIZE_MB` | Tamaño máximo permitido por fotografía | Servidor / API | Configurable según pruebas de implementación |
| `OPEN_PLANTBOOK_CLIENT_ID` | Identificador de cliente OAuth2 para Open Plantbook | Servidor | *Credencial provista por portal externo* |
| `OPEN_PLANTBOOK_CLIENT_SECRET` | Secreto OAuth2 para Open Plantbook | Servidor | *Credencial provista por portal externo* |
| `OPEN_PLANTBOOK_API_URL` | URL base de la API externa | Servidor | `https://open.plantbook.io/api/v1` |

---

## 14. Estrategia de Testing

Para mantener alta confiabilidad sin burocracia excesiva:
1. **Unit Tests (Vitest):**
   - Reglas de dominio puras (validación de formatos, transiciones de estado de salud `health_status`, asignación de `is_primary`).
   - Mappers de payload de Open Plantbook hacia `PlantReference`.
2. **Integration Tests (Vitest + DB local de test):**
   - Repositorios Prisma (`PrismaPlantRepository`, `PrismaLocationRepository`): verificar constraints de unicidad y preservación de relaciones.
   - `LocalFileStorageService`: verificación de escritura y lectura física en directorio temporal aislado.
3. **Integration Mocks (MSW - Mock Service Worker):**
   - Pruebas del cliente `OpenPlantbookClient` simulando respuestas HTTP 200, 401, 429 y 500 para validar manejo de errores, refresh de token y fallbacks.
4. **E2E Tests (Playwright - alcance selectivo en v0.1):**
   - Flujo crítico `FLOW-001` (Alta de planta completa con subida de foto y visualización en inventario).

---

## 15. Pending Architecture Decisions (PADs)

*No existen decisiones pendientes para el alcance del MVP v0.1. Todas las decisiones arquitectónicas han sido resueltas:*

- **PAD-001 (Generación de `permanent_code`):** **RESOLVED** mediante secuencia nativa dedicada de PostgreSQL (`ADR-017`).
- **PAD-002 (Serving y resolución de fotos):** **RESOLVED** mediante abstracción de storage `IFileStorageService.resolveUrl()` con Route Handler controlado en v0.1.
- **PAD-003 (Preprocesamiento de imágenes):** **RESOLVED** conceptualmente mediante procesamiento server-side (`sharp` a formato WebP optimizado), con parámetros específicos diferidos a la fase de implementación.

---

## 16. Decisiones Arquitectónicas Registradas (ADRs del Sistema)

- **ADR-014: Monolito Full-Stack con Next.js y TypeScript.**
- **ADR-015: Persistencia Relacional con PostgreSQL y Prisma ORM.**
- **ADR-016: Identificadores Técnicos UUIDv7 y Desacoplamiento de Códigos de Dominio.**
- **ADR-017: Generación de permanent_code Mediante Secuencia Dedicada de PostgreSQL.**
