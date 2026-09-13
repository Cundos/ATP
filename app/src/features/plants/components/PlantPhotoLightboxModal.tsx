'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Star,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { PhotoEntity } from '@/core/domain/entities';
import { formatPhotoDate, getPhotoEffectiveDate } from '@/core/domain/services';
import { Modal, Button, Toast } from '@/components/ui';
import {
  setPrimaryPlantPhotoAction,
  updatePlantPhotoMetadataAction,
  deletePlantPhotoAction,
} from '../actions';
import styles from './PlantPhotoLightboxModal.module.css';

export interface PlantPhotoLightboxModalProps {
  photo: PhotoEntity | null;
  isOpen: boolean;
  onClose: () => void;
  plantId: string;
  permanentCode: string;
  totalPhotosCount: number;
}

export const PlantPhotoLightboxModal: React.FC<PlantPhotoLightboxModalProps> = ({
  photo,
  isOpen,
  onClose,
  plantId,
  permanentCode,
  totalPhotosCount,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit fields
  const [editDate, setEditDate] = useState<string>('');
  const [editCaption, setEditCaption] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!photo) return null;

  const photoUrl = `/api/photos/view/${photo.file_path.replace(/^\/+/, '')}`;
  const effectiveDateStr = formatPhotoDate(photo);

  const startEditMode = () => {
    const effDate = getPhotoEffectiveDate(photo);
    setEditDate(effDate.toISOString().split('T')[0]);
    setEditCaption(photo.caption || '');
    setIsEditing(true);
    setErrorMessage(null);
  };

  const cancelEditMode = () => {
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSaveEdit = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updatePlantPhotoMetadataAction(plantId, photo.id, {
        taken_at: editDate || null,
        caption: editCaption,
      });

      if (result.success) {
        setIsEditing(false);
        setToastMessage('Detalles actualizados correctamente.');
        router.refresh();
      } else {
        setErrorMessage(result.message || 'Error al guardar cambios.');
      }
    });
  };

  const handleSetPrimary = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await setPrimaryPlantPhotoAction(plantId, photo.id);
      if (result.success) {
        setToastMessage('Foto marcada como principal.');
        router.refresh();
      } else {
        setErrorMessage(result.message || 'Error al marcar como principal.');
      }
    });
  };

  const handleConfirmDelete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deletePlantPhotoAction(plantId, photo.id);
      if (result.success) {
        setIsDeleteModalOpen(false);
        onClose();
        setToastMessage('Fotografía eliminada.');
        router.refresh();
      } else {
        setErrorMessage(result.message || 'Error al eliminar la fotografía.');
      }
    });
  };

  return (
    <>
      {toastMessage && (
        <Toast
          type="success"
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Modal Principal Lightbox */}
      <Modal
        isOpen={isOpen && !isDeleteModalOpen}
        onClose={onClose}
        title={`Fotografía — ${permanentCode}`}
        description={`Registro visual del ejemplar (${effectiveDateStr})`}
        footer={
          <div className={styles.actionsBar}>
            <div className={styles.leftActions}>
              {!photo.is_primary && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSetPrimary}
                  disabled={isPending}
                  leftIcon={<Star size={15} />}
                >
                  {isPending ? 'Guardando...' : 'Marcar como principal'}
                </Button>
              )}
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditMode}
                  disabled={isPending}
                  leftIcon={<Edit2 size={15} />}
                >
                  Editar nota / fecha
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isPending}
                leftIcon={<Trash2 size={15} />}
              >
                Eliminar foto
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className={styles.lightboxContainer}>
          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              {errorMessage}
            </div>
          )}

          <div className={styles.imageWrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={photo.caption || `Fotografía de ${permanentCode}`}
              className={styles.largeImage}
            />
            {photo.is_primary && (
              <span className={styles.primaryBadgeOverlay}>
                <Star size={12} fill="currentColor" aria-hidden="true" />
                Foto principal
              </span>
            )}
          </div>

          <div className={styles.metadataSection}>
            {isEditing ? (
              <div className={styles.editForm}>
                <div className={styles.editField}>
                  <label htmlFor="edit-taken-at" className={styles.editLabel}>
                    Fecha de la foto
                  </label>
                  <input
                    id="edit-taken-at"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={styles.editInput}
                    disabled={isPending}
                  />
                </div>

                <div className={styles.editField}>
                  <label htmlFor="edit-caption" className={styles.editLabel}>
                    Nota u observación
                  </label>
                  <textarea
                    id="edit-caption"
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="Nota sobre el estado de la planta en esta fecha..."
                    maxLength={300}
                    className={styles.editTextarea}
                    disabled={isPending}
                  />
                </div>

                <div className={styles.editButtonsRow}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditMode}
                    disabled={isPending}
                    leftIcon={<X size={14} />}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    isLoading={isPending}
                    disabled={isPending}
                    leftIcon={<Check size={14} />}
                  >
                    Guardar cambios
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.metaHeader}>
                  <span className={styles.dateRow}>
                    <Calendar size={15} aria-hidden="true" />
                    {effectiveDateStr}
                  </span>
                </div>
                {photo.caption ? (
                  <p className={styles.captionText}>{photo.caption}</p>
                ) : (
                  <p className={styles.noCaption}>Sin notas registradas</p>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Confirmación de Eliminación */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="¿Eliminar esta fotografía?"
        description="Esta acción eliminará permanentemente la foto del historial visual del ejemplar."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isPending}
              disabled={isPending}
            >
              {isPending ? 'Eliminando...' : 'Confirmar Eliminación'}
            </Button>
          </>
        }
      >
        <div className={styles.deleteWarning}>
          <p className={styles.deleteWarningText}>
            ¿Estás seguro de que deseás eliminar esta foto? Se eliminará tanto el registro como el archivo del almacenamiento.
          </p>
          {photo.is_primary && totalPhotosCount > 1 && (
            <div className={styles.deleteWarningNote}>
              <AlertTriangle size={16} aria-hidden="true" style={{ display: 'inline', marginRight: 6 }} />
              Esta foto es la <strong>principal</strong>. Al eliminarla, la fotografía más reciente restante pasará a ser automáticamente la nueva foto principal.
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
