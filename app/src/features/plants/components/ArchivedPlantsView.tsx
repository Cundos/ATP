'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  RotateCcw,
  MapPin,
  Calendar,
  Info,
} from 'lucide-react';
import { PlantEntity } from '@/core/domain/entities';
import { HealthBadge, Button, EmptyState, Modal, Toast } from '@/components/ui';
import { restorePlantAction } from '../actions';
import styles from './ArchivedPlantsView.module.css';

export interface ArchivedPlantsViewProps {
  initialPlants: PlantEntity[];
}

export function ArchivedPlantsView({ initialPlants }: ArchivedPlantsViewProps) {
  const router = useRouter();
  const [plants, setPlants] = useState<PlantEntity[]>(initialPlants);
  const [selectedPlant, setSelectedPlant] = useState<PlantEntity | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleConfirmRestore = () => {
    if (!selectedPlant) return;

    startTransition(async () => {
      const result = await restorePlantAction(selectedPlant.id);
      if (result.success) {
        setPlants((prev) => prev.filter((p) => p.id !== selectedPlant.id));
        setFeedback({
          type: 'success',
          message: `Ejemplar ${selectedPlant.permanent_code} (${selectedPlant.common_name}) restaurado correctamente`,
        });
        setSelectedPlant(null);
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: result.message || 'Ocurrió un error al restaurar la planta.',
        });
      }
    });
  };

  if (plants.length === 0) {
    return (
      <div className={styles.container}>
        {feedback && (
          <Toast
            type={feedback.type}
            message={feedback.message}
            onClose={() => setFeedback(null)}
          />
        )}
        <EmptyState
          icon={<Archive size={28} />}
          title="No hay plantas archivadas"
          description="No existen ejemplares dados de baja en la colección. Las plantas archivadas conservan su código permanente y pueden restaurarse en cualquier momento."
          action={
            <Link href="/inventory">
              <Button variant="secondary" leftIcon={<ArrowLeft size={18} />}>
                Volver al Inventario
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {feedback && (
        <Toast
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      <div className={styles.plantList}>
        {plants.map((plant) => {
          const formattedDate = plant.acquisition_date
            ? new Intl.DateTimeFormat('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'UTC',
              }).format(new Date(plant.acquisition_date))
            : null;

          return (
            <article
              key={plant.id}
              className={styles.plantCard}
              aria-label={`Ejemplar archivado ${plant.permanent_code}`}
            >
              <div className={styles.cardMainInfo}>
                <div className={styles.cardHeader}>
                  <span className={styles.permanentCode}>{plant.permanent_code}</span>
                  <HealthBadge status={plant.health_status} size="sm" />
                </div>
                <h2 className={styles.commonName}>{plant.common_name}</h2>
                {plant.scientific_name && (
                  <p className={styles.scientificName}>{plant.scientific_name}</p>
                )}
                <div className={styles.cardMeta}>
                  <span className={styles.metaItem}>
                    <MapPin size={14} aria-hidden="true" />
                    <span>{plant.location?.name ?? 'Sin ubicación'}</span>
                  </span>
                  {formattedDate && (
                    <span className={styles.metaItem}>
                      <Calendar size={14} aria-hidden="true" />
                      <span>Adquirida: {formattedDate}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.cardActions}>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw size={16} />}
                  onClick={() => setSelectedPlant(plant)}
                  disabled={isPending}
                  aria-label={`Restaurar ejemplar ${plant.permanent_code}`}
                >
                  Restaurar
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal de Confirmación de Restauración */}
      <Modal
        isOpen={Boolean(selectedPlant)}
        onClose={() => setSelectedPlant(null)}
        title="¿Restaurar este ejemplar?"
        description={
          selectedPlant
            ? `El ejemplar ${selectedPlant.permanent_code} (${selectedPlant.common_name}) volverá a estar activo en tu inventario.`
            : ''
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setSelectedPlant(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmRestore}
              isLoading={isPending}
              disabled={isPending}
            >
              {isPending ? 'Restaurando...' : 'Confirmar Restauración'}
            </Button>
          </>
        }
      >
        <div className={styles.modalNotice}>
          <Info size={20} className={styles.modalNoticeIcon} aria-hidden="true" />
          <p className={styles.modalNoticeText}>
            El código permanente se conservará intacto y la planta volverá a figurar en el inventario y catálogo general.
          </p>
        </div>
      </Modal>
    </div>
  );
}
