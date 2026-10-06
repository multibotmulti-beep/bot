'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';

interface MenuOption {
  id: string;
  number: string;
  label: string;
  targetMenuId: string;
}

interface BotMenu {
  id: string;
  title: string;
  triggerKey: string;
  welcomeMessage: string;
  exitMessage: string;
  options: MenuOption[];
  parentId: string | null;
}

export default function BotBuilderPanel() {
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);

  // Estado inicial de menús jerárquicos del bot
  const [menus, setMenus] = useState<BotMenu[]>([
    {
      id: 'root',
      title: 'Menú Principal',
      triggerKey: 'hola',
      welcomeMessage: '¡Bienvenido a nuestro negocio! Por favor elige una opción:',
      exitMessage: 'Gracias por comunicarte con nosotros. ¡Hasta luego!',
      parentId: null,
      options: [
        { id: 'opt-1', number: '1', label: 'Ver Productos y Catálogo', targetMenuId: 'catalog' },
        { id: 'opt-2', number: '2', label: 'Horarios y Ubicación', targetMenuId: 'hours' },
        { id: 'opt-3', number: '3', label: 'Hablar con un Asesor', targetMenuId: 'support' },
      ],
    },
    {
      id: 'catalog',
      title: 'Submenú: Catálogo',
      triggerKey: '1',
      welcomeMessage: 'Selecciona una categoría de productos:',
      exitMessage: 'Regresando...',
      parentId: 'root',
      options: [
        { id: 'opt-11', number: '1', label: 'Ofertas del Día', targetMenuId: 'root' },
        { id: 'opt-12', number: '2', label: 'Nuevos Lanzamientos', targetMenuId: 'root' },
      ],
    },
    {
      id: 'hours',
      title: 'Submenú: Horarios',
      triggerKey: '2',
      welcomeMessage: 'Atendemos de Lunes a Sábados de 9:00 AM a 8:00 PM.',
      exitMessage: 'Regresando...',
      parentId: 'root',
      options: [],
    },
    {
      id: 'support',
      title: 'Submenú: Asesor',
      triggerKey: '3',
      welcomeMessage: 'Derivando con un representante humano...',
      exitMessage: 'Regresando...',
      parentId: 'root',
      options: [],
    },
  ]);

  const [selectedMenuId, setSelectedMenuId] = useState<string>('root');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeMenu = menus.find((m) => m.id === selectedMenuId) || menus[0];

  const handleSelectMenu = (id: string) => {
    setSelectedMenuId(id);
    if (isMobileView) {
      setMobileShowEditor(true);
    }
    logger.info({ menuId: id }, 'Seleccionando menú de bot para editar');
  };

  const handleUpdateActiveMenu = (fields: Partial<BotMenu>) => {
    setMenus((prev) =>
      prev.map((m) => (m.id === activeMenu.id ? { ...m, ...fields } : m))
    );
    logger.info({ menuId: activeMenu.id, fields }, 'Actualizando menú de bot');
  };

  const handleAddOption = () => {
    const newOpt: MenuOption = {
      id: 'opt-' + Date.now(),
      number: String(activeMenu.options.length + 1),
      label: 'Nueva Opción',
      targetMenuId: 'root',
    };
    handleUpdateActiveMenu({ options: [...activeMenu.options, newOpt] });
  };

  const handleDeleteOption = (optId: string) => {
    handleUpdateActiveMenu({
      options: activeMenu.options.filter((o) => o.id !== optId),
    });
  };

  const handleUpdateOption = (optId: string, fields: Partial<MenuOption>) => {
    handleUpdateActiveMenu({
      options: activeMenu.options.map((o) => (o.id === optId ? { ...o, ...fields } : o)),
    });
  };

  const handleCreateSubmenu = () => {
    const newMenuId = 'menu-' + Date.now();
    const newMenu: BotMenu = {
      id: newMenuId,
      title: 'Nuevo Submenú',
      triggerKey: String(activeMenu.options.length + 1),
      welcomeMessage: 'Mensaje de bienvenida del submenú...',
      exitMessage: 'Mensaje de salida...',
      parentId: activeMenu.id,
      options: [],
    };

    const newOpt: MenuOption = {
      id: 'opt-' + Date.now(),
      number: String(activeMenu.options.length + 1),
      label: newMenu.title,
      targetMenuId: newMenuId,
    };

    setMenus((prev) => [...prev, newMenu]);
    handleUpdateActiveMenu({ options: [...activeMenu.options, newOpt] });
    setSelectedMenuId(newMenuId);
    logger.info({ newMenuId }, 'Creado nuevo submenú jerárquico');
  };

  return (
    <div style={{ padding: '8px 24px 24px 24px', textAlign: 'left', height: 'calc(100vh - 85px)', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ marginTop: '8px', marginBottom: '8px' }}>Asistente Creador de Bots (WhatsApp)</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
        Diseña menús interactivos por números de forma visual y sin código. Crea submenús infinitos y configura la atención automática.
      </p>

      {/* Contenedor Dual-Column / Adaptativo estilo WhatsApp */}
      <div
        style={{
          flex: 1,
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)',
          display: 'grid',
          gridTemplateColumns: isMobileView ? '1fr' : '280px 1fr',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Columna Izquierda: Árbol de Menús */}
        {(!isMobileView || !mobileShowEditor) && (
          <div
            style={{
              borderRight: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--color-background)',
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Estructura de Menús</span>
              <button
                onClick={handleCreateSubmenu}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Submenú
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {menus.map((menu) => (
                <div
                  key={menu.id}
                  onClick={() => handleSelectMenu(menu.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: selectedMenuId === menu.id ? 'var(--color-surface)' : 'transparent',
                    border: selectedMenuId === menu.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '6px',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: selectedMenuId === menu.id ? 'var(--color-primary)' : 'var(--color-text)' }}>
                    {menu.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Activador: &quot;{menu.triggerKey}&quot; • {menu.options.length} opciones
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Columna Derecha: Editor Visual del Menú Activo */}
        {(!isMobileView || mobileShowEditor) && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: 'var(--color-surface)' }}>
            {/* Cabecera del Editor */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--color-background)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isMobileView && (
                  <button
                    onClick={() => setMobileShowEditor(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}
                  >
                    &larr; Volver
                  </button>
                )}
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Editando: {activeMenu.title}</h3>
              </div>
            </div>

            {/* Formulario de Configuración */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Nombre del Menú</label>
                  <input
                    type="text"
                    value={activeMenu.title}
                    onChange={(e) => handleUpdateActiveMenu({ title: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Palabra / Número Activador</label>
                  <input
                    type="text"
                    value={activeMenu.triggerKey}
                    onChange={(e) => handleUpdateActiveMenu({ triggerKey: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Mensaje de Bienvenida del Menú</label>
                <textarea
                  rows={3}
                  value={activeMenu.welcomeMessage}
                  onChange={(e) => handleUpdateActiveMenu({ welcomeMessage: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', resize: 'vertical' }}
                />
              </div>

              {/* Sección de Opciones Numéricas del Menú */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Opciones del Menú (Numéricas)</h4>
                  <button
                    onClick={handleAddOption}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary)',
                      borderRadius: '16px',
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Agregar Opción
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeMenu.options.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      Este menú no tiene opciones configuradas.
                    </p>
                  ) : (
                    activeMenu.options.map((opt) => (
                      <div
                        key={opt.id}
                        style={{
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          padding: '10px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <input
                          type="text"
                          value={opt.number}
                          onChange={(e) => handleUpdateOption(opt.id, { number: e.target.value })}
                          style={{ width: '50px', padding: '8px', textAlign: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                        />
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => handleUpdateOption(opt.id, { label: e.target.value })}
                          placeholder="Texto de la opción (ej. Comprar producto)"
                          style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                        />
                        <button
                          onClick={() => handleDeleteOption(opt.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Mensaje de Salida / Volver</label>
                <input
                  type="text"
                  value={activeMenu.exitMessage}
                  onChange={(e) => handleUpdateActiveMenu({ exitMessage: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
