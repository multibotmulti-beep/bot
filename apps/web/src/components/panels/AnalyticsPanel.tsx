export default function AnalyticsPanel() {
  return (
    <div style={{ padding: '24px', textAlign: 'left' }}>
      <h1>Analíticas y Reportes</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Monitoreo en tiempo real de actividad y métricas clave del sistema.</p>
      
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Métricas de Uso General</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Sin datos recientes registrados en el periodo actual.</p>
      </div>
    </div>
  );
}
