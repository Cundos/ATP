# Historias de Usuario (User Stories) — MVP v0.1

Este documento especifica las historias de usuario para el alcance del **MVP v0.1** de Atilio Plants.  
Cada historia sigue el formato estándar ágil con criterios de aceptación verificables en sintaxis Gherkin (*Given-When-Then*).

---

## Índice de Historias de Usuario

- [US-001: Visualización del Dashboard](#us-001--visualización-del-dashboard)
- [US-002: Consulta del Inventario Activo y Ordenamiento Predeterminado](#us-002--consulta-del-inventario-activo-y-ordenamiento-predeterminado)
- [US-003: Búsqueda y Filtrado de Ejemplares](#us-003--búsqueda-y-filtrado-de-ejemplares)
- [US-004: Consulta de la Ficha Individual del Ejemplar](#us-004--consulta-de-la-ficha-individual-del-ejemplar)
- [US-005: Alta de un Nuevo Ejemplar](#us-005--alta-de-un-nuevo-ejemplar)
- [US-006: Asignación Automática e Inmutable de ID Permanente](#us-006--asignación-automática-e-inmutable-de-id-permanente)
- [US-007: Edición de Datos de un Ejemplar](#us-007--edición-de-datos-de-un-ejemplar)
- [US-008: Archivado Lógico de un Ejemplar](#us-008--archivado-lógico-de-un-ejemplar)
- [US-009: Consulta de Ejemplares Archivados](#us-009--consulta-de-ejemplares-archivados)
- [US-010: Restauración de un Ejemplar Archivado](#us-010--restauración-de-un-ejemplar-archivado)
- [US-011: Selección y Asignación de Ubicaciones Administrables](#us-011--selección-y-asignación-de-ubicaciones-administrables)
- [US-012: Administración del Catálogo de Ubicaciones](#us-012--administración-del-catálogo-de-ubicaciones)
- [US-013: Carga y Reemplazo de Fotografía Principal con Preservación de Archivo](#us-013--carga-y-reemplazo-de-fotografía-principal-con-preservación-de-archivo)
- [US-014: Búsqueda y Enriquecimiento Botánico Opcional en el Alta](#us-014--búsqueda-y-enriquecimiento-botánico-opcional-en-el-alta)
- [US-015: Consulta de Cuidados Teóricos de la Especie en la Ficha](#us-015--consulta-de-cuidados-teóricos-de-la-especie-en-la-ficha)

---

## US-001 — Visualización del Dashboard

**Como** usuario coleccionista,  
**quiero** ver una pantalla inicial con métricas consolidadas de mi colección,  
**para** tener una perspectiva inmediata del volumen y estado sanitario general de mis plantas.

### Criterios de Aceptación:
- **AC 1.1:**  
  *Given* que existen ejemplares activos en el sistema,  
  *When* ingreso a la pantalla principal (Dashboard),  
  *Then* se muestra el contador total exacto de plantas activas en la colección.
- **AC 1.2:**  
  *Given* que existen ejemplares activos categorizados según su estado de salud (`UNKNOWN`, `HEALTHY`, `ATTENTION`, `RECOVERY`),  
  *When* visualizo el Dashboard,  
  *Then* se muestra la distribución real de cantidades de plantas correspondientes a cada estado, incluyendo explícitamente la cantidad de plantas "Sin evaluar" (`UNKNOWN`).
- **AC 1.3:**  
  *Given* que existen ejemplares archivados en el sistema,  
  *When* se calculan las métricas del Dashboard de plantas activas,  
  *Then* los ejemplares archivados quedan expresamente excluidos de los totales y desgloses sanitarios principales.
- **AC 1.4:**  
  *Given* que estoy en el Dashboard,  
  *When* interactúo con el acceso directo al inventario,  
  *Then* el sistema navega inmediatamente a la vista de inventario.

---

## US-002 — Consulta del Inventario Activo y Ordenamiento Predeterminado

**Como** usuario,  
**quiero** visualizar la lista completa de mis plantas activas en formato de tarjetas ordenadas por defecto por su identificador secuencial,  
**para** recorrer ordenadamente mi colección y acceder al detalle de cada ejemplar.

### Criterios de Aceptación:
- **AC 2.1:**  
  *Given* que accedo a la vista de Inventario sin especificar filtros ni criterios manuales de orden,  
  *When* se renderiza la lista de ejemplares activos,  
  *Then* las plantas se exhiben ordenadas de forma predeterminada por su ID permanente ascendente (`AT-PL-001`, `AT-PL-002`, `AT-PL-003`, ...).
- **AC 2.2:**  
  *Given* que estoy en el Inventario,  
  *When* interactúo con el control de ordenamiento,  
  *Then* el sistema permite alternar el orden como mínimo entre:
    1. ID permanente ascendente (predeterminado).
    2. Incorporaciones más recientes (fecha de incorporación / ID descendente).
    3. Nombre común alfabético (A-Z).
- **AC 2.3:**  
  *Given* que un ejemplar activo se renderiza en una tarjeta,  
  *When* se muestra en el inventario,  
  *Then* presenta visiblemente: fotografía principal (o marcador de posición), identificador permanente (`AT-PL-XXX`), nombre común, nombre científico (si existe), etiqueta de estado de salud (`Sin evaluar`, `Saludable`, `Atención` o `Recuperación`) y nombre de la ubicación asociada (o indicación clara de "Sin ubicación").
- **AC 2.4:**  
  *Given* que accedo desde un dispositivo móvil,  
  *When* observo el inventario,  
  *Then* la disposición se organiza en columna vertical optimizada para pantalla táctil; y al acceder desde desktop, se adapta en grilla responsive aprovechando el ancho de pantalla.
- **AC 2.5:**  
  *Given* que selecciono una tarjeta de planta,  
  *When* hago tap o clic sobre ella,  
  *Then* el sistema navega a la ficha individual detallada de ese ejemplar.

---

## US-003 — Búsqueda y Filtrado de Ejemplares

**Como** usuario con múltiples plantas,  
**quiero** buscar por texto y filtrar por atributos como estado o ubicación,  
**para** encontrar rápidamente un ejemplar específico dentro de la colección.

### Criterios de Aceptación:
- **AC 3.1:**  
  *Given* la lista del inventario activo,  
  *When* escribo un término en el campo de búsqueda (coincidencia con ID `AT-PL-XXX`, nombre común o nombre científico),  
  *Then* la lista se actualiza mostrando únicamente las plantas que coincidan con el término ingresado.
- **AC 3.2:**  
  *Given* la lista del inventario activo,  
  *When* selecciono un filtro por estado de salud (`Sin evaluar`, `Saludable`, `Atención` o `Recuperación`),  
  *Then* el sistema exhibe exclusivamente los ejemplares cuyo estado de salud coincida con la selección.
- **AC 3.3:**  
  *Given* la lista del inventario activo,  
  *When* selecciono un filtro por ubicación específica del catálogo activo (ej. "Living"),  
  *Then* se listan únicamente los ejemplares asociados a dicha ubicación.
- **AC 3.4:**  
  *Given* que combino un término de búsqueda, un filtro de estado y un filtro de ubicación,  
  *When* se aplica el criterio,  
  *Then* el listado responde a la intersección lógica (AND) de todos los filtros aplicados.
- **AC 3.5:**  
  *Given* que ningún ejemplar coincide con los criterios de búsqueda o filtrado,  
  *When* finaliza la evaluación,  
  *Then* se muestra un mensaje informativo claro indicando que no se encontraron coincidencias, ofreciendo una acción para restablecer los filtros.

---

## US-004 — Consulta de la Ficha Individual del Ejemplar

**Como** usuario,  
**quiero** consultar la ficha individual de un ejemplar organizada en secciones claras,  
**para** conocer toda la información relevante de identidad, ubicación, estado, cultivo y metadatos administrativos de la planta.

### Criterios de Aceptación:
- **AC 4.1:**  
  *Given* que selecciono un ejemplar activo o archivado,  
  *When* se abre su ficha individual,  
  *Then* la información se presenta estructurada en las secciones conceptuales: Identidad, Ubicación, Estado, Cultivo y Administración.
- **AC 4.2:**  
  *Given* la sección Identidad,  
  *When* se muestra en pantalla,  
  *Then* exhibe el ID permanente (`AT-PL-XXX`), nombre común, nombre científico, cultivar (si existe) y fotografía principal en tamaño completo.
- **AC 4.3:**  
  *Given* la sección Estado,  
  *When* se visualiza la ficha,  
  *Then* se exhibe el estado sanitario actual (`Sin evaluar`, `Saludable`, `Atención` o `Recuperación`) junto con las observaciones textuales registradas.
- **AC 4.4:**  
  *Given* la sección Cultivo,  
  *When* el usuario no ha ingresado tipo de maceta, composición de sustrato, necesidades de luz o riego,  
  *Then* dichos campos se muestran explícitamente como vacíos o "Desconocido", sin inventar especificaciones.
- **AC 4.5:**  
  *Given* la sección Administración,  
  *When* se consulta la ficha,  
  *Then* se muestran la fecha de incorporación a la colección, el estado en el ciclo de vida del sistema (`Activo` o `Archivado`), la fecha de creación del registro y la fecha de última modificación.

---

## US-005 — Alta de un Nuevo Ejemplar

**Como** usuario,  
**quiero** registrar una nueva planta completando un formulario con requisitos mínimos,  
**para** dar de alta rápidamente un ejemplar sin verme bloqueado si desconozco detalles botánicos o técnicos avanzados.

### Criterios de Aceptación:
- **AC 5.1:**  
  *Given* que accedo al formulario de alta de ejemplar,  
  *When* reviso los campos requeridos,  
  *Then* únicamente el **Nombre Común** es de ingreso estrictamente obligatorio por parte del usuario (el ID se genera automáticamente).
- **AC 5.2:**  
  *Given* el formulario de alta,  
  *When* no selecciono un estado de salud específico al crear la planta,  
  *Then* el sistema asigna por defecto el estado `UNKNOWN` ("Sin evaluar"), sin asumir que la planta está saludable.
- **AC 5.3:**  
  *Given* el formulario de alta,  
  *When* dejo en blanco campos opcionales (nombre científico, cultivar, maceta, sustrato, observaciones, requerimientos),  
  *Then* el sistema permite guardar el registro asignándoles valor nulo (`null`) o desconocido.
- **AC 5.4:**  
  *Given* el campo de ubicación en el formulario de alta,  
  *When* interactúo con él,  
  *Then* sólo permite seleccionar entre las ubicaciones activas del catálogo o dejar el campo vacío ("Sin ubicación"), impidiendo escribir texto libre.
- **AC 5.5:**  
  *Given* que no indico fecha de incorporación explícita,  
  *When* guardo el ejemplar,  
  *Then* el sistema asigna automáticamente la fecha calendario actual como fecha de incorporación y fija el ciclo de vida en `ACTIVE`.

---

## US-006 — Asignación Automática e Inmutable de ID Permanente

**Como** sistema y usuario,  
**quiero** que el identificador permanente `AT-PL-XXX` sea generado de forma automática y secuencial sin intervención manual,  
**para** evitar duplicidades, salteos no controlados o alteración de la identidad física de las plantas.

### Criterios de Aceptación:
- **AC 6.1:**  
  *Given* que se va a crear un nuevo ejemplar,  
  *When* el usuario ingresa al formulario de alta o se procede a guardar,  
  *Then* el campo de identificador no permite edición manual por parte del usuario.
- **AC 6.2:**  
  *Given* que el último ejemplar registrado en la historia del sistema (activo o archivado) es `AT-PL-013`,  
  *When* se genera el siguiente ejemplar,  
  *Then* el sistema calcula y asigna estrictamente el identificador `AT-PL-014`.
- **AC 6.3:**  
  *Given* que existen ejemplares archivados entre los registros históricos (por ejemplo, `AT-PL-005` archivada),  
  *When* se dan de alta nuevas plantas,  
  *Then* el identificador de la planta archivada jamás es reutilizado.
- **AC 6.4:**  
  *Given* que un ejemplar ya fue creado con su ID permanente,  
  *When* se edita cualquier dato del ejemplar,  
  *Then* el ID permanente permanece inmutable y protegido contra cualquier sobreescritura.

---

## US-007 — Edición de Datos de un Ejemplar

**Como** usuario,  
**quiero** actualizar los datos descriptivos, estado sanitario, ubicación y cultivo de un ejemplar,  
**para** mantener reflejados los cambios y evolución de la planta a lo largo del tiempo.

### Criterios de Aceptación:
- **AC 7.1:**  
  *Given* la ficha de un ejemplar activo,  
  *When* ingreso a la acción de "Editar ejemplar",  
  *Then* se habilitan para modificación: nombre común, nombre científico, cultivar, ubicación (desde catálogo activo), estado de salud (`Sin evaluar`, `Saludable`, `Atención`, `Recuperación`), observaciones, maceta, sustrato, requerimientos y fecha de incorporación.
- **AC 7.2:**  
  *Given* el formulario de edición,  
  *When* se presenta la vista de edición,  
  *Then* el campo identificador permanente `AT-PL-XXX` se muestra bloqueado / de sólo lectura, impidiendo su alteración.
- **AC 7.3:**  
  *Given* que modifico la maceta, el sustrato, la ubicación o el nombre de un ejemplar,  
  *When* guardo los cambios,  
  *Then* la información se actualiza, la fecha de última modificación se renueva automáticamente y la identidad permanente (`AT-PL-XXX`) se preserva idéntica.
- **AC 7.4:**  
  *Given* que intento dejar el Nombre Común completamente vacío durante la edición,  
  *When* presiono guardar,  
  *Then* el sistema bloquea el guardado y exige mantener al menos un nombre identificatorio válido.

---

## US-008 — Archivado Lógico de un Ejemplar

**Como** usuario,  
**quiero** archivar un ejemplar que ha fallecido, fue donado o regalado,  
**para** retirar la planta del inventario cotidiano sin perder su historia ni borrar datos del sistema.

### Criterios de Aceptación:
- **AC 8.1:**  
  *Given* un ejemplar en estado activo,  
  *When* el usuario selecciona la acción "Archivar ejemplar" desde su ficha,  
  *Then* el sistema solicita una confirmación explícita advirtiendo que la planta pasará al archivo histórico.
- **AC 8.2:**  
  *Given* que el usuario confirma el archivado,  
  *When* se ejecuta la operación,  
  *Then* el estado de ciclo de vida del ejemplar cambia a `ARCHIVED` (archivado lógico) y ningún registro es eliminado físicamente de la base de datos (`no hard delete`).
- **AC 8.3:**  
  *Given* que un ejemplar fue archivado,  
  *When* se regresa al inventario activo o al Dashboard,  
  *Then* la planta archivada ya no aparece en el listado activo ni suma en los contadores del Dashboard.
- **AC 8.4:**  
  *Given* que un ejemplar fue archivado,  
  *When* se inspecciona su registro,  
  *Then* su identificador `AT-PL-XXX`, fotos, datos taxonómicos, notas y metadatos se conservan íntegros.

---

## US-009 — Consulta de Ejemplares Archivados

**Como** usuario,  
**quiero** acceder a una sección específica de ejemplares archivados,  
**para** consultar el historial, notas y fotografías de plantas que ya no forman parte de la colección activa.

### Criterios de Aceptación:
- **AC 9.1:**  
  *Given* que existen ejemplares archivados,  
  *When* el usuario accede a la vista o filtro explícito de "Plantas Archivadas",  
  *Then* el sistema muestra el listado de todos los ejemplares con ciclo de vida `ARCHIVED`.
- **AC 9.2:**  
  *Given* la vista de ejemplares archivados,  
  *When* selecciono una planta archivada,  
  *Then* se abre su ficha individual completa indicando claramente un distintivo visual de "Ejemplar Archivado".
- **AC 9.3:**  
  *Given* la ficha de un ejemplar archivado,  
  *When* se examinan sus datos,  
  *Then* toda la información histórica permanece disponible para lectura.

---

## US-010 — Restauración de un Ejemplar Archivado

**Como** usuario,  
**quiero** tener la posibilidad de desarchivar/restaurar un ejemplar archivado,  
**para** reintegrarlo al inventario activo en caso de haberlo archivado por error o haber recuperado la planta.

### Criterios de Aceptación:
- **AC 10.1:**  
  *Given* un ejemplar en estado de ciclo de vida `ARCHIVED`,  
  *When* accedo a su ficha y selecciono "Restaurar ejemplar",  
  *Then* el sistema solicita confirmación para devolverlo a la colección activa.
- **AC 10.2:**  
  *Given* que confirmo la restauración,  
  *When* se procesa la acción,  
  *Then* el ciclo de vida del ejemplar vuelve a `ACTIVE` manteniendo inalterado su identificador `AT-PL-XXX` original y la totalidad de sus datos previos.
- **AC 10.3:**  
  *Given* que un ejemplar fue restaurado a `ACTIVE`,  
  *When* ingreso al inventario general o al Dashboard,  
  *Then* el ejemplar vuelve a figurar en el inventario activo y se contabiliza en las métricas del Dashboard.

---

## US-011 — Selección y Asignación de Ubicaciones Administrables

**Como** usuario,  
**quiero** asociar mi planta a una ubicación seleccionada estrictamente desde el catálogo de ubicaciones activas,  
**para** clasificar mis plantas por ambientes hogareños sin inconsistencias de texto libre.

### Criterios de Aceptación:
- **AC 11.1:**  
  *Given* el formulario de alta o edición de un ejemplar,  
  *When* interactúo con el selector de ubicación,  
  *Then* se presentan para selección exclusivamente las ubicaciones activas del catálogo (no archivadas) y una opción para "Sin ubicación" (`null`).
- **AC 11.2:**  
  *Given* el selector de ubicación en el formulario de planta,  
  *When* intento ingresar un valor de ubicación,  
  *Then* el sistema restringe el ingreso a la selección del catálogo, impidiendo la creación o tipeo de texto libre dentro de dicho selector.
- **AC 11.3:**  
  *Given* que una ubicación asignada a una planta es renombrada en el catálogo general,  
  *When* se consulta la ficha o tarjeta de dicha planta,  
  *Then* se visualiza el nombre actualizado de la ubicación.
- **AC 11.4:**  
  *Given* que una ubicación es archivada en el catálogo general,  
  *When* se consulta un ejemplar que ya tenía asignada históricamente esa ubicación,  
  *Then* la planta conserva dicha ubicación visible en su tarjeta y ficha, pero dicha ubicación archivada no se ofrece como opción para nuevas asignaciones ni altas.

---

## US-012 — Administración del Catálogo de Ubicaciones

**Como** usuario,  
**quiero** disponer de una interfaz simple y dedicada (pantalla o modal) para administrar mis ubicaciones,  
**para** crear nuevos ambientes del hogar, corregir sus nombres y archivar los que ya no use.

### Criterios de Aceptación:
- **AC 12.1:**  
  *Given* la interfaz dedicada de administración de ubicaciones,  
  *When* ingreso a ella,  
  *Then* puedo consultar la lista completa de ubicaciones activas existentes.
- **AC 12.2:**  
  *Given* la interfaz de administración de ubicaciones,  
  *When* ingreso un nuevo nombre (ej. "Balcón") y confirmo,  
  *Then* la nueva ubicación se registra en el catálogo activo y queda disponible inmediatamente en los selectores de plantas.
- **AC 12.3:**  
  *Given* una ubicación existente en el catálogo,  
  *When* edito su nombre y guardo los cambios,  
  *Then* el nombre se actualiza en el catálogo y en todas las plantas asociadas a ella.
- **AC 12.4:**  
  *Given* una ubicación activa en el catálogo,  
  *When* selecciono la acción de archivarla,  
  *Then* la ubicación pasa a estado archivado, dejando de estar disponible para futuras asignaciones pero preservándose en las plantas que ya la tenían.

---

## US-013 — Carga y Reemplazo de Fotografía Principal con Preservación de Archivo

**Como** usuario,  
**quiero** adjuntar una imagen fotográfica principal a cada ejemplar y actualizarla cuando lo desee,  
**para** mantener al día el aspecto visible de la planta sin destruir los archivos de fotos anteriores.

### Criterios de Aceptación:
- **AC 13.1:**  
  *Given* el formulario de alta o edición de un ejemplar,  
  *When* el usuario selecciona un archivo de imagen válido desde su dispositivo local,  
  *Then* la imagen se carga y se asigna como fotografía principal visible del ejemplar.
- **AC 13.2:**  
  *Given* un ejemplar que ya cuenta con una fotografía principal,  
  *When* el usuario carga una nueva imagen en modo de edición,  
  *Then* la nueva imagen pasa a ser la fotografía principal visible en tarjeta y ficha, y el archivo físico de la fotografía anterior no se destruye ni se borra del almacenamiento local, quedando preservado en disco para soporte futuro de la bitácora fotográfica.
- **AC 13.3:**  
  *Given* la interfaz de v0.1,  
  *When* el usuario visualiza la ficha de una planta con foto reemplazada,  
  *Then* se exhibe únicamente la fotografía principal actual (v0.1 no expone todavía la galería histórica en UI).
- **AC 13.4:**  
  *Given* que un ejemplar no posee imagen cargada,  
  *When* se visualiza en el inventario o en la ficha,  
  *Then* el sistema renderiza un marcador visual neutro (*placeholder*) sin provocar errores.

---

## US-014 — Búsqueda y Enriquecimiento Botánico Opcional en el Alta

**Como** usuario coleccionista,  
**quiero** buscar la especie de mi planta en Open Plantbook durante el alta para autocompletar su clasificación botánica y registrar su referencia,  
**para** ahorrar tiempo de tipeo y disponer de conocimiento botánico general sin perder agilidad si decido no usar la integración.

### Criterios de Aceptación:
- **AC 14.1:**  
  *Given* el formulario de alta de una planta con conectividad a Internet,  
  *When* ingreso un término de búsqueda botánica (ej. "Monstera deliciosa") y ejecuto la búsqueda,  
  *Then* el sistema consulta la API de Open Plantbook y presenta una lista de resultados con nombre científico y nombres comunes disponibles.
- **AC 14.2:**  
  *Given* una lista de resultados de Open Plantbook,  
  *When* selecciono una especie,  
  *Then* el sistema precompleta en el formulario el `scientific_name` y sugiere el `common_name`, permitiéndome editar el nombre común de mi ejemplar antes de guardar.
- **AC 14.3:**  
  *Given* que selecciono una especie externa y guardo la planta,  
  *When* se confirma la creación,  
  *Then* el sistema persiste localmente un snapshot inmutable en `PlantReference` (con `provider = 'OPEN_PLANTBOOK'`, `external_id`, nombres, cuidados teóricos y `raw_data`) y vincula el ejemplar a dicha referencia (`Plant.reference_id`).
- **AC 14.4:**  
  *Given* que ya existe en la base de datos local una `PlantReference` para la misma especie y proveedor,  
  *When* creo un segundo ejemplar de esa misma especie,  
  *Then* el sistema reutiliza la referencia existente sin duplicar registros innecesariamente.
- **AC 14.5:**  
  *Given* que no cuento con conexión a Internet, el proveedor responde con error (timeout, HTTP 429, 5xx) o decido no buscar,  
  *When* interactúo con el formulario de alta,  
  *Then* el sistema ofrece la opción inmediata de *"Continuar sin referencia"*, permitiéndome completar manualmente el nombre común y guardar la planta en menos de 10 segundos sin errores bloqueantes.
- **AC 14.6:**  
  *Given* que Open Plantbook provee una imagen en `image_url`,  
  *When* se crea la planta con dicha referencia,  
  *Then* la imagen externa **no** se convierte automáticamente en la `Photo` principal del ejemplar.

---

## US-015 — Consulta de Cuidados Teóricos de la Especie en la Ficha

**Como** usuario,  
**quiero** visualizar en la ficha de mi planta los datos y cuidados teóricos provistos por la referencia externa,  
**para** consultar las recomendaciones botánicas de la especie junto con las condiciones reales de cultivo de mi ejemplar.

### Criterios de Aceptación:
- **AC 15.1:**  
  *Given* un ejemplar vinculado a una `PlantReference`,  
  *When* abro su ficha individual (SCR-003),  
  *Then* la información se presenta con una distinción semántica y visual clara entre:
    - *Condiciones de Cultivo del Ejemplar* (maceta actual, sustrato real, notas propias).
    - *Referencia Botánica de la Especie* (rangos teóricos de luz, temperatura, humedad y cuidados generales según Open Plantbook).
- **AC 15.2:**  
  *Given* una planta que no posee referencia botánica vinculada (`reference_id = null`),  
  *When* consulto su ficha individual,  
  *Then* la sección de referencia botánica no se muestra o indica amigablemente que no posee ficha botánica enlazada, funcionando normalmente la consulta del resto de los datos.
- **AC 15.3:**  
  *Given* un dispositivo sin conexión a Internet,  
  *When* abro la ficha de una planta con referencia botánica previamente asociada,  
  *Then* los datos de la especie se visualizan instantáneamente gracias al snapshot persistido localmente en `PlantReference`.

