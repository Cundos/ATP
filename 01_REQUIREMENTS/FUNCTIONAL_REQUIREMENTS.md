# Requisitos Funcionales — MVP v0.1

Este documento establece la especificación formal y detallada de los requisitos funcionales del sistema **Atilio Plants v0.1**, asegurando trazabilidad directa con las historias de usuario, la visión del producto, el modelo de datos y la integración botánica con Open Plantbook.

---

## 1. Alcance y Delimitación del MVP v0.1

El objetivo de **Atilio Plants v0.1** es proveer un inventario digital estructurado y funcional para colecciones domésticas de plantas de interior, priorizando la simplicidad operativa cotidiana, la fidelidad del dato, el respeto irrestricto de la identidad de cada ejemplar y el enriquecimiento botánico opcional.

### Funcionalidades dentro del alcance de v0.1:
- Métricas e indicadores esenciales en pantalla de inicio (Dashboard), reflejando la distribución real de salud incluyendo plantas sin evaluar.
- Inventario general en tarjetas responsivas (*mobile-first*), ordenadas de forma predeterminada por ID permanente ascendente (`AT-PL-001`, `AT-PL-002`, ...), con controles para alternar criterios de ordenamiento.
- Búsqueda textual y filtrado multicriterio (por estado de salud y por ubicación).
- Ficha individual estructurada por secciones conceptuales (*Identidad*, *Ubicación*, *Estado*, *Condiciones de Cultivo*, *Administración* y *Referencia Botánica*).
- Alta simplificada de ejemplares con generación automática e inmutable de identificador permanente (`AT-PL-XXX`) y estado de salud inicial `UNKNOWN` ("Sin evaluar").
- Edición y actualización de datos descriptivos del ejemplar sin alterar su identidad.
- Archivado y restauración lógica de ejemplares (*soft delete* con preservación de historia).
- Catálogo e interfaz dedicada simple (pantalla o modal) para administrar ubicaciones (crear, renombrar, archivar, consultar activas), vinculando plantas mediante selección exclusiva (sin texto libre).
- Carga y reemplazo de fotografía principal, garantizando que el archivo anterior no se destruya en disco al ser reemplazado.
- **Integración opcional con Open Plantbook:** Búsqueda externa de especies, asistencia en autocompletado en alta sin bloqueo, persistencia local inmutable de snapshots en `PlantReference` y visualización de cuidados teóricos de la especie en la ficha.

### Elementos Fuera de Alcance para v0.1 (Exclusiones Explícitas):
- Sincronización automática periódica en segundo plano de Open Plantbook.
- Descarga y persistencia local obligatoria de imágenes de referencia (pendiente de verificación de licencia/términos del proveedor).
- Historial de riegos, fertilizaciones, podas, trasplantes y bitácora de intervenciones.
- Galería fotográfica histórica visible en la interfaz, comparación temporal visual o timelapses.
- Generación de códigos QR y plantillas de impresión de etiquetas físicas.
- Conexión o lectura de sensores de humedad, conductividad (EC), temperatura o luz (Zigbee, ESP32, MQTT).
- Integración bidireccional o pasiva con Home Assistant.
- Reglas automáticas de notificación, motor de recomendaciones inteligentes de cultivo o comparación automatizada.
- Análisis de imágenes y asistencia de diagnóstico mediante Inteligencia Artificial.
- Autenticación, perfiles de usuario, roles y permisos (operación en red local privada).
- Exposición o consumo público directo a través de Internet.

---

## 2. Requisitos por Dominio

### Dominio: Dashboard (Panel de Inicio)

- **FR-001:** El sistema debe mostrar en la pantalla inicial el número total de ejemplares activos que componen la colección.
- **FR-002:** El sistema debe mostrar en la pantalla inicial la distribución de plantas activas categorizadas por su estado de salud:
  - `UNKNOWN` ("Sin evaluar")
  - `HEALTHY` ("Saludable")
  - `ATTENTION` ("Atención")
  - `RECOVERY` ("Recuperación")
