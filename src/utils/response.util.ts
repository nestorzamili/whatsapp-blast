import { Response } from "express";

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export class ResponseBuilder<T = any> {
  private response: ApiResponse<T> = {
    status: true,
    message: "",
  };

  public setStatus(status: boolean): this {
    this.response.status = status;
    return this;
  }

  public setMessage(message: string): this {
    this.response.message = message;
    return this;
  }

  public setData(data: T): this {
    this.response.data = data;
    return this;
  }

  public setErrors(errors: string[]): this {
    this.response.errors = errors;
    return this;
  }

  public setCode(code: string): this {
    this.response.code = code;
    return this;
  }

  public build(): ApiResponse<T> {
    return this.response;
  }
}

export class ResponseUtil {
  public static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: HttpStatus = HttpStatus.OK
  ): void {
    const response = new ResponseBuilder<T>()
      .setStatus(true)
      .setMessage(message);

    if (data) {
      response.setData(data);
    }

    res.status(statusCode).json(response.build());
  }

  public static created<T>(res: Response, message: string, data?: T): void {
    this.success(res, message, data, HttpStatus.CREATED);
  }

  public static noContent(res: Response): void {
    res.status(HttpStatus.NO_CONTENT).send();
  }

  public static error(
    res: Response,
    message: string,
    statusCode: HttpStatus,
    errors?: string[],
    code?: string
  ): void {
    const response = new ResponseBuilder().setStatus(false).setMessage(message);

    if (errors) {
      response.setErrors(errors);
    }

    if (code) {
      response.setCode(code);
    }

    res.status(statusCode).json(response.build());
  }

  public static badRequest(
    res: Response,
    message: string = "Bad Request",
    errors?: string[]
  ): void {
    this.error(res, message, HttpStatus.BAD_REQUEST, errors, "BAD_REQUEST");
  }

  public static unauthorized(
    res: Response,
    message: string = "Unauthorized",
    errors?: string[]
  ): void {
    this.error(res, message, HttpStatus.UNAUTHORIZED, errors, "UNAUTHORIZED");
  }

  public static forbidden(
    res: Response,
    message: string = "Forbidden",
    errors?: string[]
  ): void {
    this.error(res, message, HttpStatus.FORBIDDEN, errors, "FORBIDDEN");
  }

  public static notFound(
    res: Response,
    message: string = "Not Found",
    errors?: string[]
  ): void {
    this.error(res, message, HttpStatus.NOT_FOUND, errors, "NOT_FOUND");
  }

  public static conflict(
    res: Response,
    message: string = "Conflict",
    errors?: string[]
  ): void {
    this.error(res, message, HttpStatus.CONFLICT, errors, "CONFLICT");
  }

  public static tooManyRequests(
    res: Response,
    message: string = "Too Many Requests",
    errors?: string[]
  ): void {
    this.error(
      res,
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      errors,
      "TOO_MANY_REQUESTS"
    );
  }

  public static internalServerError(
    res: Response,
    error: Error,
    message: string = "Internal Server Error"
  ): void {
    const errors =
      process.env.NODE_ENV === "development"
        ? [error.message, error.stack || ""]
        : undefined;

    this.error(
      res,
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      errors,
      "INTERNAL_SERVER_ERROR"
    );
  }

  public static validationError(
    res: Response,
    errors: string[],
    message: string = "Validation Error"
  ): void {
    this.error(
      res,
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      errors,
      "VALIDATION_ERROR"
    );
  }
}
