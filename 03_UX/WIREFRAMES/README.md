# Wireframes de Baja Fidelidad (Low-Fidelity Wireframes) — Atilio Plants v0.1

Este documento contiene los esquemas estructurales y de jerarquía visual (wireframes en formato texto/ASCII) para las vistas clave del **MVP v0.1** de Atilio Plants.

---

## 1. Dashboard Mobile (SCR-001)

```text
+------------------------------------------+
|  ATILIO PLANTS                   [ ... ] |
+------------------------------------------+
|                                          |
|  RESUMEN DE COLECCIÓN                    |
|  +------------------------------------+  |
|  |  PLANTAS ACTIVAS                   |  |
|  |  13 ejemplares                     |  |
|  +------------------------------------+  |
|                                          |
|  ESTADO GENERAL                          |
|  +------------------+-----------------+  |
|  | [?] Sin evaluar  | [🌿] Saludable  |  |
|  |     2 plantas    |      8 plantas  |  |
|  +------------------+-----------------+  |
|  | [!] Atención     | [🔄] Recuperac. |  |
|  |     2 plantas    |      1 planta   |  |
|  +------------------+-----------------+  |
|                                          |
|  [  Ver Inventario Completo  (13)   ]    |
|                                          |
|  ACCIONES RÁPIDAS                        |
|  +------------------------------------+  |
|  |  [ + ] Registrar nueva planta      |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
| [ Inicio ]     [ Inventario ]   [ + Nueva ]
+------------------------------------------+
```

---

## 2. Inventario Mobile (SCR-002)

```text
+------------------------------------------+
|  INVENTARIO                      [ ... ] |
+------------------------------------------+
| [ Q Buscar por nombre o AT-PL-XXX...   ] |
|                                          |
| FILTROS:                                 |
| (Todos) [?] Sin evaluar [!] Atención ... |
| [ Ubicación: Todas v ] [ Orden: ID asc v]|
|                                          |
| Mostrando 13 plantas activas             |
|                                          |
| +--------------------------------------+ |
| | [ FOTO ]  AT-PL-001      [🌿 Salud.] | |
| |           Monstera deliciosa         | |
| |           Monstera deliciosa         | |
| |           📍 Living                  | |
| +--------------------------------------+ |
|                                          |
| +--------------------------------------+ |
| | [ FOTO ]  AT-PL-002     [!] Atención | |
| |           Ficus elástica             | |
| |           Ficus elastica 'Burgundy'  | |
| |           📍 Escritorio              | |
| +--------------------------------------+ |
|                                          |
| +--------------------------------------+ |
| | [ FOTO ]  AT-PL-003     [?] Sin eval | |
| |           Potus variegado            | |
| |           Epipremnum aureum          | |
| |           📍 Sin ubicación           | |
| +--------------------------------------+ |
|                                          |
+------------------------------------------+
| [ Inicio ]     [ Inventario* ]  [ + Nueva ]
+------------------------------------------+
```

---

## 3. Ficha de Planta Mobile (SCR-003)

```text
+------------------------------------------+
|  < Volver al inventario                  |
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |      [ FOTOGRAFÍA PROPIA ]         |  |
|  |                                    |  |
|  +------------------------------------+  |
|  AT-PL-001            [🌿 Saludable]     |
|                                          |
|  IDENTIDAD                               |
|  Monstera deliciosa                      |
|  Especie: Monstera deliciosa             |
|  Cultivar: 'Borsigiana'                  |
|                                          |
|  UBICACIÓN                               |
|  📍 Living                               |
|                                          |
|  ESTADO Y OBSERVACIONES                  |
|  Estado: Saludable                       |
|  Notas: Brotó hoja nueva con fenestras   |
|         completas la semana pasada.      |
|                                          |
|  CONDICIONES REALES DE CULTIVO           |
|  - Maceta actual: Barro cocido 24cm      |
|  - Sustrato real: Mezcla aireada (turba) |
|  - Luz en sitio:  Luz indirecta ventana  |
|  - Riego real:    Semanal según humedad  |
|                                          |
|  REFERENCIA BOTÁNICA (Open Plantbook)    |
|  +------------------------------------+  |
|  |  [ Foto Catálogo Especie ]         |  |
|  |  Monstera deliciosa Liebm.         |  |
|  |  - Luz teórica: 1500 - 3500 lux    |  |
|  |  - Riego teórico: Med/Wait dry     |  |
|  |  - Humedad amb.: 50% - 80%         |  |
|  +------------------------------------+  |
|                                          |
|  ADMINISTRACIÓN                          |
|  - Incorporación: 12/03/2025             |
|  - Ciclo de vida: Activo                 |
|  - Última modif.: 04/09/2026             |
|                                          |
|  +------------------------------------+  |
|  |   [   Editar información   ]       |  |
|  +------------------------------------+  |
|                                          |
|       [ Archivar este ejemplar ]         |
|                                          |
+------------------------------------------+
```

