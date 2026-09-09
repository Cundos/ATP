'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        icon={<AlertCircle size={32} />}
        title="Ocurrió un error inesperado"
        description="No pudimos cargar la información del panel de control. Por favor, intenta nuevamente."
        action={
          <Button onClick={() => reset()} leftIcon={<RefreshCw size={18} />}>
            Reintentar
          </Button>
        }
      />
    </section>
  );
}
