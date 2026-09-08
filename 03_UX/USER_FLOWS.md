# Flujos de Usuario (User Flows) — Atilio Plants v0.1

Este documento especifica los recorridos de navegación interactivos clave para **Atilio Plants v0.1 (MVP)**, describiendo puntos de entrada, pasos del usuario, respuestas del sistema, caminos alternativos y gestión de errores.

---

## Índice de Flujos

- [FLOW-001: Consultar la Colección General](#flow-001--consultar-la-colección-general)
- [FLOW-002: Buscar un Ejemplar por Texto](#flow-002--buscar-un-ejemplar-por-texto)
- [FLOW-003: Filtrar Inventario por Estado de Salud o Ubicación](#flow-003--filtrar-inventario-por-estado-de-salud-o-ubicación)
- [FLOW-004: Abrir y Consultar la Ficha Individual](#flow-004--abrir-y-consultar-la-ficha-individual)
- [FLOW-005: Alta Rápida de un Nuevo Ejemplar](#flow-005--alta-rápida-de-un-nuevo-ejemplar)
- [FLOW-006: Editar Información de un Ejemplar](#flow-006--editar-información-de-un-ejemplar)
- [FLOW-007: Archivar un Ejemplar](#flow-007--archivar-un-ejemplar)
- [FLOW-008: Consultar Ejemplares Archivados](#flow-008--consultar-ejemplares-archivados)
- [FLOW-009: Restaurar un Ejemplar Archivado](#flow-009--restaurar-un-ejemplar-archivado)
- [FLOW-010: Administrar Catálogo de Ubicaciones](#flow-010--administrar-catálogo-de-ubicaciones)
- [FLOW-011: Reemplazar Fotografía Principal](#flow-011--reemplazar-fotografía-principal)

---

## FLOW-001 — Consultar la Colección General

- **Trazabilidad:** FR-001, FR-004, FR-006, FR-007, FR-008 | US-001, US-002
- **Punto de entrada:** Apertura de la aplicación en el smartphone o navegador web.
- **Paso a paso:**
  1. El usuario abre la app y aterriza en el **Dashboard** (SCR-001).
  2. Visualiza el total de plantas activas y la distribución por estados de salud (`Sin evaluar`, `Saludable`, `Atención`, `Recuperación`).
  3. Hace tap en *"Ver Inventario"* o pulsa la pestaña *"Inventario"* en la barra inferior.
  4. El sistema presenta la vista de **Inventario Activo** (SCR-002), mostrando las plantas en tarjetas ordenadas de forma predeterminada por su código permanente ascendente (`AT-PL-001`, `AT-PL-002`, ...).
  5. El usuario hace scroll vertical explorando su colección.
- **Resultado esperado:** Conocimiento claro del estado general de la colección en menos de 5 segundos.
- **Caminos alternativos:** Si pulsa directamente sobre una métrica sanitaria en el Dashboard (ej. *"Atención: 2"*), el sistema navega directo a SCR-002 con dicho filtro aplicado.

---

## FLOW-002 — Buscar un Ejemplar por Texto

- **Trazabilidad:** FR-010, FR-012 | US-003
- **Punto de entrada:** Vista de Inventario Activo (SCR-002).
- **Paso a paso:**
  1. El usuario toca el campo de búsqueda superior (*"Buscar por nombre o AT-PL-..."*).
  2. Escribe una parte del nombre común (ej. *"Monstera"*), nombre científico o código (ej. *"005"*).
  3. El sistema filtra las tarjetas mostradas en tiempo real (o tras 300 ms de pausa al tipear).
  4. La lista exhibe exclusivamente las coincidencias encontradas.
- **Resultado esperado:** Localización inmediata del ejemplar deseado.
- **Manejo de excepciones:** Si no existen coincidencias, el sistema muestra el empty state con el mensaje *"No se encontraron plantas"* y el botón *"Limpiar búsqueda"*.

---

## FLOW-003 — Filtrar Inventario por Estado de Salud o Ubicación

- **Trazabilidad:** FR-011, FR-013, FR-014, FR-015 | US-003
- **Punto de entrada:** Vista de Inventario Activo (SCR-002).
- **Paso a paso:**
  1. El usuario interactúa con la barra de filtros rápidos:
     - Toca el chip de estado: ej. *"Atención"*.
     - O selecciona en el menú desplegable de ubicación: ej. *"Living"*.
  2. El sistema recalcula la lista mostrando únicamente los ejemplares activos que satisfacen ambos criterios en simultáneo.
  3. El usuario puede además modificar el orden con el selector de ordenamiento (ej. *"Más recientes"* o *"Nombre A-Z"*).
- **Resultado esperado:** Aislamiento rápido de plantas que requieren cuidado o que comparten un mismo espacio físico.

---

## FLOW-004 — Abrir y Consultar la Ficha Individual

- **Trazabilidad:** FR-009, FR-015, FR-016, FR-017, FR-049, FR-055 | US-002, US-004, US-015
- **Punto de entrada:** Tarjeta de planta en SCR-002 (o SCR-006).
- **Paso a paso:**
  1. El usuario hace tap sobre la tarjeta de un ejemplar (ej. `AT-PL-003 - Ficus elástica`).
  2. El sistema abre la **Ficha Individual** (SCR-003).
  3. La pantalla muestra en alta jerarquía la fotografía principal propia y el código inmutable `AT-PL-003`.
  4. El usuario recorre las secciones del ejemplar: *Identidad*, *Ubicación*, *Estado y Notas*, *Condiciones Reales de Cultivo* (maceta actual, sustrato real, luz, riego) y *Administración*.
  5. Si el ejemplar posee una referencia botánica asociada (`PlantReference`), se visualiza la sección destacada *"Referencia botánica (Open Plantbook)"* con los cuidados y umbrales teóricos de la especie y la foto de catálogo sin conexión a Internet requerida (gracias al snapshot local).
  6. Los campos no cargados se presentan limpiamente como *"Sin especificar"*, sin provocar ruido visual.
- **Resultado esperado:** Consulta exhaustiva y cómoda de la historia, necesidades reales y estándar botánico del ser vivo.

---

## FLOW-005 — Alta de un Nuevo Ejemplar (con Enriquecimiento Opcional)

- **Trazabilidad:** FR-018 a FR-026, FR-038, FR-046 a FR-054 | US-005, US-006, US-014
- **Punto de entrada:** Botón central `[+ Nueva]` en la barra inferior o botón en Dashboard / Inventario.
- **Paso a paso:**
  1. El usuario accede a la pantalla de **Alta de Ejemplar** (SCR-004).
  2. **Paso Opcional de Búsqueda:** El usuario puede tipear la especie (ej. *"Epipremnum aureum"*) en el buscador botánico superior:
     - *Caso Conexión y Resultados:* El sistema consulta Open Plantbook y lista resultados. Al tocar uno, se asocia la `PlantReference`, se precompleta el nombre científico y se sugiere el nombre común.
     - *Caso Sin Conexión / Error / Omisión:* El usuario pulsa *"Continuar sin referencia"* (o ignora la búsqueda) y avanza directamente al alta manual sin demoras ni bloqueos.
  3. El sistema exhibe el aviso informativo: *"Código asignado automáticamente: AT-PL-XXX"*.
  4. El usuario escribe o confirma el **Nombre Común** (único dato obligatorio a su cargo, ej. *"Potus limón"*).
  5. (Opcional) Hace tap en *"Cargar foto"* y selecciona una imagen real desde la cámara o galería local.
  6. (Opcional) Elige una ubicación del selector desplegable.
  7. El estado sanitario ya se encuentra fijado por defecto en **"Sin evaluar"** (`UNKNOWN`), pudiendo modificarlo si lo desea.
  8. (Opcional) Despliega el acordeón *"Más detalles"* para agregar o ajustar cultivar, maceta actual, sustrato o notas de riego.
  9. Pulsa el botón primario **"Guardar planta"**.
  10. El sistema valida el nombre, genera el código permanente secuencial global (`AT-PL-XXX`), persiste el registro (y el snapshot de referencia si se seleccionó) y almacena la fotografía en disco.
  11. Se muestra notificación toast (*"Planta creada exitosamente"*) y redirige inmediatamente a la Ficha Individual del nuevo ejemplar (**SCR-003**, según **PUD-002**).
- **Gestión de error:** Si el usuario intenta guardar con el campo *Nombre Común* en blanco, el sistema detiene el envío, destaca el campo con mensaje de error accesible (*"Por favor, ingresá un nombre común para identificar la planta"*) y enfoca el input. Si la API externa falla, un mensaje sutil advierte *"No se pudo conectar con Open Plantbook. Podés continuar manualmente"* sin interrumpir la creación.

---

## FLOW-006 — Editar Información de un Ejemplar

- **Trazabilidad:** FR-025, FR-026, FR-027, FR-028 | US-007
- **Punto de entrada:** Botón *"Editar"* en la Ficha Individual (SCR-003).
- **Paso a paso:**
  1. El usuario visualiza el formulario de **Edición** (SCR-005) precompletado con los datos actuales.
  2. El campo `permanent_code` se muestra bloqueado como sólo lectura.
  3. El usuario modifica atributos (ej. cambia la maceta, actualiza las observaciones o reasigna de "Living" a "Atelier").
  4. Pulsa **"Guardar cambios"**.
  5. El sistema actualiza el registro, renueva el timestamp `updated_at` y redirige a la ficha con los cambios reflejados.

---

## FLOW-007 — Archivar un Ejemplar

- **Trazabilidad:** FR-029, FR-030, FR-031 | US-008
- **Punto de entrada:** Pie de la Ficha Individual (SCR-003).
- **Paso a paso:**
  1. El usuario pulsa la acción secundaria *"Archivar planta"*.
  2. Aparece un diálogo modal de confirmación con lenguaje constructivo:  
     `"¿Archivar este ejemplar? Saldrá del inventario activo pero todo su historial, notas y fotografías se conservarán en el archivo. Podrás consultarlo o restaurarlo en cualquier momento."`
  3. El usuario confirma pulsando *"Archivar"*.
  4. El sistema actualiza `lifecycle_status = 'ARCHIVED'`.
  5. Muestra notificación toast (*"Planta archivada correctamente"*) y regresa al Inventario Activo (SCR-002), donde el ejemplar ya no figura en la lista activa ni suma en el Dashboard.

---

## FLOW-008 — Consultar Ejemplares Archivados

- **Trazabilidad:** FR-032, FR-034 | US-009
- **Punto de entrada:** Menú de opciones secundarias en cabecera del Dashboard o Inventario.
- **Paso a paso:**
  1. El usuario selecciona la opción *"Plantas Archivadas"*.
  2. Se abre la pantalla **SCR-006**, listando las plantas históricas en baja lógica con estilo visual atenuado.
  3. El usuario puede buscar entre ellas por nombre o código permanente.
  4. Al pulsar sobre una tarjeta, se abre la ficha completa del ejemplar archivado en modo lectura.

---

## FLOW-009 — Restaurar un Ejemplar Archivado

- **Trazabilidad:** FR-033, FR-035 | US-010
- **Punto de entrada:** Ficha de un ejemplar archivado en SCR-006.
- **Paso a paso:**
  1. El usuario pulsa el botón *"Restaurar a la colección activa"*.
  2. El sistema solicita confirmación mediante diálogo modal.
  3. El usuario confirma.
  4. El sistema actualiza `lifecycle_status = 'ACTIVE'`, manteniendo exactamente el mismo código `AT-PL-XXX` y todos sus datos históricos.
  5. Notificación toast (*"Planta reintegrada a la colección activa"*) y redirección al inventario activo.

---

## FLOW-010 — Administrar Catálogo de Ubicaciones

- **Trazabilidad:** FR-037 a FR-041 | US-011, US-012
- **Punto de entrada:** Opción *"Gestionar Ubicaciones"* desde el menú secundario o enlace *"+ Nueva ubicación"* en el selector del formulario de planta.
- **Paso a paso:**
  1. Se abre el diálogo/sheet modal de **Administración de Ubicaciones** (SCR-007).
  2. **Crear:** El usuario escribe el nombre (ej. *"Balcón"*) en el input y pulsa *"Agregar"*. La ubicación queda activa de inmediato.
  3. **Renombrar:** Pulsa el icono de editar sobre *"Escritorio"*, cambia el nombre a *"Oficina"* y confirma. El cambio se propaga automáticamente a las plantas que la tienen asignada.
  4. **Archivar:** Pulsa el icono de archivar sobre un ambiente en desuso. Si tiene plantas vinculadas, el sistema advierte que las plantas conservarán el registro pero no se ofrecerá para futuras altas.
  5. El usuario cierra el modal y continúa su flujo habitual.

---

## FLOW-011 — Reemplazar Fotografía Principal

- **Trazabilidad:** FR-039, FR-043, FR-044 | US-013
- **Punto de entrada:** Pantalla de Edición de Planta (SCR-005).
- **Paso a paso:**
  1. El usuario pulsa *"Cambiar fotografía"* sobre la imagen actual.
  2. Selecciona un archivo de imagen desde su dispositivo.
  3. La interfaz muestra la previsualización de la nueva imagen y una nota aclaratoria: *"La imagen anterior se conservará en tu archivo"*.
  4. Pulsa *"Guardar cambios"*.
  5. El sistema almacena la nueva imagen en `photos/{permanent_code}/<uuid>.<ext>`, actualiza `Photo.is_primary` y preserva intacto el binario de la imagen anterior en disco.
  6. Redirige a SCR-003 exhibiendo la nueva foto principal.
