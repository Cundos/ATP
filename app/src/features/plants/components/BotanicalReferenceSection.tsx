'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Thermometer,
  Sun,
  CloudRain,
  Droplets,
  Gauge,
  Scissors,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PlantReferenceEntity } from '@/core/domain/entities';
import { parseBotanicalReferenceViewModel } from '../view-models/botanical-reference.vm';
import styles from './BotanicalReferenceSection.module.css';

export interface BotanicalReferenceSectionProps {
  reference: PlantReferenceEntity;
}

export const BotanicalReferenceSection: React.FC<BotanicalReferenceSectionProps> = ({
  reference,
}) => {
  const [imageError, setImageError] = useState(false);
  const vm = parseBotanicalReferenceViewModel(reference);

  if (!vm) {
    return null;
  }

  return (
    <section
      className={styles.sectionCard}
      aria-labelledby="section-botanical-reference-title"
    >
      <div className={styles.sectionHeader}>
        <div className={styles.headerTitleGroup}>
          <h2 id="section-botanical-reference-title" className={styles.sectionTitle}>
            <BookOpen size={18} aria-hidden="true" className={styles.headerIcon} />
            <span>Conocimiento Botánico de Referencia</span>
          </h2>
          <span className={styles.provenanceBadge}>{vm.sourceProvenanceText}</span>
        </div>
      </div>

      {/* Reference Identity: Scientific Name, Common Names, Reference Image */}
      <div className={styles.referenceIdentity}>
        <div className={styles.identityText}>
          <h3 className={styles.scientificName}>{vm.scientificName}</h3>
          {vm.commonNamesFormatted && (
            <p className={styles.commonNames}>{vm.commonNamesFormatted}</p>
          )}
        </div>

        {vm.imageUrl && !imageError && (
          <div className={styles.referenceImageWrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vm.imageUrl}
              alt={`Referencia botánica para ${vm.scientificName}`}
              className={styles.referenceImage}
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <span className={styles.imageCaption}>Imagen de referencia botánica</span>
          </div>
        )}
      </div>

      {/* Environmental Metrics */}
      {vm.hasMetrics && (
        <div className={styles.metricsContainer}>
          <h4 className={styles.subHeading}>Requerimientos Ambientales</h4>
          <dl className={styles.metricsGrid}>
            {vm.metrics.temperature && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <Thermometer size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>Temperatura</span>
                </dt>
                <dd className={styles.metricValue}>{vm.metrics.temperature}</dd>
              </div>
            )}
            {vm.metrics.light && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <Sun size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>Luminosidad</span>
                </dt>
                <dd className={styles.metricValue}>{vm.metrics.light}</dd>
              </div>
            )}
            {vm.metrics.environmentalHumidity && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <CloudRain size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>Humedad Ambiente</span>
                </dt>
                <dd className={styles.metricValue}>{vm.metrics.environmentalHumidity}</dd>
              </div>
            )}
            {vm.metrics.soilMoisture && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <Droplets size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>Humedad de Suelo</span>
                </dt>
                <dd className={styles.metricValue}>{vm.metrics.soilMoisture}</dd>
              </div>
            )}
            {vm.metrics.soilEc && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <Gauge size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>EC de Suelo</span>
                </dt>
                <dd className={styles.metricValue}>{vm.metrics.soilEc}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Qualitative Care Guidelines */}
      {vm.hasCareGuidelines && (
        <div className={styles.guidelinesContainer}>
          <h4 className={styles.subHeading}>Guía Teórica de Cuidados</h4>
          <dl className={styles.guidelinesList}>
            {vm.careGuidelines.watering && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Droplets size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Riego Recomendado</span>
                </dt>
                <dd className={styles.guidelineText}>{vm.careGuidelines.watering}</dd>
              </div>
            )}
            {vm.careGuidelines.sunlight && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Sun size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Exposición Solar</span>
                </dt>
                <dd className={styles.guidelineText}>{vm.careGuidelines.sunlight}</dd>
              </div>
            )}
            {vm.careGuidelines.soil && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Layers size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Sustrato Sugerido</span>
                </dt>
                <dd className={styles.guidelineText}>{vm.careGuidelines.soil}</dd>
              </div>
            )}
            {vm.careGuidelines.pruning && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Scissors size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Poda</span>
                </dt>
                <dd className={styles.guidelineText}>{vm.careGuidelines.pruning}</dd>
              </div>
            )}
            {vm.careGuidelines.fertilization && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Sparkles size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Fertilización</span>
                </dt>
                <dd className={styles.guidelineText}>{vm.careGuidelines.fertilization}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  );
};
