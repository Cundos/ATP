# Integraciones Externas — Atilio Plants

> **Estado:** Aprobado (Sprint 0, Sprint 2 & ATP-HA-001)  
> **Alcance:** Arquitectura de comunicación con proveedores externos (Open Plantbook) y cimientos de integración con Home Assistant (ATP-HA-001).

---

## 1. Integración con Open Plantbook

La integración con **Open Plantbook** provee enriquecimiento botánico y taxonomía de referencia (`ATP-004B`, `ADR-012`, `ADR-013`).

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

## 2. Integración con Home Assistant (ATP-HA-001 Foundation)

En estricta observancia de los lineamientos de arquitectura:
- **`ADR-001` (Independencia de Home Assistant):** Atilio Plants no depende de Home Assistant para operar ni como base de datos primaria.
- **`ADR-003` (Desacoplamiento de Sensores e Identidad):** Los sensores son dispositivos fungibles que se asocian de forma temporal o dinámica a un ejemplar físico pero **nunca forman parte de la identidad de `Plant`**.
- **Home Assistant NO es fuente de identidad de plantas.**

### 2.1 Frontera de Responsabilidades del Sistema:

| Sistema | Responsabilidad Primaria | Atributos y Datos |
| :--- | :--- | :--- |
| **Atilio Plants** | **Identidad del ejemplar**, Catálogo de plantas, Ubicaciones físicas, Bitácora e historial de intervenciones. | `permanent_code` (`AT-PL-XXX`), UUIDs, fotos históricas, notas, estado sanitario de dominio (`UNKNOWN`, `HEALTHY`, `ATTENTION`, `RECOVERY`). |
| **Home Assistant** | **Telemetría y Estado de Sensores en tiempo real**, Conectividad de hardware, Automatizaciones operativas domésticas. | Lectura de humedad analógica/calibrada (`%`), voltaje de batería, LQI, disponibilidad (`online`/`offline`), futuros actuadores. |
| **Open Plantbook** | **Conocimiento Botánico de Referencia**, Taxonomía general, Rangos óptimos teóricos de cultivo. | Especie botánica, PID, rangos mín/máx de luz/humedad/temp, textos cualitativos de riego y sustrato. |

### 2.2 Arquitectura Técnica (Server-Side Read-Only):

```text
┌─────────────────────────────────────────────────────────────┐
│                    Atilio Plants (Server)                   │
│                                                             │
│   [UseCase / Service]                                       │
│          │                                                  │
│          ▼                                                  │
│   [IHomeAssistantClient] ──> [HomeAssistantRestClient]      │
└──────────────────────────────────────┬──────────────────────┘
                                       │ HTTPS (Bearer Token)
                                       │ Timeout 7000ms
                                       ▼
                     [Nabu Casa Remote UI / LAN]
                     https://*.ui.nabu.casa/api/states/{entity_id}
                                       │
                                       ▼
                          [Home Assistant Core REST API]
```

### 2.3 Principios de Seguridad y Sanitización:
1. **Server-Only Execution:** `HOME_ASSISTANT_BASE_URL` y `HOME_ASSISTANT_TOKEN` residen exclusivamente en variables de entorno de servidor. Jamás se exponen al cliente navegador ni se inyectan en bundles frontend.
2. **Sin Proxies Abiertos:** No existen endpoints públicos genéricos tipo `/api/ha?entity=...`. El acceso ocurre exclusivamente mediante casos de uso internos autorizados.
3. **Sanitización Estricta de DTO (`HomeAssistantState`):** Se descartan contextos internos, tokens y atributos no autorizados. Solo se exponen atributos aprobados (`friendly_name`, `unit_of_measurement`, `device_class`).
4. **Manejo Resiliente de Errores:** Errores 401, 403, 404, 429, 5xx, timeouts y fallas de red se traducen a excepciones de dominio sin filtrar tokens ni cabeceras en los mensajes de error.

---

## 3. Ingesta de Eventos Operativos de Home Assistant (ATP-HA-003)

Home Assistant puede empujar eventos operativos significativos hacia Atilio Plants mediante un webhook HTTP seguro.

### 3.1 Principio Operativo:
- **Home Assistant:** Ejecuta automatizaciones y detecta eventos (`SOIL_MOISTURE_LOW`, `SOIL_MOISTURE_RECOVERED`, `SENSOR_OFFLINE`, `SENSOR_ONLINE`, `IRRIGATION_STARTED`, `IRRIGATION_FINISHED`).
- **Atilio Plants:** Recibe y persiste **únicamente eventos discretos** que aportan valor histórico a la bitácora del ejemplar.
- **NO se almacena telemetría periódica cruda minuto a minuto.**

### 3.2 Arquitectura del Flujo de Ingesta:

