'use client';

import React from 'react';
import {
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Droplets,
  Battery,
  BatteryWarning,
  Camera,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  PlantCareContextDTO,
  CareAssessmentStatus,
  RecommendationPriority,
} from '@/core/domain/entities';
import styles from './PlantCareContextSection.module.css';

export interface PlantCareContextSectionProps {
  careContext: PlantCareContextDTO;
}

const statusMap: Record<
  CareAssessmentStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  OK: {
    label: 'Óptimo',
    icon: <CheckCircle2 size={14} aria-hidden="true" />,
    className: styles.statusOk,
  },
  WATCH: {
    label: 'En Observación',
    icon: <AlertTriangle size={14} aria-hidden="true" />,
    className: styles.statusWatch,
  },
  ACTION_RECOMMENDED: {
    label: 'Acción Sugerida',
    icon: <AlertCircle size={14} aria-hidden="true" />,
    className: styles.statusAction,
  },
  DATA_INSUFFICIENT: {
    label: 'Datos Insuficientes',
    icon: <HelpCircle size={14} aria-hidden="true" />,
    className: styles.statusDataInsufficient,
  },
};

const priorityMap: Record<
  RecommendationPriority,
  { label: string; className: string }
> = {
  CRITICAL: { label: 'Crítica', className: styles.priorityCritical },
  HIGH: { label: 'Alta', className: styles.priorityHigh },
  MEDIUM: { label: 'Media', className: styles.priorityMedium },
  LOW: { label: 'Baja', className: styles.priorityLow },
};

export const PlantCareContextSection: React.FC<PlantCareContextSectionProps> = ({
  careContext,
}) => {
  const { assessment, current_conditions, data_quality, recent_context } = careContext;
  const statusInfo = statusMap[assessment.status] || statusMap.DATA_INSUFFICIENT;

  // Format soil moisture display
  const moistureVal = current_conditions.soil_moisture.value;
  const minRef = current_conditions.soil_moisture.min_reference;
  const maxRef = current_conditions.soil_moisture.max_reference;
  const hasRef = minRef !== null || maxRef !== null;

  let moistureText = 'No disponible';
  if (moistureVal !== null) {
    moistureText = `${moistureVal}${current_conditions.soil_moisture.unit}`;
  }

  let referenceText = '';
  if (hasRef) {
    if (minRef !== null && maxRef !== null) {
      referenceText = `Rango: ${minRef}% – ${maxRef}%`;
    } else if (minRef !== null) {
      referenceText = `Mín: ${minRef}%`;
    } else if (maxRef !== null) {
      referenceText = `Máx: ${maxRef}%`;
    }
  }

  // Format sensor & battery
  const sensorStatus = current_conditions.sensor_status;
  const batteryVal = current_conditions.battery.value;

  // Format photo date
  const lastPhotoAt = recent_context.last_photo_at
    ? new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(recent_context.last_photo_at))
    : 'Sin fotos';

  return (
    <section
      className={styles.container}
      aria-labelledby="care-context-title"
      data-testid="care-context-section"
    >
      <header className={styles.header}>
        <h2 id="care-context-title" className={styles.headerTitle}>
          <HeartHandshake size={18} className={styles.headerIcon} aria-hidden="true" />
          <span>Estado de Cuidado</span>
        </h2>
        <span
          className={`${styles.statusBadge} ${statusInfo.className}`}
          data-testid="care-status-badge"
        >
          {statusInfo.icon}
          <span>{statusInfo.label}</span>
        </span>
      </header>

      {/* Headline & Summary */}
      <div className={styles.headlineCard}>
        <p className={styles.headline} data-testid="care-headline">
          {assessment.headline}
        </p>
        <p className={styles.summary} data-testid="care-summary">
          {assessment.summary}
        </p>
      </div>

      {/* Warnings if any */}
      {data_quality.warnings.length > 0 && (
        <div className={styles.warningsCard}>
          <AlertTriangle size={16} className={styles.warningIcon} aria-hidden="true" />
          <ul className={styles.warningsList}>
            {data_quality.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Conditions Grid */}
      <div className={styles.conditionsGrid}>
        {/* Soil Moisture */}
        <div className={styles.conditionCard}>
          <div className={styles.conditionIconWrapper}>
            <Droplets size={16} aria-hidden="true" />
          </div>
          <div className={styles.conditionDetails}>
            <span className={styles.conditionLabel}>Humedad de sustrato</span>
            <span className={styles.conditionValue}>{moistureText}</span>
            {referenceText && (
              <span className={styles.conditionSubtext}>{referenceText}</span>
            )}
          </div>
        </div>

        {/* Sensor & Battery */}
        <div className={styles.conditionCard}>
          <div className={styles.conditionIconWrapper}>
            {sensorStatus === 'ONLINE' ? (
              batteryVal !== null && batteryVal <= 20 ? (
                <BatteryWarning size={16} aria-hidden="true" />
              ) : (
                <Wifi size={16} aria-hidden="true" />
              )
            ) : sensorStatus === 'OFFLINE' ? (
              <WifiOff size={16} aria-hidden="true" />
            ) : (
              <Battery size={16} aria-hidden="true" />
            )}
          </div>
          <div className={styles.conditionDetails}>
            <span className={styles.conditionLabel}>Sensor / Conexión</span>
            <span className={styles.conditionValue}>
              {sensorStatus === 'ONLINE'
                ? 'En línea'
                : sensorStatus === 'OFFLINE'
                ? 'Fuera de línea'
                : sensorStatus === 'STALE'
                ? 'Desactualizado'
                : 'No vinculado'}
            </span>
            {batteryVal !== null && (
              <span className={styles.conditionSubtext}>
                Batería: {batteryVal}%
              </span>
            )}
          </div>
        </div>

        {/* Visual history */}
        <div className={styles.conditionCard}>
          <div className={styles.conditionIconWrapper}>
            <Camera size={16} aria-hidden="true" />
          </div>
          <div className={styles.conditionDetails}>
            <span className={styles.conditionLabel}>Último registro visual</span>
            <span className={styles.conditionValue}>{lastPhotoAt}</span>
            {recent_context.recent_photo_caption && (
              <span className={styles.conditionSubtext}>
                {recent_context.recent_photo_caption}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {assessment.recommendations.length > 0 && (
        <div className={styles.recommendationsSection}>
          <h3 className={styles.recommendationsTitle}>Recomendaciones</h3>
          <ul className={styles.recommendationList}>
            {assessment.recommendations.map((rec, index) => {
              const priorityInfo =
                priorityMap[rec.priority] || priorityMap.MEDIUM;
              return (
                <li
                  key={rec.code || index}
                  className={styles.recommendationItem}
                  data-testid="care-recommendation-item"
                >
                  <div className={styles.recommendationHeader}>
                    <h4 className={styles.recommendationTitle}>{rec.title}</h4>
                    <span
                      className={`${styles.priorityBadge} ${priorityInfo.className}`}
                    >
                      {priorityInfo.label}
                    </span>
                  </div>
                  <p className={styles.recommendationExplanation}>
                    {rec.explanation}
                  </p>
                  {rec.evidence && rec.evidence.length > 0 && (
                    <details className={styles.evidenceDetails}>
                      <summary className={styles.evidenceSummary}>
                        Ver justificación y lecturas
                      </summary>
                      <ul className={styles.evidenceList}>
                        {rec.evidence.map((ev, evIdx) => (
                          <li key={evIdx}>{ev}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
