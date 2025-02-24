import { Response } from "express";

interface ResponseData {
  success: boolean;
  message?: string;
  [key: string]: any;
}

export const handleResponse = (
  res: Response,
  statusCode: number,
  data: ResponseData
): void => {
  res.status(statusCode).json(data);
};

export const handleAuthError = (res: Response): void => {
  handleResponse(res, 401, {
    success: false,
    message: "Unauthorized access",
  });
};

export const handleClientError = (res: Response, message: string): void => {
  handleResponse(res, 400, {
    success: false,
    message,
  });
};

export const handleNotFoundError = (res: Response, message: string): void => {
  handleResponse(res, 404, {
    success: false,
    message,
  });
};

export const handleServerError = (res: Response, error: any): void => {
  handleResponse(res, 500, {
    success: false,
    message: "Internal server error",
    error: error.message,
  });
};
