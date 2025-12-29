import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../logger/app.logger';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private logger = new AppLogger();

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const logger = this.logger;

    (req as any).requestId = requestId;

    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      logger.log(
        `${req.method} ${req.url} ${statusCode} ${duration}ms`,
        {
          context: 'HttpLogging',
          requestId,
          method: req.method,
          path: req.url,
          statusCode,
          duration,
        },
      );

      return originalSend.call(this, data);
    };

    next();
  }
}
