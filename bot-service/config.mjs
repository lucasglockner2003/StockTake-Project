import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

export const DEFAULT_MOCK_PORTAL_URL = "http://localhost:4177";
export const BOT_SERVICE_SHARED_SECRET_HEADER = "x-bot-service-secret";
export const MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH = 32;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvironmentFiles() {
  const envFilePaths = [
    path.resolve(__dirname, ".env"),
    path.resolve(__dirname, "../.env"),
  ];

  envFilePaths.forEach((envFilePath) => {
    dotenv.config({
      path: envFilePath,
      override: false,
      quiet: true,
    });
  });
}

loadEnvironmentFiles();

export function getNodeEnv() {
  return String(process.env.NODE_ENV || "development").trim().toLowerCase() || "development";
}

export function isDevelopmentLike(nodeEnv = getNodeEnv()) {
  return nodeEnv !== "production";
}

export function isBrowserAutomationEnabled(nodeEnv = getNodeEnv()) {
  const normalizedValue = String(process.env.USE_BROWSER || "")
    .trim()
    .toLowerCase();

  if (!normalizedValue) {
    return isDevelopmentLike(nodeEnv);
  }

  return normalizedValue === "true";
}

export function resolveMockPortalBaseUrl(
  value,
  nodeEnv = getNodeEnv()
) {
  const normalizedValue = String(value || "").trim().replace(/\/+$/, "");

  if (normalizedValue) {
    return normalizedValue;
  }

  return isDevelopmentLike(nodeEnv) ? DEFAULT_MOCK_PORTAL_URL : "";
}

export function normalizeBotServiceSharedSecret(value) {
  return String(value || "").trim();
}
