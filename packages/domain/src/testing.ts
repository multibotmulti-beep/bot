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
      logger.info('El usuario demo ya existe o ya fue creado');
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
      metrics: {
        users: userCount,
        credentials: credentialCount,
        webhookLogs: logCount,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }

  static async runDiagnostics() {
    const results: Array<{ step: string; success: boolean; message: string; durationMs: number }> = [];

    // Test 1: Database ping
    const t1Start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.push({ step: 'Database Ping', success: true, message: 'Conexión PostgreSQL OK', durationMs: Date.now() - t1Start });
    } catch (e: any) {
      results.push({ step: 'Database Ping', success: false, message: e.message, durationMs: Date.now() - t1Start });
    }

    // Test 2: User management
    const t2Start = Date.now();
    try {
      const email = `diag-${Date.now()}@test.local`;
      const user = await UserService.createUser({ email, name: 'Diag User' });
      results.push({ step: 'User Creation', success: !!user.id, message: `Usuario creado con ID ${user.id}`, durationMs: Date.now() - t2Start });
    } catch (e: any) {
      results.push({ step: 'User Creation', success: false, message: e.message, durationMs: Date.now() - t2Start });
    }

    // Test 3: Credential management
    const t3Start = Date.now();
    try {
      const apiName = `diag-api-${Date.now()}`;
      const cred = await CredentialService.createCredential({
        apiName,
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        targetUrl: 'http://localhost:4000/webhooks/test-receiver',
      });
      results.push({ step: 'Credential Creation', success: !!cred.id, message: `Credencial creada para ${apiName}`, durationMs: Date.now() - t3Start });
    } catch (e: any) {
      results.push({ step: 'Credential Creation', success: false, message: e.message, durationMs: Date.now() - t3Start });
    }

    const allPassed = results.every(r => r.success);
    return {
      success: allPassed,
      summary: allPassed ? 'Todas las pruebas de diagnóstico pasaron correctamente.' : 'Algunas pruebas fallaron.',
      steps: results,
      timestamp: new Date().toISOString(),
    };
  }
}
