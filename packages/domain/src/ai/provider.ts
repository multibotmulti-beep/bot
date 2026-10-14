import { logger } from '@repo/logger';
import { AIProvider, AIMessage, AITool, AIResponse } from './types';

export class GroqAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    this.model = model;
  }

  async chatCompletion(messages: AIMessage[], tools?: AITool[]): Promise<AIResponse> {
    try {
      const payload: any = {
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, 'Error en API de Groq AI');
        throw new Error(`Groq AI Error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content || null,
        tool_calls: choice?.message?.tool_calls || undefined,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Excepción al invocar Groq AI Provider');
      throw error;
    }
  }
}

export class AIProviderFactory {
  static getProvider(providerName?: string): AIProvider {
    const provider = providerName || process.env.AI_PROVIDER || 'groq';
    if (provider === 'groq') {
      return new GroqAIProvider();
    }
    return new GroqAIProvider();
  }
}
