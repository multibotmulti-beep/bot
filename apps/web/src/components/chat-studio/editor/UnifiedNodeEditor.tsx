'use client';

import React, { useState } from 'react';
import { ChatIcons } from '../icons/ChatIcons';

export type ContentType = 'text_plain' | 'text_menu' | 'media_interactive' | 'image_menu' | 'single_function';

export interface MenuOptionItem {
  number?: string;
  option?: string;
  label: string;
  actionKey?: string;
}

export interface UnifiedNodeEditorProps {
  initialData?: {
    responseMessage?: string;
    contentType?: ContentType;
    mediaUrl?: string | null;
    actionKey?: string | null;
    options?: MenuOptionItem[];
  };
  isCreation?: boolean;
  nodeTitle?: string;
  hasExistingMenu?: boolean;
  onSave: (data: {
    responseMessage: string;
    contentType: ContentType;
    mediaUrl?: string | null;
    actionKey?: string | null;
    menuOptions: MenuOptionItem[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function UnifiedNodeEditor({
  initialData,
  isCreation = false,
  nodeTitle = 'Editor Unificado de Nodo',
  hasExistingMenu = false,
  onSave,
  onCancel
}: UnifiedNodeEditorProps) {
  const [contentType, setContentType] = useState<ContentType>(initialData?.contentType || 'text_menu');
  const [responseMessage, setResponseMessage] = useState<string>(initialData?.responseMessage || '');
  const [mediaUrl, setMediaUrl] = useState<string>(initialData?.mediaUrl || '');
  const [actionKey, setActionKey] = useState<string>(initialData?.actionKey || 'custom.advanced_flow');
  const [menuOptions, setMenuOptions] = useState<MenuOptionItem[]>(
    initialData?.options && initialData.options.length > 0
      ? initialData.options
      : [
          { number: '1', option: '1', label: 'Opción 1', actionKey: 'stock.check' },
          { number: '2', option: '2', label: 'Opción 2', actionKey: 'support.human' }
        ]
  );
  const [statusText, setStatusText] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const handleAddOption = () => {
    const nextNum = String(menuOptions.length + 1);
    setMenuOptions([
      ...menuOptions,
      { number: nextNum, option: nextNum, label: `Opción ${nextNum}`, actionKey: 'custom.advanced_flow' }
    ]);
  };

  const handleRemoveOption = (index: number) => {
    const updated = menuOptions.filter((_, i) => i !== index).map((opt, i) => ({
      ...opt,
      number: String(i + 1),
      option: String(i + 1)
    }));
    setMenuOptions(updated);
  };

  const handleOptionChange = (index: number, field: keyof MenuOptionItem, value: string) => {
    const updated = [...menuOptions];
    updated[index] = { ...updated[index], [field]: value };
    setMenuOptions(updated);
  };

  const handleSaveClick = async () => {
    if (!responseMessage.trim()) {
      setStatusText('El texto de respuesta es obligatorio.');
      return;
    }
    if ((contentType === 'text_menu' || contentType === 'image_menu') && hasExistingMenu && isCreation) {
      setStatusText('Este turno ya posee un menú configurado. Solo se permite un menú por turno.');
      return;
    }
    setSaving(true);
    setStatusText('Guardando en base de datos...');
    try {
      await onSave({
        responseMessage,
        contentType,
        mediaUrl: (contentType === 'media_interactive' || contentType === 'image_menu') ? mediaUrl : null,
        actionKey: (contentType === 'single_function' || contentType === 'media_interactive') ? actionKey : null,
        menuOptions: (contentType === 'text_menu' || contentType === 'image_menu') ? menuOptions : []
      });
      setStatusText('¡Guardado con éxito!');
      setTimeout(() => {
        setStatusText(null);
        setSaving(false);
      }, 800);
    } catch (err: any) {
      setStatusText(`Error: ${err.message}`);
      setSaving(false);
    }
  };

  const isMenuType = contentType === 'text_menu' || contentType === 'image_menu';
  const isMediaType = contentType === 'media_interactive' || contentType === 'image_menu';
  const isFunctionType = contentType === 'single_function' || contentType === 'media_interactive';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        color: '#111b21',
        fontSize: '0.86rem',
        overflow: 'hidden'
      }}
    >
      {/* Cabecera del Editor Unificado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#00a884', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ChatIcons.Tool />
          <span>{nodeTitle}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '2px' }}
        >
          <ChatIcons.Close />
        </button>
      </div>

      {/* Selector de Tipo de Contenido */}
      <div>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
          Tipo de Respuesta / Nodo:
        </label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
          {[
            { id: 'text_plain', label: 'Texto', icon: <ChatIcons.Text /> },
            { id: 'text_menu', label: 'Menú', icon: <ChatIcons.Menu /> },
            { id: 'image_menu', label: 'Img + Menú', icon: <ChatIcons.Image /> },
            { id: 'media_interactive', label: 'Imagen', icon: <ChatIcons.Image /> },
            { id: 'single_function', label: 'Función', icon: <ChatIcons.Function /> }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setContentType(item.id as ContentType)}
              style={{
                flex: 1,
                minWidth: '60px',
                padding: '5px 6px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: contentType === item.id ? '#00a884' : '#f1f5f9',
                color: contentType === item.id ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* URL de Imagen (si aplica) */}
      {isMediaType && (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px', color: '#475569' }}>
            URL del Banner / Imagen:
          </label>
          <input
            type="text"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#ffffff', color: '#111b21', outline: 'none' }}
          />
        </div>
      )}

      {/* Función Oculta (si aplica) */}
      {isFunctionType && (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px', color: '#475569' }}>
            Acción / Función del Sistema:
          </label>
          <select
            value={actionKey}
            onChange={(e) => setActionKey(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid #00a884', fontSize: '0.8rem', backgroundColor: '#ffffff', color: '#111b21', fontWeight: 600, outline: 'none' }}
          >
            <option value="custom.advanced_flow">Flujo Libre / Avanzado</option>
            <option value="stock.check">Consulta de Stock / Inventario</option>
            <option value="turnos.book">Reserva de Turnos</option>
            <option value="business.payment_info">Datos de Pago</option>
            <option value="support.human">Derivar a Asesor Humano</option>
          </select>
        </div>
      )}

      {/* Texto del Mensaje principal */}
      <div style={{ width: '100%', boxSizing: 'border-box' }}>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px', color: '#475569' }}>
          Mensaje Principal de Respuesta:
        </label>
        <textarea
          value={responseMessage}
          onChange={(e) => setResponseMessage(e.target.value)}
          placeholder="Escribe el mensaje que verá el usuario..."
          rows={3}
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', resize: 'vertical', backgroundColor: '#ffffff', color: '#111b21', outline: 'none' }}
        />
      </div>

      {/* Gestor de Opciones de Menú (si aplica) */}
      {isMenuType && (
        <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ChatIcons.Menu /> Opciones del Menú:
            </span>
            <button
              type="button"
              onClick={handleAddOption}
              style={{ padding: '3px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <ChatIcons.Plus /> Agregar Opción
            </button>
          </div>

          {menuOptions.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', width: '18px', textAlign: 'center' }}>#{opt.number || idx + 1}</span>
              <input
                type="text"
                value={opt.label}
                onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                placeholder="Texto de opción..."
                style={{ flex: 2, boxSizing: 'border-box', padding: '5px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.78rem', backgroundColor: '#fff', color: '#111b21', outline: 'none' }}
              />
              <select
                value={opt.actionKey || 'custom.advanced_flow'}
                onChange={(e) => handleOptionChange(idx, 'actionKey', e.target.value)}
                style={{ flex: 1.5, boxSizing: 'border-box', padding: '5px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', backgroundColor: '#fff', color: '#111b21', outline: 'none' }}
              >
                <option value="custom.advanced_flow">Flujo libre</option>
                <option value="stock.check">Stock</option>
                <option value="turnos.book">Turnos</option>
                <option value="business.payment_info">Pagos</option>
                <option value="support.human">Soporte</option>
              </select>
              {menuOptions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Eliminar opción"
                >
                  <ChatIcons.Trash />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Barra de Estado y Botones de Acción */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', borderTop: '1px solid #e2e8f0', paddingTop: '6px', width: '100%', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '0.72rem', color: statusText?.includes('Error') || statusText?.includes('posee') ? '#dc2626' : '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {statusText && <ChatIcons.Warning />}
          {statusText || (isCreation ? 'Creando nuevo mensaje' : 'Editando mensaje')}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', fontSize: '0.78rem', cursor: 'pointer', color: '#334155', fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: '#00a884', color: '#ffffff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ChatIcons.Save />
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
