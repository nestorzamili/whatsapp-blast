import express from "express";
import cors from "cors";
import helmet from "helmet";
import morganMiddleware from "./middleware/morgan.middleware";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import clientRoute from "./routes/client.routes";
import messageRoute from "./routes/message.routes";
import logger from "./config/logger";

dotenv.config();

const app = express();

// Middleware
app.use(morganMiddleware);
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// Routes
app.use("/auth", authRoutes);
app.use("/client", clientRoute);
app.use("/message", messageRoute);

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
);

export default app;
