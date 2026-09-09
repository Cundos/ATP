'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sprout,
  Droplets,
  FileText,
  Lock,
  HeartPulse,
} from 'lucide-react';
import {
  Input,
  Select,
  Textarea,
  Button,
  Toast,
  SelectOption,
} from '@/components/ui';
import { PlantEntity, LocationEntity, HealthStatus } from '@/core/domain/entities';
import { createPlantAction, updatePlantAction, PlantActionResult } from '../actions';
import { PlantFormInputSchema } from '../schemas/plant-form.schema';
import styles from './PlantForm.module.css';

export interface PlantFormProps {
  mode: 'create' | 'edit';
  initialData?: PlantEntity;
  activeLocations: LocationEntity[];
}

export function PlantForm({ mode, initialData, activeLocations }: PlantFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form values state
  const [commonName, setCommonName] = useState(initialData?.common_name || '');
  const [scientificName, setScientificName] = useState(initialData?.scientific_name || '');
  const [cultivar, setCultivar] = useState(initialData?.cultivar || '');
  const [healthStatus, setHealthStatus] = useState<HealthStatus>(initialData?.health_status || 'UNKNOWN');
  
  // Format acquisition date to YYYY-MM-DD for date input
  const initialAcquisitionDateStr = initialData?.acquisition_date
    ? new Date(initialData.acquisition_date).toISOString().split('T')[0]
    : '';
  const [acquisitionDate, setAcquisitionDate] = useState(initialAcquisitionDateStr);

  const [locationId, setLocationId] = useState(initialData?.location_id || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Cultivation profile state
  const [potInfo, setPotInfo] = useState(initialData?.profile?.pot_info || '');
  const [substrateInfo, setSubstrateInfo] = useState(initialData?.profile?.substrate_info || '');
  const [lightConditions, setLightConditions] = useState(initialData?.profile?.light_conditions || '');
  const [wateringNotes, setWateringNotes] = useState(initialData?.profile?.watering_notes || '');

  // Validation & feedback state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Health options for Select
  const healthOptions: SelectOption[] = [
    { value: 'UNKNOWN', label: 'Sin evaluar' },
    { value: 'HEALTHY', label: 'Saludable' },
    { value: 'ATTENTION', label: 'Atención' },
    { value: 'RECOVERY', label: 'Recuperación' },
  ];

  // Location options for Select
  const locationOptions: SelectOption[] = [
    { value: '', label: 'Sin ubicación' },
    ...activeLocations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  // If in edit mode and initial location was archived, keep it visible in options
  if (
    mode === 'edit' &&
    initialData?.location &&
    !activeLocations.some((l) => l.id === initialData.location_id)
  ) {
    locationOptions.push({
      value: initialData.location.id,
      label: `${initialData.location.name} (Archivada)`,
    });
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionFeedback(null);
    setErrors({});

    // Client-side validation with Zod
    const rawPayload = {
      common_name: commonName,
      scientific_name: scientificName,
      cultivar: cultivar,
      health_status: healthStatus,
      acquisition_date: acquisitionDate,
      location_id: locationId,
      notes: notes,
      pot_info: potInfo,
      substrate_info: substrateInfo,
      light_conditions: lightConditions,
      watering_notes: wateringNotes,
    };

    const clientValidation = PlantFormInputSchema.safeParse(rawPayload);
    if (!clientValidation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of clientValidation.error.issues) {
        const fieldName = issue.path[0] as string;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setActionFeedback({
        type: 'error',
        message: 'Por favor completá los campos obligatorios requeridos.',
      });
      return;
    }

    const formData = new FormData();
    formData.append('common_name', commonName);
    formData.append('scientific_name', scientificName);
    formData.append('cultivar', cultivar);
    formData.append('health_status', healthStatus);
    formData.append('acquisition_date', acquisitionDate);
    formData.append('location_id', locationId);
    formData.append('notes', notes);
    formData.append('pot_info', potInfo);
    formData.append('substrate_info', substrateInfo);
    formData.append('light_conditions', lightConditions);
    formData.append('watering_notes', wateringNotes);

    startTransition(async () => {
      let result: PlantActionResult;

      if (mode === 'create') {
        result = await createPlantAction(null, formData);
      } else {
        result = await updatePlantAction(initialData!.id, null, formData);
      }

      if (!result.success) {
        if (result.errors) {
          setErrors(result.errors);
        }
        setActionFeedback({
          type: 'error',
          message: result.message || 'Ocurrió un error al guardar.',
        });
      } else {
        setActionFeedback({
          type: 'success',
          message: result.message || 'Operación exitosa',
        });

        // Redirigir a la ficha de la planta tras el guardado
        const targetCode = result.permanent_code || initialData?.permanent_code;
        if (targetCode) {
          setTimeout(() => {
            router.push(`/plants/${targetCode}`);
            router.refresh();
          }, 300);
        }
      }
    });
  };

  const cancelHref =
    mode === 'edit' && initialData
      ? `/plants/${initialData.permanent_code}`
      : '/inventory';

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit} noValidate>
      {actionFeedback && (
        <Toast
          type={actionFeedback.type}
          message={actionFeedback.message}
          onClose={() => setActionFeedback(null)}
        />
      )}

      {/* Identidad / Código Permanente */}
      {mode === 'edit' && initialData && (
        <div className={styles.permanentCodeCard}>
          <div className={styles.codeLabelGroup}>
            <span className={styles.codeLabel}>Código de Ejemplar</span>
            <span className={styles.codeValue}>{initialData.permanent_code}</span>
          </div>
          <span className={styles.immutableBadge}>
            <Lock size={12} />
            Inmutable
          </span>
        </div>
      )}

      {/* Sección 1: Datos Principales */}
      <section className={styles.sectionCard} aria-labelledby="section-main-title">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>
            <Sprout size={20} />
          </span>
          <div>
            <h2 id="section-main-title" className={styles.sectionTitle}>
              Identificación Botánica
            </h2>
            <p className={styles.sectionDescription}>
              Nombre común y clasificación taxonómica de la planta.
            </p>
          </div>
        </div>

        <div className={styles.fieldsGrid}>
          <Input
            id="common_name"
            name="common_name"
            label="Nombre Común"
            placeholder="Ej. Gomero, Monstera, Pothos"
            value={commonName}
            onChange={(e) => {
              setCommonName(e.target.value);
              if (errors.common_name) {
                setErrors((prev) => ({ ...prev, common_name: '' }));
              }
            }}
            error={errors.common_name}
            required
            autoFocus={mode === 'create'}
            disabled={isPending}
          />

          <div className={styles.fieldsGrid2Col}>
            <Input
              id="scientific_name"
              name="scientific_name"
              label="Nombre Científico (Opcional)"
              placeholder="Ej. Ficus elastica"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              error={errors.scientific_name}
              disabled={isPending}
            />

            <Input
              id="cultivar"
              name="cultivar"
              label="Cultivar / Variedad (Opcional)"
              placeholder="Ej. Variegata, Robusta"
              value={cultivar}
              onChange={(e) => setCultivar(e.target.value)}
              error={errors.cultivar}
              disabled={isPending}
            />
          </div>
        </div>
      </section>

      {/* Sección 2: Estado, Ubicación e Incorporación */}
      <section className={styles.sectionCard} aria-labelledby="section-status-title">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>
            <HeartPulse size={20} />
          </span>
          <div>
            <h2 id="section-status-title" className={styles.sectionTitle}>
              Estado y Ubicación
            </h2>
            <p className={styles.sectionDescription}>
              Ubicación física y condición de salud actual.
            </p>
          </div>
        </div>

        <div className={styles.fieldsGrid2Col}>
          <Select
            id="health_status"
            name="health_status"
            label="Estado Sanitario"
            options={healthOptions}
            value={healthStatus}
            onChange={(e) => setHealthStatus(e.target.value as HealthStatus)}
            error={errors.health_status}
            disabled={isPending}
          />

          <Select
            id="location_id"
            name="location_id"
            label="Ubicación Física"
            options={locationOptions}
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              if (errors.location_id) {
                setErrors((prev) => ({ ...prev, location_id: '' }));
              }
            }}
            error={errors.location_id}
            disabled={isPending}
          />
        </div>

        <div className={styles.fieldsGrid}>
          <Input
            id="acquisition_date"
            name="acquisition_date"
            type="date"
            label="Fecha de Adquisición (Opcional)"
            value={acquisitionDate}
            onChange={(e) => setAcquisitionDate(e.target.value)}
            error={errors.acquisition_date}
            helperText="Dejar vacío si la fecha exacta de incorporación es desconocida."
            disabled={isPending}
          />
        </div>
      </section>

      {/* Sección 3: Perfil de Cultivo */}
      <section className={styles.sectionCard} aria-labelledby="section-profile-title">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>
            <Droplets size={20} />
          </span>
          <div>
            <h2 id="section-profile-title" className={styles.sectionTitle}>
              Perfil de Cultivo
            </h2>
            <p className={styles.sectionDescription}>
              Parámetros de maceta, sustrato, luz y pautas de riego.
            </p>
          </div>
        </div>

        <div className={styles.fieldsGrid2Col}>
          <Input
            id="pot_info"
            name="pot_info"
            label="Maceta"
            placeholder="Ej. Terracota N° 18, Plástico 3L"
            value={potInfo}
            onChange={(e) => setPotInfo(e.target.value)}
            error={errors.pot_info}
            disabled={isPending}
          />

          <Input
            id="substrate_info"
            name="substrate_info"
            label="Sustrato"
            placeholder="Ej. Sustrato para aráceas con perlita"
            value={substrateInfo}
            onChange={(e) => setSubstrateInfo(e.target.value)}
            error={errors.substrate_info}
            disabled={isPending}
          />
        </div>

        <div className={styles.fieldsGrid}>
          <Input
            id="light_conditions"
            name="light_conditions"
            label="Condiciones de Luz"
            placeholder="Ej. Luz indirecta brillante, sol suave de mañana"
            value={lightConditions}
            onChange={(e) => setLightConditions(e.target.value)}
            error={errors.light_conditions}
            disabled={isPending}
          />

          <Textarea
            id="watering_notes"
            name="watering_notes"
            label="Notas de Riego"
            placeholder="Ej. Regar cuando los primeros 3cm de sustrato estén secos. Reducir en invierno."
            value={wateringNotes}
            onChange={(e) => setWateringNotes(e.target.value)}
            error={errors.watering_notes}
            disabled={isPending}
          />
        </div>
      </section>

      {/* Sección 4: Observaciones Generales */}
      <section className={styles.sectionCard} aria-labelledby="section-notes-title">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>
            <FileText size={20} />
          </span>
          <div>
            <h2 id="section-notes-title" className={styles.sectionTitle}>
              Observaciones y Bitácora Inicial
            </h2>
            <p className={styles.sectionDescription}>
              Comentarios adicionales, procedencia o notas particulares.
            </p>
          </div>
        </div>

        <div className={styles.fieldsGrid}>
          <Textarea
            id="notes"
            name="notes"
            label="Notas Generales"
            placeholder="Ej. Esqueje regalado por un familiar. Follaje con buen desarrollo."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            error={errors.notes}
            disabled={isPending}
          />
        </div>
      </section>

      {/* Acciones de Envío */}
      <div className={styles.actionsBar}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isPending}
          disabled={isPending}
        >
          {isPending
            ? 'Guardando...'
            : mode === 'create'
            ? 'Registrar Planta'
            : 'Guardar Cambios'}
        </Button>

        <Link href={cancelHref} className={styles.cancelButtonLink}>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            disabled={isPending}
          >
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