- **FR-003:** Los indicadores del Dashboard deben calcularse dinámicamente a partir de los datos reales del inventario, sin interpolar ni inventar datos no registrados y reflejando fielmente los ejemplares que aún no han sido evaluados.
- **FR-004:** El sistema debe proveer desde la pantalla inicial un acceso directo e intuitivo hacia el Inventario completo.
- **FR-005:** El Dashboard no debe contabilizar dentro de sus métricas de salud ni en el total activo a los ejemplares con ciclo de vida archivado (`ARCHIVED`).

### Dominio: Inventario

- **FR-006:** El sistema debe proveer una vista de inventario que liste exclusivamente la totalidad de los ejemplares en estado activo.
- **FR-007:** La vista de inventario debe ordenar los ejemplares de forma predeterminada por **ID permanente ascendente** (`AT-PL-001`, `AT-PL-002`, `AT-PL-003`, ...).
- **FR-008:** El sistema debe proveer controles en la vista de inventario para alternar el criterio de ordenamiento como mínimo entre:
  1. ID permanente ascendente (predeterminado).
  2. Incorporaciones más recientes (fecha de incorporación / ID descendente).
  3. Nombre común alfabético (A-Z).
- **FR-009:** Cada planta en el inventario debe presentarse en una tarjeta individual que exhiba de manera condensada:
  1. Fotografía principal propia (o marcador de posición si no posee).
  2. Identificador permanente (`AT-PL-XXX`).
  3. Nombre común.
  4. Nombre científico (si está registrado).
  5. Etiqueta visual de estado de salud (`Sin evaluar`, `Saludable`, `Atención`, `Recuperación`).
  6. Nombre de la ubicación asignada o indicación visual atenuada de "Sin ubicación" (PUD-001 Opción A).
- **FR-010:** La vista de inventario debe estar diseñada con enfoque *mobile-first* (apilamiento vertical legible en pantallas táctiles) y adaptarse fluidamente a una grilla de múltiples columnas en pantallas de mayor resolución (desktop/tablet).
- **FR-011:** La selección o pulsación sobre la tarjeta de un ejemplar debe navegar a su respectiva ficha individual.

### Dominio: Búsqueda y Filtros

- **FR-012:** El sistema debe permitir la búsqueda ingresando texto libre, evaluando coincidencias sobre: identificador permanente (`AT-PL-XXX`), nombre común y nombre científico.
- **FR-013:** El sistema debe permitir filtrar el inventario por estado de salud, permitiendo aislar plantas en estado `UNKNOWN`, `HEALTHY`, `ATTENTION` o `RECOVERY`.
- **FR-014:** El sistema debe permitir filtrar el inventario por ubicación física, seleccionando cualquiera de las ubicaciones registradas en el catálogo.
- **FR-015:** El sistema debe admitir la combinación simultánea de criterio de búsqueda textual y filtros de estado y ubicación (operación lógica AND).
- **FR-016:** Cuando una búsqueda o filtrado no arroje resultados, el sistema debe exhibir un mensaje explicativo y una opción para restablecer los filtros aplicados.

### Dominio: Ficha Individual del Ejemplar

- **FR-017:** Cada ejemplar debe contar con una vista de ficha individual organizada modularmente en las siguientes secciones conceptuales:
  - **Identidad:** ID permanente (`AT-PL-XXX`), nombre común, nombre científico, cultivar (si aplica) y fotografía principal actual propia.
  - **Ubicación:** Ubicación física actual asignada.
  - **Estado:** Estado de salud actual (`Sin evaluar`, `Saludable`, `Atención`, `Recuperación`) y observaciones o notas clínicas.
  - **Condiciones de Cultivo:** Datos físicos actuales del ejemplar (maceta actual, sustrato actual, condiciones reales conocidas de luz y notas reales de riego).
  - **Administración:** Fecha de incorporación a la colección, estado en el ciclo de vida (`Activo` o `Archivado`), fecha de creación del registro y fecha de última modificación.
  - **Referencia Botánica (cuando exista):** Sección secundaria claramente diferenciada que exhibe el conocimiento de la especie proveniente de Open Plantbook (nombre científico de referencia, nombres comunes, cuidados teóricos de la especie y URL de imagen de catálogo).
