import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import {
  AppRequest,
  buildRequestLogMessage,
  getRequestId,
  getRequestPath,
} from '../http/request-context';

type ErrorResponseBody = {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly isProduction: boolean) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<AppRequest>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.buildErrorPayload(exception, statusCode, request);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      const message =
        exception instanceof Error
          ? exception.message
          : 'Unexpected internal server error.';
      const logMessage = buildRequestLogMessage('request_exception', request, {
        statusCode,
        error: message,
      });

      this.logger.error(logMessage, stack);
    }

    response.status(statusCode).json(payload);
  }

  private buildErrorPayload(
    exception: unknown,
    statusCode: number,
    request: Request,
  ): ErrorResponseBody {
    const timestamp = new Date().toISOString();
    const path = getRequestPath(request);
    const requestId = getRequestId(request);

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const fallbackError = this.getHttpErrorLabel(statusCode);

      if (typeof response === 'string') {
        const error = String(fallbackError);

        return {
          statusCode,
          error,
          message: response,
          timestamp,
          path,
          requestId,
        };
      }

      if (response && typeof response === 'object') {
        const responseRecord = response as Record<string, unknown>;
        const message = Array.isArray(responseRecord.message)
          ? responseRecord.message.filter((value) => typeof value === 'string')
          : typeof responseRecord.message === 'string'
            ? responseRecord.message
            : String(fallbackError);
        const error =
          typeof responseRecord.error === 'string'
            ? responseRecord.error
            : String(fallbackError);

        return {
          statusCode,
          error,
          message,
          timestamp,
          path,
          requestId,
        };
      }
    }

    return {
      statusCode,
      error: String(this.getHttpErrorLabel(statusCode)),
      message: this.isProduction
        ? 'Internal server error.'
        : exception instanceof Error
          ? exception.message
          : 'Unexpected internal server error.',
      timestamp,
      path,
      requestId,
    };
  }

  private getHttpErrorLabel(statusCode: number) {
    const label = (HttpStatus as Record<number, string | undefined>)[statusCode];
    return label || 'HttpException';
  }
}
