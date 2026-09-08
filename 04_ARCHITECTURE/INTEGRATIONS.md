# Integraciones Externas — Atilio Plants MVP v0.1 y Evolución

> **Estado:** Aprobado para Sprint 0 (ATP-007)  
> **Alcance:** Arquitectura de comunicación con proveedores externos (Open Plantbook en v0.1) y límites de integración futura con Home Assistant.

---

## 1. Integración en MVP v0.1: Open Plantbook

La integración básica con **Open Plantbook** forma parte del alcance del MVP v0.1 como enriquecimiento botánico opcional (`ATP-004B`, `ADR-012`, `ADR-013`).

### 1.1 Principios Rectores:
1. **No Bloqueante:** Toda falla de red, rate limit (429) o indisponibilidad de la API permite continuar utilizando el 100% de las funciones de Atilio Plants.
2. **Server-Side Exclusivo:** Los secretos `OPEN_PLANTBOOK_CLIENT_ID` y `OPEN_PLANTBOOK_CLIENT_SECRET` jamás se transmiten al cliente.
3. **Persistencia Local Inmutable:** Toda especie seleccionada se almacena en la tabla local `PlantReference` como snapshot inmutable. La aplicación opera sin depender del uptime de Open Plantbook.

### 1.2 Flujo de Datos y Mapeo Conceptual:

```text
Open Plantbook API (/api/v1/plant/detail/{pid}?include=*)
                     │
                     ▼
             [OpenPlantbookMapper]
                     │
      ┌──────────────┴──────────────┐
      ▼                             ▼
PlantReference                ReferenceCare (JSONB)
- provider: 'OPEN_PLANTBOOK'  - min/max light lux
- external_id: pid            - min/max humidity
- display_pid / common_names  - min/max temp
- image_url                   - watering / pruning / soil texts
- sync_timestamp              - raw_data (payload original completo)
```

---

## 2. Integración Futura: Home Assistant (Etapa 4)

En estricta observancia de los lineamientos de arquitectura:
- **`ADR-001` (Independencia de Home Assistant):** Atilio Plants no depende de Home Assistant para operar ni como base de datos primaria.
- **`ADR-003` (Desacoplamiento de Sensores e Identidad):** Los sensores son dispositivos fungibles que se asocian de forma temporal a un ejemplar físico pero no forman parte de la identidad de `Plant`.
- **Alcance v0.1:** Cero código, cero dependencias de Home Assistant y ninguna entidad de sensores en el esquema del MVP.

### 2.3 Frontera Arquitectónica Futura:
En la Etapa 4 se creará un módulo aislado `integrations/home-assistant/` que:
1. Se comunicará vía REST API de Home Assistant (con Long-Lived Access Token) o vía MQTT.
2. Mapeará lecturas de entidades sensor (ej: `sensor.ficus_living_moisture`) a una entidad secundaria desacoplada de telemetría (`PlantTelemetryReading`), indexada por `plant_id` y timestamp.
3. La desconexión o reinicio de Home Assistant no afectará la disponibilidad del catálogo ni la bitácora de Atilio Plants.
