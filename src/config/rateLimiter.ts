import rateLimit from "express-rate-limit";
import { ResponseUtil } from "../utils/response.util";

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  handler: (req, res) => {
    ResponseUtil.tooManyRequests(
      res,
      "Too many login attempts from this IP, please try again after an hour"
    );
  },
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  handler: (req, res) => {
    ResponseUtil.tooManyRequests(
      res,
      "Too many message requests, please try again after a minute"
    );
  },
});
