import { z } from 'zod';

export interface CapabilityContext {
  senderPhone?: string;
  userId?: string;
  botId?: string;
  args?: any;
  localConfig?: any;
  headers?: Record<string, any>;
  protocol?: string;
}

export interface CapabilityResult {
  success: boolean;
  message?: string;
  data?: any;
  nextStep?: string;
}

export interface ConfigFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  defaultValue?: any;
  options?: { label: string; value: any }[];
  required?: boolean;
  description?: string;
}

export interface DomainCapability {
  key: string;
  name: string;
  description: string;
  parameters?: Record<string, string>;
  configSchema?: ConfigFieldSchema[];
  exampleUsage?: string;
  execute: (context: CapabilityContext) => Promise<CapabilityResult>;
}

export const ExecuteCapabilitySchema = z.object({
  capabilityKey: z.string(),
  senderPhone: z.string().optional(),
  userId: z.string().optional(),
  botId: z.string().optional(),
  args: z.any().optional(),
});

export type ExecuteCapabilityDTO = z.infer<typeof ExecuteCapabilitySchema>;
