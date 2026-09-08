# Visión del Producto: Atilio Plants

---

## 1. Declaración de Misión

**Atilio Plants** es un sistema personal diseñado para centralizar, gestionar y enriquecer el cuidado de plantas de interior, garantizando la trazabilidad histórica de cada individuo biológico a lo largo de toda su existencia.

A diferencia de las aplicaciones tradicionales de jardinería basadas en recordatorios estáticos por especie o catálogos genéricos, Atilio Plants sitúa el foco en el **ejemplar individual** como entidad primaria y permanente, respetando sus condiciones particulares de microclima, salud, intervenciones y evolución física.

---

## 2. Alcance y Capacidades Futuras

El sistema abordará de manera progresiva las siguientes capacidades:

### A. Gestión de Identidad y Taxonomía
- Identificador permanente e inmutable por espécimen (`AT-PL-001`, etc.).
- Clasificación botánica completa (nombre común, especie, cultivar, familia).
- Registro de procedencia, fecha de adquisición y estado vital.

### B. Bitácora de Cuidados y Mantenimiento
- Registro de riegos, composición del agua y aditivos.
- Planes de fertilización (tipo de fertilizante, dosis, periodicidad).
- Operaciones de poda, limpieza foliar y mantenimiento fitosanitario.
- Control de trasplantes, dimensiones de maceta y formulaciones de sustrato.
- Diagnóstico y tratamiento de plagas, hongos o anomalías fisiológicas.

### C. Seguimiento Visual y Cronología Fotográfica
- Repositorio fotográfico ordenado cronológicamente por espécimen.
- Registro visual del desarrollo vegetativo, floración o recuperación ante estrés.
- Comparación temporal de estado foliar y crecimiento.

### D. Contexto Físico y Ambiental
- Ubicación dinámica dentro del hogar (ambiente, orientación, exposición lumínica).
- Movilidad de ubicación sin pérdida ni alteración de identidad del ejemplar.

### E. Telemetría y Ecosistema IoT (Opcional / Desacoplado)
- Integración opcional con sensores de humedad de suelo, temperatura, radiación lumínica y conductividad eléctrica (EC).
- Conectividad mediante Zigbee / MQTT / Home Assistant.
- *Principio inviolable:* La ausencia de hardware IoT no degrada ninguna función nuclear del software.

### F. Inteligencia y Asistencia Contextual
- Motor de reglas y recomendaciones contextuales basadas en el histórico acumulado de cada espécimen y sus condiciones reales.
- Automatizaciones de alertas y sugerencias operativas.
- Integración futura con visión computacional e Inteligencia Artificial para asistencia en diagnóstico de patologías y estimación de tasa de desarrollo foliar.

---

## 3. Filosofía de Integridad de Datos

- **No invención de información:** Si un dato (ej. fecha exacta de nacimiento, cultivar específico, composición exacta del sustrato) se desconoce, el sistema registra explícitamente `null` o `unknown`. Nunca se extrapolan valores por defecto que distorsionen la realidad.
- **Inmutabilidad de la historia:** Las acciones pasadas (un riego ejecutado, un trasplante realizado en 2024) forman parte del historial inmutable de la planta.
- **Ciclo de vida cerrado:** Dar de baja o archivar una planta (por deceso, donación o venta) preserva la totalidad de sus métricas y registros históricos.