```text
┌──────────────────────────────────────┐
│        Home Assistant Core           │
│   (Automation / rest_command)        │
└──────────────────┬───────────────────┘
                   │ POST /api/integrations/home-assistant/events
                   │ Authorization: Bearer <HOME_ASSISTANT_WEBHOOK_SECRET>
                   │ Content-Type: application/json
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Atilio Plants Backend                           │
│                                                                        │
│   [Timing-Safe Auth Verification (crypto.timingSafeEqual)]             │
│                        │                                               │
│                        ▼                                               │
│   [IngestHomeAssistantEventUseCase]                                    │
│        ├── Valida payload (plant_id / permanent_code, event_type, etc) │
│        ├── Resuelve ejemplar (PlantEntity)                             │
│        ├── Aplica idempotencia via event_key (UNIQUE)                  │
│        └── Sanitiza metadata (entity_id, state, automation_id, trigger)│
│                        │                                               │
│                        ▼                                               │
│   [PrismaPlantOperationalEventRepository]                              │
│                        │                                               │
│                        ▼                                               │
│   [Neon PostgreSQL (PlantOperationalEvent)]                            │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Tipos de Eventos Soportados:

| Event Type | Semántica | Valores Típicos |
| :--- | :--- | :--- |
| `SOIL_MOISTURE_LOW` | Humedad de suelo descendió por debajo del umbral de alerta | `value_number: 14.5`, `unit: "%"` |
| `SOIL_MOISTURE_RECOVERED` | Humedad de suelo recuperó niveles adecuados tras riego o absorción | `value_number: 48.0`, `unit: "%"` |
| `SENSOR_OFFLINE` | Sensor o dispositivo dejó de emitir telemetría | `value_text: "offline"`, `metadata.entity_id` |
| `SENSOR_ONLINE` | Sensor o dispositivo recuperó conectividad | `value_text: "online"`, `metadata.entity_id` |
| `IRRIGATION_STARTED` | Inicio de ciclo de riego automático o manual | `value_text: "started"` |
| `IRRIGATION_FINISHED` | Finalización de ciclo de riego | `value_number: 120` (segundos) |

### 3.4 Ejemplo de Automatización en Home Assistant (`rest_command` + `automation`):

```yaml
# configuration.yaml
rest_command:
  atp_post_event:
    url: "https://<tu-app>.vercel.app/api/integrations/home-assistant/events"
    method: POST
    headers:
      Authorization: "Bearer !secret atp_webhook_secret"
      Content-Type: "application/json"
    payload: >
      {
        "plant_code": "{{ plant_code }}",
        "event_type": "{{ event_type }}",
        "event_id": "{{ event_id }}",
        "occurred_at": "{{ now().isoformat() }}",
        "value_number": {{ value_number | default('null') }},
        "value_text": "{{ value_text | default('') }}",
        "unit": "{{ unit | default('') }}",
        "metadata": {
          "entity_id": "{{ trigger.entity_id | default('') }}",
          "state": "{{ trigger.to_state.state | default('') }}",
          "automation_id": "auto_moisture_low_zz"
        }
      }

# automations.yaml
- id: auto_moisture_low_zz
  alias: "Alerta Humedad Baja - ZZ Plant"
  trigger:
    - platform: numeric_state
      entity_id: sensor.beta_zz_plant_soil_moisture
      below: 15
      for: "00:10:00"
  action:
    - service: rest_command.atp_post_event
      data:
        plant_code: "AT-PL-007"
        event_type: "SOIL_MOISTURE_LOW"
        event_id: "zz-moist-low-{{ now().strftime('%Y%m%d%H%M') }}"
        value_number: "{{ states('sensor.beta_zz_plant_soil_moisture') | float }}"
        unit: "%"

---

## 4. Puente Cecilio / Home Assistant Read-Only Care API (ATP-VOICE-001A)

### 4.1 Principio de Autoridad y Fuente de la Verdad:
- **Atilio Plants = Fuente de la verdad contextual (*Source of Truth*):**
  - Posee la identidad permanente del ejemplar (`permanent_code`).
  - Almacena el conocimiento botánico de referencia (`PlantReference`).
  - Ejecuta el motor determinista de contexto de cuidado ([`evaluatePlantCareContext`](file:///C:/Dev/AtilioPlant/app/src/core/domain/services/plantCareContextEngine.ts)).
  - Emite evaluaciones de estado (`OK`, `WATCH`, `ACTION_RECOMMENDED`, `DATA_INSUFFICIENT`) y recomendaciones explicables con evidencia.
- **Home Assistant / Cecilio = Capa de presentación y voz (*Presentation Consumer*):**
  - Consulta el contexto de cuidado evaluado mediante la API read-only.
  - Genera respuestas conversacionales y respuestas de voz para el usuario.
  - **NO reimplementa reglas botánicas ni cálculos de umbrales.**
  - **NO ejecuta mutaciones directas sobre el modelo de datos.**

### 4.2 Arquitectura del Endpoint Read-Only:

```text
┌──────────────────────────────────────┐
│        Home Assistant / Cecilio      │
│        (Voice / Dashboard Client)    │
└──────────────────┬───────────────────┘
                   │ GET /api/integrations/home-assistant/plants/{permanentCode}/care-context
                   │ Authorization: Bearer <HOME_ASSISTANT_READ_API_SECRET>
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Atilio Plants Backend                           │
│                                                                        │
│   [Timing-Safe Auth Verification (HOME_ASSISTANT_READ_API_SECRET)]     │
│                        │                                               │
│                        ▼                                               │
│   [GetPlantCareContextUseCase]                                         │
│        ├── Valida permanent_code (AT-PL-XXX)                          │
│        ├── Obtiene ejemplar + referencia botánica                      │
│        ├── Consulta telemetría en vivo (HomeAssistantClient)           │
│        ├── Consulta historial de eventos operacionales                 │
│        └── Ejecuta evaluatePlantCareContext (ADR-019)                  │
│                        │                                               │
│                        ▼                                               │
│   [Sanitizer / Minimal Voice DTO (schema_version: "1")]                │
│        └── Sin UUIDs, sin DB IDs, sin storage paths, sin raw payloads  │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Principios de Privacidad y Minimización de Datos:
1. **Identificación Exclusiva por Código Permanente:** Solo resuelve por `AT-PL-XXX`. No acepta UUIDs ni IDs internos.
2. **Minimización de Respuesta:** Se omiten datos técnicos internos (UUIDs, IDs de tabla, paths de archivos en blob/storage, datos crudos JSON, identificadores de entidades de Home Assistant).
3. **Manejo Resiliente y Degradado:** Si Home Assistant se encuentra temporalmente inaccesible, el motor degrada transparentemente retornando `200 OK` con `telemetry_available: false` y evaluación basada en la referencia botánica disponible.
```
