# Integración con Open Plantbook — Análisis y Diseño Conceptual (Change Request ATP-004B)

> **Estado del Documento:** Propuesta de Change Request (Pendiente de Aprobación).  
> **Alcance:** Especificación conceptual, evaluación de impacto arquitectónico, de datos y UX para la integración opcional con Open Plantbook.

---

## 1. Objetivo y Límites de Responsabilidad

El objetivo de este Change Request es incorporar a **Open Plantbook** (u otros proveedores futuros) como una **fuente externa y opcional de enriquecimiento y referencia botánica**, sin vulnerar la soberanía del modelo de dominio ni la estrategia *local-first* de Atilio Plants.

### Límites de Responsabilidad Inviolables:
- **Open Plantbook NO es la base de datos de Atilio Plants.**
- **Open Plantbook NO es la fuente de identidad de los ejemplares físicos.** La identidad (`AT-PL-XXX`) y la existencia de cada ser vivo pertenecen pura y exclusivamente a la entidad `Plant`.
- **Open Plantbook NO es una dependencia bloqueante:** Atilio Plants continuará funcionando al 100% de sus capacidades cuando:
  - no haya conexión a Internet (entorno offline local);
  - la API de Open Plantbook no responda o devuelva errores (HTTP 5xx, timeouts, rate limits);
  - una especie botánica no exista en el catálogo de Open Plantbook;
  - el usuario decida voluntariamente no asociar ninguna referencia externa a su planta.
- **Open Plantbook NO define el estado de salud de la planta:** Las lecturas o recomendaciones de la especie son referencias biológicas teóricas generales; el estado real de salud y los cuidados aplicados corresponden a la evaluación física del usuario sobre el ejemplar.

---

## 2. Capacidades Verificadas de Open Plantbook

En base a la documentación técnica oficial y especificaciones OpenAPI del proveedor:

### Capacidades Confirmadas por Documentación Oficial (*Confirmed by Provider Documentation*):
- **Autenticación:** Implementa estándar **OAuth2 Client Credentials Grant** (`POST /api/v1/token/`), requiriendo `client_id` y `client_secret` generados en el portal web `open.plantbook.io`.
- **Identificador de Especie:** Utiliza un `pid` (*Plant Identifier*, ej. `"monstera deliciosa"` o `"epipremnum aureum"`).
- **Búsqueda:** Endpoint `GET /api/v1/plant/search` con parámetro de consulta `alias` / nombre común o científico, devolviendo lista paginada de resultados coincidentes con sus respectivos `pid` y nombres.
- **Detalle:** Endpoint `GET /api/v1/plant/detail/{pid}` que devuelve:
  - Nombres botánicos (`display_pid`, nombres comunes).
  - Rangos de cuidado / umbrales ambientales numéricos: `min_temp`, `max_temp`, `min_light_lux`, `max_light_lux`, `min_soil_moist`, `max_soil_moist`, `min_soil_ec`, `max_soil_ec`, `min_env_humid`, `max_env_humid`.
  - Categorías de cuidado cualitativo textual (mediante parámetro `?include=care` o `?include=*`): `watering`, `sunlight`, `soil`, `pruning`, `fertilization`.
  - URL de imagen de referencia (`image_url`).
- **Rate Limits:** La API aplica restricciones de tasa de peticiones con respuesta HTTP 429 (`ErrRateLimitExceeded`), recomendando el cacheo local de resultados (1h en búsquedas, 24h+ en detalles).

### Supuestos de Diseño (*Design Assumptions*):
- La disponibilidad de imágenes externas depende de servidores remotos de terceros (URLs externas que pueden caducar si no se persisten localmente).

---

## 3. Separación Conceptual: Ejemplar Físico vs. Referencia Botánica

Para preservar la pureza del dominio se establece una delimitación tajante:

### A) Ejemplar Físico (`Plant`)
Representa el ser vivo real, concreto y perecedero ubicado en la maceta del usuario:
- Identificador permanente inmutable (`AT-PL-008`).
- Nombre coloquial propio (*"Marble Queen del living"*).
- Fotografía real capturada por el usuario (`Photo`).
- Ubicación actual (`Location`).
- Estado de salud real evaluado (`health_status`).
- Condiciones reales de cultivo actual (`PlantCultivationProfile`).
- Ciclo de vida administrativo (`lifecycle_status`).

### B) Referencia Botánica Externa (`PlantReference`)
Representa conocimiento teórico y compartido sobre una especie o taxón botánico provisto por una fuente externa:
- Fuente o proveedor (`provider = 'OPEN_PLANTBOOK'`).
- Identificador externo (`external_id = pid`).
- Nombre científico y nombres comunes sugeridos.
- Umbrales e instrucciones generales de cuidado de la especie (*Reference Care*).
- Imagen botánica de catálogo (*Reference Image*).
- Metadata de sincronización y procedencia.

