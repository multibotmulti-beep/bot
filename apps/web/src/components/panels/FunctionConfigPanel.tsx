'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';
import { BotApiClient, apiFetch } from '@/lib/apiClient';
import { useUserSession } from '@/lib/userSession';
import { ClientDatabase } from '@/lib/clientDatabase';

interface DynamicField {
  key: string;
  value: string;
}

interface FunctionItem {
  actionKey: string;
  description: string;
  configSchema?: { key: string; label: string; type: string; defaultValue?: any }[];
  suggestedFields?: string[];
}

// Plantillas sugeridas de campos base por tipo de función conocida (inician en blanco)
const FUNCTION_SUGGESTIONS: Record<string, string[]> = {
  'business.payment_info': ['banco', 'titular', 'cbu', 'alias', 'linkPago'],
  'stock.manage': ['product', 'qty', 'precio', 'categoria'],
  'turnos.book': ['horarios', 'duracion_minutos', 'servicio'],
  'pedidos.create': ['moneda', 'metodos_envio', 'tiempo_entrega'],
  'faq.query': ['direccion', 'horario_atencion', 'telefono_contacto'],
};

export default function FunctionConfigPanel() {
  const { userPhone, isLoggedIn } = useUserSession();
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('admin');

  // Funciones cargadas dinámicamente desde el backend o catálogo
  const [availableFunctions, setAvailableFunctions] = useState<FunctionItem[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string>('');

  // Campos dinámicos del formulario (clave - valor)
  const [fields, setFields] = useState<DynamicField[]>([]);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Cargar el bot activo de la sesión actual y restringir la lista exclusivamente a ese bot
  useEffect(() => {
    BotApiClient.getProfiles()
      .then((profiles) => {
        const activeSessionBot = typeof window !== 'undefined' ? sessionStorage.getItem('active_bot_id') : null;
        if (profiles && profiles.length > 0) {
          let scopedProfiles = profiles;
          if (activeSessionBot) {
            scopedProfiles = profiles.find((p: any) => (p.botId || p.id) === activeSessionBot)
              ? [profiles.find((p: any) => (p.botId || p.id) === activeSessionBot)]
              : [profiles[profiles.length - 1]];
          } else {
            scopedProfiles = [profiles[profiles.length - 1]];
          }
          setBots(scopedProfiles);
          const targetId = scopedProfiles[0]?.botId || scopedProfiles[0]?.id || 'admin';
          setSelectedBotId(targetId);
          if (typeof window !== 'undefined' && scopedProfiles[0]) {
            sessionStorage.setItem('active_bot_id', targetId);
          }
        } else {
          setBots([{ id: 'admin', botId: 'admin', name: 'Bot Principal' }]);
          setSelectedBotId('admin');
        }
      })
      .catch((err) => {
        logger.error({ err }, 'Error cargando perfiles de bot en FunctionConfigPanel');
        setBots([{ id: 'admin', botId: 'admin', name: 'Bot Principal' }]);
        setSelectedBotId('admin');
      });
  }, []);

  // 2. Cargar funciones disponibles dinámicamente desde la API
  useEffect(() => {
    apiFetch('/bot/functions')
      .then((data) => {
        let loadedFunctions: FunctionItem[] = [];
        if (data.success && Array.isArray(data.functions)) {
          loadedFunctions = data.functions.map((f: any) => ({
            actionKey: f.actionKey,
            description: f.description || 'Función de negocio ejecutable',
            configSchema: f.configSchema || [],
            suggestedFields: FUNCTION_SUGGESTIONS[f.actionKey] || [],
          }));
        } else if (data.success && Array.isArray(data.capabilities)) {
          loadedFunctions = data.capabilities.map((c: any) => ({
            actionKey: c.key,
            description: c.description || c.name,
            configSchema: c.configSchema || [],
            suggestedFields: [],
          }));
        }

        if (loadedFunctions.length === 0) {
          // Fallback dinámico si no hay respuesta de red
          loadedFunctions = Object.keys(FUNCTION_SUGGESTIONS).map((key) => ({
            actionKey: key,
            description: 'Función de catálogo dinámico',
            suggestedFields: FUNCTION_SUGGESTIONS[key],
          }));
        }

        setAvailableFunctions(loadedFunctions);
        if (loadedFunctions.length > 0 && !selectedFunction) {
          setSelectedFunction(loadedFunctions[0].actionKey);
        }
      })
      .catch((err) => {
        logger.warn({ err }, 'No se pudo cargar /bot/functions, utilizando catálogo dinámico local');
        const fallback = Object.keys(FUNCTION_SUGGESTIONS).map((key) => ({
          actionKey: key,
          description: 'Función de catálogo dinámico',
          suggestedFields: FUNCTION_SUGGESTIONS[key],
        }));
        setAvailableFunctions(fallback);
        if (fallback.length > 0 && !selectedFunction) {
          setSelectedFunction(fallback[0].actionKey);
        }
      });
  }, []);

  // 3. Cargar la configuración de la función seleccionada (sin hardcoding, todo en blanco o según BD)
  useEffect(() => {
    if (!selectedBotId || !selectedFunction) return;

    setIsLoading(true);
    setStatusMsg(null);

    const loadConfig = async () => {
      let loadedConfig: Record<string, any> | null = null;

      if (isLoggedIn && userPhone) {
        // Modo con Sesión: Cargar desde la base de datos del backend
        try {
          const res = await apiFetch(`/bot/function-configs/${selectedBotId}`);
          if (res.success && Array.isArray(res.configs)) {
            const match = res.configs.find((c: any) => c.actionKey === selectedFunction);
            if (match && match.config) {
              loadedConfig = match.config;
            }
          }
        } catch (e) {
          logger.warn({ e }, 'Error al consultar configuración remota, revisando caché local');
        }
      }

      // Si no hay configuración remota o estamos en modo anónimo, consultar base de datos local del navegador
      if (!loadedConfig) {
        loadedConfig = ClientDatabase.getFunctionConfig(selectedBotId, selectedFunction);
      }

      const currentFn = availableFunctions.find(f => f.actionKey === selectedFunction);
      const schema = currentFn?.configSchema || [];

      // Transformar configuración en lista de campos dinámicos
      if (loadedConfig && Object.keys(loadedConfig).length > 0) {
        const dynamicList: DynamicField[] = Object.entries(loadedConfig).map(([key, val]) => ({
          key,
          value: typeof val === 'object' ? JSON.stringify(val) : String(val),
        }));
        setFields(dynamicList);
      } else if (schema.length > 0) {
        setFields(schema.map((s) => ({ key: s.key, value: s.defaultValue !== undefined ? String(s.defaultValue) : '' })));
      } else {
        // Todo en blanco: si la función tiene sugerencias de campos, inicializar en blanco
        const suggested = FUNCTION_SUGGESTIONS[selectedFunction] || [];
        if (suggested.length > 0) {
          setFields(suggested.map((key) => ({ key, value: '' })));
        } else {
          setFields([]);
        }
      }

      setIsLoading(false);
    };

    loadConfig();
  }, [selectedBotId, selectedFunction, isLoggedIn, userPhone]);

  // Manejo de actualización de valor de campo
  const handleFieldValueChange = (index: number, newValue: string) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index].value = newValue;
      return updated;
    });
  };

  // Manejo de actualización de clave de campo
  const handleFieldKeyChange = (index: number, newKey: string) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index].key = newKey;
      return updated;
    });
  };

  // Eliminar campo dinámico
  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  // Agregar nuevo campo personalizado
  const handleAddNewField = () => {
    if (!newFieldKey.trim()) return;
    setFields((prev) => [...prev, { key: newFieldKey.trim(), value: newFieldValue.trim() }]);
    setNewFieldKey('');
    setNewFieldValue('');
  };

  // Guardar configuración (en BD de perfil si hay sesión, o en BD local del navegador si es anónimo)
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    // Convertir lista de campos dinámicos a objeto JSON
    const configObject: Record<string, any> = {};
    for (const f of fields) {
      if (f.key.trim()) {
        configObject[f.key.trim()] = f.value;
      }
    }

    try {
      if (isLoggedIn && userPhone) {
        // Guardar en Perfil y Base de Datos vía API
        const res = await apiFetch('/bot/function-configs', {
          method: 'POST',
          body: JSON.stringify({
            botId: selectedBotId,
            actionKey: selectedFunction,
            config: configObject,
          }),
        });

        // Respaldar también localmente en el navegador
        ClientDatabase.saveFunctionConfig(selectedBotId, selectedFunction, configObject);

        if (res.success) {
          setStatusMsg(`✅ Configuración guardada en la base de datos para el bot [${selectedBotId}] y asociada a tu sesión.`);
        } else {
          setStatusMsg(`❌ Error al guardar en base de datos: ${res.message || res.error}`);
        }
      } else {
        // Modo Anónimo: Guardar exclusivamente en la base de datos local del navegador
        ClientDatabase.saveFunctionConfig(selectedBotId, selectedFunction, configObject);
        setStatusMsg('✅ Guardado en la base de datos local del navegador (Modo anónimo sin base de datos remota).');
      }
    } catch (err: any) {
      // Fallback a almacenamiento local si falla la red
      ClientDatabase.saveFunctionConfig(selectedBotId, selectedFunction, configObject);
      setStatusMsg(`⚠️ Almacenado localmente en el navegador (${err.message}).`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', textAlign: 'left', maxWidth: '900px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '8px' }}>
              ⚙️ Configuración Avanzada de Funciones
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', margin: 0 }}>
              Personaliza los datos y el comportamiento de cada función de forma aislada para cada uno de tus bots.
            </p>
          </div>
          <div>
            {isLoggedIn && userPhone ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                🟢 Sesión Activa ({userPhone})
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                🟡 Modo Anónimo (Guardado local en navegador)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selector Dinámico de Bot y Función */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
            Seleccionar Bot / Negocio
          </label>
          <select
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontSize: '14px',
            }}
          >
            {bots.map((b) => (
              <option key={b.botId || b.id} value={b.botId || b.id}>
                {b.name} ({b.botId || b.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
            Función a Configurar (Cargadas dinámicamente)
          </label>
          <select
            value={selectedFunction}
            onChange={(e) => setSelectedFunction(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontSize: '14px',
            }}
          >
            {availableFunctions.map((fn) => (
              <option key={fn.actionKey} value={fn.actionKey}>
                {fn.actionKey} - {fn.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Formulario Dinámico sin Datos Hardcodeados */}
      <form onSubmit={handleSaveConfig} style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              Configurando: <span style={{ color: 'var(--color-primary)' }}>{selectedFunction || 'Seleccione función'}</span>
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Bot ID: <strong>{selectedBotId}</strong>
            </span>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {isLoggedIn ? '☁️ Guardado en Perfil y Base de Datos' : '💾 Guardado Local en Navegador (JSONB)'}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Cargando parámetros de función...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fields.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                borderRadius: '8px',
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: '14px'
              }}>
                No hay parámetros configurados aún. Agrega campos a continuación para configurar esta función.
              </div>
            ) : (
              fields.map((field, idx) => (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  background: 'var(--color-background)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Parámetro / Clave
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: cbu, horarios, precio"
                      value={field.key}
                      onChange={(e) => handleFieldKeyChange(idx, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Valor Configurado
                    </label>
                    <input
                      type="text"
                      placeholder="En blanco o valor personalizado"
                      value={field.value}
                      onChange={(e) => handleFieldValueChange(idx, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ paddingTop: '18px' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      title="Eliminar parámetro"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Agregar nuevo parámetro personalizado */}
            <div style={{
              marginTop: '10px',
              padding: '16px',
              borderRadius: '8px',
              border: '1px dashed var(--color-border)',
              background: 'rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                ➕ Añadir Nuevo Parámetro a la Función
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Nombre del parámetro (ej: alias, cupo)"
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '13px',
                  }}
                />
                <input
                  type="text"
                  placeholder="Valor inicial (opcional)"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '13px',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddNewField}
                  disabled={!newFieldKey.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: newFieldKey.trim() ? 'pointer' : 'not-allowed',
                    opacity: newFieldKey.trim() ? 1 : 0.5,
                  }}
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {statusMsg && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: statusMsg.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : statusMsg.includes('⚠️') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: statusMsg.includes('✅') ? '#10b981' : statusMsg.includes('⚠️') ? '#f59e0b' : '#ef4444',
            fontWeight: '600',
            fontSize: '13px',
          }}>
            {statusMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-soft)',
              fontSize: '14px',
            }}
          >
            {isSaving ? 'Guardando...' : isLoggedIn ? '💾 Guardar en Perfil y Base de Datos' : '💾 Guardar en Navegador (Modo Anónimo)'}
          </button>
        </div>
      </form>
    </div>
  );
}
