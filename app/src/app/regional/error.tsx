'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function RegionalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Flora Regional y Fenología
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Información estacional de tu región ecológica.
        </p>
      </div>

      <EmptyState
        icon={<AlertCircle size={32} />}
        title="No pudimos cargar la flora regional"
        description="Ocurrió un inconveniente al consultar los eventos estacionales. Por favor, intenta nuevamente."
        action={
          <Button onClick={() => reset()} leftIcon={<RefreshCw size={18} />}>
            Reintentar
          </Button>
        }
      />
    </section>
  );
}
