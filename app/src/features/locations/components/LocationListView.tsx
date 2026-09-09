'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Sprout,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { LocationEntity, LifecycleStatus } from '@/core/domain/entities';
import { Button, Input, Modal, EmptyState, Toast } from '@/components/ui';
import {
  createLocationAction,
  renameLocationAction,
  archiveLocationAction,
  restoreLocationAction,
  LocationActionResult,
} from '../actions';
import { LocationFormSchema } from '../schemas/location-form.schema';
import styles from './LocationListView.module.css';

export interface LocationListViewProps {
  initialLocations: LocationEntity[];
  plantCounts: Record<string, { total: number; active: number; archived: number }>;
}

export function LocationListView({ initialLocations, plantCounts }: LocationListViewProps) {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationEntity[]>(initialLocations);
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [isPending, startTransition] = useTransition();

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form Modal state (Create / Rename)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'rename'>('create');
  const [editingLocation, setEditingLocation] = useState<LocationEntity | null>(null);
  const [locationName, setLocationName] = useState('');
  const [formError, setFormError] = useState('');

  // Confirmation Modals state
  const [locationToArchive, setLocationToArchive] = useState<LocationEntity | null>(null);
  const [locationToRestore, setLocationToRestore] = useState<LocationEntity | null>(null);

  // Filtered list
  const filteredLocations = locations.filter((loc) => {
    if (filterTab === 'ALL') return true;
    return loc.lifecycle_status === filterTab;
  });

  const activeCount = locations.filter((l) => l.lifecycle_status === 'ACTIVE').length;
  const archivedCount = locations.filter((l) => l.lifecycle_status === 'ARCHIVED').length;

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setEditingLocation(null);
    setLocationName('');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenRenameModal = (loc: LocationEntity) => {
    setFormMode('rename');
    setEditingLocation(loc);
    setLocationName(loc.name);
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Client-side validation
    const validation = LocationFormSchema.safeParse({ name: locationName });
    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message || 'Nombre inválido.');
      return;
    }

    const formData = new FormData();
    formData.append('name', locationName.trim());

    startTransition(async () => {
      let result: LocationActionResult;

      if (formMode === 'create') {
        result = await createLocationAction(null, formData);
      } else {
        result = await renameLocationAction(editingLocation!.id, null, formData);
      }

      if (!result.success) {
        if (result.errors?.name) {
          setFormError(result.errors.name);
        } else {
          setFormError(result.message || 'Error al guardar la ubicación.');
        }
      } else {
        setIsFormModalOpen(false);
        setFeedback({
          type: 'success',
          message: result.message || 'Operación exitosa',
        });
        router.refresh();
      }
    });
  };

  const handleConfirmArchive = () => {
    if (!locationToArchive) return;

    startTransition(async () => {
      const result = await archiveLocationAction(locationToArchive.id);
      if (result.success) {
        setLocations((prev) =>
          prev.map((l) =>
            l.id === locationToArchive.id ? { ...l, lifecycle_status: 'ARCHIVED' as LifecycleStatus } : l
          )
        );
        setFeedback({
          type: 'success',
          message: `Ubicación "${locationToArchive.name}" archivada correctamente`,
        });
        setLocationToArchive(null);
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: result.message || 'Error al archivar la ubicación.',
        });
      }
    });
  };

  const handleConfirmRestore = () => {
    if (!locationToRestore) return;

    startTransition(async () => {
      const result = await restoreLocationAction(locationToRestore.id);
      if (result.success) {
        setLocations((prev) =>
          prev.map((l) =>
            l.id === locationToRestore.id ? { ...l, lifecycle_status: 'ACTIVE' as LifecycleStatus } : l
          )
        );
        setFeedback({
          type: 'success',
          message: `Ubicación "${locationToRestore.name}" restaurada correctamente`,
        });
        setLocationToRestore(null);
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: result.message || 'Error al restaurar la ubicación.',
        });
      }
    });
  };

  return (
    <div className={styles.container}>
      {feedback && (
        <Toast
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Barra Superior con Pestañas y Acción */}
      <div className={styles.topBar}>
        <div className={styles.filterTabs} role="tablist" aria-label="Filtrar ubicaciones por estado">
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'ACTIVE'}
            className={`${styles.filterTab} ${filterTab === 'ACTIVE' ? styles.filterTabActive : ''}`}
            onClick={() => setFilterTab('ACTIVE')}
          >
            <span>Activas</span>
            <span className={styles.tabBadge}>{activeCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'ARCHIVED'}
            className={`${styles.filterTab} ${filterTab === 'ARCHIVED' ? styles.filterTabActive : ''}`}
            onClick={() => setFilterTab('ARCHIVED')}
          >
            <span>Archivadas</span>
            <span className={styles.tabBadge}>{archivedCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'ALL'}
            className={`${styles.filterTab} ${filterTab === 'ALL' ? styles.filterTabActive : ''}`}
            onClick={() => setFilterTab('ALL')}
          >
            <span>Todas</span>
            <span className={styles.tabBadge}>{locations.length}</span>
          </button>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={handleOpenCreateModal}
          disabled={isPending}
        >
          Nueva Ubicación
        </Button>
      </div>

      {/* Lista de Ubicaciones o Empty State */}
      {filteredLocations.length === 0 ? (
        <EmptyState
          icon={<MapPin size={28} />}
          title={
            filterTab === 'ARCHIVED'
              ? 'No hay ubicaciones archivadas'
              : filterTab === 'ACTIVE'
              ? 'No hay ubicaciones activas'
              : 'No hay ubicaciones registradas'
          }
          description={
            filterTab === 'ARCHIVED'
              ? 'Las ubicaciones dadas de baja aparecerán aquí. Las plantas asociadas conservarán la referencia histórica.'
              : 'Comenzá agregando los espacios físicos de tu hogar (ej: Balcón, Living, Patio).'
          }
          action={
            filterTab !== 'ACTIVE' ? (
              <Button variant="secondary" onClick={() => setFilterTab('ACTIVE')}>
                Ver Ubicaciones Activas
              </Button>
            ) : (
              <Button variant="primary" leftIcon={<Plus size={18} />} onClick={handleOpenCreateModal}>
                Crear Primera Ubicación
              </Button>
            )
          }
        />
      ) : (
        <div className={styles.locationList}>
          {filteredLocations.map((loc) => {
            const count = plantCounts[loc.id]?.total ?? 0;
            const isActive = loc.lifecycle_status === 'ACTIVE';

            return (
              <article
                key={loc.id}
                className={styles.locationCard}
                aria-label={`Ubicación ${loc.name}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.locationNameGroup}>
                    <span className={styles.locationIcon}>
                      <MapPin size={20} aria-hidden="true" />
                    </span>
                    <h2 className={styles.locationName}>{loc.name}</h2>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${
                      isActive ? styles.statusActive : styles.statusArchived
                    }`}
                  >
                    {isActive ? 'Activa' : 'Archivada'}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <Sprout size={16} className={styles.plantCountIcon} aria-hidden="true" />
                  <span>
                    {count === 1
                      ? '1 ejemplar asociado'
                      : `${count} ejemplares asociados`}
                  </span>
                </div>

                <div className={styles.cardActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit2 size={15} />}
                    onClick={() => handleOpenRenameModal(loc)}
                    disabled={isPending}
                    aria-label={`Renombrar ubicación ${loc.name}`}
                  >
                    Renombrar
                  </Button>

                  {isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Archive size={15} />}
                      onClick={() => setLocationToArchive(loc)}
                      disabled={isPending}
                      aria-label={`Archivar ubicación ${loc.name}`}
                    >
                      Archivar
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<RotateCcw size={15} />}
                      onClick={() => setLocationToRestore(loc)}
                      disabled={isPending}
                      aria-label={`Restaurar ubicación ${loc.name}`}
                    >
                      Restaurar
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Renombrar Ubicación */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={formMode === 'create' ? 'Nueva Ubicación' : 'Renombrar Ubicación'}
        description={
          formMode === 'create'
            ? 'Definí un nombre descriptivo para identificar el espacio físico.'
            : `Modificá el nombre de la ubicación "${editingLocation?.name}".`
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsFormModalOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleFormSubmit}
              isLoading={isPending}
              disabled={isPending}
            >
              {isPending
                ? 'Guardando...'
                : formMode === 'create'
                ? 'Crear Ubicación'
                : 'Guardar Nombre'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit} noValidate>
          <Input
            id="location_name"
            name="name"
            label="Nombre de la Ubicación"
            placeholder="Ej. Balcón, Living, Terraza, Galería"
            value={locationName}
            onChange={(e) => {
              setLocationName(e.target.value);
              if (formError) setFormError('');
            }}
            error={formError}
            required
            autoFocus
            disabled={isPending}
          />
        </form>
      </Modal>

      {/* Modal Confirmar Archivo de Ubicación */}
      <Modal
        isOpen={Boolean(locationToArchive)}
        onClose={() => setLocationToArchive(null)}
        title="¿Archivar esta ubicación?"
        description={
          locationToArchive
            ? `La ubicación "${locationToArchive.name}" dejará de estar disponible para nuevas asignaciones.`
            : ''
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setLocationToArchive(null)}
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
            Las plantas que ya usan esta ubicación conservarán la referencia, pero la ubicación dejará de estar disponible para nuevas asignaciones.
          </p>
        </div>
      </Modal>

      {/* Modal Confirmar Restauración de Ubicación */}
      <Modal
        isOpen={Boolean(locationToRestore)}
        onClose={() => setLocationToRestore(null)}
        title="¿Restaurar esta ubicación?"
        description={
          locationToRestore
            ? `La ubicación "${locationToRestore.name}" volverá a estar activa.`
            : ''
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setLocationToRestore(null)}
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
            La ubicación volverá a aparecer en los selectores de alta y edición de plantas.
          </p>
        </div>
      </Modal>
    </div>
  );
}
