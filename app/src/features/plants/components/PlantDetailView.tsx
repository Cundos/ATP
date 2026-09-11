'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  Edit,
  Archive,
  Droplets,
  Sun,
  Layers,
  Box,
  AlertTriangle,
  Info,
  Tag,
} from 'lucide-react';
import { PlantEntity } from '@/core/domain/entities';
import { HealthBadge, Button, Modal, Toast } from '@/components/ui';
import { archivePlantAction } from '../actions';
import { PlantThumbnail } from './PlantThumbnail';
import { BotanicalReferenceSection } from './BotanicalReferenceSection';
import styles from './PlantDetailView.module.css';

export interface PlantDetailViewProps {
  plant: PlantEntity;
}

export const PlantDetailView: React.FC<PlantDetailViewProps> = ({ plant }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error'; message: string } | null>(null);

  // Formateo de fecha de adquisición
  const formattedAcquisitionDate = plant.acquisition_date
    ? new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(plant.acquisition_date))
    : 'No declarada';

  // Ubicación actual o histórica
  const locationName = plant.location?.name ?? 'Sin ubicación';
  const isLocationArchived = plant.location?.lifecycle_status === 'ARCHIVED';

  // Perfil de cultivo
  const profile = plant.profile;
  const hasProfileData = Boolean(
    profile &&
      (profile.pot_info ||
        profile.substrate_info ||
        profile.light_conditions ||
        profile.watering_notes)
  );

  const handleConfirmArchive = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await archivePlantAction(plant.id);
      if (result.success) {
        setIsArchiveModalOpen(false);
        router.push('/plants/archived');
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: result.message || 'Error al archivar el ejemplar.',
        });
      }
    });
  };

  return (
    <article className={styles.container} aria-label={`Ficha de ${plant.common_name}`}>
      {feedback && (
        <Toast
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Navegación Superior */}
      <nav aria-label="Navegación secundaria">
        <Link href="/inventory" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Volver al Inventario</span>
        </Link>
      </nav>

      {/* Cabecera / Hero */}
      <header className={styles.headerCard}>
        <div className={styles.photoBannerWrapper}>
          <PlantThumbnail
            photoPath={plant.photos?.find((p) => p.is_primary)?.file_path || plant.photos?.[0]?.file_path}
            plantName={plant.common_name}
            size="lg"
            className={styles.heroThumbnail}
          />
        </div>

        <div className={styles.headerTop}>
          <span className={styles.permanentCodeBadge}>
            <Tag size={14} aria-hidden="true" />
            <span>{plant.permanent_code}</span>
          </span>
          <HealthBadge status={plant.health_status} size="md" />
        </div>

        <h1 className={styles.commonName}>{plant.common_name}</h1>

        {plant.scientific_name && (
          <p className={styles.scientificName}>{plant.scientific_name}</p>
        )}

        {plant.cultivar && (
          <p className={styles.cultivarBadge}>
            <span className={styles.cultivarLabel}>Cultivar:</span> {plant.cultivar}
          </p>
        )}
      </header>

      {/* Barra de Acciones Principales */}
      <section className={styles.actionsBar} aria-label="Acciones sobre el ejemplar">
        <Link href={`/plants/${plant.permanent_code}/edit`} className={styles.actionBtnLink}>
          <Button variant="secondary" fullWidth leftIcon={<Edit size={16} />}>
            Editar
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={() => setIsArchiveModalOpen(true)}
          leftIcon={<Archive size={16} />}
          className={styles.archiveBtn}
          aria-label={`Archivar ejemplar ${plant.permanent_code}`}
        >
          Archivar
        </Button>
      </section>

      {/* Sección: Taxonomía y Datos de Adquisición */}
      <section className={styles.sectionCard} aria-labelledby="section-taxonomy-title">
        <h2 id="section-taxonomy-title" className={styles.sectionTitle}>
          <Info size={18} aria-hidden="true" />
          <span>Información General</span>
        </h2>
        <dl className={styles.dataList}>
          <div className={styles.dataRow}>
            <dt className={styles.dataTerm}>Nombre Científico</dt>
            <dd className={styles.dataValue}>
              {plant.scientific_name ? (
                <em>{plant.scientific_name}</em>
              ) : (
                <span className={styles.emptyText}>No registrado</span>
              )}
            </dd>
          </div>

          <div className={styles.dataRow}>
            <dt className={styles.dataTerm}>Cultivar / Variedad</dt>
            <dd className={styles.dataValue}>
              {plant.cultivar || <span className={styles.emptyText}>No declarado</span>}
            </dd>
          </div>

          <div className={styles.dataRow}>
            <dt className={styles.dataTerm}>
              <span className={styles.termWithIcon}>
                <Calendar size={14} aria-hidden="true" /> Fecha de Adquisición
              </span>
            </dt>
            <dd className={styles.dataValue}>{formattedAcquisitionDate}</dd>
          </div>
        </dl>
      </section>

      {/* Sección: Ubicación Física */}
      <section className={styles.sectionCard} aria-labelledby="section-location-title">
        <h2 id="section-location-title" className={styles.sectionTitle}>
          <MapPin size={18} aria-hidden="true" />
          <span>Ubicación Física</span>
        </h2>
        <div className={styles.locationContainer}>
          <p className={plant.location ? styles.locationName : styles.emptyLocation}>
            {locationName}
          </p>
          {isLocationArchived && (
            <span className={styles.archivedLocationNote}>
              (Ubicación archivada en el catálogo)
            </span>
          )}
        </div>
      </section>

      {/* Sección: Perfil de Cultivo */}
      <section className={styles.sectionCard} aria-labelledby="section-profile-title">
        <h2 id="section-profile-title" className={styles.sectionTitle}>
          <Droplets size={18} aria-hidden="true" />
          <span>Perfil de Cultivo</span>
        </h2>
        {hasProfileData && profile ? (
          <dl className={styles.dataList}>
            {profile.pot_info && (
              <div className={styles.dataRow}>
                <dt className={styles.dataTerm}>
                  <span className={styles.termWithIcon}>
                    <Box size={14} aria-hidden="true" /> Maceta / Recipiente
                  </span>
                </dt>
                <dd className={styles.dataValue}>{profile.pot_info}</dd>
              </div>
            )}
            {profile.substrate_info && (
              <div className={styles.dataRow}>
                <dt className={styles.dataTerm}>
                  <span className={styles.termWithIcon}>
                    <Layers size={14} aria-hidden="true" /> Sustrato
                  </span>
                </dt>
                <dd className={styles.dataValue}>{profile.substrate_info}</dd>
              </div>
            )}
            {profile.light_conditions && (
              <div className={styles.dataRow}>
                <dt className={styles.dataTerm}>
                  <span className={styles.termWithIcon}>
                    <Sun size={14} aria-hidden="true" /> Condiciones Lumínicas
                  </span>
                </dt>
                <dd className={styles.dataValue}>{profile.light_conditions}</dd>
              </div>
            )}
            {profile.watering_notes && (
              <div className={styles.dataRow}>
                <dt className={styles.dataTerm}>
                  <span className={styles.termWithIcon}>
                    <Droplets size={14} aria-hidden="true" /> Pautas de Riego
                  </span>
                </dt>
                <dd className={styles.dataValue}>{profile.watering_notes}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className={styles.emptyText}>Sin datos de cultivo</p>
        )}
      </section>

      {/* Sección: Conocimiento Botánico de Referencia (ATP-IMP-025) */}
      {plant.reference && (
        <BotanicalReferenceSection reference={plant.reference} />
      )}

      {/* Sección: Observaciones y Notas */}
      {plant.notes && (
        <section className={styles.sectionCard} aria-labelledby="section-notes-title">
          <h2 id="section-notes-title" className={styles.sectionTitle}>
            <FileText size={18} aria-hidden="true" />
            <span>Observaciones y Notas</span>
          </h2>
          <p className={styles.notesText}>{plant.notes}</p>
        </section>
      )}

      {/* Modal Accesible de Confirmación de Archivo */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="¿Archivar este ejemplar?"
        description={`El ejemplar ${plant.permanent_code} (${plant.common_name}) pasará a la lista de plantas archivadas.`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsArchiveModalOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmArchive}
              isLoading={isPending}
              disabled={isPending}
            >
              {isPending ? 'Archivando...' : 'Confirmar Archivo'}
            </Button>
          </>
        }
      >
        <div className={styles.modalNotice}>
          <AlertTriangle size={20} className={styles.modalNoticeIcon} aria-hidden="true" />
          <p className={styles.modalNoticeText}>
            El código permanente <strong>{plant.permanent_code}</strong> e historial se preservarán íntegramente. Podrás consultar o restaurar este ejemplar desde el menú de <em>Plantas Archivadas</em>.
          </p>
        </div>
      </Modal>
    </article>
  );
};
