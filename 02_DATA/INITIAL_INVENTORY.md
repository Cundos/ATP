# Inventario Inicial Real (Bootstrap Dataset) — Atilio Plants

Este documento constituye el registro canónico del **inventario inicial real** de la colección doméstica de Atilio Plants.  
Contiene la información de relevamiento de los **13 ejemplares físicos existentes**, documentada con fidelidad estricta al modelo de datos aprobado en el Sprint 0, lista para su ingestión en la fase de implementación.

---

## 1. Propósito y Principios del Dataset

1. **Fidelidad al mundo real:** Cada registro representa un individuo físico concreto y vivo de la colección doméstica.
2. **Identidad inmutable (`permanent_code`):** Los códigos `AT-PL-001` a `AT-PL-013` identifican unívoca y permanentemente a estos 13 ejemplares.
3. **Sin reservas futuras:** No se reserva de forma anticipada el identificador `AT-PL-014` ni ningún otro código posterior.
4. **Fidelidad del dato (prohibición de inventar información):** Los datos no relevados o desconocidos se registran explícitamente como `null` en el modelo conceptual. No se inyectan cadenas ficticias como `"desconocido"`, `"sin datos"` o `"N/A"`.
5. **Autonomía de entidades no inicializadas:**
   - **`location_id = null`:** Al no existir aún un catálogo formal de ubicaciones administradas, ningún ejemplar posee ubicación asignada. Las referencias coloquiales (ej. "junto al escritorio") se conservan únicamente en el campo de texto libre `observaciones`.
   - **`reference_id = null`:** No se establecen vínculos artificiales con Open Plantbook. La asociación a una `PlantReference` se realizará exclusivamente a través del flujo funcional de búsqueda/selección.
   - **Ausencia de `Photo`:** Las fotografías tomadas durante el relevamiento previo no están incorporadas al storage de la app; el conteo de fotos físicas en el sistema para todos los ejemplares es cero (`Primary Photo = none`).
   - **Ausencia de `PlantCultivationProfile`:** La relación es `Plant 1 — 0..1 PlantCultivationProfile`. Al no existir datos confirmados de maceta o mezcla de sustrato para estos ejemplares, el perfil permanece **ausente** (no se crean registros artificialmente vacíos).
6. **Distinción de ejemplares taxonómicamente coincidentes:**  
   - `AT-PL-008` y `AT-PL-009` son dos seres vivos independientes de *Pothos Marble Queen*.
   - `AT-PL-007` y `AT-PL-011` son dos seres vivos independientes de *Zamioculca*.  
   La coincidencia de especie, cultivar o nombre común no implica duplicidad; la identidad pertenece a cada ser físico (`permanent_code`).

---

## 2. Metadatos del Relevamiento

- **Fecha de relevamiento documental:** Septiembre de 2026.
- **Cantidad total de ejemplares:** 13 plantas.
- **Estado de ciclo de vida (`lifecycle_status`):** `ACTIVE` (13 ejemplares activos, 0 archivados).
- **Distribución de Estado de Salud (`health_status`):**
  - `HEALTHY` ("Saludable"): 10 plantas
  - `ATTENTION` ("Atención"): 2 plantas
  - `RECOVERY` ("Recuperación"): 1 planta
  - `UNKNOWN` ("Sin evaluar"): 0 plantas *(todas cuentan con evaluación visual inicial documentada)*

---

## 3. Tabla Resumen del Dataset Canónico

| Código | Nombre Común | Nombre Científico | Cultivar | Salud | Ciclo | Fecha Incorp. | Ubicación | Ref. Externa | Fotos | Perfil Cultivo |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **AT-PL-001** | Gomero | *Ficus elastica* | `null` | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-002** | Pothos N'Joy | *Epipremnum aureum* | N'Joy | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-003** | Monstera adansonii | *Monstera adansonii* | `null` | `ATTENTION` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-004** | Pothos común | *Epipremnum aureum* | `null` | `RECOVERY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-005** | Philodendron Pink Princess | *Philodendron* | Pink Princess | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-006** | Philodendron hederaceum | *Philodendron hederaceum* | `null` | `ATTENTION` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-007** | Zamioculca | *Zamioculcas zamiifolia* | `null` | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-008** | Pothos Marble Queen | *Epipremnum aureum* | Marble Queen | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-009** | Pothos Marble Queen | *Epipremnum aureum* | Marble Queen | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-010** | Golden Pothos | *Epipremnum aureum* | Golden Pothos | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-011** | Zamioculca | *Zamioculcas zamiifolia* | `null` | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-012** | Pothos verde/común | *Epipremnum aureum* | `null` | `HEALTHY` | `ACTIVE` | `null` | `null` | `null` | 0 | Ausente |
| **AT-PL-013** | Croton | *Codiaeum variegatum* | `null` | `HEALTHY` | `ACTIVE` | 2026-09-05 | `null` | `null` | 0 | Ausente |

---

## 4. Detalle Individual por Ejemplar

### Ejemplar AT-PL-001
- **permanent_code:** `AT-PL-001`
- **common_name:** Gomero
- **scientific_name:** *Ficus elastica*
- **cultivar:** `null`
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Estado visual general bueno.

### Ejemplar AT-PL-002
- **permanent_code:** `AT-PL-002`
- **common_name:** Pothos N'Joy
- **scientific_name:** *Epipremnum aureum*
- **cultivar:** N'Joy
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Estado visual general muy bueno.

### Ejemplar AT-PL-003
- **permanent_code:** `AT-PL-003`
- **common_name:** Monstera adansonii
- **scientific_name:** *Monstera adansonii*
- **cultivar:** `null`
- **health_status:** `ATTENTION`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Presenta hojas pálidas/amarillentas.

### Ejemplar AT-PL-004
- **permanent_code:** `AT-PL-004`
- **common_name:** Pothos común
- **scientific_name:** *Epipremnum aureum*
- **cultivar:** `null`
- **health_status:** `RECOVERY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Ejemplar muy debilitado, con pocas hojas; se observa una hoja nueva viable.

