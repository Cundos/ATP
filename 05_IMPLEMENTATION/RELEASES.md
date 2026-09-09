# Registro de Versiones y Releases — Atilio Plants

> **Estado:** Documento Vivo de Seguimiento de Versiones (Sprint 0 — ATP-008)  
> **Alcance:** Plan de Releases estructurado por Milestones, criterios de aceptación formal y roadmap de despliegue hacia la versión de producción local **v0.1-mvp**.

---

## 1. Plan de Releases y Milestones del MVP v0.1

| Release / Milestone | Enfoque Principal | Entregables Clave | Gate de Calidad | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Milestone 0: Bootstrap Técnico** (`v0.0.1-bootstrap`) | Fundaciones de Entorno & Persistencia | Next.js/TS, Docker Compose, PostgreSQL (Neon / Local), Prisma ORM, UUIDv7, secuencia nativa `permanent_code`, repositorios base y framework de tests. | `GATE-0` | **COMPLETADO (GATE-0 APROBADO)** |
| **Milestone 1: Inventario Base** (`v0.0.2-inventory`) | Núcleo de Dominio & Catálogo UI | Importación bootstrap de 13 plantas (`AT-PL-001` a `013`), CRUD completo de ejemplares, archivo/restauración, catálogo de ubicaciones, Dashboard, listado mobile-first, Ficha Individual (`SCR-003`), Formularios de Alta/Edición (`SCR-004`/`SCR-005`), Plantas Archivadas (`SCR-006`) y Administración de Ubicaciones (`SCR-007`). | `GATE-1` | **EN PROGRESO (Implementación funcional M1 completa — pendiente auditoría GATE-1)** |



| **Milestone 2: Fotos** (`v0.0.3-photos`) | Almacenamiento & Multimedia | `LocalFileStorageService`, preprocesamiento con `sharp` a WebP, streaming seguro `/api/photos/view/`, reemplazo de foto principal preservando histórico en disco. | `GATE-2` | **PLANIFICADO** |
| **Milestone 3: Open Plantbook** (`v0.0.4-plantbook`) | Conocimiento Botánico Asistido | OAuth2 server-side, `OpenPlantbookClient` resiliente (429/timeout), snapshot persistente `PlantReference`, modal de búsqueda asistida no bloqueante. | `GATE-3` | **PLANIFICADO** |
| **Milestone 4: Hardening** (`v0.0.5-rc`) | Estabilidad, A11y & Testing | Hardening de navegación móvil, contrastes WCAG AA, suite de pruebas automatizadas (unit, integration, E2E), logging estructurado y manejo de errores. | `GATE-4` | **PLANIFICADO** |
| **RELEASE v0.1: MVP** (`v0.1.0-mvp`) | Versión Final Lista para Producción Local | Sistema 100% operativo en entorno local, documentación técnica de instalación (`README.md`), dataset inicial operativo y verificación integral. | `RELEASE-GATE` | **PLANIFICADO** |

---

## 2. Criterios Explícitos para la Liberación de la Release v0.1-mvp

Atilio Plants v0.1 se considerará formalmente **LIBERADA** y apta para uso cotidiano cuando se certifiquen los siguientes puntos:

