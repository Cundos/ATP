import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { HealthStatus } from '@/core/domain/entities';
import styles from './DashboardMetricCard.module.css';

export interface DashboardMetricCardProps {
  label: string;
  value: number;
  href: string;
  icon?: React.ReactNode;
  healthStatus?: HealthStatus;
  isPrimary?: boolean;
}

export const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  label,
  value,
  href,
  icon,
  healthStatus,
  isPrimary = false,
}) => {
  const statusClass = healthStatus ? styles[healthStatus.toLowerCase()] : '';
  const rootClass = [
    styles.card,
    isPrimary ? styles.primary : '',
    statusClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link
      href={href}
      className={rootClass}
      aria-label={`${label}: ${value} plantas. Ver listado`}
    >
      <div className={styles.header}>
        <div className={styles.labelGroup}>
          {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
          <span className={styles.label}>{label}</span>
        </div>
        <span className={styles.arrowIcon} aria-hidden="true">
          <ChevronRight size={16} />
        </span>
      </div>

      <div className={styles.body}>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{value === 1 ? 'ejemplar' : 'ejemplares'}</span>
      </div>
    </Link>
  );
};
