import winston from "winston";

const { combine, timestamp, colorize, printf, json } = winston.format;

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "cyan",
};

winston.addColors(colors);

const environment = process.env.NODE_ENV || "development";

// Development format
const developmentFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Production format
const productionFormat = combine(timestamp(), json());

const logger = winston.createLogger({
  level: environment === "development" ? "debug" : "http", // Changed from 'info' to 'http'
  format: environment === "development" ? developmentFormat : productionFormat,
  transports: [
    ...(environment === "development"
      ? [
          // Development transports
          new winston.transports.Console(),
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
          }),
          new winston.transports.File({
            filename: "logs/debug.log",
            level: "debug",
          }),
        ]
      : [
          // Production transports
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: "logs/http.log", // Added HTTP log file
            level: "http",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]),
  ],
  // Handling Uncaught Exceptions in production
  ...(environment === "production" && {
    exceptionHandlers: [
      new winston.transports.File({ filename: "logs/exceptions.log" }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: "logs/rejections.log" }),
    ],
  }),
});

export default logger;
