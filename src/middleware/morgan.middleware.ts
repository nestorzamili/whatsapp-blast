import morgan from "morgan";
import logger from "../config/logger";

const environment = process.env.NODE_ENV || "development";

const stream = {
  write: (message: string) => logger.http(message.trim()),
};

const developmentFormat =
  ':method :url :status :response-time ms - :res[content-length] ":referrer" ":user-agent"';

const productionFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

const morganMiddleware = morgan(
  environment === "development" ? developmentFormat : productionFormat,
  { stream }
);

export default morganMiddleware;
