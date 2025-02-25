import morgan from "morgan";
import logger from "../config/logger";

const environment = process.env.NODE_ENV || "development";

const stream = {
  write: (message: string) => logger.http(message.trim()),
};

const developmentFormat =
  ':method :url :status :response-time ms - :res[content-length] ":referrer" ":user-agent"';

const productionFormat = ":remote-addr :method :url :status :response-time ms";

const morganMiddleware = morgan(
  environment === "development" ? developmentFormat : productionFormat,
  {
    stream,
    skip: (req, res) => {
      if (environment === "production") {
        return req.url === "/health" && res.statusCode === 200;
      }
      return false;
    },
  }
);

export default morganMiddleware;
