# Roadmap: Atilio Plants

El desarrollo de Atilio Plants se ejecuta de forma estrictamente secuencial e incremental. No se asumen fechas fijas; la progresión se define por hitos de completitud técnica y funcional validados.

---

## Etapa 0 — Diseño Funcional y Técnico (Fase Actual)
- **Objetivo:** Establecer la base documental, especificaciones de requerimientos, diseño conceptual de datos, diseño de experiencia de usuario (UX) y lineamientos de arquitectura técnica.
- **Entregables clave:**
  - Estructura documental completa y estandarizada.
  - Especificación formal de requisitos funcionales y no funcionales.
  - Modelo de datos conceptual y esquema del ejemplar (`AT-PL-XXX`).
  - Wireframes y flujos de interacción principales.
  - Arquitectura del sistema, especificación de API y lineamientos de integración.
  - Registro inicial de Decisiones Arquitectónicas (ADR).

---

## Etapa 1 — Inventario Digital (MVP)
- **Objetivo:** Desarrollar el Producto Mínimo Viable (MVP) operativo que permita la gestión básica del inventario de plantas.
- **Alcance funcional:**
  - Alta, edición, consulta y archivo de ejemplares.
  - Asignación estricta y validación del identificador `AT-PL-XXX`.
  - Atributos esenciales: nombre común, especie, cultivar (opcional), fecha de ingreso, estado general.
  - Registro de ubicación física actual y maceta.
  - Carga del inventario inicial de los 13 ejemplares reales.
  - Interfaz responsiva con foco prioritario en mobile.

---

## Etapa 2 — Gestión y Bitácora
- **Objetivo:** Proveer herramientas operativas diarias de seguimiento y registro de acciones sobre cada planta.
- **Alcance funcional:**
  - Bitácora de intervenciones: riegos, fertilizaciones, podas, trasplantes y limpiezas.
  - Registro de anomalías fitosanitarias (plagas, enfermedades, deficiencias nutricionales).
  - Almacenamiento local de fotografías vinculadas a fechas e intervenciones.
  - Timeline cronológico interactivo por ejemplar.

---

## Etapa 3 — Identificación Física
- **Objetivo:** Conectar el mundo físico con el sistema digital de forma inmediata.
- **Alcance funcional:**
  - Generación de códigos QR únicos asociados a cada identificador `AT-PL-XXX`.
  - Formato imprimible de etiquetas resistentes para macetas / estacas de identificación.
  - Escaneo de QR desde la cámara del dispositivo móvil para acceso directo a la ficha del ejemplar.

---

## Etapa 4 — Telemetría
- **Objetivo:** Enriquecer el perfil de las plantas con métricas ambientales y de sustrato en tiempo real o diferido.
- **Alcance funcional:**
  - Vinculación lógica desacoplada de sensores (humedad, temperatura, luz, conductividad).
  - Integración externa con Home Assistant vía API/MQTT (ingesta pasiva o consulta).
  - Visualización de gráficas temporales de variables ambientales.
  - Preservación del funcionamiento offline y manual sin depender de la presencia de sensores.

---

## Etapa 5 — Motor de Cuidados
- **Objetivo:** Transformar los datos históricos y telemetría en recomendaciones proactivas.
- **Alcance funcional:**
  - Reglas de negocio para sugerencias de riego adaptadas a la época del año y lectura de sensores.
  - Alertas preventivas por desecación excesiva, exceso hídrico o estrés lumínico.
  - Calendarios sugeridos de fertilización y poda basados en la especie y temporada.

---

## Etapa 6 — Seguimiento Fotográfico Avanzado e Inteligencia Artificial
- **Objetivo:** Explotar la información visual acumulada mediante análisis automatizado y comparativas avanzadas.
- **Alcance funcional:**
  - Herramienta de comparación temporal visual (side-by-side / timelapse) para evaluar crecimiento.
  - Modelos de visión computacional y agentes de IA para asistencia en detección temprana de plagas.
  - Estimación asistida de volumen foliar y diagnóstico de salud.
