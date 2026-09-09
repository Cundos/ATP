import React from 'react';
import Link from 'next/link';
import { Archive, ArrowLeft } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function ArchivedPlantsPage() {
  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Plantas Archivadas
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Historial y recuperación de ejemplares dados de baja (SCR-006).
        </p>
      </div>

      <EmptyState
        icon={<Archive size={28} />}
        title="Historial de Plantas Archivadas"
        description="Esta vista secundaria permitirá consultar y desarchivar ejemplares dados de baja sin perder su código permanente."
        action={
          <Link href="/inventory">
            <Button variant="secondary" leftIcon={<ArrowLeft size={18} />}>
              Volver al Inventario
            </Button>
          </Link>
        }
      />
    </section>
  );
}
