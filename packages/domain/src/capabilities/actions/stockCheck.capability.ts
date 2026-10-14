import { DomainCapability, CapabilityContext, CapabilityResult } from '../types';
import { CapabilityRegistry } from '../registry';
import { BotFunctionConfigService } from '../../function-config';

export const StockCheckCapability: DomainCapability = {
  key: 'stock.check',
  name: 'Consulta de Stock',
  description: 'Consulta el stock e inventario actual de productos en el negocio',
  configSchema: [
    { key: 'product', label: 'Nombre del Producto', type: 'string', defaultValue: 'Producto General', required: true },
    { key: 'qty', label: 'Cantidad Disponible', type: 'number', defaultValue: 10, required: true },
    { key: 'precio', label: 'Precio Unitario ($)', type: 'number', defaultValue: 100 },
    { key: 'categoria', label: 'Categoría', type: 'string', defaultValue: 'General' },
  ],
  execute: async (context: CapabilityContext): Promise<CapabilityResult> => {
    const { prisma } = await import('@repo/database');
    const botId = context.botId || 'admin';
    const memories = await prisma.botMemory.findMany({
      where: { botId, category: 'stock' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (memories.length === 0) {
      let stockCfg = await BotFunctionConfigService.getConfig(botId, 'stock.manage', context.localConfig);
      if (!stockCfg.config || !stockCfg.config.product) {
        stockCfg = await BotFunctionConfigService.getConfig(botId, 'stock.check', context.localConfig);
      }
      if (stockCfg.success && stockCfg.config && stockCfg.config.product) {
        const cfg = stockCfg.config;
        return {
          success: true,
          message: `📦 *Consulta de Stock (Configuración del Bot)*\n\n1. *${cfg.product}* (${cfg.categoria || 'General'}) - Stock: 🟢 **${cfg.qty || 10} unidades** - Precio: $${cfg.precio || '0'}`,
          data: { stock: [cfg] }
        };
      }

      return {
        success: true,
        message: `📦 *Consulta de Stock*\n\nNo hay productos registrados en el inventario de este bot en la base de datos.`,
        data: { stock: [] }
      };
    }

    const listText = memories.map((m: any, idx: number) => {
      const payload = m.payload as any;
      return `${idx + 1}. *${payload?.producto || m.title}* - Stock: 🟢 **${payload?.cantidad || 'N/A'}**`;
    }).join('\n');

    return {
      success: true,
      message: `📦 *Inventario Actual (Bot: ${botId}):*\n\n${listText}`,
      data: { stock: memories }
    };
  }
};

CapabilityRegistry.register(StockCheckCapability);
