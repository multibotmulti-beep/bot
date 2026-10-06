'use client';

export default function DebugResponsePanel({
  data,
  title,
}: {
  data: any;
  title: string;
}) {
  return (
    <div
      style={{
        margin: '1rem 0',
        padding: '1rem',
        border: '2px dashed var(--color-warning)',
        borderRadius: '8px',
        backgroundColor: 'var(--color-warning-bg)',
        fontSize: '0.75rem',
        overflowX: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-warning)' }}>
        {title}
      </h3>
      <pre style={{ margin: 0 }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
