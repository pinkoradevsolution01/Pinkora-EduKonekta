import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = request.header('x-request-id') ?? randomUUID();
    if (!(exception instanceof HttpException) && !(exception instanceof ZodError))
      console.error({ requestId, exception });
    const status =
      exception instanceof ZodError
        ? HttpStatus.BAD_REQUEST
        : exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof ZodError
        ? 'Invalid request'
        : exception instanceof HttpException
          ? exception.getResponse()
          : undefined;
    const responseMessage =
      exceptionResponse && typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? (exceptionResponse as { message?: unknown }).message
        : undefined;
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : Array.isArray(responseMessage)
          ? responseMessage.join('; ')
          : typeof responseMessage === 'string'
            ? responseMessage
            : status >= 500
              ? 'Internal server error'
              : 'Request could not be completed';

    response.status(status).json({
      error: {
        code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
        message,
        requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
