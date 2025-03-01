import winston from "winston";
import { isProduction, isDevelopment } from "../utils/environment";

const { combine, timestamp, colorize, printf, json } = winston.format;

// Log levels with colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "cyan",
};

winston.addColors(colors);

// Format configurations
const formats = {
  development: combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
    printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  production: combine(timestamp(), json()),
};

// Transport configurations
const getTransports = () => {
  if (isDevelopment()) {
    return [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
      new winston.transports.File({
        filename: "logs/debug.log",
        level: "debug",
      }),
    ];
  } else {
    return [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: "logs/http.log",
        level: "http",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: "logs/combined.log",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ];
  }
};

// Exception handlers for production
const exceptionHandlers = isProduction()
  ? {
      exceptionHandlers: [
        new winston.transports.File({ filename: "logs/exceptions.log" }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: "logs/rejections.log" }),
      ],
    }
  : {};

// Create logger
const logger = winston.createLogger({
  level: isDevelopment() ? "debug" : "http",
  levels,
  format: isDevelopment() ? formats.development : formats.production,
  transports: getTransports(),
  ...exceptionHandlers,
});

// Log environment on startup
logger.info(
  `Logger initialized in ${process.env.NODE_ENV || "development"} mode`
);

export default logger;
