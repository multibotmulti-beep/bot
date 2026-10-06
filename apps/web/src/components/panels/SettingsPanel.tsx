export default function SettingsPanel() {
  return (
    <div style={{ padding: '24px', textAlign: 'left' }}>
      <h1>Configuración General</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Ajustes de la aplicación y preferencias de usuario centralizadas.</p>
      
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Preferencias de Interfaz</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Utiliza el menú flotante del Dock inferior para alternar el tema claro/oscuro.</p>
      </div>
    </div>
  );
}
