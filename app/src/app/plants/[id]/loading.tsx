import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PlantDetailLoading() {
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
        <div
          style={{
            height: '28px',
            width: '200px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            opacity: 0.6,
            animation: 'pulse 1.5s infinite',
            marginBottom: '8px',
          }}
        />
        <div
          style={{
            height: '16px',
            width: '140px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            opacity: 0.6,
            animation: 'pulse 1.5s infinite',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            height: '140px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            opacity: 0.6,
            animation: 'pulse 1.5s infinite',
          }}
        />
        <div
          style={{
            height: '120px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            opacity: 0.6,
            animation: 'pulse 1.5s infinite',
          }}
        />
        <div
          style={{
            height: '120px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            opacity: 0.6,
            animation: 'pulse 1.5s infinite',
          }}
        />
      </div>
    </section>
  );
}