1. **Ejecución Local Reproducible:** La aplicación levanta de forma determinista mediante `docker compose up` en una máquina de desarrollo o servidor homelab sin pasos manuales indocumentados.
2. **Persistencia y Soberanía Local:** Todos los datos (plantas, ubicaciones, cultivo y referencias) residen en PostgreSQL local persistido en volumen de Docker.
3. **Dataset Inicial Real Operativo:** Los 13 ejemplares iniciales reales (`AT-PL-001` a `AT-PL-013`) están disponibles en el catálogo con sus estados sanitarios correctos, y la secuencia atómica queda alineada con el máximo histórico (13) para generar el siguiente código a partir de 14.
4. **Ciclo de Vida Completo de Ejemplares:** Se pueden dar de alta nuevas plantas (asignando automáticamente `AT-PL-014` en adelante), editarlas, archivarlas (soft delete con preservación histórica) y restaurarlas.
5. **Administración Estricta de Ubicaciones:** Las ubicaciones se seleccionan exclusivamente desde el catálogo administrable; archivar una ubicación no rompe las plantas históricas asociadas.
6. **Búsqueda y Filtros Fluidos:** El inventario permite filtrar por estado sanitario (`HEALTHY`, `ATTENTION`, `RECOVERY`, `UNKNOWN`), por ubicación y buscar por texto libre de forma ágil.
7. **Pipeline Fotográfico Operativo:** Se pueden capturar/subir fotografías desde dispositivos móviles; se comprimen a WebP en servidor; y el reemplazo de foto principal conserva el archivo anterior en disco.
8. **Integración Externa Resiliente:** Se pueden buscar y vincular referencias de Open Plantbook; si el servicio externo falla o devuelve HTTP 429, la aplicación opera al 100% sin bloquear al usuario.
9. **Experiencia Mobile-First de Calidad:** La interfaz responde con fluidez en navegadores táctiles de teléfonos móviles, con targets táctiles adecuados para uso con una sola mano y feedback visual de carga/éxito, tomando las pautas de WCAG AA como referencia técnica de contraste y legibilidad.
10. **Cero Errores Críticos Conocidos:** Sin unhandled promise rejections, sin fallos de TypeScript y con suite automatizada de pruebas ejecutando en verde.
11. **Documentación de Arranque Clara:** `README.md` incluye las instrucciones paso a paso para configurar `.env` y poner en marcha la aplicación desde cero.

---

## 3. Despliegue en Producción (Vercel + Neon Cloud)

| Campo | Valor |
| :--- | :--- |
| **URL oficial de producción** | **https://atp-sigma.vercel.app** |
| **Proyecto Vercel** | `teresita-0157fbe4/atp` |
| **Repositorio** | `Cundos/ATP` (branch `main`) |
| **Root Directory** | `app` |
| **Framework** | Next.js (auto-detected) |
| **Base de datos** | Neon Cloud PostgreSQL (runtime, lectura real) |
| **Deployment Protection** | Producción: **pública** (sin SSO). Previews: SSO protegido. |
| **Commit desplegado** | `ca19984` (`feat: implement individual plant detail screen (SCR-003)`) |
| **Deployment ID** | `dpl_8jY6VaL8ixkX7XBM66NNdjrUJeQK` |
| **Estado** | ● **READY** |
| **Fecha de validación** | 2026-09-09T02:33 UTC |
| **Acceso público confirmado** | ✅ Validado sin sesión autenticada |

### Rutas verificadas en producción

| Ruta | Status | Validación |
| :--- | :--- | :--- |
| `/` (Dashboard) | 200 OK | Total 13, HEALTHY 10, ATTENTION 2, RECOVERY 1, UNKNOWN 0 |
| `/inventory` | 200 OK | Lista de 13 ejemplares activos |
| `/plants/AT-PL-001` | 200 OK | Gomero, Saludable, acquisition_date "No declarada" |
| `/plants/AT-PL-003` | 200 OK | Monstera adansonii, Atención |
| `/plants/AT-PL-013` | 200 OK | Croton, acquisition_date 05/09/2026 |
| `/plants/AT-PL-999` | 200 (not-found) | "Ejemplar No Encontrado" renderizado correctamente |

---

## 4. Releases Futuras (Roadmap Post-MVP)

Las etapas posteriores del roadmap continuarán con la siguiente proyección:
- **v0.2.x (Etapa 2):** Bitácora de intervenciones (riegos, fertilizaciones, podas, trasplantes) y timeline interactivo.
- **v0.3.x (Etapa 3):** Identificación física mediante generación e impresión de etiquetas QR y escaneo por cámara.
- **v0.4.x (Etapa 4):** Telemetría ambiental desacoplada e integración externa con Home Assistant / MQTT.
- **v0.5.x (Etapa 5):** Motor de cuidados proactivo y reglas de sugerencia de riego estacional.
- **v0.6.x (Etapa 6):** Comparativas visuales de crecimiento (timelapse) y asistencia botánica por IA.
