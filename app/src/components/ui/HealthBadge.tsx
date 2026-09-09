import React from 'react';
import styles from './HealthBadge.module.css';

export type HealthStatusType = 'HEALTHY' | 'ATTENTION' | 'RECOVERY' | 'UNKNOWN';

export interface HealthBadgeProps {
  status: HealthStatusType;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const HEALTH_STATUS_LABELS: Record<HealthStatusType, string> = {
  HEALTHY: 'Saludable',
  ATTENTION: 'Atención',
  RECOVERY: 'Recuperación',
  UNKNOWN: 'Sin evaluar',
};

export const HealthBadge: React.FC<HealthBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  const normalizedStatus = (status || 'UNKNOWN').toUpperCase() as HealthStatusType;
  const label = HEALTH_STATUS_LABELS[normalizedStatus] || HEALTH_STATUS_LABELS.UNKNOWN;

  const rootClass = [
    styles.badge,
    styles[normalizedStatus.toLowerCase()],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={rootClass}
      role="status"
      aria-label={`Estado sanitario: ${label}`}
    >
      {showDot && <span className={styles.dot} aria-hidden="true" />}
      <span className={styles.label}>{label}</span>
    </span>
  );
};