### Ejemplar AT-PL-005
- **permanent_code:** `AT-PL-005`
- **common_name:** Philodendron Pink Princess
- **scientific_name:** *Philodendron*
- **cultivar:** Pink Princess
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Crecimiento trepador. Especie exacta no confirmada más allá del género/cultivar documentado.

### Ejemplar AT-PL-006
- **permanent_code:** `AT-PL-006`
- **common_name:** Philodendron hederaceum
- **scientific_name:** *Philodendron hederaceum*
- **cultivar:** `null`
- **health_status:** `ATTENTION`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Presenta hojas amarillentas/secas e internodos largos.

### Ejemplar AT-PL-007
- **permanent_code:** `AT-PL-007`
- **common_name:** Zamioculca
- **scientific_name:** *Zamioculcas zamiifolia*
- **cultivar:** `null`
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Estado visual general muy bueno. Ejemplar independiente de AT-PL-011.

### Ejemplar AT-PL-008
- **permanent_code:** `AT-PL-008`
- **common_name:** Pothos Marble Queen
- **scientific_name:** *Epipremnum aureum*
- **cultivar:** Marble Queen
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Estado general bueno; posee guías largas con sectores desnudos. Ejemplar independiente de AT-PL-009.

### Ejemplar AT-PL-009
- **permanent_code:** `AT-PL-009`
- **common_name:** Pothos Marble Queen
- **scientific_name:** *Epipremnum aureum*
- **cultivar:** Marble Queen
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Ejemplar independiente de AT-PL-008. Estado visual muy bueno.

### Ejemplar AT-PL-010
- **permanent_code:** `AT-PL-010`
- **common_name:** Golden Pothos
- **scientific_name:** *Epipremnum aureum*
- **cultivar:** Golden Pothos
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Crecimiento trepador con tutor.

### Ejemplar AT-PL-011
- **permanent_code:** `AT-PL-011`
- **common_name:** Zamioculca
- **scientific_name:** *Zamioculcas zamiifolia*
- **cultivar:** `null`
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Ejemplar independiente de AT-PL-007. Estado visual muy bueno.

### Ejemplar AT-PL-012
- **permanent_code:** `AT-PL-012`
- **common_name:** Pothos verde/común
- **scientific_name:** *Epipremnum aureum*
- **cultivar:** `null`
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `null`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Ejemplar ubicado actualmente junto al área de escritorio/notebook según relevamiento informal, pero sin Location formal hasta definir catálogo.

### Ejemplar AT-PL-013
- **permanent_code:** `AT-PL-013`
- **common_name:** Croton
- **scientific_name:** *Codiaeum variegatum*
- **cultivar:** `null`
- **health_status:** `HEALTHY`
- **lifecycle_status:** `ACTIVE`
- **acquisition_date:** `2026-09-05`
- **location_id:** `null`
- **reference_id:** `null`
- **observaciones:** Follaje multicolor. Adquirido en vivero.

---

## 5. Reglas de Validación y Criterios de Importación Futura

1. **Unicidad e Integridad de Clave:** La importación de este dataset debe verificar que los identificadores `AT-PL-001` a `AT-PL-013` sean generados con restricción de unicidad estricta y orden secuencial.
2. **Campos Opcionales como NULL:**
   - Para `AT-PL-001`, `003`, `004`, `006`, `007`, `011`, `012`, `013`, el atributo `cultivar` debe persistirse como `NULL` en la base de datos.
   - Para `AT-PL-005`, el atributo `scientific_name` registra el género botánico `Philodendron` (especie específica no determinada).
   - Para todos excepto `AT-PL-013`, `acquisition_date` debe persistirse como `NULL`.
3. **Cero Dependencias Circulares:** Al iniciar la importación en la base de datos, ningún registro debe depender de tablas foráneas `Location`, `PlantReference` ni `Photo`.
4. **Respeto a la Secuencia Posterior:** Tras la ingestión de estos 13 registros, los futuros identificadores se generarán de forma automática durante el alta de cada nuevo ejemplar según la estrategia técnica que se defina en la implementación, garantizando la unicidad global, inmutabilidad y no reutilización de códigos, sin reservar identificadores manualmente por anticipado.

