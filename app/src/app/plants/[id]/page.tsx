import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Tag } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

interface PlantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlantDetailPage({ params }: PlantDetailPageProps) {
  const { id } = await params;

  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/inventory" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--brand-primary)', marginBottom: '12px' }}>
          <ArrowLeft size={16} /> Volver al Inventario
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Ficha del Ejemplar: {id}
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Vista de detalle individual botánico (SCR-003).
        </p>
      </div>

      <EmptyState
        icon={<Tag size={28} />}
        title={`Ejemplar ${id}`}
        description="La ficha individual detallada con taxonomía, foto principal y perfil de cultivo se implementará en ATP-IMP-013."
        action={
          <Link href="/inventory">
            <Button variant="secondary" leftIcon={<ArrowLeft size={18} />}>
              Volver al Catálogo
            </Button>
          </Link>
        }
      />
    </section>
  );
}
