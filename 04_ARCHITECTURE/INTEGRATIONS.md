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
