import React from 'react';
import Link from 'next/link';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function NewPlantPage() {
  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Nueva Planta
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Alta y asignación automática de código permanente (SCR-004).
        </p>
      </div>

      <EmptyState
        icon={<PlusCircle size={28} />}
        title="Formulario de Alta de Ejemplar"
        description="Esta pantalla implementará el alta de plantas con validación de nombre común y selección de ubicación en ATP-IMP-014."
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
