import React from 'react';
import Link from 'next/link';
import { MapPin, ArrowLeft } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function LocationsPage() {
  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Catálogo de Ubicaciones
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Administración de ubicaciones físicas controladas (SCR-007).
        </p>
      </div>

      <EmptyState
        icon={<MapPin size={28} />}
        title="Gestión de Ubicaciones"
        description="Esta vista permitirá crear, renombrar y archivar ubicaciones normalizadas en ATP-IMP-015."
        action={
          <Link href="/">
            <Button variant="secondary" leftIcon={<ArrowLeft size={18} />}>
              Volver al Inicio
            </Button>
          </Link>
        }
      />
    </section>
  );
}
