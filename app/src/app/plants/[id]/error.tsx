'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function PlantDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/inventory"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.875rem',
            color: 'var(--brand-primary)',
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} /> Volver al Inventario
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Ficha del Ejemplar
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Detalle individual y cuidados botánicos.
        </p>
      </div>

      <EmptyState
        icon={<AlertCircle size={32} />}
        title="No pudimos cargar la ficha de la planta"
        description="Ocurrió un problema de conexión al recuperar los datos del ejemplar. Por favor, intenta nuevamente."
        action={
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button onClick={() => reset()} leftIcon={<RefreshCw size={18} />}>
              Reintentar
            </Button>
            <Link href="/inventory">
              <Button variant="secondary" leftIcon={<ArrowLeft size={18} />}>
                Volver al Catálogo
              </Button>
            </Link>
          </div>
        }
      />
    </section>
  );
}
