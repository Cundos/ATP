'use client';

import React, { useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  BookOpen,
  Globe,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  RegionalPlantSpeciesEntity,
  PlantPhenologyEntity,
  PhenologyEventType,
  EcologicalRegionEntity,
} from '@/core/domain/entities';
import {
  formatMonthRanges,
  formatGrowthHabit,
} from '../utils/floraFormatters';
import styles from './SpeciesDetailModal.module.css';

export interface SpeciesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  species: RegionalPlantSpeciesEntity | null;
  activePhenology?: PlantPhenologyEntity[];
  currentMonth?: number;
  ecologicalRegion?: EcologicalRegionEntity | null;
}

const EVENT_LABELS: Record<PhenologyEventType, string> = {
  SPROUTING: 'Brotación',
  FLOWERING: 'Floración',
  FRUITING: 'Fructificación',
  SOWING: 'Siembra',
  PLANTING: 'Plantación',
};

const EVENT_CLASSES: Record<PhenologyEventType, string> = {
  SPROUTING: styles.eventSprouting,
  FLOWERING: styles.eventFlowering,
  FRUITING: styles.eventFruiting,
  SOWING: styles.eventSowing,
  PLANTING: styles.eventPlanting,
};

export const SpeciesDetailModal: React.FC<SpeciesDetailModalProps> = ({
  isOpen,
  onClose,
  species,
  ecologicalRegion,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !species) return null;

  const commonName =
    species.common_names && species.common_names.length > 0
      ? species.common_names.join(' / ')
      : species.canonical_name || species.scientific_name;

  const humanHabit = formatGrowthHabit(species.growth_habit);

  // Ecorregión real sin inventar fallback
  const ecoregionName =
    ecologicalRegion?.name || species.ecological_region?.name || null;

  // Fuente principal
  const primarySource =
    species.phenology_records?.find((p) => p.source)?.source || null;

  // Agrupar fenología por tipo de evento
  const phenologyByType = new Map<PhenologyEventType, number[]>();
  if (species.phenology_records) {
    for (const record of species.phenology_records) {
      const existing = phenologyByType.get(record.event_type) || [];
      if (!existing.includes(record.month)) {
        existing.push(record.month);
      }
      phenologyByType.set(record.event_type, existing);
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
      data-testid="species-detail-modal"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="species-modal-title"
        aria-describedby="species-modal-scientific"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.badgeRow}>
              {species.native_status === 'NATIVE' && (
                <span className={styles.nativeBadge}>Nativa</span>
              )}
              {humanHabit && (
                <span className={styles.habitBadge}>{humanHabit}</span>
              )}
              {species.conservation_status && (
                <span className={styles.conservationBadge}>
                  <ShieldCheck size={11} aria-hidden="true" />
                  {species.conservation_status}
                </span>
              )}
            </div>
            <h2 id="species-modal-title" className={styles.title}>
              {commonName}
            </h2>
            <p id="species-modal-scientific" className={styles.scientificName}>
              {species.scientific_name}
              {species.family && (
                <span className={styles.familyText}> · Familia {species.family}</span>
              )}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar detalle de especie"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Ecorregión */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <Globe size={14} className={styles.sectionIcon} aria-hidden="true" />
              <span className={styles.sectionLabel}>Ecorregión</span>
            </div>
            <p className={styles.sectionContent}>
              {ecoregionName ? (
                <span>{ecoregionName}</span>
              ) : (
                <span className={styles.textMuted}>Ecorregión no informada</span>
              )}
            </p>
          </div>

          {/* Observaciones */}
          {species.notes && (
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <Info size={14} className={styles.sectionIcon} aria-hidden="true" />
                <span className={styles.sectionLabel}>Observaciones botánicas</span>
              </div>
              <p className={styles.sectionContent}>{species.notes}</p>
            </div>
          )}

          {/* Calendario Fenológico Completo */}
          {phenologyByType.size > 0 && (
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <Sparkles size={14} className={styles.sectionIcon} aria-hidden="true" />
                <span className={styles.sectionLabel}>Calendario fenológico documentado</span>
              </div>
              <div className={styles.phenologyList}>
                {Array.from(phenologyByType.entries()).map(([eventType, months]) => {
                  const sortedMonths = [...months].sort((a, b) => a - b);
                  const rangeLabel = formatMonthRanges(sortedMonths);
                  const eventRecord = species.phenology_records?.find(
                    (p) => p.event_type === eventType && p.source
                  );
                  const eventSource = eventRecord?.source;

                  return (
                    <div key={eventType} className={styles.phenologyItem}>
                      <span className={`${styles.eventBadge} ${EVENT_CLASSES[eventType] || ''}`}>
                        {EVENT_LABELS[eventType]}
                      </span>
                      <span className={styles.phenologyRange}>{rangeLabel}</span>
                      {eventSource && (
                        <span className={styles.phenologySource} title={eventSource.name}>
                          ({eventSource.name})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trazabilidad y Fuente Científica */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <BookOpen size={14} className={styles.sectionIcon} aria-hidden="true" />
              <span className={styles.sectionLabel}>Fuente botánica oficial</span>
            </div>
            <div className={styles.sourceBox}>
              <p className={styles.sourceName}>
                {primarySource?.name || 'Fuente no informada'}
              </p>
              {primarySource?.description && (
                <p className={styles.sourceDescription}>{primarySource.description}</p>
              )}
              {primarySource?.url && (
                <a
                  href={primarySource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sourceLink}
                  aria-label={`Abrir fuente oficial de ${species.scientific_name} en nueva pestaña`}
                >
                  <span>Ver fuente oficial</span>
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.doneButton}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
