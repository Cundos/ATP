# ADR-018: Dynamic & Deterministic Care Context Engine (ATP-CARE-001)

## Estado
Aceptado

## Contexto
Atilio Plants cuenta con fichas botánicas enriquecidas (Open Plantbook), telemetría en tiempo real desde Home Assistant (sensores de humedad, batería, estado online/stale) e historial de eventos operacionales.
Se requería unificar estas fuentes heterogéneas en un contexto de cuidado (*Care Context*) coherente y explicable para cada ejemplar, sin depender de modelos generativos (LLMs), sin persistencia redundante y sin automatizar el riego.

## Decisiones de Diseño

1. **Cálculo Determinista On-Demand**:
   - El contexto de cuidado no se almacena en tablas dedicadas ni genera snapshots periódicos. Se computa al vuelo mediante una función de dominio pura (`evaluatePlantCareContext`) en la capa de dominio.
   - Cero dependencias con OpenAI u otros LLMs; la evaluación es 100% reproducible y explicable.

2. **Precedencia de Umbrales (Threshold Precedence)**:
   - 1º: Umbrales explícitos asignados al sensor/ejemplar (si existieran).
   - 2º: Umbrales botánicos provistos por Open Plantbook (`min_soil_moist`, `max_soil_moist`).
   - 3º: Si no hay umbrales disponibles, la clasificación es `UNKNOWN`. **Nunca se inventan ni asumen umbrales mágicos por defecto**.

3. **Precedencia de Calidad de Datos / Telemetría**:
   - Si el sensor está `OFFLINE` o la lectura está desactualizada (`STALE`), la clasificación de humedad es forzada a `UNKNOWN` y el estado general pasa a `WATCH`.
   - Se evita emitir alertas falsas de riego bajo o sobrehidratación cuando los datos no son confiables.

4. **Explicabilidad y Evidencia**:
   - Cada recomendación (`CareRecommendation`) incluye una lista estructurada de evidencias (`evidence: string[]`) detallando lecturas numéricas, rangos de referencia y eventos operacionales previos.

5. **Integración en UI**:
   - Componente `PlantCareContextSection` ubicado entre la telemetría en tiempo real y la actividad reciente, con badges semánticos, cards de condiciones y lista de recomendaciones con justificación desplegable.

## Consecuencias
- **Positivas**: Cero costos de inferencia de IA, latencia despreciable (<1ms de cálculo de dominio), alta confiabilidad y total explicabilidad en las sugerencias de cuidado.
- **Negativas**: Las sugerencias complejas no estandarizadas están limitadas a las reglas deterministas definidas.
