import { Injectable, Logger } from '@nestjs/common';

interface LogContext {
  context?: string;
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

@Injectable()
export class AppLogger {
  private logger = new Logger('App');

  log(message: string, context?: LogContext) {
    this.logger.log(this.formatMessage(message, context));
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(this.formatMessage(message, context));
  }

  error(message: string, error?: any, context?: LogContext) {
    const stack = error?.stack || '';
    this.logger.error(this.formatMessage(message, context), stack);
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(this.formatMessage(message, context));
  }

  private formatMessage(message: string, context?: LogContext): string {
    if (!context) return message;
    const parts = [message];
    if (context.context) parts.push(`[${context.context}]`);
    if (context.requestId) parts.push(`[${context.requestId}]`);
    if (context.userId) parts.push(`[user:${context.userId}]`);
    return parts.join(' ');
  }
}
