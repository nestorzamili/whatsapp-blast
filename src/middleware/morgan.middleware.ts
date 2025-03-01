import morgan from "morgan";
import { IncomingMessage } from "http";
import logger from "../config/logger";
import { isDevelopment } from "../utils/environment";

morgan.token("real-ip", (req: IncomingMessage) => {
  const xForwardedFor = req.headers["x-forwarded-for"] as string;
  const xRealIp = req.headers["x-real-ip"] as string;

  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    return ips[0];
  }

  if (xRealIp) {
    return xRealIp;
  }

  const ip = req.socket?.remoteAddress || "";
  return ip.replace(/^::ffff:/, "");
});

const formats = {
  development:
    ':method :url :status :response-time ms - :res[content-length] ":referrer" ":user-agent"',
  production:
    ':real-ip - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
};

const morganMiddleware = morgan(
  isDevelopment() ? formats.development : formats.production,
  {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  }
);

export default morganMiddleware;
