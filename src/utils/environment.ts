import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import logger from "../config/logger";

// Load environment variables immediately but silently
(function loadEnv() {
  try {
    let currentDir = __dirname;
    while (currentDir !== path.parse(currentDir).root) {
      if (fs.existsSync(path.join(currentDir, "package.json"))) {
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    const envPath = path.join(currentDir, ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.error("Failed to load environment variables", error);
    }
  }
})();

// Environment types
export type Environment = "development" | "production" | "test";

/**
 * Get the current environment
 * @returns The current environment (development, production, or test)
 */
export const getEnvironment = (): Environment => {
  return (process.env.NODE_ENV as Environment) || "development";
};

/**
 * Check if the current environment is production
 */
export const isProduction = (): boolean => getEnvironment() === "production";

/**
 * Check if the current environment is development
 */
export const isDevelopment = (): boolean => getEnvironment() === "development";

/**
 * Check if the current environment is test
 */
export const isTest = (): boolean => getEnvironment() === "test";