- **FR-018:** La ficha del ejemplar debe admitir que los campos no informados se presenten de forma explícita como vacíos o desconocidos (`null` / "Sin especificar"), respetando el principio de fidelidad del dato.
- **FR-019:** La ficha del ejemplar debe proporcionar accesos directos para editar los datos de la planta o modificar su estado en el ciclo de vida (archivar/restaurar).

### Dominio: Alta de Ejemplares

- **FR-020:** El sistema debe permitir el registro de una nueva planta mediante un formulario accesible tanto desde dispositivos móviles como desde computadoras de escritorio.
- **FR-021:** El identificador permanente con formato `AT-PL-XXX` debe ser generado de forma enteramente automática y secuencial por el sistema (ej. `AT-PL-001`, `AT-PL-002`, ..., `AT-PL-014`), quedando bloqueado contra edición manual por el usuario.
- **FR-022:** El algoritmo de generación de identificador debe garantizar que jamás se reutilice un número de ID ya asignado, incluso si el ejemplar preexistente se encuentra archivado.
- **FR-023:** En el formulario de alta, el único dato de entrada obligatorio a cargo del usuario es el **Nombre Común**.
- **FR-024:** Todos los demás atributos (nombre científico, cultivar, ubicación, fotografía, maceta, sustrato, notas y condiciones particulares) deben ser opcionales y admitir valor nulo.
- **FR-025:** El valor predeterminado del estado de salud al crear una planta debe ser estrictamente `UNKNOWN` ("Sin evaluar"), sin asumir que la planta está saludable en ausencia de evaluación explícita del usuario.
- **FR-026:** Si el usuario no especifica fecha de incorporación en el alta, el sistema debe registrar por defecto la fecha actual del sistema.

### Dominio: Edición

- **FR-027:** El sistema debe permitir modificar en cualquier momento los atributos descriptivos de un ejemplar existente (nombre común, nombre científico, cultivar, ubicación, estado de salud, maceta, sustrato, notas y condiciones de cultivo).
- **FR-028:** El identificador permanente `AT-PL-XXX` debe permanecer estrictamente de sólo lectura e inalterable durante cualquier operación de edición.
- **FR-029:** El sistema debe registrar automáticamente la fecha y hora de la última modificación cada vez que se guarden cambios en el ejemplar.
- **FR-030:** Ninguna modificación sobre maceta, sustrato, ubicación, nombres o estado debe generar alteración en la clave de identidad del espécimen.

### Dominio: Archivado y Ciclo de Vida

- **FR-031:** El sistema debe implementar archivado lógico (*soft delete*) para el retiro de ejemplares, modificando su atributo de ciclo de vida a `ARCHIVED` sin borrar registros de la base de datos.
- **FR-032:** El sistema debe requerir una confirmación explícita del usuario antes de proceder con el archivado de un ejemplar.
- **FR-033:** Los ejemplares archivados deben excluirse automáticamente del inventario activo y del Dashboard por defecto.
- **FR-034:** El sistema debe proveer una vista o filtro específico para consultar y explorar la lista de ejemplares archivados con su información y fotos íntegras.
- **FR-035:** El sistema debe permitir la restauración de un ejemplar archivado al estado `ACTIVE`, preservando su identificador original `AT-PL-XXX` y reincorporándolo al inventario activo.
- **FR-036:** El estado de ciclo de vida (`lifecycle_status`: `ACTIVE` / `ARCHIVED`) debe gestionarse de forma totalmente independiente del estado de salud (`health_status`: `UNKNOWN`, `HEALTHY`, `ATTENTION`, `RECOVERY`).

### Dominio: Ubicaciones

