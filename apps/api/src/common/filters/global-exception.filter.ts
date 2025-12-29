import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppLogger } from '../logger/app.logger';
import { ErrorResponse } from '../exceptions/app.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger = new AppLogger();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && 'code' in exceptionResponse) {
        errorResponse = exceptionResponse as ErrorResponse;
      } else {
        errorResponse = {
          ok: false,
          code: 'HTTP_ERROR',
          message: exception.message,
        };
      }
    } else if (exception instanceof Error) {
      errorResponse = {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: exception.message || 'Internal Server Error',
      };
      this.logger.error(`Unhandled error: ${exception.message}`, exception, {
        context: 'GlobalExceptionFilter',
        path: request.url,
        method: request.method,
      });
    } else {
      errorResponse = {
        ok: false,
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
      };
      this.logger.error(`Unknown error type`, new Error(String(exception)), {
        context: 'GlobalExceptionFilter',
        path: request.url,
        method: request.method,
      });
    }

    response.status(statusCode).json(errorResponse);
  }
}
