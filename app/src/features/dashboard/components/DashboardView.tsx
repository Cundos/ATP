import React from 'react';
import Link from 'next/link';
import {
  Sprout,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { PlantEntity } from '@/core/domain/entities';
import { Button, EmptyState, HealthBadge } from '@/components/ui';
import { PlantThumbnail } from '@/features/plants/components/PlantThumbnail';
import { DashboardMetricCard } from './DashboardMetricCard';
import styles from './DashboardView.module.css';

export interface DashboardViewProps {
  plants: PlantEntity[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ plants }) => {
  const total = plants.length;

  // Derivación de métricas a partir del dataset real
  const counts = {
    healthy: plants.filter((p) => p.health_status === 'HEALTHY').length,
    attention: plants.filter((p) => p.health_status === 'ATTENTION').length,
    recovery: plants.filter((p) => p.health_status === 'RECOVERY').length,
    unknown: plants.filter((p) => p.health_status === 'UNKNOWN').length,
  };

  const requiringAttentionCount = counts.attention + counts.recovery;
  const attentionPlants = plants
    .filter((p) => p.health_status === 'ATTENTION' || p.health_status === 'RECOVERY')
    .slice(0, 3);

  if (total === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.welcomeSection}>
          <h1 className={styles.title}>Mi Jardín Botánico</h1>
          <p className={styles.subtitle}>
            Monitoreo, estado sanitario y cuidados de tu colección botánica.
          </p>
        </div>

        <EmptyState
          icon={<Sprout size={32} />}
          title="Tu colección está vacía"
          description="Aún no tienes plantas activas registradas en tu inventario botánico."
          action={
            <Link href="/plants/new">
              <Button leftIcon={<Plus size={18} />}>Registrar Primera Planta</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Saludo y Cabecera */}
      <div className={styles.welcomeSection}>
        <h1 className={styles.title}>Mi Jardín Botánico</h1>
        <p className={styles.subtitle}>
          {total === 1 ? '1 ejemplar en cultivo' : `${total} ejemplares en cultivo`}
        </p>
      </div>

      {/* Mensaje Contextual de Síntesis */}
      <div className={styles.summaryBanner} role="status" aria-live="polite">
        <p className={styles.bannerTitle}>
          {requiringAttentionCount > 0
            ? `${requiringAttentionCount} ${
                requiringAttentionCount === 1 ? 'ejemplar requiere' : 'ejemplares requieren'
              } seguimiento`
            : 'Colección sin alertas activas'}
        </p>
        <p className={styles.bannerSubtitle}>
          {requiringAttentionCount > 0
            ? `${counts.attention} en atención y ${counts.recovery} en recuperación.`
            : 'Todos tus ejemplares evaluados se encuentran en estado saludable.'}
        </p>
      </div>

      {/* Métricas Principales */}
      <section className={styles.metricsSection} aria-label="Métricas de la colección">
        <div className={styles.totalRow}>
          <DashboardMetricCard
            label="Total Colección Activa"
            value={total}
            href="/inventory"
            isPrimary={true}
          />
        </div>

        <div className={styles.healthGrid}>
          <DashboardMetricCard
            label="Saludables"
            value={counts.healthy}
            href="/inventory?health=HEALTHY"
            healthStatus="HEALTHY"
          />
          <DashboardMetricCard
            label="Atención"
            value={counts.attention}
            href="/inventory?health=ATTENTION"
            healthStatus="ATTENTION"
          />
          <DashboardMetricCard
            label="Recuperación"
            value={counts.recovery}
            href="/inventory?health=RECOVERY"
            healthStatus="RECOVERY"
          />
          <DashboardMetricCard
            label="Sin evaluar"
            value={counts.unknown}
            href="/inventory?health=UNKNOWN"
            healthStatus="UNKNOWN"
          />
        </div>
      </section>

      {/* Sección de Ejemplares que requieren seguimiento */}
      {attentionPlants.length > 0 && (
        <section className={styles.attentionSection} aria-label="Ejemplares que requieren seguimiento">
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Requieren Seguimiento</h2>
            <Link href="/inventory?health=ATTENTION" className={styles.seeAllLink}>
              Ver inventario →
            </Link>
          </div>
          <div className={styles.attentionGrid}>
            {attentionPlants.map((plant) => {
              const primaryPhoto = plant.photos?.find((p) => p.is_primary) || plant.photos?.[0];
              return (
                <Link
                  key={plant.id}
                  href={`/plants/${plant.permanent_code}`}
                  className={styles.attentionCard}
                  aria-label={`Ver ejemplar ${plant.common_name} (${plant.permanent_code})`}
                >
                  <PlantThumbnail
                    photoPath={primaryPhoto?.file_path}
                    plantName={plant.common_name}
                    size="sm"
                    className={styles.attentionThumbnail}
                  />
                  <div className={styles.attentionInfo}>
                    <div className={styles.attentionTop}>
                      <span className={styles.attentionCode}>{plant.permanent_code}</span>
                      <HealthBadge status={plant.health_status} size="sm" />
                    </div>
                    <span className={styles.attentionName}>{plant.common_name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Acción Principal CTA */}
      <section className={styles.ctaSection} aria-label="Acción principal">
        <Link href="/plants/new" className={styles.ctaLink}>
          <Button fullWidth size="lg" leftIcon={<Plus size={20} />}>
            Nueva Planta
          </Button>
        </Link>
      </section>

      {/* Accesos Secundarios */}
      <section className={styles.quickNavSection} aria-label="Accesos secundarios">
        <h2 className={styles.sectionTitle}>Accesos Rápidos</h2>
        <div className={styles.quickNavGrid}>
          <Link href="/inventory" className={styles.quickNavLink}>
            <div className={styles.quickNavText}>
              <span className={styles.quickNavTitle}>Inventario Completo</span>
              <span className={styles.quickNavDesc}>Ver y filtrar los {total} ejemplares</span>
            </div>
            <ArrowRight size={16} className={styles.quickNavArrow} />
          </Link>

          <Link href="/locations" className={styles.quickNavLink}>
            <div className={styles.quickNavText}>
              <span className={styles.quickNavTitle}>Ubicaciones</span>
              <span className={styles.quickNavDesc}>Administrar espacios físicos</span>
            </div>
            <ArrowRight size={16} className={styles.quickNavArrow} />
          </Link>

          <Link href="/plants/archived" className={styles.quickNavLink}>
            <div className={styles.quickNavText}>
              <span className={styles.quickNavTitle}>Plantas Archivadas</span>
              <span className={styles.quickNavDesc}>Historial de bajas</span>
            </div>
            <ArrowRight size={16} className={styles.quickNavArrow} />
          </Link>
        </div>
      </section>
    </div>
  );
};
