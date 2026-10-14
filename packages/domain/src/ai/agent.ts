import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { AIProviderFactory } from './provider';
import { AIMessage, AITool } from './types';
import { BotFunctionRegistry } from '../bot.functions';
import { BotProfileService } from '../bot';

export class AIAgent {
  /**
   * Obtiene las herramientas (tools) disponibles basadas en el registro de funciones del bot
   */
  static getTools(): AITool[] {
    const functions = BotFunctionRegistry.getAll();
    return functions.map(fn => ({
      type: 'function',
      function: {
        name: fn.actionKey.replace(/\./g, '_'),
        description: fn.description,
        parameters: {
          type: 'object',
          properties: {
            args: {
              type: 'string',
              description: 'Argumentos o detalles adicionales proporcionados por el usuario para la función'
            }
          }
        }
      }
    }));
  }

  /**
   * Recupera el historial de conversación reciente para mantener el contexto en tiempo real
   */
  static async getContextHistory(botId: string, senderPhone: string): Promise<AIMessage[]> {
    try {
      const memories = await prisma.botMemory.findMany({
        where: { botId, senderPhone },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const messages: AIMessage[] = memories.reverse().map(m => {
        let parsedPayload: any = {};
        try {
          parsedPayload = m.payload ? JSON.parse(m.payload) : {};
        } catch {}

        return {
          role: m.status === 'user' ? 'user' : 'assistant',
          content: m.title + (parsedPayload.content ? ` (${parsedPayload.content})` : ''),
        };
      });

      return messages;
    } catch {
      return [];
    }
  }

  /**
   * Guarda un mensaje en el historial de memoria conversacional
   */
  static async saveContextMessage(botId: string, senderPhone: string, role: 'user' | 'assistant', content: string) {
    try {
      await prisma.botMemory.create({
        data: {
          botId,
          senderPhone,
          category: 'chat_context',
          title: content.substring(0, 150),
          status: role,
          payload: JSON.stringify({ role, content }),
          tags: `context,${role}`,
        },
      });
    } catch (err: any) {
      logger.error({ err }, 'Error al guardar contexto conversacional en BD');
    }
  }

  /**
   * Procesa un mensaje de chat usando IA con soporte para memoria contextual y Function Calling
   */
  static async handleMessage(botId: string, senderPhone: string, incomingText: string): Promise<string> {
    const provider = AIProviderFactory.getProvider();

    // 1. Obtener perfil del negocio para contextualizar la IA
    const profile = await BotProfileService.getProfileByBotId(botId);
    const businessName = profile?.name || 'Comercio General';
    const businessDesc = profile?.description || 'Asistente virtual automatizado';

    // 2. Construir system prompt personalizado
    const systemPrompt: AIMessage = {
      role: 'system',
      content: `Eres el asistente virtual inteligente de "${businessName}". Descripción del negocio: "${businessDesc}". 
Tu objetivo es atender a los clientes de forma natural, cordial y eficiente. 
Puedes consultar stock, registrar turnos, proporcionar datos de pago y gestionar pedidos utilizando las herramientas disponibles cuando el usuario lo solicite. Responde siempre en español de manera concisa y profesional.`
    };

    // 3. Recuperar historial de contexto
    const history = await this.getContextHistory(botId, senderPhone);

    // 4. Registrar mensaje del usuario en memoria
    await this.saveContextMessage(botId, senderPhone, 'user', incomingText);

    // 5. Preparar mensajes para la IA
    const messages: AIMessage[] = [
      systemPrompt,
      ...history,
      { role: 'user', content: incomingText }
    ];

    const tools = this.getTools();

    // 6. Invocar al proveedor de IA (Groq por defecto)
    let aiResponse = await provider.chatCompletion(messages, tools);

    // 7. Manejar Function Calling si la IA lo requiere
    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      const toolCall = aiResponse.tool_calls[0];
      const originalActionKey = toolCall.function.name.replace(/_/g, '.');
      
      logger.info({ originalActionKey, arguments: toolCall.function.arguments }, 'IA invocó Function Calling');

      // Ejecutar la función real mediante el registro de dominio
      const executionResult = await BotFunctionRegistry.execute(originalActionKey, {
        botId,
        senderPhone,
        args: { input: incomingText, ...JSON.parse(toolCall.function.arguments || '{}') }
      });

      const functionOutput = executionResult.success ? executionResult.message : `Error: ${executionResult.message}`;

      messages.push({
        role: 'assistant',
        content: `Ejecutando función ${originalActionKey}...`,
      });
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: functionOutput,
      });

      aiResponse = await provider.chatCompletion(messages);
    }

    const finalReply = aiResponse.content || 'Entendido. ¿En qué más puedo ayudarte?';

    // 8. Guardar respuesta del asistente en memoria
    await this.saveContextMessage(botId, senderPhone, 'assistant', finalReply);

    return finalReply;
  }
}
