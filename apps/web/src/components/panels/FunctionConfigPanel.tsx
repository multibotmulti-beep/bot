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

// Nombres descriptivos y profesionales para el selector de funciones
const FRIENDLY_FUNCTION_NAMES: Record<string, string> = {
  'business.payment_info': '💳 Datos de Cobro y Pagos (CBU / Alias / Banco)',
  'stock.manage': '📦 Gestión de Inventario y Stock',
  'turnos.book': '📅 Reserva de Turnos y Citas',
  'pedidos.create': '🛍️ Creación de Pedidos y Órdenes',
  'faq.query': 'ℹ️ Información General del Negocio (FAQ)',
  'support.human': '👤 Derivación a Asesor Humano',
  'client.save_info': '💾 Guardado de Notas y Datos de Cliente',
  'payments.checkout': '🛒 Checkout y Enlace de Pago',
  'mis.reservas': '📋 Mis Reservas y Pedidos Activos',
  'custom.messages': '💬 Banco de Mensajes y Menús Personalizados',
  'custom.free_menu': '🎛️ Menú Libre y Respuesta Personalizada',
  'custom.menu_builder': '📂 Creador de Menús Dinámicos (Texto Superior + Menú)',
};

// Guías y metadatos de campos orientados a usuarios finales sin experiencia
const FUNCTION_GUIDES: Record<string, { title: string; description: string; fieldsMeta: Record<string, { label: string; placeholder: string; help: string }> }> = {
  'custom.menu_builder': {
    title: '📂 Creador de Menús Dinámicos (Texto Superior + Menú)',
    description: 'Crea submenús estructurados con un texto superior opcional (bienvenida, cabecera o explicación) y el listado de opciones de menú debajo.',
    fieldsMeta: {
      headerText: { label: '📝 Texto Superior (Opcional)', placeholder: 'Ej: Aquí tienes nuestras opciones principales:', help: 'Texto explicativo que se mostrará arriba del menú.' },
      menuTitle: { label: '🏷️ Título del Menú', placeholder: 'Ej: Menú Principal / Submenú de Servicios', help: 'Título principal del menú.' },
    }
  },
  'business.payment_info': {
    title: '💳 Configuración de Datos de Cobro y Pagos',
    description: 'Configura la información bancaria y de billeteras virtuales que el bot enviará a tus clientes al realizar una compra.',
    fieldsMeta: {
      banco: { label: '🏦 Banco o Billetera', placeholder: 'Ej: Mercado Pago, Banco Galicia, BBVA', help: 'Nombre de la entidad financiera o billetera virtual.' },
      titular: { label: '👤 Titular de la Cuenta', placeholder: 'Ej: Juan Pérez / Empresa S.A.', help: 'Nombre completo o razón social del titular.' },
      cbu: { label: '🔢 CBU o CVU', placeholder: 'Ej: 0000003100000000000000', help: 'Número de CBU de 22 dígitos o CVU.' },
      alias: { label: '🔤 Alias de la Cuenta', placeholder: 'Ej: mi.negocio.mp', help: 'Alias CBU fácil para transferencias.' },
      linkPago: { label: '🔗 Enlace / Link de Pago Web', placeholder: 'Ej: https://mpago.li/tu-link', help: 'Link directo de Mercado Pago, PayPal o pasarela web.' },
    }
  },
  'turnos.book': {
    title: '📅 Configuración de Reserva de Turnos',
    description: 'Establece los horarios de atención y días disponibles para que tus clientes agenden citas con tu negocio.',
    fieldsMeta: {
      horarios: { label: '⏰ Horarios de Atención', placeholder: 'Ej: Lunes a Viernes de 9:00 a 18:00 hs', help: 'Franja horaria general disponible para turnos.' },
      duracion_minutos: { label: '⏱️ Duración por Turno (minutos)', placeholder: 'Ej: 30 o 60', help: 'Tiempo asignado a cada cita reservada.' },
      servicio: { label: '🛠️ Servicio Ofrecido', placeholder: 'Ej: Atención general / Consulta profesional', help: 'Nombre o descripción del servicio principal.' },
    }
  },
  'pedidos.create': {
    title: '🛍️ Configuración de Creación de Pedidos',
    description: 'Define la moneda, métodos de entrega y políticas para las órdenes de compra de tus clientes.',
    fieldsMeta: {
      moneda: { label: '💵 Moneda', placeholder: 'Ej: ARS ($) o USD (US$)', help: 'Moneda oficial utilizada en los cobros.' },
      metodos_envio: { label: '🚚 Métodos de Envío', placeholder: 'Ej: Envío a domicilio y Retiro en local', help: 'Opciones de entrega disponibles para el cliente.' },
      tiempo_entrega: { label: '⏱️ Tiempo Estimado de Entrega', placeholder: 'Ej: 24 a 48 horas hábiles', help: 'Plazo aproximado de despacho o entrega.' },
    }
  },
  'faq.query': {
    title: 'ℹ️ Información General del Negocio (FAQ)',
    description: 'Proporciona los datos de contacto, ubicación y horarios generales que el bot responderá ante consultas frecuentes.',
    fieldsMeta: {
      direccion: { label: '📍 Dirección Física o Web', placeholder: 'Ej: Av. Corrientes 1234, CABA', help: 'Ubicación de tu local o sitio web oficial.' },
      horario_atencion: { label: '🕒 Horario General', placeholder: 'Ej: Lunes a Sábados de 10 a 20hs', help: 'Horario general de atención al público.' },
      telefono_contacto: { label: '📞 Teléfono de Soporte / Local', placeholder: 'Ej: +54 9 11 1234-5678', help: 'Línea telefónica de atención o WhatsApp de contacto.' },
    }
  },
  'support.human': {
    title: '👤 Configuración de Derivación a Asesor',
    description: 'Establece el número de contacto humano al cual se derivarán las conversaciones cuando el cliente solicite hablar con una persona.',
    fieldsMeta: {
      telefono_soporte: { label: '📱 WhatsApp del Asesor / Dueño', placeholder: 'Ej: +54 9 3765 24-5980', help: 'Número al que se derivarán las alertas de soporte.' },
      mensaje_derivacion: { label: '💬 Mensaje Personalizado de Derivación', placeholder: 'Ej: Un asesor te contactará en breve.', help: 'Texto que enviará el bot al transferir la charla.' },
    }
  },
  'client.save_info': {
    title: '💾 Configuración de Guardado de Datos de Cliente',
    description: 'Configura cómo el bot solicitará y registrará información personalizada de tus clientes (como dirección de entrega o notas).',
    fieldsMeta: {
      instrucciones: { label: '📝 Instrucción para el Cliente', placeholder: 'Ej: Envía tu dirección completa y aclaración.', help: 'Mensaje guía para que el cliente proporcione sus datos.' },
      campo_requerido: { label: '📌 Dato Principal a Guardar', placeholder: 'Ej: Dirección de envío o nota de preferencia', help: 'Tipo de información que el bot almacenará.' },
    }
  },
  'payments.checkout': {
    title: '🛒 Configuración de Checkout de Pago',
    description: 'Define los títulos y mensajes automáticos al generar órdenes de cobro para tus clientes.',
    fieldsMeta: {
      moneda: { label: '💵 Moneda de Cobro', placeholder: 'Ej: ARS / USD', help: 'Moneda para las órdenes de pago generadas.' },
      titulo_orden: { label: '🏷️ Título de la Orden', placeholder: 'Ej: Orden de Compra Online', help: 'Encabezado descriptivo para el comprobante.' },
    }
  },
  'mis.reservas': {
    title: '📋 Configuración de Mis Reservas',
    description: 'Personaliza los textos cuando el cliente consulta sus turnos, pedidos y solicitudes activas.',
    fieldsMeta: {
      titulo_seccion: { label: '🏷️ Título del Listado', placeholder: 'Ej: Tus Pedidos y Turnos Activos', help: 'Encabezado al mostrar los registros del cliente.' },
      mensaje_vacio: { label: '📭 Mensaje si no hay registros', placeholder: 'Ej: No tienes reservas registradas actualmente.', help: 'Texto mostrado cuando el cliente no posee solicitudes.' },
    }
  },
  'custom.messages': {
    title: '💬 Banco de Mensajes y Menús Personalizados',
    description: 'Crea y administra mensajes enriquecidos personalizados (cursos, propuestas, trámites, promociones) para que tu bot responda automáticamente.',
    fieldsMeta: {}
  },
  'custom.free_menu': {
    title: '🎛️ Configuración de Menú Libre y Respuesta Personalizada',
    description: 'Crea una función personalizada sin nombre fijo, definiendo libremente tanto el título/nombre del menú como la respuesta de texto que enviará el bot.',
    fieldsMeta: {
      menuName: { label: '🏷️ Nombre / Título del Menú', placeholder: 'Ej: Menú de Cursos / Promociones / Requisitos', help: 'Nombre libre que aparecerá como título del menú.' },
      menuResponse: { label: '📝 Respuesta de Texto Libre', placeholder: 'Ej: Hola 👋 Aquí tienes la información detallada...', help: 'Texto libre personalizado que responderá el bot.' },
    }
  }
};

