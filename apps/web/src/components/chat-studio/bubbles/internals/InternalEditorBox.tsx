'use client';

import React, { useState } from 'react';
import { MenuOption } from '../types';

export type ContentType = 'text_plain' | 'text_menu' | 'media_interactive' | 'image_menu' | 'single_function';

export interface InternalEditorBoxProps {
  initialText: string;
  initialContentType?: ContentType;
  initialMediaUrl?: string | null;
  initialActionKey?: string | null;
  initialOptions?: MenuOption[];
  onSave: (data: {
    responseMessage: string;
    contentType: ContentType;
    mediaUrl?: string | null;
    actionKey?: string | null;
    menuOptions: MenuOption[];
  }) => void;
  onCancel: () => void;
}

// Iconos SVG puros para la barra superior de herramientas y cabecera
const ToolIcons = {
  text: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  ),
  menu: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  ),
  media: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  ),
  function: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  close: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  save: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  ),
  plus: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
};

export default function InternalEditorBox({
  initialText,
  initialContentType = 'text_menu',
  initialMediaUrl = '',
  initialActionKey = 'custom.advanced_flow',
  initialOptions = [],
  onSave,
  onCancel
}: InternalEditorBoxProps) {
  const [contentType, setContentType] = useState<ContentType>(initialContentType);
  const [responseMessage, setResponseMessage] = useState(initialText);
  const [mediaUrl, setMediaUrl] = useState(initialMediaUrl || '');
  const [actionKey, setActionKey] = useState(initialActionKey || 'custom.advanced_flow');
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>(
    initialOptions && initialOptions.length > 0
      ? initialOptions
      : [
          { number: '1', label: 'Opción 1', actionKey: 'stock.check' },
          { number: '2', label: 'Opción 2', actionKey: 'support.human' }
        ]
  );

  const handleAddOption = () => {
    const nextNum = String(menuOptions.length + 1);
    setMenuOptions([
      ...menuOptions,
      { number: nextNum, label: `Opción ${nextNum}`, actionKey: 'custom.advanced_flow' }
    ]);
  };

  const handleRemoveOption = (index: number) => {
    const updated = menuOptions.filter((_, i) => i !== index).map((opt, i) => ({
      ...opt,
      number: String(i + 1)
    }));
    setMenuOptions(updated);
  };

  const handleOptionChange = (index: number, field: keyof MenuOption, value: string) => {
    const updated = [...menuOptions];
    updated[index] = { ...updated[index], [field]: value };
    setMenuOptions(updated);
  };

  const isMenuType = contentType === 'text_menu' || contentType === 'image_menu';
  const isMediaType = contentType === 'media_interactive' || contentType === 'image_menu';
  const isFunctionType = contentType === 'single_function' || contentType === 'media_interactive';

  // Título e Icono SVG flexible según la herramienta activa
  let headerTitle = 'Editor de Nodo';
  let HeaderIcon = ToolIcons.text;

  if (contentType === 'text_menu' || contentType === 'image_menu') {
    headerTitle = 'Editor de Menú Interactivo';
    HeaderIcon = ToolIcons.menu;
  } else if (contentType === 'media_interactive') {
    headerTitle = 'Editor de Multimedia';
    HeaderIcon = ToolIcons.media;
  } else if (contentType === 'single_function') {
    headerTitle = 'Editor de Función de Sistema';
    HeaderIcon = ToolIcons.function;
  } else {
    headerTitle = 'Editor de Texto Plano';
    HeaderIcon = ToolIcons.text;
  }

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '14px',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        border: 'none',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
        color: '#111b21',
        fontSize: '0.86rem'
      }}
    >
      <style>{`
        .editor-tool-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 2px;
          padding: 6px 8px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 0.68rem;
          font-weight: 600;
          transition: all 0.2s;
          flex: 1;
        }
        .editor-option-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background-color: #f8fafc;
          padding: 6px;
          border-radius: 6px;
        }
        @media (min-width: 768px) {
          .editor-tool-btn {
            flex-direction: row;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            font-size: 0.75rem;
          }
          .editor-option-row {
            flex-direction: row;
            gap: 6px;
            padding: 4px;
            background-color: transparent;
          }
        }
      `}</style>

      {/* 1. CABECERA SUPERIOR: TÍTULO FLEXIBLE CON SVG Y BOTÓN DE CERRAR AL LADO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00a884', fontWeight: 700, fontSize: '0.9rem' }}>
          <HeaderIcon />
          <span>{headerTitle}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}
          title="Cerrar editor"
        >
          <ToolIcons.close />
        </button>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS RESPONSIVE (VERTICAL EN MÓVIL, HORIZONTAL EN PC) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setContentType('text_plain')}
          title="Texto Plano"
          className="editor-tool-btn"
          style={{
            background: contentType === 'text_plain' ? '#00a884' : 'transparent',
            color: contentType === 'text_plain' ? '#ffffff' : '#475569',
          }}
        >
          <ToolIcons.text /> <span>Texto</span>
        </button>

        <button
          type="button"
          onClick={() => setContentType('text_menu')}
          title="Menú Interactivo"
          className="editor-tool-btn"
          style={{
            background: contentType === 'text_menu' ? '#00a884' : 'transparent',
            color: contentType === 'text_menu' ? '#ffffff' : '#475569',
          }}
        >
          <ToolIcons.menu /> <span>Menú</span>
        </button>

        <button
          type="button"
          onClick={() => setContentType('media_interactive')}
          title="Multimedia / Imagen"
          className="editor-tool-btn"
          style={{
            background: contentType === 'media_interactive' ? '#00a884' : 'transparent',
            color: contentType === 'media_interactive' ? '#ffffff' : '#475569',
          }}
        >
          <ToolIcons.media /> <span>Multimedia</span>
        </button>

        <button
          type="button"
          onClick={() => setContentType('single_function')}
          title="Función del Sistema"
          className="editor-tool-btn"
          style={{
            background: contentType === 'single_function' ? '#00a884' : 'transparent',
            color: contentType === 'single_function' ? '#ffffff' : '#475569',
          }}
        >
          <ToolIcons.function /> <span>Función</span>
        </button>
      </div>

      {/* Texto de Respuesta */}
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
          Mensaje / Texto del Bot:
        </label>
        <textarea
          value={responseMessage}
          onChange={(e) => setResponseMessage(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#f1f5f9',
            color: '#0f172a',
            fontSize: '0.88rem',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* URL de Imagen / Multimedia */}
      {isMediaType && (
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
            URL de la Imagen o Multimedia:
          </label>
          <input
            type="text"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Acción Asociada (actionKey) */}
      {isFunctionType && (
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
            Acción del Sistema (actionKey):
          </label>
          <select
            value={actionKey}
            onChange={(e) => setActionKey(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          >
            <option value="custom.advanced_flow">Flujo Avanzado / Libre</option>
            <option value="stock.check">Consulta de Stock</option>
            <option value="turnos.book">Reserva de Turnos</option>
            <option value="pedidos.create">Crear Pedido</option>
            <option value="business.payment_info">Datos de Pago</option>
            <option value="support.human">Derivar a Humano</option>
          </select>
        </div>
      )}

      {/* Gestor de Opciones de Menú */}
      {isMenuType && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
              Opciones del Menú Interactivo:
            </span>
            <button
              type="button"
              onClick={handleAddOption}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ToolIcons.plus /> Añadir Opción
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {menuOptions.map((opt, idx) => (
              <div key={idx} className="editor-option-row" style={{ alignItems: 'center' }}>
                <input
                  type="text"
                  value={opt.number || String(idx + 1)}
                  onChange={(e) => handleOptionChange(idx, 'number', e.target.value)}
                  style={{ width: '100%', maxWidth: '45px', padding: '6px', textAlign: 'center', borderRadius: '4px', border: 'none', backgroundColor: '#f1f5f9', fontSize: '0.8rem', outline: 'none' }}
                />
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                  placeholder="Texto de opción"
                  style={{ flex: 1, width: '100%', padding: '6px 8px', borderRadius: '4px', border: 'none', backgroundColor: '#f1f5f9', fontSize: '0.8rem', outline: 'none' }}
                />
                <select
                  value={opt.actionKey || 'custom.advanced_flow'}
                  onChange={(e) => handleOptionKeyChange(idx, e.target.value)} // wait, handleOptionChange
                  onChange={(e) => handleOptionChange(idx, 'actionKey', e.target.value)}
                  style={{ width: '100%', maxWidth: '120px', padding: '6px', borderRadius: '4px', border: 'none', backgroundColor: '#f1f5f9', fontSize: '0.75rem', outline: 'none' }}
                >
                  <option value="custom.advanced_flow">Flujo</option>
                  <option value="stock.check">Stock</option>
                  <option value="turnos.book">Turnos</option>
                  <option value="pedidos.create">Pedido</option>
                  <option value="support.human">Humano</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                  title="Eliminar"
                >
                  <ToolIcons.close />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de Guardar / Cancelar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#f1f5f9',
            fontSize: '0.8rem',
            cursor: 'pointer',
            color: '#475569'
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            onSave({
              responseMessage,
              contentType,
              mediaUrl: isMediaType ? mediaUrl : null,
              actionKey: isFunctionType ? actionKey : null,
              menuOptions: isMenuType ? menuOptions : []
            });
          }}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#00a884',
            color: '#ffffff',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ToolIcons.save /> Guardar Cambios al Instante
        </button>
      </div>
    </div>
  );
}
