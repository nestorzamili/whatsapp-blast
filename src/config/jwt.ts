import jwt, { SignOptions, TokenExpiredError } from "jsonwebtoken";
import crypto from "crypto";
import { UserPayload, VerificationResult } from "../types";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

const generateToken = (
  payload: UserPayload,
  secret: string,
  expiresIn: string
) => jwt.sign(payload, secret, { expiresIn } as SignOptions);

const verifyJwtToken = (token: string, secret: string): VerificationResult => {
  try {
    const payload = jwt.verify(token, secret) as UserPayload;
    return {
      isValid: true,
      payload,
    };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return {
        isValid: false,
        payload: null,
        error: `Token has expired`,
      };
    }
    return {
      isValid: false,
      payload: null,
      error: `Invalid token`,
    };
  }
};

export const generateAccessToken = (payload: UserPayload) =>
  generateToken(payload, JWT_SECRET, "1h");

export const generateRefreshToken = (payload: UserPayload) =>
  generateToken(payload, JWT_REFRESH_SECRET, "7d");

export const generateVerificationToken = (): string =>
  crypto.randomBytes(32).toString("hex");

export const verifyToken = async (token: string): Promise<VerificationResult> =>
  verifyJwtToken(token, JWT_SECRET);

export const verifyRefreshToken = async (
  token: string
): Promise<VerificationResult> => verifyJwtToken(token, JWT_REFRESH_SECRET);
