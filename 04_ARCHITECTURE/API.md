# Especificación de API y Contratos de Servicio — Atilio Plants MVP v0.1

> **Estado:** Aprobado para Sprint 0 (ATP-007)  
> **Alcance:** Criterio arquitectónico de Server Actions vs. Route Handlers, contratos de invocación, formatos de payload JSON, códigos de respuesta y manejo de errores.

---

## 1. Criterio de Comunicación: Server Actions vs. Route Handlers

En una arquitectura Next.js full-stack monolítica moderna, no es necesario exponer un endpoint REST duplicado por cada mutación interna de la UI. Se adopta el siguiente criterio estricto:

1. **Server Actions (`src/features/*/actions.ts`):**  
   Mecanismo primario para toda interacción originada por la UI móvil de la aplicación (crear planta, editar planta, archivar planta, crear/renombrar/archivar ubicación).
   - Invocan directamente los **Casos de Uso** en la capa de aplicación.
   - Retornan estados estructurados con tipos TypeScript end-to-end.
2. **Route Handlers (`src/app/api/...`):**  
   Reservados exclusivamente para necesidades HTTP reales donde se requiere control directo sobre el protocolo:
   - **Upload de Binarios y Archivos Fotográficos:** `POST /api/photos/upload` (manejo de stream `multipart/form-data`).
   - **Serving y Streaming de Archivos:** `GET /api/photos/[...storageKey]` (cabeceras `Cache-Control`, content-type y prevención de sniffing).
   - **Proxy Seguro hacia Servicios Externos:** `GET /api/integrations/plantbook/search` (aislamiento de secretos y rate limiting para autocompletado en cliente).
   - **Futuras Integraciones Desacopladas:** Endpoints de ingesta pasiva para sistemas externos (ej. Home Assistant o webhooks en etapas posteriores).
3. **Capa Común de Casos de Uso:**  
   Tanto las Server Actions como los Route Handlers delegan la ejecución en los **Casos de Uso** (`src/core/application/use-cases/`), evitando duplicar lógica de negocio o de validación.

---

## 2. Contratos de Server Actions (Operaciones de UI)

### 2.1 Módulo Plantas (`features/plants/actions.ts`)

#### `createPlantAction(input: CreatePlantInput): Promise<ActionResult<PlantDetailDto>>`
- **Input:**
  ```typescript
  interface CreatePlantInput {
    commonName: string;            // Requerido, 1-100 chars
    scientificName?: string;       // Opcional
    cultivar?: string;             // Opcional
    locationId?: string;           // Opcional, UUIDv7
    healthStatus?: HealthStatus;   // Opcional, default: 'UNKNOWN' (ADR-009)
    acquisitionDate?: string;      // Opcional, formato YYYY-MM-DD
    referenceId?: string;          // Opcional, UUIDv7 (snapshot botánico vinculado)
    notes?: string;                // Opcional
    cultivation?: {
      potInfo?: string;
      substrateInfo?: string;
      lightConditions?: string;
      wateringNotes?: string;
    };
  }
  ```
- **Comportamiento:**
  - Invoca `CreatePlantUseCase`.
  - Genera atómicamente el `permanent_code` (`AT-PL-XXX`) mediante la secuencia dedicada de PostgreSQL (`ADR-017`).
  - Asigna clave primaria técnica `id` de tipo `UUIDv7` (`ADR-016`).
  - Revalida el path `/plants` en el caché de Next.js.
- **Retorno Exitoso:** Objeto `PlantDetailDto` con `id`, `permanentCode`, datos de cultivo y estado de salud.

#### `updatePlantAction(id: string, input: UpdatePlantInput): Promise<ActionResult<PlantDetailDto>>`
- **Regla:** El atributo `permanentCode` es inmutable; no forma parte de `UpdatePlantInput`.

#### `archivePlantAction(id: string): Promise<ActionResult<void>>`
- **Efecto:** Cambia `lifecycleStatus = 'ARCHIVED'` (`ADR-004`). Preserva intacto todo el historial fotográfico y de cultivo.

### 2.2 Módulo Ubicaciones (`features/locations/actions.ts`)

