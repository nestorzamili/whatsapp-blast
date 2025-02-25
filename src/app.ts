import express from "express";
import cors from "cors";
import helmet from "helmet";
import morganMiddleware from "./middleware/morgan.middleware";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import clientRoute from "./routes/client.routes";
import messageRoute from "./routes/message.routes";
import quotaRoute from "./routes/quota.routes";
import logger from "./config/logger";
import { ResponseUtil, HttpStatus } from "./utils/response.util";
import prisma from "./config/db";
import { ClientService } from "./services/client.service";

dotenv.config();

const app = express();

// Middleware
app.use(morganMiddleware);
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  ResponseUtil.success(res, "Welcome to Blastify API");
});

app.get("/health", async (req, res) => {
  try {
    const dbConnected = await prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    ResponseUtil.success(res, "Health check passed", {
      status: dbConnected ? "healthy" : "degraded",
      services: {
        api: {
          status: true,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
        database: {
          status: dbConnected,
          lastChecked: new Date().toISOString(),
        },
        whatsapp: ClientService.getInstance().getStatus(),
      },
    });
  } catch (error) {
    ResponseUtil.error(
      res,
      "Service unhealthy",
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
});

// Routes
app.use("/auth", authRoutes);
app.use("/client", clientRoute);
app.use("/message", messageRoute);
app.use("/quota", quotaRoute);

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Error:", err);
    ResponseUtil.internalServerError(res, err);
  }
);

export default app;
