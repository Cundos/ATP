import React from 'react';
import Link from 'next/link';
import { Trees, Plus } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function InventoryPage() {
  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Inventario de Plantas
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Catálogo completo de ejemplares activos (SCR-002).
        </p>
      </div>

      <EmptyState
        icon={<Trees size={28} />}
        title="Catálogo de Plantas Activas"
        description="Esta pantalla mostrará las plantas registradas con búsqueda, filtros sanitarios y ordenación en ATP-IMP-011."
        action={
          <Link href="/plants/new">
            <Button leftIcon={<Plus size={18} />}>Registrar Primer Ejemplar</Button>
          </Link>
        }
      />
    </section>
  );
}
