# ADR-021: Regional & Seasonal Flora Data Model and Botanical Provenance (ATP-ECO-001A)

## Estado
Aceptado

## Contexto
Atilio Plants incorporó un modelo de datos inicial para plantas domésticas en maceta y cuidado indoor/outdoor individual. Sin embargo, para soportar la comprensión y preservación del entorno ecológico, se requiere conocer la flora nativa regional y el calendario de eventos fenológicos estacionales (brotación, floración, fructificación, siembra, plantación) según la ubicación geográfica del usuario (ej: Arroyito, Córdoba, Argentina) y su correspondiente matriz ecológica (Espinal / Chaco Seco).

Se establecieron los siguientes principios rectores:
1. **Separación entre Geografía Política y Biomas Ecológicos**: Una localidad o provincia política (`GrowingRegion`) puede intersecarse con una o más ecorregiones (`EcologicalRegion`), soportando ecotonos y zonas de transición mediante una relación N:M (`GrowingRegionEcologicalRegion`).
2. **Trazabilidad y Verificabilidad Botánica Estricta**: No se inventan datos botánicos ni se utiliza un LLM como fuente de verdad botánica. Todo evento fenológico (`PlantPhenology`) debe referenciar obligatoriamente una fuente documentada (`DataSource`).
3. **Desacoplamiento con el Catálogo de Cultivo Doméstico**: La flora regional (`RegionalPlantSpecies`) puede existir de forma independiente o vincularse opcionalmente a fichas botánicas existentes (`PlantReference`).
4. **Resistencia a Duplicados e Integridad Temporal**: Un evento fenológico define explícitamente el mes (1 a 12) y tipo de evento, con unicidad estricta para evitar reportes redundantes de la misma fuente en la misma región.

## Decisiones de Diseño

### 1. Entidades del Dominio

- **`DataSource`**: Registra la institución o repositorio científico de referencia (`Flora Argentina / IBODA - CONICET`, `INTA`, etc.), con tipado estricto (`SourceType`: `BOTANICAL_INSTITUTION`, `GOVERNMENT_DATASET`, `HERBARIUM`, `SCIENTIFIC_PUBLICATION`, `MANUAL_CURATION`).
- **`EcologicalRegion`**: Identifica ecorregiones y biomas ecológicos estandarizados (`code`, `name`, `biome`, `description`), como `ESPINAL` (*Distrito del Algarrobo / Caldén*) o `CHACO_SECO`.
- **`GrowingRegion`**: Representa la geografía política del usuario (`code`, `name`, `country`, `province`, `locality`, `latitude`, `longitude`), como `ARROYITO_CBA`.
- **`GrowingRegionEcologicalRegion`**: Relación N:M que asocia regiones geográficas con ecorregiones, distinguiendo la ecorregión primaria (`is_primary: true`) de transiciones fitogeográficas.
- **`RegionalPlantSpecies`**: Catálogo de especies regionales asociadas a una ecorregión, con estado nativo (`NativeStatus`: `NATIVE`, `NON_NATIVE`, `ENDEMIC`, `INTRODUCED_NATURALIZED`), hábito de crecimiento, estado de conservación (UICN) y nombres comunes. Unicidad en `[scientific_name, ecological_region_id]`.
- **`PlantPhenology`**: Registro mensual (mes 1 a 12) de eventos estacionales (`PhenologyEventType`: `SPROUTING`, `FLOWERING`, `FRUITING`, `SOWING`, `PLANTING`) con `source_id` obligatorio y unicidad en `[species_id, ecological_region_id, event_type, month, source_id]`.

### 2. Casos de Uso en Capa de Aplicación

- **`GetSeasonalRegionalFloraUseCase`**:
  - Consulta los eventos fenológicos y especies activas en un mes determinado (1-12) para una región geográfica (`growing_region_code`) o ecológica (`ecological_region_id`).
  - Permite filtrar por tipo de evento (`event_type`) y estado nativo (`native_status`).
  - Validación estricta fail-closed (`RegionalFloraValidationError`) ante meses inválidos o ausencia de región.
- **`GetNativeRegionalFloraUseCase`**:
  - Lista las especies botánicas regionales de una ecorregión o geografía política.
  - Permite filtrado por hábito de crecimiento (ej: `Árbol`, `Arbusto`) y estado nativo.

### 3. Caso Semilla Inicial Curado (Arroyito, Córdoba)

Se configuró el dataset semilla inicial con fuentes botánicas oficiales:
- Ecorregión: **Espinal** (`ESPINAL`) y transición **Chaco Seco** (`CHACO_SECO`).
- Región Geográfica: **Arroyito, Córdoba** (`ARROYITO_CBA`).
- Especies curadas con eventos fenológicos completos y trazabilidad de fuentes:
  - *Prosopis alba* (Algarrobo blanco) — Fabaceae / Árbol (Brotación: Sep-Oct; Floración: Oct-Nov; Fructificación: Dic-Feb; Siembra: Ago-Sep; Plantación: Sep-Oct).
  - *Geoffroea decorticans* (Chañar) — Fabaceae / Árbol-Arbusto (Floración: Sep-Oct; Fructificación: Nov-Dic).
  - *Vachellia caven* (Espinillo / Aromo) — Fabaceae / Árbol-Arbusto (Floración: Ago-Oct; Fructificación: Dic-Feb).

## Consecuencias
- **Positivas**:
  - Base sólida y extensible para futuras vistas estacionales en la UI y recomendaciones de calendario de siembra/plantación.
  - Cero ambigüedad botánica; todas las afirmaciones fenológicas están respaldadas por instituciones botánicas reconocidas.
  - Modelo relacional limpio y normalizado en PostgreSQL con índices optimizados para consultas por mes y región.
- **Negativas**:
  - Requiere carga y curaduría manual o scripts de ingestión estructurada de datasets científicos para expandir la cobertura geográfica.
