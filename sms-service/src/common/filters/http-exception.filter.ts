import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponseBody {
  code: string;
  message: string;
  details: string[] | null;
}

// Standardizes every error response to { code, message, details } so API
// consumers never have to branch on which endpoint failed.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(this.buildBody(status, exception));
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: null,
    });
  }

  private buildBody(status: number, exception: HttpException): ErrorResponseBody {
    const body = exception.getResponse();
    const code = HttpStatus[status] ?? 'ERROR';

    if (typeof body === 'string') {
      return { code, message: body, details: null };
    }

    const { message } = body as { message?: string | string[]; error?: string };

    if (Array.isArray(message)) {
      return { code, message: 'Validation failed', details: message };
    }

    return { code, message: message ?? exception.message, details: null };
  }
}
