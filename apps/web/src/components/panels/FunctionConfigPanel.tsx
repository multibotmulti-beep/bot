'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';
import { BotApiClient, apiFetch } from '@/lib/apiClient';
import { useUserSession } from '@/lib/userSession';

export default function FunctionConfigPanel() {
  const { userPhone, isLoggedIn } = useUserSession();
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('admin');
  
  // Selected Function to Configure
  const [selectedFunction, setSelectedFunction] = useState<string>('business.payment_info');

  // Form State for Payment / Business Info
  const [cbu, setCbu] = useState('0000003100012345678901');
  const [alias, setAlias] = useState('MI.NEGOCIO.MP');
  const [titular, setTitular] = useState('Comercio Pro');
  const [banco, setBanco] = useState('Mercado Pago');
  const [linkPago, setLinkPago] = useState('https://mpago.li/mi-negocio');

  // Form State for Stock
  const [stockProduct, setStockProduct] = useState('Zapatillas Deportivas');
  const [stockQty, setStockQty] = useState('25');

  // Form State for Turnos
  const [turnoHorarios, setTurnoHorarios] = useState('09:00, 10:30, 14:00, 16:30');

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar bots del usuario
  useEffect(() => {
    BotApiClient.getProfiles()
      .then((profiles) => {
        if (profiles && profiles.length > 0) {
          setBots(profiles);
          setSelectedBotId(profiles[0].botId || profiles[0].id);
        }
      })
      .catch((err) => logger.error({ err }, 'Error cargando perfiles de bot en FunctionConfigPanel'));
  }, []);

  // Cargar configuración existente al cambiar de bot o función
  useEffect(() => {
    if (!selectedBotId) return;
    apiFetch(`/bot/function-configs/${selectedBotId}`)
      .then(data => {
        if (data.success && data.configs) {
          const found = data.configs.find((c: any) => c.actionKey === selectedFunction);
          if (found && found.config) {
            if (selectedFunction === 'business.payment_info') {
              setCbu(found.config.cbu || cbu);
              setAlias(found.config.alias || alias);
              setTitular(found.config.titular || titular);
              setBanco(found.config.banco || banco);
              setLinkPago(found.config.linkPago || linkPago);
            } else if (selectedFunction === 'stock.manage') {
              setStockProduct(found.config.product || stockProduct);
              setStockQty(found.config.qty || stockQty);
            } else if (selectedFunction === 'turnos.book') {
              setTurnoHorarios(found.config.horarios || turnoHorarios);
            }
          }
        }
      })
      .catch(err => logger.error({ err }, 'Error cargando configuración de función'));
  }, [selectedBotId, selectedFunction]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    let configData: any = {};
    if (selectedFunction === 'business.payment_info') {
      configData = { cbu, alias, titular, banco, linkPago };
    } else if (selectedFunction === 'stock.manage') {
      configData = { product: stockProduct, qty: Number(stockQty) };
    } else if (selectedFunction === 'turnos.book') {
      configData = { horarios: turnoHorarios };
    }

    try {
      const data = await apiFetch('/bot/function-configs', {
        method: 'POST',
        body: JSON.stringify({
          botId: selectedBotId,
          actionKey: selectedFunction,
          config: configData,
        }),
      });
      if (data.success) {
        setStatusMsg('✅ ¡Configuración de función guardada con éxito en la base de datos!');
      } else {
        setStatusMsg(`❌ Error al guardar: ${data.message}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error de conexión: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', textAlign: 'left', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '8px' }}>⚙️ Configuración Avanzada de Funciones</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
          Personaliza los datos y el comportamiento de cada función (Stock, Pagos, Turnos) de forma aislada para cada uno de tus bots.
        </p>
      </div>

      {/* Selector de Bot y Función */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Seleccionar Bot / Negocio</label>
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
            }}
          >
            <option value="admin">Bot Predeterminado (Admin)</option>
            {bots.map((b) => (
              <option key={b.id} value={b.botId || b.id}>
                {b.name} ({b.botId || b.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Función a Configurar</label>
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
            }}
          >
            <option value="business.payment_info">💳 Datos de Cobro y Pagos (CBU / Alias)</option>
            <option value="stock.manage">📦 Gestión de Stock Inicial</option>
            <option value="turnos.book">📅 Horarios Disponibles para Turnos</option>
          </select>
        </div>
      </div>

      {/* Formulario de Configuración Específica */}
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
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
          Configurando: <span style={{ color: 'var(--color-primary)' }}>{selectedFunction}</span> (Bot: {selectedBotId})
        </h3>

        {selectedFunction === 'business.payment_info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Banco / Billetera</label>
                <input
                  type="text"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Titular de la Cuenta</label>
                <input
                  type="text"
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>CBU / CVU</label>
                <input
                  type="text"
                  value={cbu}
                  onChange={(e) => setCbu(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Alias</label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Link de Pago Web</label>
              <input
                type="text"
                value={linkPago}
                onChange={(e) => setLinkPago(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        )}

        {selectedFunction === 'stock.manage' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Nombre del Producto / Stock</label>
              <input
                type="text"
                value={stockProduct}
                onChange={(e) => setStockProduct(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Cantidad Inicial</label>
              <input
                type="number"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        )}

        {selectedFunction === 'turnos.book' && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Horarios Disponibles (separados por comas)</label>
            <input
              type="text"
              value={turnoHorarios}
              onChange={(e) => setTurnoHorarios(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
            />
          </div>
        )}

        {statusMsg && (
          <div style={{ padding: '12px', borderRadius: '8px', background: statusMsg.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: statusMsg.includes('✅') ? '#10b981' : '#ef4444', fontWeight: '600' }}>
            {statusMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
              cursor: 'pointer',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Configuración de Función'}
          </button>
        </div>
      </form>
    </div>
  );
}
