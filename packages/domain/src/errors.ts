import { logger } from '@repo/logger';

export enum ErrorCodes {
    CREDENTIAL_INVALID = 'CREDENTIAL_INVALID',
    CREDENTIAL_NOT_FOUND = 'CREDENTIAL_NOT_FOUND',
    WEBHOOK_DISPATCH_FAILED = 'WEBHOOK_DISPATCH_FAILED',
    DATABASE_ERROR = 'DATABASE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: ErrorCodes;
    public readonly userMessage: string;
    public readonly details?: any;

    constructor(
        message: string,
        userMessage: string,
        errorCode: ErrorCodes = ErrorCodes.INTERNAL_SERVER_ERROR,
        statusCode: number = 500,
        details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.userMessage = userMessage;
        this.details = details;

        logger.error(
            { errorCode, statusCode, details, stack: this.stack },
            `[APP_ERROR] ${message}`
        );

        Error.captureStackTrace(this, this.constructor);
    }
}

export class CredentialError extends AppError {
    constructor(message: string, userMessage: string, details?: any) {
        super(message, userMessage, ErrorCodes.CREDENTIAL_INVALID, 400, details);
    }
}

export class WebhookError extends AppError {
    constructor(message: string, userMessage: string, details?: any) {
        super(message, userMessage, ErrorCodes.WEBHOOK_DISPATCH_FAILED, 502, details);
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, userMessage: string, details?: any) {
        super(message, userMessage, ErrorCodes.DATABASE_ERROR, 500, details);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, userMessage: string, details?: any) {
        super(message, userMessage, ErrorCodes.VALIDATION_ERROR, 400, details);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string, userMessage: string, details?: any) {
        super(message, userMessage, ErrorCodes.NOT_FOUND, 404, details);
    }
}

export class ConflictError extends AppError {
    constructor(message: string, userMessage: string, details?: any) {
        super(message, userMessage, ErrorCodes.CONFLICT, 409, details);
    }
}

/**
 * Mapeador inteligente de errores de Prisma a errores de dominio HTTP
 */
export function mapPrismaError(error: any): AppError {
    if (error && typeof error.code === 'string') {
        switch (error.code) {
            case 'P2002': {
                const target = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'registro';
                return new ConflictError(
                    `Unique constraint violation on field(s): ${target}`,
                    `Conflicto de datos: Ya existe un registro con el mismo valor único (${target}).`,
                    { field: target, prismaCode: error.code }
                );
            }
            case 'P2025':
                return new NotFoundError(
                    `Record not found: ${error.message}`,
                    `Recurso no encontrado: El elemento solicitado no existe en la base de datos.`,
                    { prismaCode: error.code }
                );
            case 'P2003':
                return new ValidationError(
                    `Foreign key constraint failed: ${error.message}`,
                    `Error de relación: La operación viola una restricción de clave foránea.`,
                    { prismaCode: error.code }
                );
            default:
                return new DatabaseError(
                    `Prisma error [${error.code}]: ${error.message}`,
                    `Error de base de datos (${error.code}) al procesar la operación.`,
                    { prismaCode: error.code, meta: error.meta }
                );
        }
    }
    return error;
}
