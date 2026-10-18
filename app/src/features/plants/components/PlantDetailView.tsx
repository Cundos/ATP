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
  Tag,
  QrCode,
} from 'lucide-react';
import { PlantEntity, PlantOperationalEventEntity, PlantCareContextDTO } from '@/core/domain/entities';
import { HealthBadge, Button, Modal, Toast } from '@/components/ui';
import { archivePlantAction } from '../actions';
import { PlantThumbnail } from './PlantThumbnail';
import { PlantPhotoTimeline } from './PlantPhotoTimeline';
import { BotanicalReferenceSection } from './BotanicalReferenceSection';
import { PlantLiveTelemetrySection } from './PlantLiveTelemetrySection';
import { PlantCareContextSection } from './PlantCareContextSection';
import { PlantRecentActivitySection } from './PlantRecentActivitySection';
import { PlantQrCode } from './PlantQrCode';
import { PlantLiveTelemetryDTO } from '@/core/application/use-cases/GetPlantLiveTelemetryUseCase';
import {
  BotanicalReferenceViewModel,
  parseBotanicalReferenceViewModel,
} from '../view-models/botanical-reference.vm';
import styles from './PlantDetailView.module.css';

export interface PlantDetailViewProps {
  plant: PlantEntity;
  botanicalReference?: BotanicalReferenceViewModel | null;
  liveTelemetry?: PlantLiveTelemetryDTO | null;
  careContext?: PlantCareContextDTO | null;
  recentEvents?: PlantOperationalEventEntity[];
}

