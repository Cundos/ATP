import React from 'react';

export default function RegionalLoading() {
  return (
    <section>
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            width: '120px',
            height: '22px',
            backgroundColor: 'var(--brand-primary-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '8px',
            opacity: 0.6,
          }}
        />
        <div
          style={{
            width: '260px',
            height: '32px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '8px',
            opacity: 0.7,
          }}
        />
        <div
          style={{
            width: '180px',
            height: '18px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-sm)',
            opacity: 0.5,
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              height: '160px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </section>
  );
}
