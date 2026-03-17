import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';

const SENSITIVE_FIELDS = [
  'password',
  'oldPassword',
  'newPassword',
  'refreshToken',
  'accessToken',
  'token',
  'secret',
  'authorization',
];

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, query, body } = req;
    const start = Date.now();

    const sanitizedBody = this.sanitize(body);

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      this.logger.log(
        `Request: ${method} ${originalUrl} | Query: ${JSON.stringify(query)} | Body: ${JSON.stringify(sanitizedBody)} | Status: ${statusCode} | Duration: ${duration}ms`,
      );
    });

    next();
  }

  private sanitize(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        sanitized[key] = '***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
