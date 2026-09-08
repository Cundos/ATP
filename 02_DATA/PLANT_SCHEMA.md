# Esquema Lógico de Datos — Atilio Plants v0.1

Este documento detalla la especificación lógica campo a campo para cada una de las entidades que componen el modelo de datos de **Atilio Plants v0.1**, incorporando `PlantReference` y la actualización semántica de condiciones reales de cultivo.

---

## 1. Entidad: `Plant`

Representa el individuo botánico físico único y central del sistema.

| Campo | Tipo Lógico | Requerido | Nullable | Mutable | Restricciones / Reglas | Notas de Negocio |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | String / UUID | Sí | No | No | Primary Key | Identificador técnico interno opaco |
| `permanent_code` | String | Sí | No | No | Unique Key, Format `^AT-PL-\d{3,}$` | Código inmutable visible (`AT-PL-001`). Nunca reutilizable |
| `common_name` | String | Sí | No | Sí | Min length 1 | Nombre coloquial principal. Único campo requerido al usuario en alta |
| `scientific_name` | String | No | Sí | Sí | — | Género y especie botánica (ej. *Monstera deliciosa*) |
| `cultivar` | String | No | Sí | Sí | — | Variedad cultivada (ej. 'Variegata', 'Albo') |
| `health_status` | Enum | Sí | No | Sí | `UNKNOWN`, `HEALTHY`, `ATTENTION`, `RECOVERY` | Default: `UNKNOWN` ("Sin evaluar") |
| `lifecycle_status` | Enum | Sí | No | Sí | `ACTIVE`, `ARCHIVED` | Default: `ACTIVE`. Define archivado lógico |
| `acquisition_date` | Date | Sí | No | Sí | Date <= CurrentDate | Fecha de incorporación física. Default: fecha del sistema al alta |
| `notes` | Text | No | Sí | Sí | — | Observaciones generales, antecedentes o notas clínicas |
| `location_id` | String / UUID | No | Sí | Sí | Foreign Key -> `Location.id` | Ubicación actual asignada. Puede ser `null` ("Sin ubicación") |
| `reference_id` | String / UUID | No | Sí | Sí | Foreign Key -> `PlantReference.id` | Enlace opcional a la referencia de especie. Puede ser `null` |
| `created_at` | Timestamp | Sí | No | No | Auto-set | Auditoría de creación del registro |
| `updated_at` | Timestamp | Sí | No | Sí | Auto-update | Auditoría de última modificación de datos |

*Nota sobre la foto principal:* La entidad `Plant` no almacena una columna foránea hacia la foto principal; la misma se resuelve a través de `Photo.is_primary`.

---

## 2. Entidad: `PlantReference`

Almacena el conocimiento botánico compartido y los cuidados teóricos de la especie/taxón provistos por Open Plantbook.

| Campo | Tipo Lógico | Requerido | Nullable | Mutable | Restricciones / Reglas | Notas de Negocio |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | String / UUID | Sí | No | No | Primary Key | Identificador técnico interno de la referencia |
| `provider` | String | Sí | No | No | ej. `'OPEN_PLANTBOOK'` | Proveedor externo de la información |
| `external_id` | String | Sí | No | No | ej. `'monstera deliciosa'` | Identificador externo en el proveedor (`pid`) |
| `scientific_name` | String | Sí | No | Sí | Min length 1 | Nombre científico estandarizado de la especie |
| `common_names` | JSON / Array | No | Sí | Sí | — | Nombres comunes de referencia devueltos por el proveedor |
| `reference_care` | JSON / Object | No | Sí | Sí | — | Cuidados teóricos de especie (temp, luz lux, riego, humedad, suelo) |
| `image_url` | String | No | Sí | Sí | URL válida | Imagen ilustrativa de catálogo (NO se convierte en `Photo`) |
| `fetched_at` | Timestamp | Sí | No | No | Auto-set | Momento en que se obtuvo por primera vez el snapshot |
| `last_sync_at` | Timestamp | Sí | No | Sí | Auto-update | Momento de última verificación/sincronización con la API |
| `raw_data` | JSON / Object | Sí | No | Sí | Snapshot íntegro del payload | Almacena respuesta original para trazabilidad y compatibilidad |

*Restricción compuesta:* `UNIQUE(provider, external_id)` garantiza que no se duplique la misma especie del mismo proveedor en la base local.

---

## 3. Entidad: `Location`

Representa los ambientes físicos administrables de la vivienda donde se ubican las plantas.

