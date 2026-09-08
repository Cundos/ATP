-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'ATTENTION', 'RECOVERY');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateSequence
-- Secuencia nativa para generación atómica de permanent_code (AT-PL-XXX)
CREATE SEQUENCE IF NOT EXISTS plant_code_seq START WITH 1 INCREMENT BY 1;

-- CreateTable locations
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lifecycle_status" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- Partial unique index para Location: evita nombres duplicados (case-insensitive) entre ubicaciones ACTIVE
CREATE UNIQUE INDEX "locations_active_name_key" ON "locations"(LOWER("name")) WHERE "lifecycle_status" = 'ACTIVE';

-- CreateTable plant_references
CREATE TABLE "plant_references" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "scientific_name" TEXT NOT NULL,
    "common_names" JSONB,
    "reference_care" JSONB,
    "image_url" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_data" JSONB NOT NULL,

    CONSTRAINT "plant_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable plants
CREATE TABLE "plants" (
    "id" TEXT NOT NULL,
    "permanent_code" TEXT NOT NULL,
    "common_name" TEXT NOT NULL,
    "scientific_name" TEXT,
    "cultivar" TEXT,
    "health_status" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lifecycle_status" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "acquisition_date" TIMESTAMP(3),
    "notes" TEXT,
    "location_id" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable plant_cultivation_profiles
CREATE TABLE "plant_cultivation_profiles" (
    "id" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "pot_info" TEXT,
    "substrate_info" TEXT,
    "light_conditions" TEXT,
    "watering_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plant_cultivation_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable photos
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "captured_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "plant_references_provider_external_id_key" ON "plant_references"("provider", "external_id");
CREATE UNIQUE INDEX "plants_permanent_code_key" ON "plants"("permanent_code");
CREATE INDEX "plants_location_id_idx" ON "plants"("location_id");
CREATE INDEX "plants_reference_id_idx" ON "plants"("reference_id");
CREATE INDEX "plants_lifecycle_status_idx" ON "plants"("lifecycle_status");
CREATE INDEX "plants_health_status_idx" ON "plants"("health_status");
CREATE UNIQUE INDEX "plant_cultivation_profiles_plant_id_key" ON "plant_cultivation_profiles"("plant_id");
CREATE INDEX "photos_plant_id_idx" ON "photos"("plant_id");
CREATE INDEX "photos_is_primary_idx" ON "photos"("is_primary");

-- Partial unique index para Photo: máximo una foto con is_primary = true por planta
CREATE UNIQUE INDEX "photos_single_primary_per_plant_idx" ON "photos"("plant_id") WHERE "is_primary" = true;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plants" ADD CONSTRAINT "plants_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "plant_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plant_cultivation_profiles" ADD CONSTRAINT "plant_cultivation_profiles_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photos" ADD CONSTRAINT "photos_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;