---

## 4. Alta de Planta Mobile — Formulario Progresivo (SCR-004)

```text
+------------------------------------------+
|  NUEVA PLANTA                 [ Cancelar ]|
+------------------------------------------+
|  ENRIQUECIMIENTO (OPCIONAL)              |
|  [ Q Buscar especie en Open Plantbook...]|
|  [ Continuar sin referencia botánica -> ]|
|                                          |
|  Código: Asignación automática (AT-PL-...)
|                                          |
|  NOMBRE COMÚN * (obligatorio)            |
|  [ Ej. Pothos limón                  ]   |
|                                          |
|  FOTOGRAFÍA PROPIA (opcional)            |
|  +------------------------------------+  |
|  |  [ 📷 Tomar foto de este ejemplar] |  |
|  +------------------------------------+  |
|                                          |
|  ESTADO DE SALUD                         |
|  (*) Sin evaluar   ( ) Saludable         |
|  ( ) Atención      ( ) Recuperación      |
|                                          |
|  UBICACIÓN                               |
|  [ Seleccionar ubicación...         v ]  |
|  [+ Crear nuevo ambiente]                |
|                                          |
|  > CONDICIONES REALES Y CULTIVO (v)      |
|    - Nombre científico: [            ]   |
|    - Cultivar:          [            ]   |
|    - Fecha de ingreso:  [ 07/09/2026 ]   |
|    - Maceta actual:     [            ]   |
|    - Sustrato real:     [            ]   |
|    - Luz en sitio:      [            ]   |
|    - Notas de riego:    [            ]   |
|    - Observaciones:     [            ]   |
|                                          |
|  +------------------------------------+  |
|  |      [  Guardar Planta  ]          |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

---

## 5. Inventario en Desktop (Adaptación SCR-002)

En resoluciones de escritorio, el espacio se distribuye horizontalmente manteniendo idéntico modelo mental:

```text
+----------------------------------------------------------------------------------------------------+
|  ATILIO PLANTS              [ Inicio ]  [ Inventario* ]  [ Ubicaciones ]  [ Archivadas ]   [+ Nueva] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ Q Buscar por nombre común, científico o AT-PL-XXX...                                      ]     |
|                                                                                                    |
|  FILTROS:  Estado: [ Todos v ]   Ubicación: [ Todas v ]   Orden: [ ID permanente ascendente v ]    |
|  Resultados: 13 ejemplares activos                                                                 |
|                                                                                                    |
|  +----------------------+  +----------------------+  +----------------------+  +-----------------+ |
|  | [ FOTO PRINCIPAL ]   |  | [ FOTO PRINCIPAL ]   |  | [ FOTO PRINCIPAL ]   |  | [ FOTO PRINC ]  | |
|  |                      |  |                      |  |                      |  |                 | |
|  | AT-PL-001 [🌿 Salud] |  | AT-PL-002 [! Atenc]  |  | AT-PL-003 [? Sin ev] |  | AT-PL-004 ...   | |
|  | Monstera deliciosa   |  | Ficus elástica       |  | Potus variegado      |  | Sansevieria ... | |
|  | M. deliciosa         |  | Ficus elastica       |  | Epipremnum aureum    |  | Dracaena trif.. | |
|  | 📍 Living            |  | 📍 Escritorio        |  | 📍 Sin ubicación     |  | 📍 Dormitorio   | |
|  +----------------------+  +----------------------+  +----------------------+  +-----------------+ |
|                                                                                                    |
|  +----------------------+  +----------------------+  +----------------------+  +-----------------+ |
|  | AT-PL-005 ...        |  | AT-PL-006 ...        |  | AT-PL-007 ...        |  | AT-PL-008 ...   | |
|  +----------------------+  +----------------------+  +----------------------+  +-----------------+ |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```
