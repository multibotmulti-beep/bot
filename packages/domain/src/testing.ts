import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { CredentialService } from './webhook';
import { UserService } from './index';

export class TestingService {
  static async seedDemoData() {
    logger.info('Cargando datos de prueba / demo (seed)...');
    
    // 1. Crear usuario demo si no existe
    let demoUser;
    try {
      demoUser = await UserService.createUser({
        email: 'demo@monorepo.local',
        name: 'Usuario Demo Enterprise',
      });
    } catch (err: any) {
      logger.info({ err }, 'El usuario demo ya existe o ya fue creado');
      const users = await UserService.getUsers();
      demoUser = users.find(u => u.email === 'demo@monorepo.local') || users[0];
    }

    // 2. Crear credencial de prueba para webhook apuntando al receptor local
    const demoCredential = await CredentialService.createCredential({
      apiName: 'local-test-api',
      apiKey: 'key_live_monorepo_123456',
      apiSecret: 'secret_hmac_sha256_super_secure',
      targetUrl: 'http://localhost:4000/webhooks/test-receiver',
      isActive: true,
    });

    logger.info('Datos de prueba cargados exitosamente');
    return {
      success: true,
      message: 'Datos de prueba cargados correctamente',
      data: {
        demoUser,
        demoCredential: {
          id: demoCredential.id,
          apiName: demoCredential.apiName,
          targetUrl: demoCredential.targetUrl,
        },
      },
    };
  }

  static async getSystemStatus() {
    const startTime = Date.now();
    let dbStatus = 'CONNECTED';
    let dbLatencyMs = 0;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - startTime;
    } catch (error) {
      dbStatus = 'DISCONNECTED';
      logger.warn({ error }, 'Database ping check failed');
    }

    const [userCount, credentialCount, logCount] = await Promise.all([
      prisma.user.count(),
      prisma.apiCredential.count(),
      prisma.webhookLog.count(),
    ]);

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        provider: 'postgresql',
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      stats: {
        users: userCount,
        credentials: credentialCount,
        webhookLogs: logCount,
      },
    };
  }
}
