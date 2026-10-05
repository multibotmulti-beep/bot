import pino from 'pino';
import { randomUUID } from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export type Logger = typeof logger;

/**
 * Estructura de métricas de rendimiento
 */
export interface PerformanceMetric {
  operation: string;
  durationMs: number;
  timestamp: string;
  success: boolean;
  meta?: Record<string, any>;
}

/**
 * Utilidades avanzadas de Logging, Métricas de Rendimiento y Trazabilidad Distribuida
 */
export const LoggerUtils = {
  /**
   * Genera un identificador único de trazabilidad (TraceId / RequestId)
   */
  generateTraceId(): string {
    return randomUUID();
  },

  /**
   * Crea un logger hijo enriquecido con un traceId para trazabilidad distribuida
   */
  withTrace(traceId: string) {
    return logger.child({ traceId });
  },

  /**
   * Mide automáticamente el rendimiento y registra la latencia de una operación asíncrona
   */
  async measureAsync<T>(
    operationName: string,
    fn: () => Promise<T>,
    meta?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    const traceId = meta?.traceId || randomUUID();
    const childLog = logger.child({ traceId, operation: operationName });

    childLog.info({ ...meta }, `Iniciando operación: ${operationName}`);

    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      childLog.info(
        { durationMs, success: true, ...meta },
        `Operación completada: ${operationName} en ${durationMs}ms`
      );
      return result;
    } catch (error: any) {
      const durationMs = Math.round(performance.now() - start);
      childLog.error(
        { durationMs, success: false, err: error.message, ...meta },
        `Operación fallida: ${operationName} tras ${durationMs}ms`
      );
      throw error;
    }
  },

  /**
   * Registra una métrica de rendimiento explícita
   */
  logPerformance(metric: PerformanceMetric) {
    logger.info(
      { type: 'performance_metric', ...metric },
      `[METRIC] ${metric.operation}: ${metric.durationMs}ms`
    );
  },
};
