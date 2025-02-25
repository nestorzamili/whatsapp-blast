import { Request, Response, NextFunction } from "express";
import { ResponseUtil } from "../utils/response.util";

interface ValidatorMiddleware {
  validateRequestBody: (
    allowedFields: string[]
  ) => (req: Request, res: Response, next: NextFunction) => void;
  validateQueryParams: (
    allowedParams: string[]
  ) => (req: Request, res: Response, next: NextFunction) => void;
}

export const validateRequestBody = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const extraFields = Object.keys(req.body).filter(
      (key) => !allowedFields.includes(key)
    );

    if (extraFields.length > 0) {
      ResponseUtil.badRequest(res, "Invalid request body", [
        `Unexpected fields: ${extraFields.join(", ")}`,
      ]);
      return;
    }

    next();
  };
};

export const validateQueryParams = (allowedParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const extraParams = Object.keys(req.query).filter(
      (key) => !allowedParams.includes(key)
    );

    if (extraParams.length > 0) {
      ResponseUtil.badRequest(res, "Invalid query parameters", [
        `Unexpected parameters: ${extraParams.join(", ")}`,
      ]);
      return;
    }

    next();
  };
};

const validator: ValidatorMiddleware = {
  validateRequestBody,
  validateQueryParams,
};

export default validator;
