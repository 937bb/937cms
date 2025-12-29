import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorResponse {
  ok: false;
  code: string;
  message: string;
  details?: any;
}

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    const response: ErrorResponse = {
      ok: false,
      code,
      message,
      ...(details && { details }),
    };
    super(response, statusCode);
  }
}

export class ValidationException extends AppException {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, details);
  }
}

export class DatabaseException extends AppException {
  constructor(message: string, details?: any) {
    super('DATABASE_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}

export class AuthException extends AppException {
  constructor(message: string = 'Unauthorized') {
    super('AUTH_ERROR', message, HttpStatus.UNAUTHORIZED);
  }
}

export class NotFoundException extends AppException {
  constructor(message: string = 'Not Found') {
    super('NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends AppException {
  constructor(message: string = 'Conflict') {
    super('CONFLICT', message, HttpStatus.CONFLICT);
  }
}

export class InternalServerException extends AppException {
  constructor(message: string = 'Internal Server Error', details?: any) {
    super('INTERNAL_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}
