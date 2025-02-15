import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many requests from this IP, please try again after an hour",
});
