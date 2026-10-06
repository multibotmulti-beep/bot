export default function HelpPanel() {
  return (
    <div style={{ padding: '24px', textAlign: 'left' }}>
      <h1>Ayuda y Soporte</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Documentación oficial de la plantilla y guías de uso.</p>
      
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Preguntas Frecuentes</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Esta plantilla está diseñada con arquitectura modular para escalabilidad máxima bajo estándares Material Design 3.</p>
      </div>
    </div>
  );
}
