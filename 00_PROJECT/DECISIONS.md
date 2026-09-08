# Architecture Decision Records (ADRs)

Este documento centraliza las decisiones arquitectónicas y de diseño del producto clave adoptadas para la construcción de Atilio Plants.

---

## Índice de Decisiones

- [ADR-001: Independencia de Home Assistant](#adr-001-independencia-de-home-assistant)
- [ADR-002: Identificadores Permanentes AT-PL-XXX](#adr-002-identificadores-permanentes-at-pl-xxx)
- [ADR-003: Desacoplamiento de Sensores e Identidad del Ejemplar](#adr-003-desacoplamiento-de-sensores-e-identidad-del-ejemplar)
- [ADR-004: Conservación del Historial de Plantas Archivadas](#adr-004-conservación-del-historial-de-plantas-archivadas)
- [ADR-005: Estrategia Local-First](#adr-005-estrategia-local-first)
- [ADR-006: Abstracción de la Capa de Almacenamiento de Archivos](#adr-006-abstracción-de-la-capa-de-almacenamiento-de-archivos)
- [ADR-007: Modelo y Administración de Catálogo de Ubicaciones](#adr-007-modelo-y-administración-de-catálogo-de-ubicaciones)
- [ADR-008: Preservación de Archivos Fotográficos Reemplazados](#adr-008-preservación-de-archivos-fotográficos-reemplazados)
- [ADR-009: Estado Sanitario Predeterminado UNKNOWN (Sin Evaluar)](#adr-009-estado-sanitario-predeterminado-unknown-sin-evaluar)
- [ADR-010: Modelado de Fotografía Principal Mediante Flag is_primary](#adr-010-modelado-de-fotografía-principal-mediante-flag-is_primary)
- [ADR-011: Estructura de Almacenamiento de Archivos Fotográficos](#adr-011-estructura-de-almacenamiento-de-archivos-fotográficos)
- [ADR-012: Entidad PlantReference y Desacoplamiento de Proveedores Botánicos](#adr-012-entidad-plantreference-y-desacoplamiento-de-proveedores-botánicos)
- [ADR-013: Autenticación Backend y Protección de Secretos de Integración](#adr-013-autenticación-backend-y-protección-de-secretos-de-integración)
- [ADR-014: Monolito Full-Stack con Next.js y TypeScript](#adr-014-monolito-full-stack-con-nextjs-y-typescript)
- [ADR-015: Persistencia Relacional con PostgreSQL y Prisma ORM](#adr-015-persistencia-relacional-con-postgresql-y-prisma-orm)
- [ADR-016: Identificadores Técnicos UUIDv7 y Desacoplamiento de Códigos de Dominio](#adr-016-identificadores-técnicos-uuidv7-y-desacoplamiento-de-códigos-de-dominio)
- [ADR-017: Generación de permanent_code Mediante Secuencia Dedicada de PostgreSQL](#adr-017-generación-de-permanent_code-mediante-secuencia-dedicada-de-postgresql)
- [ADR-018: Despliegue en Vercel con PostgreSQL Gestionado en la Nube](#adr-018-despliegue-en-vercel-con-postgresql-gestionado-en-la-nube)


---

## ADR-001: Independencia de Home Assistant

- **Estado:** Accepted
- **Contexto:**
  Home Assistant es una plataforma de automatización del hogar robusta donde confluyen múltiples sensores y dispositivos IoT (Zigbee, ESPHome, etc.). Existía la tentación de utilizar Home Assistant como el backend de almacenamiento o motor de estado principal de las plantas.
- **Decisión:**
  Atilio Plants mantendrá su propio modelo de dominio, base de datos y lógica de negocio completamente autónomos e independientes de Home Assistant. Home Assistant será tratado exclusivamente como una integración externa opcional para la captura de telemetría y ejecución de automatizaciones secundarias.
- **Consecuencias:**
  - *Positivas:* Atilio Plants funcionará en cualquier entorno sin requerir una instancia de Home Assistant activa. Se evita acoplamiento técnico indeseado.
  - *Negativas:* Se requiere mantener mecanismos de sincronización o ingesta de datos cuando se desee consumir información desde Home Assistant.

---

## ADR-002: Identificadores Permanentes AT-PL-XXX

- **Estado:** Accepted
- **Contexto:**
  En la gestión de colecciones botánicas personales, los nombres comunes y las especies pueden repetirse (ej. tener tres *Monstera deliciosa*), y las plantas suelen cambiar de maceta, tamaño y ubicación física. Se necesita un método inequívoco para referenciar cada ser vivo.
- **Decisión:**
  Cada ejemplar recibirá en su creación un identificador alfanumérico secuencial y único con el formato `AT-PL-001`, `AT-PL-002`, `AT-PL-003`, etc. Dicho identificador será inmutable y permanente durante toda la existencia del registro en el sistema.
- **Consecuencias:**
  - *Positivas:* Permite etiquetado físico directo (vía QR/código), trazabilidad exacta de bitácora y evita ambigüedad taxonómica o locativa.
  - *Negativas:* Debe implementarse una lógica estricta de generación y validación de unicidad que impida reutilización de identificadores incluso tras archivar un ejemplar.

---

## ADR-003: Desacoplamiento de Sensores e Identidad del Ejemplar

- **Estado:** Accepted
- **Contexto:**
  Los sensores de humedad de suelo, luminosidad o temperatura son dispositivos electrónicos fungibles: pueden agotarse sus baterías, romperse, calibrarse o reasignarse a otra maceta según la temporada o necesidad diagnóstica.
- **Decisión:**
  Los sensores se modelarán como entidades desacopladas que pueden asociarse de forma temporal o dinámica a un ejemplar, pero nunca formarán parte de la identidad ni del esquema estructural primario de la planta.
- **Consecuencias:**
  - *Positivas:* Retirar, reemplazar o apagar un sensor no altera el registro ni la continuidad de la planta. El sistema opera normalmente sin sensores conectados.
  - *Negativas:* Las consultas de telemetría histórica requieren correlacionar los períodos de asociación entre el sensor y el ejemplar.

---

## ADR-004: Conservación del Historial de Plantas Archivadas

- **Estado:** Accepted
- **Contexto:**
  Un ejemplar puede morir por enfermedad, regalarse, venderse o descartarse. Si se aplicara un borrado destructivo (`hard delete`), se perderían los datos de tratamientos aplicados, bitácora fotográfica y lecciones aprendidas sobre su cultivo.
- **Decisión:**
  Las plantas que dejen de estar activas pasarán a un estado "Archivada" (baja lógica / soft delete). Todo su historial de intervenciones, fotografías, notas y eventos permanecerá intacto y disponible para consulta histórica en el sistema.
- **Consecuencias:**
  - *Positivas:* Se preserva el patrimonio de conocimiento botánico y el historial de cuidados para análisis comparativo futuro.
  - *Negativas:* El volumen de datos almacenado continuará creciendo y las consultas cotidianas de inventario activo deben filtrar explícitamente los ejemplares archivados.

---

## ADR-005: Estrategia Local-First

- **Estado:** Accepted
- **Contexto:**
  El sistema se implementa inicialmente para uso personal en un entorno doméstico. La dependencia obligatoria de plataformas cloud (Supabase, Firebase, Vercel) introduce costos potenciales, latencia innecesaria y riesgo de discontinuidad o pérdida de privacidad de los datos locales y fotos.
- **Decisión:**
  Atilio Plants adoptará una arquitectura **Local-First**. Todo el almacenamiento de datos, procesamiento y servicios de aplicación se ejecutarán en infraestructura local (servidor hogareño / máquina de desarrollo), con capacidad de migración posterior a la nube mediante arquitecturas estándar sin requerir cambios estructurales en el modelo del producto.
- **Consecuencias:**
  - *Positivas:* Autonomía total, privacidad estricta, sin costos de suscripción en la nube y funcionamiento ininterrumpido sin conexión a internet.
  - *Negativas:* La responsabilidad de respaldos (backups) y disponibilidad del hardware recae en el entorno local.

---

## ADR-006: Abstracción de la Capa de Almacenamiento de Archivos

- **Estado:** Accepted
- **Contexto:**
  El seguimiento de las plantas involucra un alto volumen de imágenes fotográficas a lo largo del tiempo. Inicialmente, estas imágenes se guardarán en el sistema de archivos local del servidor/máquina anfitriona, pero en el futuro podrían requerir migrarse a un almacenamiento de objetos (Object Storage como S3 o MinIO).
- **Decisión:**
  El acceso, persistencia y recuperación de archivos (fotografías, adjuntos) se encapsulará detrás de una interfaz/abstracción de servicio de almacenamiento (`FileStorageService`). La implementación inicial resolverá contra el sistema de archivos local, permitiendo intercambiar el adaptador a S3/MinIO sin modificar la lógica de negocio ni los controladores.
- **Consecuencias:**
  - *Positivas:* Flexibilidad para evolucionar la infraestructura de almacenamiento sin refactorizar el código de gestión de plantas ni de bitácora.
  - *Negativas:* Requiere diseñar e implementar una capa de abstracción formal desde las fases tempranas de desarrollo.

---

## ADR-007: Modelo y Administración de Catálogo de Ubicaciones

- **Estado:** Accepted
- **Contexto:**
  Se requería definir la interacción de usuario y el tratamiento de las ubicaciones físicas para evitar inconsistencias por texto libre (ej. "living", "Living ", "LIVIN").
- **Decisión:**
  Las ubicaciones se gestionarán como una entidad de catálogo independiente mediante una interfaz simple dedicada (pantalla o diálogo modal) que permita: crear, renombrar, archivar y listar ubicaciones activas. En los formularios de plantas no se admitirá tipeo libre directo; se seleccionará exclusivamente de este catálogo o quedará vacía ("Sin ubicación"). Al archivar una ubicación, esta permanecerá visible en las plantas que ya la poseían históricamente, pero quedará oculta para nuevas asignaciones.
- **Consecuencias:**
  - *Positivas:* Integridad referencial limpia, sin duplicados ortográficos y con histórico espacial consistente.
  - *Negativas:* Requiere proveer vistas o modales de administración específicos para ubicaciones ya desde v0.1.

---

## ADR-008: Preservación de Archivos Fotográficos Reemplazados

- **Estado:** Accepted
- **Contexto:**
  En v0.1 cada planta expone únicamente una fotografía principal. Al permitir que el usuario reemplace esta imagen por una más reciente, existía la disyuntiva entre sobreescribir/eliminar el archivo físico anterior o conservarlo en disco.
- **Decisión:**
  Al actualizar la foto principal, el archivo anterior no será eliminado físicamente del almacenamiento. Permanecerá persistido bajo una nomenclatura única en disco, aunque la interfaz de v0.1 únicamente muestre la foto principal activa. Esto mantiene la base preparada para la implementación de la bitácora cronológica y seguimiento fotográfico en la Etapa 2 sin pérdida de datos visuales.
- **Consecuencias:**
  - *Positivas:* Preservación del acervo histórico visual sin trabajo de desarrollo prematuro en v0.1.
  - *Negativas:* Requiere contemplar una estrategia de nombrado único y gestionará un mayor volumen de almacenamiento local.

---

## ADR-009: Estado Sanitario Predeterminado UNKNOWN (Sin Evaluar)

- **Estado:** Accepted
- **Contexto:**
  El sistema sigue el principio de fidelidad del dato (no inventar información no contrastada). Asumir que toda planta recién creada se encuentra en estado `HEALTHY` ("Saludable") sin que el usuario haya hecho una evaluación explícita vulnera dicho principio.
- **Decisión:**
  Se incorpora el estado de salud `UNKNOWN` ("Sin evaluar") al catálogo de estados sanitarios (`UNKNOWN`, `HEALTHY`, `ATTENTION`, `RECOVERY`). Todo nuevo ejemplar registrado en el sistema tendrá asignado por defecto `UNKNOWN` salvo que el usuario declare explícitamente un estado diferente en el alta.
- **Consecuencias:**
  - *Positivas:* Honestidad en los datos del inventario y en las métricas del Dashboard; evita falsos positivos sanitarios.
  - *Negativas:* El Dashboard y los filtros deben contemplar un cuarto estado sanitario en su visualización.

---

## ADR-010: Modelado de Fotografía Principal Mediante Flag is_primary

- **Estado:** Accepted
- **Contexto:**
  Se requería definir la forma conceptual de asociar y consultar la fotografía principal activa de una planta, evitando dependencias circulares entre las entidades `Plant` y `Photo` y permitiendo la coexistencia de múltiples fotos históricas.
- **Decisión:**
  La designación de foto principal se modelará exclusivamente a través del atributo booleano `Photo.is_primary`. La entidad `Plant` **no** almacenará un campo foráneo `primary_photo_id`. Se establece la regla de dominio de que para una misma planta puede existir como máximo una fotografía con `is_primary = true` (pudiendo existir cero, una o múltiples fotos por planta). La implementación técnica concreta para garantizar esta restricción queda reservada para la etapa de diseño físico de base de datos.
- **Consecuencias:**
  - *Positivas:* Elimina dependencias cíclicas en el esquema relacional, simplifica inserciones y desacopla el ciclo de vida de `Photo` respecto de `Plant`.
  - *Negativas:* Las consultas que requieran la foto principal deberán filtrar por `is_primary = true` o proyectar dicha relación desde `Photo`.

---

## ADR-011: Estructura de Almacenamiento de Archivos Fotográficos

- **Estado:** Accepted
- **Contexto:**
  Se requería establecer la convención de organización física de los archivos de imágenes en el almacenamiento local para garantizar unicidad, legibilidad y compatibilidad transparente con futura migración a object storage (S3/MinIO).
- **Decisión:**
  Se adopta una estructura de almacenamiento jerárquica organizada por el código permanente de la planta:
  `photos/{permanent_code}/<unique-file-id>.<extension>` (ej. `photos/AT-PL-013/550e8400-e29b-41d4-a716-446655440000.webp`).
  Cada archivo en disco tendrá un nombre físicamente único (no derivado de la identidad de `Photo`). La entidad `Photo` poseerá su propio identificador técnico independiente y registrará una clave/ruta lógica (`file_path` o storage key).
- **Consecuencias:**
  - *Positivas:* Organización física ordenada en disco, prevención total de colisiones por sobreescritura y correspondencia natural con el particionado por prefijos en buckets de object storage.
  - *Negativas:* La capa de almacenamiento debe asegurar la creación de subdirectorios por ejemplar si no existen previamente.

---

## ADR-012: Entidad PlantReference y Desacoplamiento de Proveedores Botánicos

- **Estado:** Accepted
- **Contexto:**
  Se requiere enriquecer la información de las plantas con fuentes externas de conocimiento botánico (iniciando con Open Plantbook) sin comprometer la soberanía del modelo de dominio local-first ni acoplar la identidad del espécimen a un servicio de terceros.
- **Decisión:**
  Se crea la entidad conceptual `PlantReference` con la relación `Plant (N) —— vinculada a —— (0..1) PlantReference`. La referencia almacena una clave compuesta lógica única `(provider, external_id)`, datos taxonómicos normalizados, recomendaciones generales de cuidado (`reference_care`), URL de imagen externa y un snapshot del payload original (`raw_data`).
  Una planta física puede operar indefinidamente sin referencia vinculada. El snapshot local es inmutable ante caídas o desaparición del registro en el proveedor externo.
- **Consecuencias:**
  - *Positivas:* Total autonomía local-first, desacoplamiento de la identidad del ser vivo frente a catálogos externos y posibilidad de reutilizar una misma referencia botánica entre múltiples ejemplares físicos.
  - *Negativas:* Requiere gestionar la persistencia y eventual sincronización de snapshots locales.

---

## ADR-013: Autenticación Backend y Protección de Secretos de Integración

- **Estado:** Accepted
- **Contexto:**
  Open Plantbook exige autenticación OAuth2 Client Credentials Grant utilizando `client_id` y `client_secret`. Si las llamadas se hicieran desde el frontend cliente, las credenciales quedarían expuestas a inspección en el navegador.
- **Decisión:**
  Toda comunicación con Open Plantbook (obtención de token OAuth2, búsquedas y consulta de detalles) se ejecutará exclusivamente desde la capa de backend/servidor de Atilio Plants. Las credenciales `OPEN_PLANTBOOK_CLIENT_ID` y `OPEN_PLANTBOOK_CLIENT_SECRET` se inyectarán como variables de entorno de servidor seguras y nunca formarán parte del bundle cliente enviado al navegador.
- **Consecuencias:**
  - *Positivas:* Seguridad rigurosa de secretos de integración, cumplimiento de buenas prácticas y centralización de la lógica de cacheo y control de tasa (rate limiting).
  - *Negativas:* Requiere endpoints internos o server actions para mediar entre la UI y la API de Open Plantbook.

---

## ADR-014: Monolito Full-Stack con Next.js y TypeScript

- **Estado:** Accepted
- **Contexto:**
  Se requería definir la arquitectura de aplicación para el MVP v0.1: un frontend desacoplado con un backend separado (ej: FastAPI/Express) versus una solución full-stack unificada.
- **Decisión:**
  Atilio Plants adoptará una arquitectura de **Monolito Full-Stack con Next.js (App Router) y TypeScript**. Toda la lógica de presentación (UI móvil), mediación de casos de uso (Server Actions / Route Handlers) y proxy seguro de integraciones residirá en un único proyecto y artefacto de ejecución.
- **Consecuencias:**
  - *Positivas:* Máxima simplicidad operativa para un único desarrollador; cero duplicación de tipos o DTOs TypeScript entre frontend y backend; despliegue unificado en un solo contenedor Docker; y compatibilidad inmediata con plataformas cloud modernas (Vercel o contenedores Node.js).
  - *Negativas:* Requiere mantener una estricta disciplina modular interna de carpetas para asegurar la separación en capas lógicas (UI, Dominio, Infraestructura).

---

## ADR-015: Persistencia Relacional con PostgreSQL y Prisma ORM

- **Estado:** Accepted
- **Contexto:**
  Se requería confirmar el motor de base de datos relacional y la herramienta de acceso a datos para garantizar integridad referencial, soporte para snapshots JSONB de botánica y mantenibilidad de migraciones.
- **Decisión:**
  Se confirma el uso de **PostgreSQL (v16+)** como base de datos relacional y **Prisma ORM** como capa de modelado físico y gestión de migraciones declarativas. El acceso a Prisma se mantendrá encapsulado estrictamente dentro de clases del Patrón Repositorio en la capa de infraestructura.
- **Consecuencias:**
  - *Positivas:* Tipado estricto end-to-end garantizado por el cliente generado; migraciones reproducibles y versionables; facilidad para depurar datos en local vía Prisma Studio; soporte nativo para campos JSONB en `PlantReference`.
  - *Negativas:* Cierto overhead de abstracción respecto a SQL puro y necesidad de gestionar manualmente extensiones SQL avanzadas si se requieren secuencias nativas fuera del esquema estándar de Prisma.

---

## ADR-016: Identificadores Técnicos UUIDv7 y Desacoplamiento de Códigos de Dominio

- **Estado:** Accepted
- **Contexto:**
  Se requería desacoplar la clave primaria de persistencia relacional (`id`) del identificador de negocio permanente visible para el usuario (`permanent_code` tipo `AT-PL-XXX`), evaluando tipos de identificadores técnicos internos.
- **Decisión:**
  Todas las entidades del sistema (`Plant`, `Location`, `Photo`, `PlantCultivationProfile`, `PlantReference`) utilizarán claves primarias técnicas de tipo **UUIDv7**. El código `permanent_code` pertenecerá de forma exclusiva y dedicada a la entidad `Plant` como atributo de dominio con índice único.
- **Consecuencias:**
  - *Positivas:* Desacoplamiento total entre la identidad física relacional de la fila y la regla de negocio del código legible; orden temporal natural y alta localidad en índices B-tree de PostgreSQL (superando la dispersión aleatoria de UUIDv4); URLs que no exponen secuencias internas de negocio; e inmunidad ante refactorizaciones de códigos visibles.
  - *Negativas:* Requiere generación compatible con el estándar UUIDv7 en la aplicación o extensiones de base de datos compatibles.

---

## ADR-017: Generación de permanent_code Mediante Secuencia Dedicada de PostgreSQL

- **Estado:** Accepted
- **Contexto:**
  El identificador humano permanente de los ejemplares (`AT-PL-XXX`) requiere ser generado automáticamente en el alta, estrictamente único, inmutable, no reutilizable y seguro ante condiciones de carrera concurrentes (`ADR-002`, `ATP-006`).
- **Decisión:**
  El componente numérico de `permanent_code` se generará atómicamente en el servidor utilizando una **secuencia dedicada nativa de PostgreSQL** (ej. `CREATE SEQUENCE plant_code_seq`). Los eventuales gaps numéricos provocados por transacciones canceladas o que fallen son aceptables en favor de garantizar unicidad absoluta y cero contención concurrente. Esta decisión asume a PostgreSQL como motor relacional formalmente aprobado; cualquier servicio PostgreSQL gestionado en la nube deberá soportar esta misma semántica.
- **Consecuencias:**
  - *Positivas:* Operación atómica a nivel de motor de base de datos; total inmunidad contra condiciones de carrera concurrentes sin requerir bloqueos pesimistas de tabla; desacoplada completamente de los UUIDs técnicos y del ciclo de vida (`lifecycle_status`).
  - *Negativas:* Requiere definir la secuencia física nativa en la base de datos durante la inicialización/migración de PostgreSQL, en lugar de depender únicamente de primitivas básicas del esquema Prisma.

---

## ADR-018: Despliegue en Vercel con PostgreSQL Gestionado en la Nube

- **Estado:** Accepted
- **Contexto:**
  El repositorio del proyecto fue conectado directamente a la plataforma cloud **Vercel** para integración y despliegue continuo (CI/CD). Por la naturaleza de la arquitectura serverless de Vercel, los endpoints y Server Actions no pueden acceder a instancias locales de Docker en `localhost:5432`. Asimismo, la máquina de desarrollo no dispone de Docker Desktop en PATH, lo que impedía la ejecución local de contenedores sin alterar el avance de las tareas de persistencia.
- **Decisión:**
  Atilio Plants adoptará una estrategia de despliegue cloud en **Vercel** respaldada por una instancia de **PostgreSQL gestionada en la nube (PostgreSQL 16+)** accesible mediante cadena de conexión estándar `DATABASE_URL` (ej. Neon Serverless Postgres, Supabase o similar).
  Se mantiene la compatibilidad con el entorno Docker Compose (`docker-compose.yml`) como opción reproducible para homelab/despliegues locales sin que sea un requisito bloqueante para el ciclo de desarrollo en la nube.
- **Consecuencias:**
  - *Positivas:* Despliegue continuo automático e instantáneo en Vercel ante cada push a `main`; alta disponibilidad sin depender de la máquina local encendida; compatibilidad total con Prisma ORM y la secuencia nativa `plant_code_seq` (`ADR-017`); y eliminación del bloqueo por ausencia de Docker en local.
  - *Negativas:* Requiere conectividad a Internet para interactuar con la base de datos durante el desarrollo y administrar de forma segura los secretos `DATABASE_URL` tanto en Vercel como en el archivo `.env` local.

