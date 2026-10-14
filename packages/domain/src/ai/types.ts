export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface AIToolParameterProperty {
  type: string;
  description: string;
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, AIToolParameterProperty>;
      required?: string[];
    };
  };
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIResponse {
  content: string | null;
  tool_calls?: AIToolCall[];
}

export interface AIProvider {
  chatCompletion(messages: AIMessage[], tools?: AITool[]): Promise<AIResponse>;
}
