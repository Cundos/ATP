'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Trees, Filter, Plus, X } from 'lucide-react';
import { PlantEntity, LocationEntity, HealthStatus } from '@/core/domain/entities';
import { HealthBadge, Button, EmptyState, Select } from '@/components/ui';
import { PlantCard } from './PlantCard';
import styles from './PlantCatalogView.module.css';

export interface PlantCatalogViewProps {
  initialPlants: PlantEntity[];
  locations: LocationEntity[];
}

type SortOption = 'code_asc' | 'name_asc' | 'created_desc';

const HEALTH_FILTERS: Array<{ key: string; label: string; status?: HealthStatus }> = [
  { key: 'ALL', label: 'Todos' },
  { key: 'HEALTHY', label: 'Saludables', status: 'HEALTHY' },
  { key: 'ATTENTION', label: 'Atención', status: 'ATTENTION' },
  { key: 'RECOVERY', label: 'Recuperación', status: 'RECOVERY' },
  { key: 'UNKNOWN', label: 'Sin evaluar', status: 'UNKNOWN' },
];

export const PlantCatalogView: React.FC<PlantCatalogViewProps> = ({
  initialPlants,
  locations,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Obtener estado sincronizado con query params
  const searchQuery = searchParams.get('q') || '';
  const selectedHealth = searchParams.get('health') || 'ALL';
  const selectedLocation = searchParams.get('location') || 'ALL';
  const selectedSort = (searchParams.get('sort') as SortOption) || 'code_asc';

  // Helper para actualizar search params en URL de manera limpia
  const updateQueryParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'ALL' || (key === 'sort' && value === 'code_asc')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  };

  // Conteos por estado de salud sobre el dataset total activo
  const healthCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: initialPlants.length,
      HEALTHY: 0,
      ATTENTION: 0,
      RECOVERY: 0,
      UNKNOWN: 0,
    };
    initialPlants.forEach((p) => {
      if (counts[p.health_status] !== undefined) {
        counts[p.health_status]++;
      }
    });
    return counts;
  }, [initialPlants]);

  // Filtrado y ordenación
  const filteredPlants = useMemo(() => {
    return initialPlants
      .filter((plant) => {
        // 1. Filtro de búsqueda por texto (common_name, scientific_name, permanent_code)
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const matchCode = plant.permanent_code.toLowerCase().includes(query);
          const matchCommon = plant.common_name.toLowerCase().includes(query);
          const matchScientific = plant.scientific_name?.toLowerCase().includes(query) || false;
          if (!matchCode && !matchCommon && !matchScientific) {
            return false;
          }
        }

        // 2. Filtro de estado sanitario
        if (selectedHealth !== 'ALL') {
          if (plant.health_status !== selectedHealth) {
            return false;
          }
        }

        // 3. Filtro de ubicación
        if (selectedLocation !== 'ALL') {
          if (selectedLocation === 'NONE') {
            if (plant.location_id !== null && plant.location_id !== undefined) {
              return false;
            }
          } else if (plant.location_id !== selectedLocation) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'name_asc') {
          return a.common_name.localeCompare(b.common_name, 'es', { sensitivity: 'base' });
        }
        if (selectedSort === 'created_desc') {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeB - timeA;
        }
        // default: permanent_code ASC (ej. AT-PL-001, AT-PL-002)
        return a.permanent_code.localeCompare(b.permanent_code, undefined, { numeric: true });
      });
  }, [initialPlants, searchQuery, selectedHealth, selectedLocation, selectedSort]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedHealth !== 'ALL' || selectedLocation !== 'ALL';

  const clearAllFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  const locationOptions = [
    { value: 'ALL', label: 'Todas las ubicaciones' },
    { value: 'NONE', label: 'Sin ubicación' },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  const sortOptions = [
    { value: 'code_asc', label: 'Código (AT-PL-001...)' },
    { value: 'name_asc', label: 'Nombre común (A-Z)' },
    { value: 'created_desc', label: 'Fecha de registro (recientes)' },
  ];

  return (
    <div className={styles.container}>
      {/* Search & Sort Row */}
      <div className={styles.searchSortBar}>
        <div className={styles.searchWrapper}>
          <label htmlFor="inventory-search" className={styles.srOnly}>
            Buscar por nombre común, científico o código
          </label>
          <div className={styles.searchInputContainer}>
            <Search size={18} className={styles.searchIcon} aria-hidden="true" />
            <input
              id="inventory-search"
              type="search"
              value={searchQuery}
              onChange={(e) => updateQueryParams({ q: e.target.value })}
              placeholder="Buscar por nombre o código (ej. Monstera, AT-PL-001)..."
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => updateQueryParams({ q: null })}
                className={styles.clearSearchBtn}
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className={styles.sortWrapper}>
          <Select
            id="inventory-sort"
            label="Ordenar por"
            value={selectedSort}
            onChange={(e) => updateQueryParams({ sort: e.target.value })}
            options={sortOptions}
            className={styles.sortSelect}
          />
        </div>
      </div>

      {/* Health Filters Pills */}
      <div className={styles.healthFiltersRow} role="group" aria-label="Filtros por estado de salud">
        {HEALTH_FILTERS.map((filter) => {
          const isSelected = selectedHealth === filter.key;
          const count = healthCounts[filter.key] ?? 0;

          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => updateQueryParams({ health: isSelected ? 'ALL' : filter.key })}
              className={`${styles.filterPill} ${isSelected ? styles.filterPillActive : ''}`}
              aria-pressed={isSelected}
            >
              {filter.status ? (
                <HealthBadge status={filter.status} size="sm" showDot={true} />
              ) : (
                <span className={styles.pillLabel}>{filter.label}</span>
              )}
              <span className={styles.pillCount} aria-label={`${count} plantas`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary Location Filter & Stats Bar */}
      <div className={styles.secondaryFilterBar}>
        <div className={styles.locationFilterWrapper}>
          <label htmlFor="inventory-location-filter" className={styles.locationFilterLabel}>
            <Filter size={15} aria-hidden="true" />
            <span>Ubicación:</span>
          </label>
          <select
            id="inventory-location-filter"
            value={selectedLocation}
            onChange={(e) => updateQueryParams({ location: e.target.value })}
            className={styles.locationSelect}
          >
            {locationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.resultsCount} role="status">
          Mostrando <strong>{filteredPlants.length}</strong> de {initialPlants.length} ejemplares
        </div>
      </div>

      {/* Main Grid / Empty State */}
      {filteredPlants.length > 0 ? (
        <div className={styles.grid} role="region" aria-label="Listado de ejemplares activos">
          {filteredPlants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      ) : initialPlants.length === 0 ? (
        <EmptyState
          icon={<Trees size={32} />}
          title="Sin plantas en el inventario"
          description="Aún no se han registrado ejemplares botánicos en la colección."
          action={
            <Button
              onClick={() => router.push('/plants/new')}
              leftIcon={<Plus size={18} />}
            >
              Registrar Primera Planta
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={<Search size={32} />}
          title="Sin resultados para la búsqueda o filtros"
          description="No encontramos ejemplares activos que coincidan con los criterios seleccionados."
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={clearAllFilters}>
                Limpiar Filtros
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
};