**Cardinalidad del Dominio:**  
`Plant (N) —— vinculada a —— (0..1) PlantReference`  
*Una misma referencia de especie (ej. Epipremnum aureum) puede ser compartida por múltiples ejemplares físicos (ej. AT-PL-008 y AT-PL-009). A su vez, una planta física puede existir indefinidamente sin ninguna referencia vinculada.*

---

## 4. Separación entre Cuidado de Referencia y Cultivo Real

La incorporación de este Change Request consolida y clarifica la frontera de dos conceptos que anteriormente convergían en el perfil de cultivo:

```text
+-------------------------------------------------------------------------------+
|                        ESPECIE / TAXÓN COMPARTIDO                             |
|                        (PlantReference -> Reference Care)                     |
|  - Rango teórico óptimo de luz (ej. 1500 - 3000 lux)                         |
|  - Rango teórico óptimo de humedad (ej. 40% - 60%)                            |
|  - Sustrato recomendado para la especie (ej. mezcla ácida bien drenada)       |
|  - Instrucciones genéricas de riego, poda y fertilización                     |
+-------------------------------------------------------------------------------+
                                      | (enriquece / guía)
                                      v
+-------------------------------------------------------------------------------+
|                       EJEMPLAR FÍSICO INDIVIDUAL                              |
|                       (PlantCultivationProfile -> Current Cultivation)        |
|  - Maceta física actual (ej. "Maceta de barro cocido 20cm con plato")         |
|  - Sustrato real colocado (ej. "60% turba + 30% perlita + 10% humus")        |
|  - Requerimientos o adaptaciones particulares de este individuo en el hogar   |
+-------------------------------------------------------------------------------+
```

---

## 5. Estrategia de Persistencia Local, Cache y Provenance

Atilio Plants es **Local-First**. Para garantizar funcionamiento offline ininterrumpido:

### Opción Evaluada y Recomendada: Snapshot Local Persistente
- **Decisión de Persistencia:** Cuando el usuario selecciona una especie de Open Plantbook, los datos obtenidos se persisten localmente en la tabla/entidad `PlantReference` dentro de la base de datos del sistema.
- **Funcionamiento Offline:** Cualquier consulta posterior a la ficha de la planta accederá a los datos almacenados localmente en `PlantReference`, operando con 0 ms de latencia y sin requerir conexión a Internet.
- **Inmutabilidad y Tolerancia a Fallos Externos:** Si la API de Open Plantbook se cae, si la especie cambia de nombre en el servidor remoto o si es eliminada de Open Plantbook, el registro local en Atilio Plants **no se destruye ni desaparece**.
- **Metadata de Procedencia (*Provenance*):**  
  Cada tupla en `PlantReference` registrará:
  - `provider`: String identificador (`OPEN_PLANTBOOK`).
  - `external_id`: Identificador remoto (`pid`).
  - `fetched_at`: Timestamp del momento en que se obtuvo la información.
  - `last_sync_at`: Timestamp de la última verificación/sincronización exitosa.
  - `raw_data`: Snapshot JSON original para preservar la fidelidad técnica del proveedor.

---

## 6. Sincronización Conceptual

- **Sincronización Bajo Demanda (Manual):** En esta etapa no se implementarán cronjobs ni sincronizaciones automáticas en segundo plano. La actualización se realizará exclusivamente a solicitud del usuario mediante una acción explícita *"Actualizar datos desde Open Plantbook"*.
- **Desvinculación:** El usuario podrá desvincular un ejemplar de su `PlantReference` en cualquier momento, volviendo la relación a `null` sin afectar los datos propios de la planta (`Plant`).

---

## 7. Tratamiento de Fotografías Propias vs. Imágenes de Referencia

Se define una separación estricta para no distorsionar la identidad visual del ejemplar:
- **`Photo` (Propia):** Imágenes reales del individuo físico capturadas por el usuario. La foto principal del ejemplar proviene de esta entidad.
- **`PlantReference.image_url` (Externa):** Fotografía botánica ilustrativa de catálogo.
  - **Regla:** La imagen de Open Plantbook **NUNCA** se convierte automáticamente en la `Photo` principal del ejemplar.
  - Se muestra en la interfaz con tratamiento visual diferenciado (etiqueta: *"Imagen de referencia botánica"*), permitiendo que el usuario distinga a simple vista una foto de su planta real frente a un catálogo genérico.

---

## 8. Impacto sobre el Flujo de Alta de Planta (SCR-004 y FLOW-005)

El flujo de alta se amplía para admitir enriquecimiento botánico sin entorpecer el registro rápido:

