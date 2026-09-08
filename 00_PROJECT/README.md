# Atilio Plants

Sistema personal para la gestión y seguimiento individualizado de plantas de interior.

---

## Resumen del Proyecto

**Atilio Plants** nace como una solución integral para el registro, cuidado, monitoreo y seguimiento histórico de plantas de interior. El sistema parte de la premisa fundamental de tratar a cada ejemplar botánico como un individuo físico único con identidad propia, independiente de su contenedor (maceta), ubicación física, sustrato o tecnología de sensado asociada.

Actualmente, el proyecto contempla la incorporación inicial de 13 ejemplares reales y se concibe bajo una estrategia arquitectónica incremental y **local-first**.

---

## Principios del Producto

El diseño y desarrollo de Atilio Plants se rige estrictamente por 12 principios fundamentales:

1. **Ejemplar físico único:** Cada planta registrada representa un individuo físico real y único.
2. **Identificador permanente:** Cada ejemplar posee un identificador inmutable con el formato estandarizado `AT-PL-001`, `AT-PL-002`, `AT-PL-003`, etc.
3. **Identidad ligada a la planta:** La identidad pertenece al ser vivo, no al contenedor ni a la maceta.
4. **Independencia de atributos mutables:** Cambiar de maceta, ubicación, sustrato o sensor no altera la identidad del ejemplar.
5. **Historial de vida ininterrumpido:** El historial de eventos y cuidados de una planta debe preservarse a lo largo de toda su permanencia en el sistema.
6. **Conservación de archivados:** Una planta dada de baja o archivada conserva íntegramente su historial para análisis retrospectivo.
7. **Sensores como fuentes secundarias:** Los sensores aportan telemetría complementaria y nunca condicionan el funcionamiento base del sistema.
8. **Operatividad sin IoT:** El sistema es 100% funcional de forma manual, incluso en ausencia total de dispositivos IoT.
9. **Home Assistant como integración periférica:** Home Assistant actúa como servicio de integración externa; nunca es la fuente de verdad del dominio.
10. **Diseño Mobile-First con paridad Desktop:** La interfaz de usuario está optimizada prioritariamente para smartphones, manteniendo plena usabilidad en computadoras de escritorio.
11. **Fidelidad del dato (sin invenciones):** El sistema nunca asume ni inventa datos faltantes; los campos admiten explícitamente valores nulos o desconocidos (`null`, `unknown`).
12. **Simplicidad y utilidad real:** Se prioriza la mantenibilidad, claridad conceptual y utilidad práctica frente a la sobreingeniería o complejidad técnica innecesaria.

---

## Estrategia de Infraestructura (Local-First)

- **Independencia en fase inicial:** El sistema opera completamente en infraestructura local propia (on-premise / localhost), sin depender obligatoriamente de servicios en la nube (Vercel, Supabase, Firebase u homólogos).
- **Control de versiones:** Control estricto del ciclo de vida mediante Git desde el Sprint 0.
- **Portabilidad cloud futura:** Arquitectura desacoplada que permitirá la migración a la nube a futuro sin requerir rediseñar el modelo de dominio ni el producto.
- **Stack arquitectónico preliminar bajo evaluación:**
  - Frontend / Fullstack: Next.js
  - Persistencia relacional: PostgreSQL
  - ORM: Prisma
  - Despliegue de servicios: Docker & Docker Compose
  - Almacenamiento de archivos: Abstracción de capa de almacenamiento (iniciando en filesystem local y preparado para object storage tipo S3/MinIO).

---

## Estructura Documental del Repositorio

```text
ATILIO-PLANTS/
│
├── 00_PROJECT/               # Visión general, gobernanza, roadmap y ADRs
│   ├── README.md
│   ├── PRODUCT_VISION.md
│   └── ROADMAP.md
│   └── DECISIONS.md
│
├── 01_REQUIREMENTS/          # Requisitos de producto y especificación de historias
│   ├── FUNCTIONAL_REQUIREMENTS.md
│   ├── NON_FUNCTIONAL_REQUIREMENTS.md
│   └── USER_STORIES.md
│
├── 02_DATA/                  # Modelado conceptual, esquemas e inventario base
│   ├── DATA_MODEL.md
│   ├── PLANT_SCHEMA.md
│   └── INITIAL_INVENTORY.md
│
├── 03_UX/                    # Diseño de experiencia, flujos de usuario y pantallas
│   ├── SCREENS.md
│   ├── USER_FLOWS.md
│   └── WIREFRAMES/
│
├── 04_ARCHITECTURE/          # Arquitectura técnica, contratos de API e integraciones
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── INTEGRATIONS.md
│
├── 05_IMPLEMENTATION/        # Gestión del trabajo, backlog y seguimiento de releases
│   ├── BACKLOG.md
│   └── RELEASES.md
│
└── app/                      # Código fuente de la aplicación (vacío en Sprint 0)
```

---

## Estado Actual

Actualmente en **Sprint 0: Definición documental y técnica preliminar**. No se ha inicializado código ejecutable ni dependencias de runtime.
