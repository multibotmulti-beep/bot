// Utilidad de Almacenamiento Local en el Navegador (Tablas JSONB) - Sin lógica de funciones (Toda la lógica de negocio vive en el Backend)
const DB_KEY = 'bot_client_jsonb_storage_v1';

interface DatabaseSchema {
  tables: {
    stock: any[];
    sales: any[];
    employees: any[];
    bots: any[];
    memories: any[];
    settings: Record<string, any>;
  };
}

function getDatabase(): DatabaseSchema {
  if (typeof window === 'undefined') {
    return { tables: { stock: [], sales: [], employees: [], bots: [], memories: [], settings: {} } };
  }
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const initial: DatabaseSchema = {
      tables: {
        stock: [],
        sales: [],
        employees: [],
        bots: [],
        memories: [],
        settings: {
          company: { name: '', tagline: '', phone: '', email: '', address: '' },
          payments: { provider: '', cbu: '', alias: '', titular: '', banco: '', linkPago: '' }
        }
      }
    };
    localStorage.setItem(DB_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { tables: { stock: [], sales: [], employees: [], bots: [], memories: [], settings: { company: {}, payments: {} } } };
  }
}

function saveDatabase(db: DatabaseSchema): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export const ClientStorage = {
  getTable(tableName: keyof DatabaseSchema['tables']) {
    const db = getDatabase();
    return db.tables[tableName] || [];
  },

  insertRecord(tableName: keyof DatabaseSchema['tables'], record: any) {
    const db = getDatabase();
    const newRecord = { id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7), ...record, createdAt: new Date().toISOString() };
    if (Array.isArray(db.tables[tableName])) {
      (db.tables[tableName] as any[]).push(newRecord);
      saveDatabase(db);
    }
    return newRecord;
  },

  updateRecord(tableName: keyof DatabaseSchema['tables'], id: string, fields: any) {
    const db = getDatabase();
    const table = db.tables[tableName] as any[];
    if (Array.isArray(table)) {
      const idx = table.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        table[idx] = { ...table[idx], ...fields, updatedAt: new Date().toISOString() };
        saveDatabase(db);
        return table[idx];
      }
    }
    return null;
  },

  deleteRecord(tableName: keyof DatabaseSchema['tables'], id: string) {
    const db = getDatabase();
    const table = db.tables[tableName] as any[];
    if (Array.isArray(table)) {
      db.tables[tableName] = table.filter((r: any) => r.id !== id) as any;
      saveDatabase(db);
      return true;
    }
    return false;
  },

  getSetting(key: string) {
    const db = getDatabase();
    return db.tables.settings[key] || {};
  },

  saveSetting(key: string, value: any) {
    const db = getDatabase();
    db.tables.settings[key] = { ...(db.tables.settings[key] || {}), ...value };
    saveDatabase(db);
    return db.tables.settings[key];
  },

  executeCommand(cmd: string, params: any) {
    const db = getDatabase();
    if (cmd === 'bot.save' || cmd === 'bot.create') {
      const record = { id: 'bot_' + Date.now(), ...params };
      db.tables.bots.push(record);
      saveDatabase(db);
      return { success: true, data: record };
    }
    return { success: true, message: `Comando ${cmd} ejecutado localmente`, data: params };
  },

  getFunctionConfig(botId: string, actionKey: string) {
    const db = getDatabase();
    return db.tables.settings[`func_cfg_${botId}_${actionKey}`] || null;
  },

  saveFunctionConfig(botId: string, actionKey: string, config: any) {
    const db = getDatabase();
    db.tables.settings[`func_cfg_${botId}_${actionKey}`] = config;
    saveDatabase(db);
    return config;
  },

  listFunctionConfigs(botId: string) {
    const db = getDatabase();
    const prefix = `func_cfg_${botId}_`;
    const configs: { actionKey: string; config: any }[] = [];
    for (const [k, v] of Object.entries(db.tables.settings)) {
      if (k.startsWith(prefix)) {
        configs.push({
          actionKey: k.substring(prefix.length),
          config: v,
        });
      }
    }
    return configs;
  }
};

export const ClientDatabase = ClientStorage;