```text
[ Inicio de Alta ]
        |
        v
¿Desea buscar especie en Open Plantbook?
        |
        +---> SÍ ---> [ Buscar especie (online) ] ---> [ Seleccionar pid ]
        |                                                       |
        |                                                       v
        |                                            [ Autocompletar sugerencias: ]
        |                                            - Nombre común sugerido
        |                                            - Nombre científico
        |                                            - Vincular PlantReference
        |                                                       |
        +---> NO / Offline / Error / Sin resultados ------------+
                                                                |
                                                                v
                                                    [ Completar Nombre Común ]
                                                    [ Completar datos propios ]
                                                                |
                                                                v
                                                    [ Guardar Planta (AT-PL-XXX) ]
```

**Regla de no bloqueo:** La búsqueda en Open Plantbook es enteramente prescindible. Si el usuario no tiene conexión o no desea buscar, ingresa directamente el *Nombre Común* y guarda en menos de 10 segundos como fue estipulado en ATP-005.

---

## 9. Requisitos Funcionales Provisionales (Change Request)

- **CR-FR-001:** El sistema debe permitir la consulta opcional a Open Plantbook para buscar especies botánicas mediante término de búsqueda textual.
- **CR-FR-002:** El sistema debe permitir vincular un ejemplar físico (`Plant`) a una referencia botánica externa (`PlantReference`), admitiendo que múltiples ejemplares compartan la misma referencia.
---

## 9. Requisitos Funcionales Oficiales Incorporados

Los requisitos provisionales fueron formalmente aprobados e incorporados a `FUNCTIONAL_REQUIREMENTS.md` como:
- **FR-046:** Búsqueda opcional en Open Plantbook mediante consulta textual.
- **FR-047:** Visualización y selección de especies devueltas.
- **FR-048:** Creación o reutilización de `PlantReference` por `(provider, external_id)`.
- **FR-049:** Vinculación opcional N:0..1 entre `Plant` y `PlantReference`.
- **FR-050:** Operatividad plena del alta manual sin referencia (`reference_id = null`).
- **FR-051:** Persistencia de snapshot local inmutable en `PlantReference` (*local-first*).
- **FR-052:** Asistencia y autocompletado en alta con edición total por el usuario.
- **FR-053:** Independencia de la imagen de catálogo respecto de la `Photo` principal del ejemplar.
- **FR-054:** Resiliencia y continuidad operativa sin bloqueo ante fallos o cortes de Open Plantbook.
- **FR-055:** Consulta y visualización de cuidados teóricos de la especie en la Ficha Individual.

---

## 10. Historias de Usuario Oficiales Incorporadas

Las user stories del Change Request fueron aprobadas e incorporadas a `USER_STORIES.md` como:
- **US-014:** Búsqueda y Enriquecimiento Botánico Opcional en el Alta.
- **US-015:** Consulta de Cuidados Teóricos de la Especie en la Ficha.

---

## 11. Resoluciones de Integración y Decisiones Pendientes

### PID-001: Momento de Incorporación al Roadmap
- **Estado:** ACCEPTED CON MODIFICACIÓN.
- **Decisión:** La integración básica con Open Plantbook forma parte del alcance oficial del **MVP v0.1** (búsqueda, selección, persistencia de snapshot local y consulta en ficha). Quedan fuera de v0.1 sincronizaciones masivas periódicas, cronjobs y motores de recomendaciones automáticas. (Formalizado en ADR-012).

### PID-002: Imagen de Referencia y Persistencia Local
- **Estado:** PENDING / REQUIRES PROVIDER POLICY VERIFICATION.
- **Decisión para v0.1:** Se almacena exclusivamente el atributo `image_url`. La imagen externa no se convierte en `Photo`. La decisión sobre descargar o persistir permanentemente los archivos binarios de imágenes del proveedor queda pendiente hasta verificar explícitamente los términos de uso y licencias de Open Plantbook. La falta de disponibilidad de `image_url` no degrada ninguna función de la planta física.

### PID-003: Almacenamiento Seguro de Credenciales
- **Estado:** ACCEPTED.
- **Decisión:** `OPEN_PLANTBOOK_CLIENT_ID` y `OPEN_PLANTBOOK_CLIENT_SECRET` se administran exclusivamente mediante variables de entorno del servidor. Toda llamada OAuth2 se realiza desde el backend de Atilio Plants. El `client_secret` jamás se expone al cliente web/móvil. (Formalizado en ADR-013).

---

## 12. Riesgos y Restricciones Técnicas Identificadas

1. **Dependencia de Credenciales:** El usuario debe registrarse previamente en `open.plantbook.io` para obtener claves de API personales.
2. **Latencia Externa:** Toda llamada de búsqueda debe ser asíncrona y con timeout estricto. Si no hay conexión o se produce demora, la UI permite continuar inmediatamente sin referencia.
3. **Consumo de Cuota / Rate Limiting:** Superar el límite de peticiones del proveedor retorna HTTP 429; el patrón de snapshot local persistente mitiga este impacto al consultar la API externa únicamente durante el alta o vinculación explícita.

