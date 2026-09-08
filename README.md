# Atilio Plants

Sistema de gestión botánica doméstica de interior con enfoque local-first, trazabilidad física de ejemplares y asistencia externa de conocimiento taxonómico.

---

## 🚀 Infraestructura Local (Docker Compose)

El proyecto utiliza **Docker Compose** para orquestar de forma reproducible el entorno local:
- **postgres:** Motor de base de datos relacional (postgres:16-alpine), enlazado a loopback local (127.0.0.1:5432) y con persistencia en el volumen Docker postgres_data.
- **pp:** Contenedor de la aplicación Next.js (Node.js 24 LTS, multi-stage build), montando el volumen de almacenamiento ./storage:/app/storage.

### 1. Configuración de Entorno

Copiar la plantilla de variables de entorno:

\\\ash
copy .env.example .env
\\\

### 2. Iniciar Servicios

Iniciar la base de datos PostgreSQL y la aplicación en segundo plano:

\\\ash
docker compose up -d
\\\

### 3. Verificar Estado y Healthcheck

Verificar que los servicios se encuentren activos y que PostgreSQL reporte estado saludable (*healthy*):

\\\ash
docker compose ps
\\\

### 4. Detener Servicios

Para detener los contenedores preservando todos los datos del volumen persistente:

\\\ash
docker compose down
\\\

> ⚠️ **Nota:** No utilizar \docker compose down -v\ salvo que se desee purgar voluntariamente todos los datos persistidos en el volumen local.
