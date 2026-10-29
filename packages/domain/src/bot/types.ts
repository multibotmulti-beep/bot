import { z } from 'zod';

export const CreateBotProfileSchema = z.object({
  botId: z.string().optional(),
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/, { message: 'El número de teléfono debe ser válido (8 a 15 dígitos)' }),
  name: z.string().min(1, { message: 'El nombre del bot es obligatorio' }),
  description: z.string().optional(),
  welcomeMessage: z.string().optional(),
  invalidOptionMessage: z.string().optional(),
  menuOptions: z.array(z.object({
    label: z.string(),
    option: z.string(),
    actionKey: z.string().optional(),
    customResponse: z.string().optional()
  })).optional(),
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
  parentId: z.string().optional().nullable(),
  name: z.string().min(1, { message: 'El nombre del flujo es obligatorio' }),
  triggerKeyword: z.string().optional().default(''),
  contentType: z.enum(['text_plain', 'single_function', 'text_menu', 'media_interactive', 'image_menu']).optional(),
  mediaUrl: z.string().optional().nullable(),
  flowType: z.enum(['menu', 'conversation']).optional().default('menu'),
  content: z.any().optional().default('[]'),
  responseMessage: z.string().optional().default(''),
  actionKey: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  messages: z.array(z.object({
    contentType: z.string().optional(),
    responseMessage: z.string().optional(),
    mediaUrl: z.string().optional().nullable()
  })).optional(),
});

export const UpdateBotFlowSchema = CreateBotFlowSchema.partial();

export type CreateBotProfileDTO = z.infer<typeof CreateBotProfileSchema>;
export type CreateBotRuleDTO = z.infer<typeof CreateBotRuleSchema>;
export type CreateBotFlowDTO = z.infer<typeof CreateBotFlowSchema>;
export type UpdateBotFlowDTO = z.infer<typeof UpdateBotFlowSchema>;
