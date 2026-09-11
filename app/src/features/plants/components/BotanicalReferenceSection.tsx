import React from 'react';
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
import { BotanicalReferenceViewModel } from '../view-models/botanical-reference.vm';
import { ReferenceBotanicalImage } from './ReferenceBotanicalImage';
import styles from './BotanicalReferenceSection.module.css';

export interface BotanicalReferenceSectionProps {
  viewModel: BotanicalReferenceViewModel;
}

/**
 * Server-safe Component rendering botanical reference knowledge.
 * Receives strictly sanitized BotanicalReferenceViewModel (0 raw_data, 0 database UUIDs).
 */
export const BotanicalReferenceSection: React.FC<BotanicalReferenceSectionProps> = ({
  viewModel,
}) => {
  if (!viewModel) {
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
          <span className={styles.provenanceBadge}>{viewModel.sourceProvenanceText}</span>
        </div>
      </div>

      {/* Reference Identity: Scientific Name, Common Names, Reference Image */}
      <div className={styles.referenceIdentity}>
        <div className={styles.identityText}>
          <h3 className={styles.scientificName}>{viewModel.scientificName}</h3>
          {viewModel.commonNamesFormatted && (
            <p className={styles.commonNames}>{viewModel.commonNamesFormatted}</p>
          )}
        </div>

        {viewModel.imageUrl && (
          <ReferenceBotanicalImage
            imageUrl={viewModel.imageUrl}
            scientificName={viewModel.scientificName}
          />
        )}
      </div>

      {/* Environmental Metrics */}
      {viewModel.hasMetrics && (
        <div className={styles.metricsContainer}>
          <h4 className={styles.subHeading}>Requerimientos Ambientales</h4>
          <dl className={styles.metricsGrid}>
            {viewModel.metrics.temperature && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <Thermometer size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>Temperatura</span>
                </dt>
                <dd className={styles.metricValue}>{viewModel.metrics.temperature}</dd>
              </div>
            )}
            {viewModel.metrics.light && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <Sun size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>Luminosidad</span>
                </dt>
                <dd className={styles.metricValue}>{viewModel.metrics.light}</dd>
              </div>
            )}
            {viewModel.metrics.environmentalHumidity && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <CloudRain size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>Humedad Ambiente</span>
                </dt>
                <dd className={styles.metricValue}>{viewModel.metrics.environmentalHumidity}</dd>
              </div>
            )}
            {viewModel.metrics.soilMoisture && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <Droplets size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>Humedad de Suelo</span>
                </dt>
                <dd className={styles.metricValue}>{viewModel.metrics.soilMoisture}</dd>
              </div>
            )}
            {viewModel.metrics.soilEc && (
              <div className={styles.metricCard}>
                <dt className={styles.metricLabel}>
                  <Gauge size={14} aria-hidden="true" className={styles.metricIcon} />
                  <span>EC de Suelo</span>
                </dt>
                <dd className={styles.metricValue}>{viewModel.metrics.soilEc}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Qualitative Care Guidelines */}
      {viewModel.hasCareGuidelines && (
        <div className={styles.guidelinesContainer}>
          <h4 className={styles.subHeading}>Guía Teórica de Cuidados</h4>
          <dl className={styles.guidelinesList}>
            {viewModel.careGuidelines.watering && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Droplets size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Riego Recomendado</span>
                </dt>
                <dd className={styles.guidelineText}>{viewModel.careGuidelines.watering}</dd>
              </div>
            )}
            {viewModel.careGuidelines.sunlight && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Sun size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Exposición Solar</span>
                </dt>
                <dd className={styles.guidelineText}>{viewModel.careGuidelines.sunlight}</dd>
              </div>
            )}
            {viewModel.careGuidelines.soil && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Layers size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Sustrato Sugerido</span>
                </dt>
                <dd className={styles.guidelineText}>{viewModel.careGuidelines.soil}</dd>
              </div>
            )}
            {viewModel.careGuidelines.pruning && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Scissors size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Poda</span>
                </dt>
                <dd className={styles.guidelineText}>{viewModel.careGuidelines.pruning}</dd>
              </div>
            )}
            {viewModel.careGuidelines.fertilization && (
              <div className={styles.guidelineItem}>
                <dt className={styles.guidelineTitle}>
                  <Sparkles size={14} aria-hidden="true" className={styles.guidelineIcon} />
                  <span>Fertilización</span>
                </dt>
                <dd className={styles.guidelineText}>{viewModel.careGuidelines.fertilization}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  );
};