- **FR-037:** El sistema debe proveer una interfaz simple y dedicada (pantalla o modal) para la administración del catálogo de ubicaciones, permitiendo crear, renombrar, archivar y listar ubicaciones activas.
- **FR-038:** Los formularios de alta y edición de plantas deben permitir seleccionar una ubicación exclusivamente desde el catálogo de ubicaciones activas o dejar el campo vacío ("Sin ubicación" / `null`).
- **FR-039:** Los selectores de ubicación en los formularios de plantas no deben permitir la creación mediante texto libre directo.
- **FR-040:** Si una ubicación es renombrada en el catálogo, el cambio debe verse reflejado de manera consistente e inmediata en todas las plantas que la tengan asignada.
- **FR-041:** Una ubicación archivada no debe desaparecer de las plantas históricamente asociadas a ella (conservan dicha ubicación visible), pero el sistema no debe ofrecerla como opción disponible para nuevas altas ni reasignaciones.

### Dominio: Fotografías

- **FR-042:** El sistema debe permitir asociar un archivo de imagen como fotografía principal del ejemplar durante su creación o edición.
- **FR-043:** Cuando se reemplace la fotografía principal de un ejemplar por una nueva imagen, la nueva imagen pasa a ser la principal visible y el archivo físico anterior no debe destruirse ni borrarse del almacenamiento local.
- **FR-044:** En la versión v0.1 la interfaz de usuario no expondrá todavía el historial de fotografías anteriores.
- **FR-045:** Si un ejemplar no cuenta con fotografía propia, la aplicación debe mostrar un recurso gráfico neutro de reemplazo (*placeholder*), sin utilizar de forma automática imágenes externas de catálogo.

### Dominio: Integración con Open Plantbook (Referencia Botánica)

- **FR-046:** El sistema debe permitir la consulta opcional a la API de Open Plantbook para buscar especies botánicas mediante término de búsqueda textual.
- **FR-047:** El sistema debe presentar la lista de especies devueltas por Open Plantbook y permitir al usuario seleccionar una referencia o cancelar la búsqueda.
- **FR-048:** Al seleccionar una especie externa, el sistema debe crear o reutilizar un registro en la entidad local `PlantReference` identificado unívocamente por la dupla `(provider, external_id)`.
- **FR-049:** El sistema debe permitir asociar opcionalmente un ejemplar físico (`Plant`) con una referencia botánica (`PlantReference`), admitiendo que múltiples ejemplares compartan la misma referencia.
- **FR-050:** El alta y edición de una planta deben ser completamente operativas e independientes de la existencia de una `PlantReference`; el usuario debe poder omitir la búsqueda y guardar un ejemplar sin referencia externa (`reference_id = null`).
- **FR-051:** Toda la metadata estructurada obtenida de Open Plantbook (nombres botánicos, umbrales y cuidados teóricos) y el payload original (`raw_data`) deben persistirse localmente como un snapshot inmutable en `PlantReference`, garantizando funcionamiento *local-first* y consulta offline.
- **FR-052:** Al seleccionar una referencia botánica durante el alta de un ejemplar, el sistema podrá sugerir y precompletar el `scientific_name` y el `common_name`, pero el usuario mantendrá control absoluto para modificar dichos campos antes de guardar la planta.
- **FR-053:** La imagen externa provista por Open Plantbook (`image_url`) debe tratarse estrictamente como imagen ilustrativa de catálogo de la especie y no debe convertirse automáticamente en la fotografía principal del ejemplar físico.
- **FR-054:** La falta de conectividad a Internet, tiempos de espera (timeouts), cuotas excedidas (HTTP 429) o fallos del proveedor Open Plantbook no deben bloquear ni degradar el flujo de alta manual o edición de plantas.
- **FR-055:** La ficha individual de una planta vinculada a una referencia botánica debe exponer una sección secundaria distinguida que visualice los cuidados teóricos recomendados para la especie sin mezclarlos con las condiciones de cultivo reales del ejemplar.

---

## 3. Matriz de Trazabilidad (Requirements Traceability Matrix - RTM)