#### `createLocationAction(name: string): Promise<ActionResult<LocationDto>>`
- **Regla:** Validación de unicidad insensible a mayúsculas/minúsculas entre ubicaciones activas.
#### `renameLocationAction(id: string, newName: string): Promise<ActionResult<LocationDto>>`
#### `archiveLocationAction(id: string): Promise<ActionResult<void>>`
- **Regla de Negocio:** La ubicación archivada no se desvincula de las plantas históricas, pero deja de ofrecerse para nuevas asignaciones (`ADR-007`).

---

## 3. Route Handlers (Endpoints HTTP Reales)

### 3.1 Subida de Fotografía
- **Método / Ruta:** `POST /api/photos/upload`
- **Content-Type:** `multipart/form-data`
- **Campos del Formulario:**
  - `file`: Archivo binario (JPEG, PNG, WebP).
  - `plantId`: Clave técnica `UUIDv7` del ejemplar.
  - `isPrimary`: boolean (`true` si debe marcarse como foto principal).
- **Flujo de Ejecución:**
  1. Validación de MIME permitido en servidor.
  2. Preprocesamiento server-side con `sharp` (corrección de orientación EXIF, redimensionamiento y optimización WebP) (`PAD-003`).
  3. Guardado en storage vía `storageService.saveFile(permanentCode, buffer, 'webp')`.
  4. Transacción de base de datos: si `isPrimary = true`, actualiza fotos anteriores del ejemplar a `is_primary = false` e inserta registro `Photo` (`ADR-008`, `ADR-010`).
  5. Resolución de URL accesible vía `storageService.resolveUrl(photo.file_path)`.
- **Respuesta (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "0191aa10-pho1-7000-8000-000000000001",
      "plantId": "0191aa10-0001-7000-8000-000000000001",
      "filePath": "photos/AT-PL-001/0191aa10-file-7000-8000-000000000001.webp",
      "isPrimary": true,
      "url": "/api/photos/view/photos/AT-PL-001/0191aa10-file-7000-8000-000000000001.webp",
      "capturedAt": "2026-09-07T19:00:00.000Z"
    }
  }
  ```

### 3.2 Visualización / Serving de Fotografía
- **Método / Ruta:** `GET /api/photos/view/[...storageKey]`
- **Comportamiento:** Resuelve el archivo físico local a través de `LocalFileStorageService`.
- **Encabezados HTTP:**
  - `Content-Type: image/webp`
  - `Cache-Control: public, max-age=31536000, immutable`
  - `X-Content-Type-Options: nosniff`

### 3.3 Búsqueda de Especies en Open Plantbook
- **Método / Ruta:** `GET /api/integrations/plantbook/search`
- **Query Params:** `q`: término de búsqueda (mínimo 2 caracteres).
- **Comportamiento:** Proxy server-side que utiliza `OAuth2TokenManager` y consulta la API externa con timeout de 5000 ms. Mapea la respuesta a una estructura limpia para la UI (`raw_data` no se expone al cliente).
- **Respuesta (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "pid": "monstera deliciosa",
        "displayPid": "Monstera deliciosa",
        "commonNames": ["Cerimán", "Costilla de Adán", "Swiss Cheese Plant"]
      }
    ]
  }
  ```
- **Respuestas Semánticas de Error (No Bloqueantes):**
  - `429 Too Many Requests`: `{"success": false, "error": {"code": "RATE_LIMITED", "message": "Límite de consultas a Open Plantbook alcanzado. Puede continuar sin vincular referencia."}}`
  - `504 Gateway Timeout` / `502 Bad Gateway`: `{"success": false, "error": {"code": "SERVICE_UNAVAILABLE", "message": "Servicio de Open Plantbook no disponible temporalmente."}}`

### 3.4 Obtención y Creación de Snapshot Botánico
- **Método / Ruta:** `POST /api/integrations/plantbook/reference`
- **Payload:** `{"pid": "monstera deliciosa"}`
- **Comportamiento:** Consulta detalle en Open Plantbook, transforma el payload mediante `OpenPlantbookMapper` y persiste o recupera la entidad local `PlantReference` como snapshot de dominio en PostgreSQL (`ADR-012`).
- **Respuesta (200 OK / 201 Created):** Retorna el `referenceId` local (UUIDv7) para asociar al ejemplar en el formulario.