const FUNCTION_SUGGESTIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(FUNCTION_GUIDES).map(([k, v]) => [k, Object.keys(v.fieldsMeta)])
);

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

  // Menú libre y respuesta personalizada (custom.free_menu)
  const [freeMenuName, setFreeMenuName] = useState('');
  const [freeMenuResponse, setFreeMenuResponse] = useState('');

  // Stock items para stock.manage (Tarjetas de stock múltiples)
  interface StockItem {
    id: string;
    product: string;
    qty: any;
    precio: any;
    categoria: string;
  }
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [newProduct, setNewProduct] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newPrecio, setNewPrecio] = useState('');
  const [newCategoria, setNewCategoria] = useState('');

  const handleAddStockItem = () => {
    if (!newProduct.trim()) return;
    setStockItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        product: newProduct.trim(),
        qty: newQty || 10,
        precio: newPrecio || 0,
        categoria: newCategoria.trim() || 'General'
      }
    ]);
    setNewProduct('');
    setNewQty('');
    setNewPrecio('');
    setNewCategoria('');
  };

  const handleDeleteStockItem = (id: string) => {
    setStockItems(prev => prev.filter(item => item.id !== id));
  };

  // Custom messages para custom.messages (Tarjetas de mensajes personalizados)
  interface CustomMessageItem {
    id: string;
    title: string;
    content: string;
    shortcut: string;
  }
  const [customMessages, setCustomMessages] = useState<CustomMessageItem[]>([]);
  const [newMsgTitle, setNewMsgTitle] = useState('');
  const [newMsgContent, setNewMsgContent] = useState('');
  const [newMsgShortcut, setNewMsgShortcut] = useState('');

  const handleAddCustomMessage = () => {
    if (!newMsgTitle.trim() || !newMsgContent.trim()) return;
    setCustomMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: newMsgTitle.trim(),
        content: newMsgContent.trim(),
        shortcut: newMsgShortcut.trim() || ''
      }
    ]);
    setNewMsgTitle('');
    setNewMsgContent('');
    setNewMsgShortcut('');
  };

  const handleDeleteCustomMessage = (id: string) => {
    setCustomMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Cargar el bot activo de la sesión actual y restringir la lista exclusivamente a ese bot
  useEffect(() => {
    BotApiClient.getProfiles()
      .then((profiles) => {
        const activeSessionBot = typeof window !== 'undefined' ? sessionStorage.getItem('active_bot_id') : null;
        const validProfiles = (profiles || []).filter((p: any) => p.id !== 'admin' && p.botId !== 'admin' && p.type !== 'system');
        if (validProfiles.length > 0) {
          const matchedBot = activeSessionBot ? validProfiles.find((p: any) => (p.botId || p.id) === activeSessionBot) : null;
          const scopedProfiles = matchedBot ? [matchedBot] : [validProfiles[0]];
          setBots(scopedProfiles);
          const targetId = scopedProfiles[0]?.botId || scopedProfiles[0]?.id || '';
          setSelectedBotId(targetId);
          if (typeof window !== 'undefined' && scopedProfiles[0]) {
            sessionStorage.setItem('active_bot_id', targetId);
          }
        } else {
          setBots([]);
          setSelectedBotId('');
        }
      })
      .catch((err) => {
        logger.error({ err }, 'Error cargando perfiles de bot en FunctionConfigPanel');
        setBots([]);
        setSelectedBotId('');
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

        const filtered = loadedFunctions.filter((f) => FRIENDLY_FUNCTION_NAMES[f.actionKey]);
        if (filtered.length === 0) {
          // Fallback dinámico si no hay respuesta de red o funciones válidas
          const fallback = Object.keys(FRIENDLY_FUNCTION_NAMES).map((key) => ({
            actionKey: key,
            description: FRIENDLY_FUNCTION_NAMES[key],
            suggestedFields: FUNCTION_SUGGESTIONS[key] || [],
          }));
          setAvailableFunctions(fallback);
          if (fallback.length > 0 && !selectedFunction) {
            setSelectedFunction(fallback[0].actionKey);
          }
        } else {
          setAvailableFunctions(filtered);
          if (filtered.length > 0 && !selectedFunction) {
            setSelectedFunction(filtered[0].actionKey);
          }
        }
      })
      .catch((err) => {
        logger.warn({ err }, 'No se pudo cargar /bot/functions, utilizando catálogo dinámico local');
        const fallback = Object.keys(FRIENDLY_FUNCTION_NAMES).map((key) => ({
          actionKey: key,
          description: FRIENDLY_FUNCTION_NAMES[key],
          suggestedFields: FUNCTION_SUGGESTIONS[key] || [],
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
        if (selectedFunction === 'stock.manage' && Array.isArray(loadedConfig.items)) {
          setStockItems(loadedConfig.items.map((item: any) => ({ ...item, id: item.id || Math.random().toString(36).substring(2, 9) })));
        } else if (selectedFunction === 'stock.manage') {
          setStockItems([]);
        }

        if (selectedFunction === 'custom.messages' && Array.isArray(loadedConfig.messages)) {
          setCustomMessages(loadedConfig.messages.map((m: any) => ({ ...m, id: m.id || Math.random().toString(36).substring(2, 9) })));
        } else if (selectedFunction === 'custom.messages') {
          setCustomMessages([]);
        }

        if (selectedFunction === 'custom.free_menu') {
          setFreeMenuName(loadedConfig?.menuName || '');
          setFreeMenuResponse(loadedConfig?.menuResponse || '');
        } else {
          setFreeMenuName('');
          setFreeMenuResponse('');
        }

        const dynamicList: DynamicField[] = Object.entries(loadedConfig)
          .filter(([key]) => key !== 'items' && key !== 'messages' && key !== 'menuName' && key !== 'menuResponse')
          .map(([key, val]) => ({
            key,
            value: typeof val === 'object' ? JSON.stringify(val) : String(val),
          }));
        setFields(dynamicList);
      } else if (schema.length > 0) {
        if (selectedFunction === 'stock.manage') setStockItems([]);
        if (selectedFunction === 'custom.messages') setCustomMessages([]);
        setFields(schema.map((s) => ({ key: s.key, value: s.defaultValue !== undefined ? String(s.defaultValue) : '' })));
      } else {
        if (selectedFunction === 'stock.manage') setStockItems([]);
        if (selectedFunction === 'custom.messages') setCustomMessages([]);
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
    if (selectedFunction === 'stock.manage') {
      configObject.items = stockItems;
    }
    if (selectedFunction === 'custom.messages') {
      configObject.messages = customMessages;
    }
    if (selectedFunction === 'custom.free_menu') {
      configObject.menuName = freeMenuName;
      configObject.menuResponse = freeMenuResponse;
    }

    try {
      // Guardar siempre en la base de datos remota vía API, respaldando también localmente
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
        setStatusMsg(`✅ Configuración guardada exitosamente en la base de datos para el bot [${selectedBotId}].`);
      } else {
        setStatusMsg(`❌ Error al guardar en base de datos: ${res.message || res.error}`);
      }
    } catch (err: any) {
      // Fallback a almacenamiento local si hay problemas de red
      ClientDatabase.saveFunctionConfig(selectedBotId, selectedFunction, configObject);
      setStatusMsg(`⚠️ Almacenado localmente en el navegador (${err.message}).`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '16px', textAlign: 'left', maxWidth: '900px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
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
                {FRIENDLY_FUNCTION_NAMES[fn.actionKey] || `${fn.actionKey} - ${fn.description}`}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--color-text)' }}>
              {FUNCTION_GUIDES[selectedFunction]?.title || `Configurando: ${selectedFunction}`}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.4' }}>
              {FUNCTION_GUIDES[selectedFunction]?.description || 'Personaliza los parámetros de esta función para tu bot.'}
            </p>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'var(--color-background)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            {isLoggedIn ? '☁️ Guardado en Base de Datos' : '💾 Guardado Local'}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Cargando parámetros de función...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {selectedFunction === 'custom.free_menu' && (
              <div style={{
                background: 'var(--color-background)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--color-border)',
                marginBottom: '10px',
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                  🎛️ Menú Libre y Respuesta Personalizada
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Define libremente el nombre o título de tu menú personalizado y el mensaje de respuesta de texto libre que enviará el bot.
                </p>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: 'var(--color-surface)',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                      🏷️ Nombre / Título del Menú
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Menú de Cursos / Promociones / Requisitos"
                      value={freeMenuName}
                      onChange={(e) => setFreeMenuName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                      📝 Respuesta de Texto Libre (Soporta Emojis y Formato WhatsApp)
                    </label>
                    <textarea
                      placeholder="Escribe aquí la respuesta personalizada que enviará el bot..."
                      value={freeMenuResponse}
                      onChange={(e) => setFreeMenuResponse(e.target.value)}
                      rows={5}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedFunction === 'custom.messages' && (
              <div style={{
                background: 'var(--color-background)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--color-border)',
                marginBottom: '10px',
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                  💬 Banco de Mensajes y Menús Personalizados
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Crea mensajes personalizados con título y contenido enriquecido para que tu bot responda automáticamente cuando tus clientes consulten o seleccionen una opción.
                </p>

                {/* Formulario de creación de mensaje */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginBottom: '20px',
                  background: 'var(--color-surface)',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                        🏷️ Título Identificador del Mensaje
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Curso de Programación / Trámite Licencia"
                        value={newMsgTitle}
                        onChange={(e) => setNewMsgTitle(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                        ⚡ Atajo / Palabra Clave (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: curso1 / turno"
                        value={newMsgShortcut}
                        onChange={(e) => setNewMsgShortcut(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                      📝 Contenido del Mensaje (Soporta Emojis y Formato WhatsApp)
                    </label>
                    <textarea
                      placeholder="Escribe aquí el mensaje completo que enviará el bot (ej: 🚀 ¡Inscripciones abiertas! ...)"
                      value={newMsgContent}
                      onChange={(e) => setNewMsgContent(e.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleAddCustomMessage}
                      disabled={!newMsgTitle.trim() || !newMsgContent.trim()}
                      style={{
                        background: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: (newMsgTitle.trim() && newMsgContent.trim()) ? 'pointer' : 'not-allowed',
                        opacity: (newMsgTitle.trim() && newMsgContent.trim()) ? 1 : 0.5,
                      }}
                    >
                      ➕ Guardar Mensaje en el Banco
                    </button>
                  </div>
                </div>

                {/* Grid de Tarjetas de Mensajes Personalizados */}
                {customMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
                    No hay mensajes personalizados creados aún. Agrega el primero arriba para empezar a ofrecer cursos, trámites o propuestas.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '12px',
                  }}>
                    {customMessages.map((msg) => (
                      <div key={msg.id} style={{
                        background: 'var(--color-surface)',
                        borderRadius: '10px',
                        padding: '16px',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong style={{ fontSize: '14px', color: 'var(--color-text)', display: 'block' }}>{msg.title}</strong>
                            {msg.shortcut && (
                              <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', display: 'inline-block', marginTop: '3px' }}>
                                Atajo: {msg.shortcut}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomMessage(msg.id)}
                            title="Eliminar mensaje"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-muted)',
                          background: 'var(--color-background)',
                          padding: '10px',
                          borderRadius: '6px',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '120px',
                          overflowY: 'auto',
                          border: '1px solid var(--color-border)',
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedFunction === 'stock.manage' && (
              <div style={{
                background: 'var(--color-background)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--color-border)',
                marginBottom: '10px',
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                  📦 Tarjetas de Inventario y Stock
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Agrega y elimina productos del stock de tu negocio. El bot responderá con estas tarjetas y cantidades exactas.
                </p>

                {/* Formulario de adición de stock */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr)) auto',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}>
                  <input
                    type="text"
                    placeholder="Producto (Ej: Remera)"
                    value={newProduct}
                    onChange={(e) => setNewProduct(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    placeholder="Precio ($)"
                    value={newPrecio}
                    onChange={(e) => setNewPrecio(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px' }}
                  />
                  <input
                    type="text"
                    placeholder="Categoría"
                    value={newCategoria}
                    onChange={(e) => setNewCategoria(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddStockItem}
                    disabled={!newProduct.trim()}
                    style={{
                      background: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: newProduct.trim() ? 'pointer' : 'not-allowed',
                      opacity: newProduct.trim() ? 1 : 0.5,
                    }}
                  >
                    ➕ Agregar
                  </button>
                </div>

                {/* Grid de Tarjetas de Stock */}
                {stockItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)', fontSize: '13px', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
                    No hay productos cargados en el stock. Agrega el primero arriba.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '10px',
                  }}>
                    {stockItems.map((item) => (
                      <div key={item.id} style={{
                        background: 'var(--color-surface)',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        position: 'relative',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{item.product}</strong>
                          <button
                            type="button"
                            onClick={() => handleDeleteStockItem(item.id)}
                            title="Eliminar producto de stock"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>📂 {item.categoria || 'General'}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
                          <span>📦 <strong>{item.qty}</strong> u.</span>
                          <span style={{ color: 'var(--color-primary)', fontWeight: '750' }}>${item.precio}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
              fields.map((field, idx) => {
                const meta = FUNCTION_GUIDES[selectedFunction]?.fieldsMeta?.[field.key];
                const label = meta ? meta.label : field.key.toUpperCase();
                const placeholder = meta ? meta.placeholder : 'Escribe el valor...';
                const help = meta ? meta.help : '';
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'var(--color-background)',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-soft)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
                        {label}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx)}
                        title="Eliminar campo"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                    {help && <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.3' }}>{help}</span>}
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={field.value}
                      onChange={(e) => handleFieldValueChange(idx, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                );
              })
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
