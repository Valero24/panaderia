import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;
    const message =
      typeof exceptionResponse === "object" &&
      exceptionResponse &&
      "message" in exceptionResponse
        ? (exceptionResponse as any).message
        : exception instanceof Error
          ? exception.message
          : "Error interno";

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    response.status(status).json({
      statusCode: status,
      message:
        status >= 500
          ? "Error interno del servidor"
          : message,
      conflicts:
        typeof exceptionResponse === "object" &&
        exceptionResponse &&
        "conflicts" in exceptionResponse
          ? (exceptionResponse as any).conflicts
          : undefined,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
