# Requisitos No Funcionales — MVP v0.1

Este documento especifica los atributos de calidad, restricciones operativas y directrices técnicas fundamentales para **Atilio Plants v0.1**.

---

## 1. Experiencia de Usuario y Diseño

- **NFR-001 (Mobile-First):** La interfaz de usuario debe diseñarse e implementarse con prioridad estricta para pantallas táctiles de dispositivos móviles (smartphones de 360px a 430px de ancho de viewport), garantizando targets táctiles adecuados (mínimo 44x44px) y navegación cómoda con una sola mano.
- **NFR-002 (Adaptabilidad Desktop):** El sistema debe adaptarse de forma fluida a pantallas medianas y grandes (tablets, laptops y desktops de hasta 1920px o superiores), transformando listados verticales en grillas de tarjetas multitarea sin desaprovechar el espacio horizontal.

---

## 2. Infraestructura y Despliegue

- **NFR-003 (Ejecución Local-First):** La solución completa debe poder ejecutarse íntegramente en un entorno de red local privada (on-premise o localhost) sin conexión obligatoria a Internet ni dependencia de disponibilidad de servicios externos.
- **NFR-004 (Cero Dependencia Cloud Obligatoria):** Ninguna funcionalidad crítica del MVP v0.1 dependerá de proveedores de backend-as-a-service propietarios o en la nube (Vercel, Supabase Cloud, Firebase, AWS Cognito, etc.).
- **NFR-005 (Portabilidad y Preparación Cloud):** La arquitectura de componentes y acceso a datos debe concebirse de manera modular para permitir que, en etapas futuras, el sistema pueda desplegarse en contenedores cloud o servidores remotos sin requerir rediseñar el modelo de dominio ni la interfaz.

---

## 3. Integridad y Persistencia de Datos

- **NFR-006 (Persistencia Confiable):** Todos los datos de inventario, atributos de ejemplares, catálogo de ubicaciones y metadatos deben persistir de manera confiable en un motor de base de datos relacional local con soporte para transacciones ACID.
- **NFR-007 (Inmutabilidad y Unicidad del Identificador):** El sistema debe garantizar a nivel de esquema e integridad de datos que los identificadores con formato `AT-PL-XXX` sean estrictamente únicos, inmutables y nunca reutilizados, manteniendo la integridad referencial tanto para ejemplares activos como archivados.
- **NFR-008 (Preservación del Dato Real):** La base de datos y la capa de lógica de negocio deben soportar de forma nativa valores `null` / `unknown` para cualquier campo botánico o de cultivo no informado. El sistema nunca debe asumir salud ni inventar atributos faltantes.
- **NFR-009 (Integridad Referencial de Ubicaciones Archivadas):** Cuando una ubicación sea archivada en el catálogo general, el motor de persistencia debe garantizar la preservación del enlace histórico en las plantas previamente vinculadas, restringiendo la regla de archivado exclusivamente a nuevas asignaciones.
- **NFR-010 (Conservación de Archivos Multimedia Reemplazados):** La capa de gestión de archivos en almacenamiento local debe persistir de forma inmutable los binarios de fotografías reemplazadas, asignando nomenclaturas unívocas (ej. con timestamps) para evitar sobreescrituras destructivas a nivel de sistema de archivos.

---

## 4. Rendimiento y Eficiencia

- **NFR-011 (Tiempos de Respuesta Domésticos):** Para una colección doméstica proyectada de entre 10 y 200 ejemplares con sus respectivas imágenes, el tiempo de carga de la vista de inventario y del Dashboard no debe superar los 500 ms en red local cableada o Wi-Fi doméstica.
- **NFR-012 (Optimización y Procesamiento de Imágenes):** Las fotografías capturadas desde smartphones de alta resolución deben optimizarse/comprimirse para su visualización ágil en tarjetas sin saturar el ancho de banda local ni la memoria del navegador.

---

## 5. Mantenibilidad y Desacoplamiento

- **NFR-013 (Independencia de Home Assistant):** El núcleo de la aplicación, su almacenamiento y sus reglas de negocio operarán con total autonomía; la ausencia, reinicio o fallo de una instancia de Home Assistant en la red local no afectará en absoluto el funcionamiento normal de Atilio Plants.
- **NFR-014 (Mantenibilidad y Código Limpio):** La base del proyecto deberá respetar principios de separación de responsabilidades, facilitando la incorporación de nuevas etapas del roadmap (bitácora en Etapa 2, QR en Etapa 3, telemetría en Etapa 4) con mínimo impacto sobre el código existente.
- **NFR-015 (Seguridad y Exposición de Red):** En el contexto de v0.1 local, la aplicación no implementará autenticación de usuarios. Queda formalmente establecido como requisito de seguridad que cualquier futura exposición hacia redes públicas o Internet requerirá la inclusión previa de mecanismos de autenticación, autorización y encriptación TLS/HTTPS.
- **NFR-016 (Resiliencia e Inmutabilidad de Snapshot Local):** La integración con proveedores externos de información botánica debe persistir localmente los datos de especies en `PlantReference`; la caída, indisponibilidad o desaparición del registro en el servidor externo no debe provocar la pérdida, alteración ni degradación de los datos previamente almacenados en Atilio Plants.
- **NFR-017 (Protección de Secretos de Integración):** Las credenciales de acceso al proveedor (`OPEN_PLANTBOOK_CLIENT_ID` y `OPEN_PLANTBOOK_CLIENT_SECRET`) deben administrarse de forma segura en variables de entorno del servidor. El `client_secret` jamás debe exponerse al navegador ni incluirse en bundles de código cliente.
- **NFR-018 (Gestión Asíncrona, Timeouts y Rate Limiting):** Las consultas externas hacia la API de Open Plantbook deben realizarse de forma asíncrona con mecanismos de timeout controlados y manejo adecuado de respuestas de cuota excedida (HTTP 429), asegurando que la interfaz no quede bloqueada ante demoras del proveedor.

