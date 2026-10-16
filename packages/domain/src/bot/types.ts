import { z } from 'zod';

export const CreateBotProfileSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/, { message: 'El número de teléfono debe ser válido (8 a 15 dígitos)' }),
  name: z.string().min(1, { message: 'El nombre del bot es obligatorio' }),
  description: z.string().optional(),
  welcomeMessage: z.string().optional(),
  invalidOptionMessage: z.string().optional(),
  menuOptions: z.array(z.object({ label: z.string(), option: z.string() })).optional(),
  type: z.enum(['demo', 'custom', 'system']).default('custom'),
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const CreateBotRuleSchema = z.object({
  botProfileId: z.string().min(1, { message: 'El ID del perfil de bot es obligatorio' }),
  keyword: z.string().min(1, { message: 'La palabra clave es obligatoria' }),
  matchType: z.enum(['exact', 'contains', 'default']).default('exact'),
  responseMessage: z.string().min(1, { message: 'El mensaje de respuesta es obligatorio' }),
  isActive: z.boolean().default(true),
});

export const CreateBotFlowSchema = z.object({
  botProfileId: z.string().min(1, { message: 'El ID del flujo es obligatorio' }),
  name: z.string().min(1, { message: 'El nombre del flujo es obligatorio' }),
  triggerKeyword: z.string().min(1, { message: 'La palabra clave de activación es obligatoria' }),
  flowType: z.enum(['menu', 'conversation']).default('menu'),
  content: z.string().min(1, { message: 'El contenido es obligatorio' }),
  responseMessage: z.string().min(1, { message: 'El mensaje de respuesta es obligatorio' }),
  isActive: z.boolean().default(true),
});

export type CreateBotProfileDTO = z.infer<typeof CreateBotProfileSchema>;
export type CreateBotRuleDTO = z.infer<typeof CreateBotRuleSchema>;
export type CreateBotFlowDTO = z.infer<typeof CreateBotFlowSchema>;
