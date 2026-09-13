import React from 'react';
import {
  Activity,
  Droplets,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Wifi,
  WifiOff,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { PlantLiveTelemetryDTO } from '@/core/application/use-cases/GetPlantLiveTelemetryUseCase';
import styles from './PlantLiveTelemetrySection.module.css';

export interface PlantLiveTelemetrySectionProps {
  telemetry: PlantLiveTelemetryDTO;
}

function formatTelemetryTimestamp(isoString: string | null): string {
  if (!isoString) return 'Sin datos';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Sin datos';
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  } catch {
    return 'Sin datos';
  }
}

function getBatteryIcon(level: number | null) {
  if (level === null) return <Battery size={14} aria-hidden="true" />;
  if (level >= 75) return <BatteryFull size={14} aria-hidden="true" />;
  if (level >= 30) return <BatteryMedium size={14} aria-hidden="true" />;
  return <BatteryLow size={14} aria-hidden="true" />;
}

function getVisualStateClass(state: string | null): string {
  if (!state) return styles.visualStateNeutral;
  const s = state.toLowerCase();
  if (s.includes('óptimo') || s.includes('optimo') || s.includes('bueno') || s.includes('ok')) {
    return styles.visualStateOptimal;
  }
  if (s.includes('seco') || s.includes('bajo') || s.includes('atención') || s.includes('atencion') || s.includes('alerta')) {
    return styles.visualStateWarning;
  }
  return styles.visualStateNeutral;
}

export const PlantLiveTelemetrySection: React.FC<PlantLiveTelemetrySectionProps> = ({
  telemetry,
}) => {
  if (!telemetry.binding_configured) {
    return null;
  }

  const { moisture, hardware, available } = telemetry;

  return (
    <section className={styles.sectionCard} aria-labelledby="live-telemetry-title">
      <header className={styles.sectionHeader}>
        <div className={styles.headerTitleGroup}>
          <Activity size={18} className={styles.headerIcon} aria-hidden="true" />
          <h2 id="live-telemetry-title" className={styles.sectionTitle}>
            Estado en tiempo real
          </h2>
        </div>
        <div
          className={`${styles.liveIndicator} ${
            available ? styles.liveIndicatorActive : styles.liveIndicatorInactive
          }`}
        >
          <span className={`${styles.statusDot} ${available ? styles.pulseDot : ''}`} />
          <span>{available ? 'Telemetría activa' : 'Sin conexión'}</span>
        </div>
      </header>

      {!available ? (
        <div className={styles.unavailableNotice}>
          <AlertCircle size={16} className={styles.unavailableIcon} aria-hidden="true" />
          <span>
            {telemetry.error_reason || 'Telemetría no disponible. El sensor no responde o está fuera de línea.'}
          </span>
        </div>
      ) : (
        <div className={styles.telemetryGrid}>
          {/* Tarjeta de Humedad de Suelo */}
          <div className={styles.moistureCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>
                <Droplets size={14} aria-hidden="true" /> Humedad de Suelo
              </span>
              {moisture?.visual_state && (
                <span
                  className={`${styles.visualStateBadge} ${getVisualStateClass(
                    moisture.visual_state
                  )}`}
                >
                  {moisture.visual_state}
                </span>
              )}
            </div>

            <div className={styles.moistureValueWrapper}>
              {moisture && moisture.available && moisture.value !== null ? (
                <div className={styles.moistureValue}>
                  {moisture.value}
                  <span className={styles.moistureUnit}>{moisture.unit || '%'}</span>
                </div>
              ) : (
                <div className={styles.timestamp}>Lectura no disponible</div>
              )}
            </div>

            <div className={styles.timestamp} suppressHydrationWarning>
              Última lectura:{' '}
              {moisture?.last_updated
                ? formatTelemetryTimestamp(moisture.last_updated)
                : 'Reciente'}
            </div>
          </div>

          {/* Tarjeta de Dispositivo / Hardware */}
          <div className={styles.hardwareCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>Dispositivo & Sensor</span>
            </div>

            <dl className={styles.hardwareList}>
              {/* Batería */}
              {hardware?.battery !== null && hardware?.battery !== undefined && (
                <div className={styles.hardwareItem}>
                  <dt className={styles.hardwareLabel}>
                    {getBatteryIcon(hardware.battery)} Batería
                  </dt>
                  <dd className={styles.hardwareValue}>{hardware.battery}%</dd>
                </div>
              )}

              {/* Conexión */}
              {hardware?.online !== null && hardware?.online !== undefined && (
                <div className={styles.hardwareItem}>
                  <dt className={styles.hardwareLabel}>
                    {hardware.online ? (
                      <Wifi size={14} className={styles.pillOnline} aria-hidden="true" />
                    ) : (
                      <WifiOff size={14} className={styles.pillOffline} aria-hidden="true" />
                    )}
                    Conexión
                  </dt>
                  <dd
                    className={`${styles.hardwareValue} ${
                      hardware.online ? styles.pillOnline : styles.pillOffline
                    }`}
                  >
                    {hardware.online ? 'En línea' : 'Desconectado'}
                  </dd>
                </div>
              )}

              {/* Frescura de Datos */}
              {hardware?.stale !== null && hardware?.stale !== undefined && (
                <div className={styles.hardwareItem}>
                  <dt className={styles.hardwareLabel}>
                    {hardware.stale ? (
                      <Clock size={14} className={styles.pillStale} aria-hidden="true" />
                    ) : (
                      <CheckCircle2 size={14} className={styles.pillFresh} aria-hidden="true" />
                    )}
                    Lectura
                  </dt>
                  <dd
                    className={`${styles.hardwareValue} ${
                      hardware.stale ? styles.pillStale : styles.pillFresh
                    }`}
                  >
                    {hardware.stale ? 'Desactualizada' : 'Al día'}
                  </dd>
                </div>
              )}
            </dl>

            {hardware?.last_seen && (
              <div className={styles.timestamp} suppressHydrationWarning>
                Última sincronización: {formatTelemetryTimestamp(hardware.last_seen)}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
