import React from 'react';
import Link from 'next/link';
import { SearchX, ArrowLeft } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function PlantNotFound() {
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
          Ejemplar No Encontrado
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          No localizamos el código o identificador solicitado en la colección.
        </p>
      </div>

      <EmptyState
        icon={<SearchX size={32} />}
        title="Planta inexistente o desvinculada"
        description="El código permanente ingresado no coincide con ningún registro activo o archivado de tu colección botánica."
        action={
          <Link href="/inventory">
            <Button leftIcon={<ArrowLeft size={18} />}>Ir al Inventario</Button>
          </Link>
        }
      />
    </section>
  );
}
