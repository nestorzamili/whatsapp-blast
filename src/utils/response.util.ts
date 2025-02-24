import { Response } from "express";

interface ResponseData {
  success: boolean;
  message: string;
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