| Campo | Tipo Lógico | Requerido | Nullable | Mutable | Restricciones / Reglas | Notas de Negocio |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | String / UUID | Sí | No | No | Primary Key | Identificador técnico interno |
| `name` | String | Sí | No | Sí | Unique entre ubicaciones `ACTIVE`, Min length 1 | Nombre del ambiente (ej. "Living", "Cocina", "Atelier") |
| `lifecycle_status` | Enum | Sí | No | Sí | `ACTIVE`, `ARCHIVED` | Default: `ACTIVE`. Al archivar, se oculta para nuevas asignaciones |
| `created_at` | Timestamp | Sí | No | No | Auto-set | Auditoría de creación |
| `updated_at` | Timestamp | Sí | No | Sí | Auto-update | Auditoría de modificación (ej. renombramiento) |

---

## 4. Entidad: `Photo`

Almacena la metadata y ruta de los archivos fotográficos del ejemplar físico, preservando imágenes reemplazadas.

| Campo | Tipo Lógico | Requerido | Nullable | Mutable | Restricciones / Reglas | Notas de Negocio |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | String / UUID | Sí | No | No | Primary Key | Identificador técnico interno de Photo |
| `plant_id` | String / UUID | Sí | No | No | Foreign Key -> `Plant.id` | Ejemplar físico al que pertenece la fotografía |
| `file_path` | String | Sí | No | No | Storage key / Path local único | Ruta lógica: `photos/{code}/<unique-id>.<ext>` |
| `file_name` | String | Sí | No | No | — | Nombre original del archivo al subir |
| `mime_type` | String | Sí | No | No | ej. `image/jpeg`, `image/png`, `image/webp` | Formato multimedia estándar |
| `file_size` | Integer | No | Sí | No | Bytes >= 0 | Tamaño del archivo en disco |
| `is_primary` | Boolean | Sí | No | Sí | Default: `false`. Máximo una `true` por `plant_id` | Flag de foto principal visible activa |
| `captured_at` | Timestamp | No | Sí | Sí | — | Fecha real de captura fotográfica si está disponible |
| `created_at` | Timestamp | Sí | No | No | Auto-set | Momento de carga al sistema |

---

## 5. Entidad: `PlantCultivationProfile`

Aísla y representa exclusivamente las condiciones de cultivo **reales y actuales** del ejemplar físico.

| Campo | Tipo Lógico | Requerido | Nullable | Mutable | Restricciones / Reglas | Notas de Negocio |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | String / UUID | Sí | No | No | Primary Key | Identificador técnico interno |
| `plant_id` | String / UUID | Sí | No | No | Foreign Key -> `Plant.id`, Unique Constraint | Relación 1:0..1 con la planta en v0.1 |
| `pot_info` | String / Text | No | Sí | Sí | — | Características reales del contenedor actual (maceta 20cm, barro) |
| `substrate_info` | String / Text | No | Sí | Sí | — | Mezcla real de sustrato colocada (turba, perlita, corteza) |
| `light_conditions` | String / Text | No | Sí | Sí | — | Condiciones reales de iluminación en su ubicación hogareña |
| `watering_notes` | String / Text | No | Sí | Sí | — | Pautas reales observadas para el régimen de riego del ejemplar |
| `created_at` | Timestamp | Sí | No | No | Auto-set | Auditoría de creación del perfil actual |
| `updated_at` | Timestamp | Sí | No | Sí | Auto-update | Auditoría de actualización del perfil actual |

---

## 6. Reglas de Validación e Integridad Globales

1. **Unicidad del Código de Negocio:**  
   `Plant.permanent_code UNIQUE` es global e inmutable en toda la base de datos (independientemente del estado de archivo).
2. **Restricción de Foto Principal en Dominio:**  
   Para una misma `Plant` puede existir como máximo una tupla en `Photo` con `is_primary = true`. Al designar una nueva foto principal, la anterior se actualiza a `is_primary = false` y su archivo físico no se destruye.
3. **Reutilización de Referencias Botánicas:**  
   La restricción `UNIQUE(provider, external_id)` en `PlantReference` permite que múltiples ejemplares de la misma especie (ej. dos *Pothos*) apunten al mismo `id` de referencia sin duplicar snapshots.
4. **Independencia Operativa y Nulos:**  
   `Plant.reference_id` es estrictamente opcional (`nullable`). La falta de referencia externa nunca impide crear, consultar, editar ni archivar una planta.
5. **Persistencia de Referencias de Ubicaciones:**  
   El archivado de una `Location` no modifica el `location_id` de plantas previamente asignadas, pero prohíbe nuevas asignaciones.