| Requisito Funcional | Historia de Usuario Vinculada | Alcance |
| :--- | :--- | :--- |
| **FR-001** | US-001 | v0.1 |
| **FR-002** | US-001 | v0.1 |
| **FR-003** | US-001 | v0.1 |
| **FR-004** | US-001 | v0.1 |
| **FR-005** | US-001 | v0.1 |
| **FR-006** | US-002 | v0.1 |
| **FR-007** | US-002 | v0.1 |
| **FR-008** | US-002 | v0.1 |
| **FR-009** | US-002 | v0.1 |
| **FR-010** | US-002 | v0.1 |
| **FR-011** | US-002, US-004 | v0.1 |
| **FR-012** | US-003 | v0.1 |
| **FR-013** | US-003 | v0.1 |
| **FR-014** | US-003 | v0.1 |
| **FR-015** | US-003 | v0.1 |
| **FR-016** | US-003 | v0.1 |
| **FR-017** | US-004, US-015 | v0.1 |
| **FR-018** | US-004 | v0.1 |
| **FR-019** | US-004, US-007, US-008 | v0.1 |
| **FR-020** | US-005, US-014 | v0.1 |
| **FR-021** | US-005, US-006 | v0.1 |
| **FR-022** | US-006 | v0.1 |
| **FR-023** | US-005 | v0.1 |
| **FR-024** | US-005 | v0.1 |
| **FR-025** | US-001, US-005 | v0.1 |
| **FR-026** | US-005 | v0.1 |
| **FR-027** | US-007 | v0.1 |
| **FR-028** | US-006, US-007 | v0.1 |
| **FR-029** | US-007 | v0.1 |
| **FR-030** | US-007 | v0.1 |
| **FR-031** | US-008 | v0.1 |
| **FR-032** | US-008 | v0.1 |
| **FR-033** | US-001, US-002, US-008 | v0.1 |
| **FR-034** | US-009 | v0.1 |
| **FR-035** | US-010 | v0.1 |
| **FR-036** | US-001, US-004, US-008 | v0.1 |
| **FR-037** | US-012 | v0.1 |
| **FR-038** | US-011, US-012 | v0.1 |
| **FR-039** | US-011 | v0.1 |
| **FR-040** | US-011, US-012 | v0.1 |
| **FR-041** | US-011, US-012 | v0.1 |
| **FR-042** | US-013 | v0.1 |
| **FR-043** | US-013 | v0.1 |
| **FR-044** | US-013 | v0.1 |
| **FR-045** | US-002, US-004, US-013 | v0.1 |
| **FR-046** | US-014 | v0.1 |
| **FR-047** | US-014 | v0.1 |
| **FR-048** | US-014 | v0.1 |
| **FR-049** | US-014, US-015 | v0.1 |
| **FR-050** | US-005, US-014 | v0.1 |
| **FR-051** | US-014, US-015 | v0.1 |
| **FR-052** | US-014 | v0.1 |
| **FR-053** | US-013, US-014 | v0.1 |
| **FR-054** | US-014 | v0.1 |
| **FR-055** | US-004, US-015 | v0.1 |

---

## 4. Registro de Decisiones Funcionales (Resolved Functional Decisions)

- **PFD-001 (Gestión de Ubicaciones):** Interfaz dedicada simple (modal/pantalla). Catálogo administrable. Sin texto libre directo.
- **PFD-002 (Orden del Inventario):** ID permanente ascendente predeterminado (`AT-PL-001`, `AT-PL-002`, ...). Controles de orden secundario.
- **PFD-003 (Fotografías Reemplazadas):** Preservación de binarios en almacenamiento local sin borrado físico.
- **PID-001 (Open Plantbook en v0.1):** Integración básica incluida en v0.1 (búsqueda, selección, persistencia de snapshot local y consulta en ficha).

---

## 5. Pending Functional Decisions

*No existen decisiones funcionales pendientes para el alcance del MVP v0.1.*
