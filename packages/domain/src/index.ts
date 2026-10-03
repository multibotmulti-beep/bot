import { z } from 'zod';
import { prisma, User } from '@repo/database';
import { logger } from '@repo/logger';
import { DatabaseError, CredentialError } from './errors';

// Exportar todo el sistema de webhooks, credenciales, comandos, whatsapp y errores
export * from './webhook';
export * from './errors';
export * from './command';
export * from './whatsapp';
export * from './bot';

// 1. Validaciones con Zod (Value Objects / DTOs)
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).optional(),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

// 2. Servicios de Dominio / Casos de Uso
export class UserService {
  static async createUser(data: CreateUserDTO): Promise<User> {
    const validated = CreateUserSchema.parse(data);
    
    logger.info({ email: validated.email }, 'Intentando crear usuario en el dominio');

    try {
      const existing = await prisma.user.findUnique({
        where: { email: validated.email },
      });

      if (existing) {
        throw new CredentialError(
          `User with email ${validated.email} already exists`,
          `Error de usuario: Ya existe un registro con el correo ${validated.email}`
        );
      }

      const user = await prisma.user.create({
        data: {
          email: validated.email,
          name: validated.name,
        },
      });

      logger.info({ userId: user.id }, 'Usuario creado exitosamente');
      return user;
    } catch (error: any) {
      if (error instanceof CredentialError) throw error;
      throw new DatabaseError(
        `Database failure during user creation: ${error.message}`,
        'Error de base de datos: No se pudo completar la operación de usuario',
        { originalError: error.message }
      );
    }
  }

  static async getUsers(): Promise<User[]> {
    logger.info('Obteniendo lista de usuarios');
    try {
      return await prisma.user.findMany();
    } catch (error: any) {
      throw new DatabaseError(
        `Database failure during getUsers: ${error.message}`,
        'Error de base de datos: No se pudo recuperar la lista de usuarios',
        { originalError: error.message }
      );
    }
  }

  static async deleteUser(id: string): Promise<boolean> {
    logger.info({ userId: id }, 'Eliminando usuario');
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch (error: any) {
      throw new DatabaseError(
        `Database failure during deleteUser: ${error.message}`,
        'Error de base de datos: No se pudo eliminar el usuario',
        { originalError: error.message }
      );
    }
  }

  static async getSystemStatus() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const userCount = await prisma.user.count();
      const credentialCount = await prisma.apiCredential.count();
      const webhookLogCount = await prisma.webhookLog.count();
      return {
        database: 'connected',
        users: userCount,
        credentials: credentialCount,
        webhookLogs: webhookLogCount,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
