import morgan from "morgan";
import { IncomingMessage } from "http";
import logger from "../config/logger";
import { isDevelopment } from "../utils/environment";

// Custom token for IP address formatting
morgan.token("clean-remote-addr", (req: IncomingMessage) => {
  const ip = req.socket?.remoteAddress || "";
  // Convert IPv4-mapped IPv6 addresses (::ffff:127.0.0.1) to IPv4 (127.0.0.1)
  return ip.replace(/^::ffff:/, "");
});

// Format configurations
const formats = {
  development:
    ':method :url :status :response-time ms - :res[content-length] ":referrer" ":user-agent"',
  production:
    ':clean-remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
};

// Create morgan middleware
const morganMiddleware = morgan(
  isDevelopment() ? formats.development : formats.production,
  {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  }
);

export default morganMiddleware;