export const PlantDetailView: React.FC<PlantDetailViewProps> = ({
  plant,
  botanicalReference,
  liveTelemetry,
  careContext,
  recentEvents,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error'; message: string } | null>(null);

  // Sanitized botanical reference view model
  const botanicalRefVm =
    botanicalReference !== undefined
      ? botanicalReference
      : plant.reference
        ? parseBotanicalReferenceViewModel(plant.reference)
        : null;

  // Formateo de fecha de adquisición seguro
  let formattedAcquisitionDate = 'No declarada';
  if (plant.acquisition_date) {
    try {
      const parsed = new Date(plant.acquisition_date);
      if (!isNaN(parsed.getTime())) {
        formattedAcquisitionDate = new Intl.DateTimeFormat('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(parsed);
      }
    } catch {
      formattedAcquisitionDate = 'No declarada';
    }
  }

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

      {/* Cabecera / Hero Grid (2-Column on Desktop) */}
      <div className={styles.heroGrid}>
        {/* Columna Izquierda: Fotografía */}
        <div className={styles.mediaColumn}>
          <div className={styles.photoBannerWrapper}>
            <PlantThumbnail
              photoPath={plant.photos?.find((p) => p.is_primary)?.file_path || plant.photos?.[0]?.file_path}
              plantName={plant.common_name}
              size="lg"
              className={styles.heroThumbnail}
            />
          </div>
        </div>

        {/* Columna Derecha: Identidad, Acciones y Guía Rápida de Cuidados */}
        <div className={styles.detailsColumn}>
          <header className={styles.headerCard}>
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

            {/* Metadatos Rápidos Integrados (Ubicación y Adquisición) */}
            <div className={styles.quickMetaRow} aria-label="Información General y Ubicación">
              <div className={styles.quickMetaChip}>
                <span className={styles.quickMetaLabel}>
                  <MapPin size={14} aria-hidden="true" />
                  <span>Ubicación</span>
                </span>
                <span className={plant.location ? styles.locationName : styles.emptyLocation}>
                  {locationName}
                </span>
                {isLocationArchived && (
                  <span className={styles.archivedLocationNote}>
                    (Ubicación archivada en el catálogo)
                  </span>
                )}
              </div>

              <div className={styles.quickMetaChip}>
                <span className={styles.quickMetaLabel}>
                  <Calendar size={14} aria-hidden="true" />
                  <span>Adquisición</span>
                </span>
                <span className={styles.dataValue}>{formattedAcquisitionDate}</span>
              </div>
            </div>
          </header>

          {/* Barra de Acciones Principales */}
          <section className={styles.actionsBar} aria-label="Acciones sobre el ejemplar">
            <Button
              variant="secondary"
              fullWidth
              leftIcon={<Edit size={16} />}
              onClick={() => router.push(`/plants/${plant.permanent_code}/edit`)}
              className={styles.actionBtnLink}
              aria-label={`Editar ejemplar ${plant.permanent_code}`}
            >
              Editar
            </Button>
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

          {/* Sección Principal: Guía y Perfil de Cuidados (Estilo Plan Verde) */}
          <section className={styles.careGuideCard} aria-labelledby="section-profile-title">
            <div className={styles.careGuideHeader}>
              <h2 id="section-profile-title" className={styles.careGuideTitle}>
                <Droplets size={18} aria-hidden="true" />
                <span>Guía de Cuidados del Ejemplar</span>
              </h2>
              <span className={styles.careGuideSubtitle}>Lo que más importa en el día a día</span>
            </div>

            {hasProfileData && profile ? (
              <div className={styles.careBlocksList}>
                {profile.light_conditions && (
                  <div className={styles.careBlock}>
                    <div className={styles.careBlockLabel}>
                      <span className={styles.careEmoji} aria-hidden="true">☀️</span>
                      <Sun size={14} aria-hidden="true" className={styles.careBlockIcon} />
                      <span>Luz</span>
                    </div>
                    <p className={styles.careBlockText}>{profile.light_conditions}</p>
                  </div>
                )}

                {profile.watering_notes && (
                  <div className={styles.careBlock}>
                    <div className={styles.careBlockLabel}>
                      <span className={styles.careEmoji} aria-hidden="true">💧</span>
                      <Droplets size={14} aria-hidden="true" className={styles.careBlockIcon} />
                      <span>Riego</span>
                    </div>
                    <p className={styles.careBlockText}>{profile.watering_notes}</p>
                  </div>
                )}

                {profile.substrate_info && (
                  <div className={styles.careBlock}>
                    <div className={styles.careBlockLabel}>
                      <span className={styles.careEmoji} aria-hidden="true">🌱</span>
                      <Layers size={14} aria-hidden="true" className={styles.careBlockIcon} />
                      <span>Sustrato</span>
                    </div>
                    <p className={styles.careBlockText}>{profile.substrate_info}</p>
                  </div>
                )}

                {profile.pot_info && (
                  <div className={styles.careBlock}>
                    <div className={styles.careBlockLabel}>
                      <span className={styles.careEmoji} aria-hidden="true">🪴</span>
                      <Box size={14} aria-hidden="true" className={styles.careBlockIcon} />
                      <span>Maceta / Recipiente</span>
                    </div>
                    <p className={styles.careBlockText}>{profile.pot_info}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyCareBox}>
                <p className={styles.emptyText}>Sin datos de cultivo</p>
                <p className={styles.emptyCareHint}>
                  Tocá <strong>Editar</strong> para anotar cuánta luz recibe, cada cuánto regarla y qué sustrato usa.
                </p>
              </div>
            )}

            {/* Observaciones / Tip Personal integrado en la guía */}
            {plant.notes && (
              <div className={styles.tipBox} aria-labelledby="section-notes-title">
                <div id="section-notes-title" className={styles.tipLabel}>
                  <span aria-hidden="true">✨</span>
                  <FileText size={14} aria-hidden="true" />
                  <span>Observaciones y Notas</span>
                </div>
                <p className={styles.notesText}>{plant.notes}</p>
              </div>
            )}

            {/* Alerta Suave "Ojo con esto" (Estilo Plan Verde .ojo) */}
            {(plant.health_status === 'ATTENTION' || plant.health_status === 'RECOVERY') && (
              <div className={styles.ojoBox} role="note">
                <span className={styles.ojoIcon} aria-hidden="true">⚠️</span>
                <div className={styles.ojoContent}>
                  <strong>A tener en cuenta:</strong>{' '}
                  {plant.health_status === 'ATTENTION'
                    ? 'Este ejemplar requiere seguimiento cercano. Revisá humedad del sustrato antes de volver a regar y observá el envés de las hojas.'
                    : 'Ejemplar en recuperación activa. Evitá cambios bruscos de ubicación o fertilización hasta ver brotes nuevos.'}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Sección: Estado de Cuidado / Motor Determinista (ATP-CARE-001) */}
      {careContext && (
        <PlantCareContextSection careContext={careContext} />
      )}

      {/* Sección: Estado en tiempo real / Telemetría Home Assistant (ATP-HA-002) */}
      {liveTelemetry && (
        <PlantLiveTelemetrySection telemetry={liveTelemetry} />
      )}

      {/* Sección: Conocimiento Botánico de Referencia (ATP-IMP-025) */}
      {botanicalRefVm && (
        <BotanicalReferenceSection viewModel={botanicalRefVm} />
      )}

      {/* Sección: Evolución Visual / Historial de Fotografías (ATP-FEAT-002) */}
      <PlantPhotoTimeline
        plantId={plant.id}
        permanentCode={plant.permanent_code}
        photos={plant.photos}
      />

      {/* Sección: Actividad Reciente / Historial Operativo (ATP-HA-003) */}
      {recentEvents && recentEvents.length > 0 && (
        <PlantRecentActivitySection events={recentEvents} />
      )}

      {/* Sección: Identificación QR (ATP-FEAT-001) */}
      <section className={styles.sectionCard} aria-labelledby="section-qr-title" data-testid="section-qr">
        <h2 id="section-qr-title" className={styles.sectionTitle}>
          <QrCode size={18} aria-hidden="true" />
          <span>Identificación QR</span>
        </h2>
        <div className={styles.qrSectionContent}>
          <PlantQrCode permanentCode={plant.permanent_code} />
        </div>
      </section>

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
