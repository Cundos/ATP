import React from 'react';
import { History } from 'lucide-react';
import { PlantOperationalEventEntity } from '@/core/domain/entities';
import styles from './PlantRecentActivitySection.module.css';

export interface PlantRecentActivitySectionProps {
  events: PlantOperationalEventEntity[];
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'reciente';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'hace unos momentos';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays < 7) return `hace ${diffDays} d`;

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function getEventPresentation(eventType: string) {
  switch (eventType) {
    case 'SOIL_MOISTURE_LOW':
      return { label: 'Humedad baja', dotClass: styles.dotWarning };
    case 'SOIL_MOISTURE_RECOVERED':
      return { label: 'Humedad recuperada', dotClass: styles.dotSuccess };
    case 'SENSOR_OFFLINE':
      return { label: 'Sensor fuera de línea', dotClass: styles.dotWarning };
    case 'SENSOR_ONLINE':
      return { label: 'Sensor en línea', dotClass: styles.dotSuccess };
    case 'IRRIGATION_STARTED':
      return { label: 'Riego iniciado', dotClass: styles.dotInfo };
    case 'IRRIGATION_FINISHED':
      return { label: 'Riego finalizado', dotClass: styles.dotSuccess };
    default:
      return { label: eventType.replace(/_/g, ' ').toLowerCase(), dotClass: styles.dotNeutral };
  }
}

export const PlantRecentActivitySection: React.FC<PlantRecentActivitySectionProps> = ({
  events,
}) => {
  if (!events || events.length === 0) {
    return null;
  }

  return (
    <section className={styles.sectionCard} aria-labelledby="recent-activity-title">
      <header className={styles.sectionHeader}>
        <div className={styles.headerTitleGroup}>
          <History size={18} className={styles.headerIcon} aria-hidden="true" />
          <h2 id="recent-activity-title" className={styles.sectionTitle}>
            Actividad reciente
          </h2>
        </div>
        <span className={styles.eventCountBadge}>
          {events.length} {events.length === 1 ? 'evento' : 'eventos'}
        </span>
      </header>

      <ul className={styles.activityList}>
        {events.map((evt) => {
          const presentation = getEventPresentation(evt.event_type);
          const valueDisplay =
            evt.value_number !== null && evt.value_number !== undefined
              ? `${evt.value_number} ${evt.unit || ''}`.trim()
              : evt.value_text || null;

          return (
            <li key={evt.id} className={styles.activityItem}>
              <div className={styles.itemMain}>
                <span className={`${styles.itemDot} ${presentation.dotClass}`} />
                <div className={styles.itemTextGroup}>
                  <span className={styles.eventLabel}>{presentation.label}</span>
                  {valueDisplay && <span className={styles.eventValue}>{valueDisplay}</span>}
                </div>
              </div>
              <span className={styles.eventTime}>{formatRelativeTime(evt.occurred_at)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
