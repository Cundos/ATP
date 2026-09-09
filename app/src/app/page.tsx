import React from 'react';
import Link from 'next/link';
import { Sprout, Plus, Trees } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function Home() {
  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Mi Jardín Botánico
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Monitoreo, estado sanitario y cuidados de tu colección botánica.
        </p>
      </div>

      <EmptyState
        icon={<Sprout size={28} />}
        title="Panel de Control (Dashboard)"
        description="Esta vista panorámica (SCR-001) mostrará métricas sanitarias y accesos rápidos en ATP-IMP-012."
        action={
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/plants/new">
              <Button leftIcon={<Plus size={18} />}>Nueva Planta</Button>
            </Link>
            <Link href="/inventory">
              <Button variant="secondary" leftIcon={<Trees size={18} />}>
                Ver Inventario
              </Button>
            </Link>
          </div>
        }
      />
    </section>
  );
}

