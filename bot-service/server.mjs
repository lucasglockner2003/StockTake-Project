import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { runDailyOrderBot } from "../bot-poc/dailyOrderBotRunner.mjs";
import { runDailyOrderFinalSubmit } from "./finalSubmitRunner.mjs";
import {
  BOT_SERVICE_SHARED_SECRET_HEADER,
  MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH,
  getNodeEnv,
  normalizeBotServiceSharedSecret,
  resolveMockPortalBaseUrl,
} from "./config.mjs";
import { runInvoiceIntakeExecution } from "./invoiceExecutionRunner.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || process.env.BOT_SERVICE_PORT || 4190);
const NODE_ENV = getNodeEnv();
const BOT_BASE_URL = resolveMockPortalBaseUrl(process.env.MOCK_PORTAL_URL, NODE_ENV);
const BOT_SERVICE_SHARED_SECRET = normalizeBotServiceSharedSecret(
  process.env.BOT_SERVICE_SHARED_SECRET
);
const REQUIRE_BOT_SERVICE_SHARED_SECRET =
  NODE_ENV === "production" || BOT_SERVICE_SHARED_SECRET.length > 0;
const artifactsDir = path.resolve(__dirname, "../bot-poc/output");

let currentExecution = null;

if (
  REQUIRE_BOT_SERVICE_SHARED_SECRET &&
  BOT_SERVICE_SHARED_SECRET.length < MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH
) {
  throw new Error(
    `BOT_SERVICE_SHARED_SECRET must contain at least ${MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH} characters when required.`
  );
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function generateExecutionId() {
  return `exec-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function beginExecution(type, supplier) {
  currentExecution = {
    executionId: generateExecutionId(),
    type,
    supplier,
    phase: `${type}-started`,
    startedAt: new Date().toISOString(),
  };
  return currentExecution;
}

function setExecutionPhase(phase) {
  if (!currentExecution) return;
  currentExecution = {
    ...currentExecution,
    phase,
  };
}

function clearExecution() {
  currentExecution = null;
}

function normalizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function normalizeOrderInput(body) {
  const supplier = String(body?.supplier || "").trim();
  const items = Array.isArray(body?.items)
    ? body.items
        .map((item) => ({
          itemName: String(item?.itemName || item?.name || "").trim(),
          quantity: normalizeQuantity(item?.quantity),
          unit: String(item?.unit || "").trim(),
        }))
        .filter((item) => item.itemName && item.quantity > 0)
    : [];

  if (!supplier) {
    return {
      ok: false,
      errorCode: "INVALID_SUPPLIER",
      message: "Supplier is required.",
    };
  }

  if (items.length === 0) {
    return {
      ok: false,
      errorCode: "INVALID_ITEMS",
      message: "At least one valid item with quantity > 0 is required.",
    };
  }

  return {
    ok: true,
    order: {
      supplier,
      items,
    },
  };
}

function normalizeInvoiceInput(body) {
  const supplier = String(body?.supplier || "").trim();
  const invoiceNumber = String(body?.invoiceNumber || "").trim();
  const invoiceDate = String(body?.invoiceDate || "").trim();
  const items = Array.isArray(body?.items)
    ? body.items
        .map((item) => ({
          itemName: String(item?.itemName || item?.name || "").trim(),
          quantity: normalizeQuantity(item?.quantity),
          unitPrice: normalizeQuantity(item?.unitPrice),
          lineTotal: normalizeQuantity(item?.lineTotal),
        }))
        .filter((item) => item.itemName && item.quantity > 0)
    : [];

  if (!supplier) {
    return {
      ok: false,
      errorCode: "INVALID_SUPPLIER",
      message: "Supplier is required.",
    };
  }

  if (items.length === 0) {
    return {
      ok: false,
      errorCode: "INVALID_ITEMS",
      message: "At least one valid invoice item with quantity > 0 is required.",
    };
  }

  return {
    ok: true,
    invoice: {
      supplier,
      invoiceNumber,
      invoiceDate,
      items,
    },
  };
}

function structuredResponse({
  ok,
  status,
  executionId = "",
  phase = "",
  errorCode = "",
  message = "",
  ...rest
}) {
  return {
    ok: Boolean(ok),
    status: status || (ok ? "ok" : "failed"),
    executionId,
    phase,
    errorCode,
    message,
    ...rest,
  };
}

function buildExecutionLockResponse() {
  return structuredResponse({
    ok: false,
    status: "failed",
    executionId: currentExecution?.executionId || "",
    phase: currentExecution?.phase || "execution-locked",
    errorCode: "EXECUTION_IN_PROGRESS",
    message: "Another execution is already in progress.",
    currentExecution,
  });
}

function buildPortalConfigurationResponse() {
  return structuredResponse({
    ok: false,
    status: "failed",
    executionId: "",
    phase: "configuration",
    errorCode: "MOCK_PORTAL_URL_NOT_CONFIGURED",
    message: "Supplier portal base URL is not configured for bot-service.",
  });
}

function requirePortalConfiguration(res) {
  if (BOT_BASE_URL) {
    return false;
  }

  res.status(503).json(buildPortalConfigurationResponse());
  return true;
}

function requireBotServiceSecret(req, res, next) {
  if (!REQUIRE_BOT_SERVICE_SHARED_SECRET) {
    next();
    return;
  }

  const providedSecret = normalizeBotServiceSharedSecret(
    req.get(BOT_SERVICE_SHARED_SECRET_HEADER)
  );

  if (providedSecret && providedSecret === BOT_SERVICE_SHARED_SECRET) {
    next();
    return;
  }

  res.status(401).json(
    structuredResponse({
      ok: false,
      status: "failed",
      executionId: "",
      phase: "authentication",
      errorCode: "BOT_SERVICE_UNAUTHORIZED",
      message: "Bot-service shared secret is missing or invalid.",
    })
  );
}

ensureDir(artifactsDir);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/artifacts", express.static(artifactsDir));
app.use("/execute-daily-order", requireBotServiceSecret);
app.use("/execute-invoice-intake", requireBotServiceSecret);
app.use("/submit-daily-order", requireBotServiceSecret);

app.get("/health", (_req, res) => {
  return res.json(
    structuredResponse({
      ok: true,
      status: "ok",
      executionId: currentExecution?.executionId || "",
      phase: currentExecution?.phase || "idle",
      message: "Bot service is healthy.",
      service: "daily-order-bot-service",
      port: PORT,
      mockPortalUrl: BOT_BASE_URL,
      portalConfigured: Boolean(BOT_BASE_URL),
      currentExecution,
    })
  );
});

app.get("/execution-status", (_req, res) => {
  const isRunning = Boolean(currentExecution);
  return res.json(
    structuredResponse({
      ok: true,
      status: isRunning ? "running" : "idle",
      executionId: currentExecution?.executionId || "",
      phase: currentExecution?.phase || "idle",
      message: isRunning
        ? `Running ${currentExecution.type} for ${currentExecution.supplier}.`
        : "No active execution.",
      currentExecution,
    })
  );
});

app.post("/execute-daily-order", async (req, res) => {
  if (requirePortalConfiguration(res)) {
    return;
  }

  if (currentExecution) {
    return res.status(409).json(buildExecutionLockResponse());
  }

  const normalized = normalizeOrderInput(req.body);
  if (!normalized.ok) {
    return res.status(400).json(
      structuredResponse({
        ok: false,
        status: "failed",
        phase: "validation",
        errorCode: normalized.errorCode,
        message: normalized.message,
      })
    );
  }

  const execution = beginExecution("fill", normalized.order.supplier);
  const screenshotFileName = `review-${Date.now()}-${Math.floor(
    Math.random() * 10000
  )}.png`;
  const screenshotPath = path.join(artifactsDir, screenshotFileName);

  try {
    setExecutionPhase("fill-running");
    const result = await runDailyOrderBot({
      order: normalized.order,
      baseUrl: BOT_BASE_URL,
      screenshotPath,
      headless: true,
    });

    if (!result.ok) {
      setExecutionPhase("fill-failed");
      return res.status(500).json(
        structuredResponse({
          ok: false,
          status: "failed",
          executionId: execution.executionId,
          phase: "fill-failed",
          errorCode: "BOT_FILL_FAILED",
          message: result.executionNotes || "Bot fill failed.",
          executionDuration: result.executionDuration,
          executionStartedAt: result.executionStartedAt,
          executionFinishedAt: result.executionFinishedAt,
          filledAt: null,
          readyForReviewAt: null,
          screenshotPath: "",
          reviewScreenshot: "",
          executionNotes: result.executionNotes || "Bot fill failed.",
        })
      );
    }

    setExecutionPhase("fill-completed");
    return res.json(
      structuredResponse({
        ok: true,
        status: result.status,
        executionId: execution.executionId,
        phase: "fill-completed",
        errorCode: "",
        message:
          result.executionNotes ||
          "Order filled and ready for chef review.",
        executionDuration: result.executionDuration,
        executionStartedAt: result.executionStartedAt,
        executionFinishedAt: result.executionFinishedAt,
        filledAt: result.filledAt,
        readyForReviewAt: result.readyForReviewAt,
        screenshotPath: `/artifacts/${screenshotFileName}`,
        reviewScreenshot: `/artifacts/${screenshotFileName}`,
        executionNotes: result.executionNotes,
      })
    );
  } catch (error) {
    setExecutionPhase("fill-error");
    return res.status(500).json(
      structuredResponse({
        ok: false,
        status: "failed",
        executionId: execution.executionId,
        phase: "fill-error",
        errorCode: "BOT_SERVICE_INTERNAL_ERROR",
        message: error?.message || "Unexpected bot service error.",
        executionDuration: 0,
        executionStartedAt: new Date().toISOString(),
        executionFinishedAt: new Date().toISOString(),
        filledAt: null,
        readyForReviewAt: null,
        screenshotPath: "",
        reviewScreenshot: "",
        executionNotes: error?.message || "Unexpected bot service error.",
      })
    );
  } finally {
    clearExecution();
  }
});

app.post("/execute-invoice-intake", async (req, res) => {
  if (requirePortalConfiguration(res)) {
    return;
  }

  if (currentExecution) {
    return res.status(409).json(buildExecutionLockResponse());
  }

  const normalized = normalizeInvoiceInput(req.body);
  if (!normalized.ok) {
    return res.status(400).json(
      structuredResponse({
        ok: false,
        status: "failed",
        phase: "invoice-validation",
        errorCode: normalized.errorCode,
        message: normalized.message,
      })
    );
  }

  const execution = beginExecution("invoice-intake", normalized.invoice.supplier);
  const screenshotFileName = `invoice-intake-${Date.now()}-${Math.floor(
    Math.random() * 10000
  )}.png`;
  const screenshotPath = path.join(artifactsDir, screenshotFileName);

  try {
    setExecutionPhase("invoice-running");
    const result = await runInvoiceIntakeExecution({
      invoice: normalized.invoice,
      baseUrl: BOT_BASE_URL,
      screenshotPath,
      headless: true,
    });

    if (!result.success) {
      setExecutionPhase("invoice-failed");
      return res.status(500).json(
        structuredResponse({
          ok: false,
          status: "failed",
          executionId: execution.executionId,
          phase: "invoice-failed",
          errorCode: "INVOICE_EXECUTION_FAILED",
          message: result.notes || "Goods received execution failed.",
          duration: Number(result.duration || 0),
          screenshot: "",
          filledItems: result.filledItems || [],
          notes: result.notes || "Goods received execution failed.",
        })
      );
    }

    setExecutionPhase("invoice-completed");
    return res.json(
      structuredResponse({
        ok: true,
        status: "executed",
        executionId: execution.executionId,
        phase: "invoice-completed",
        errorCode: "",
        message:
          result.notes ||
          "Goods received completed and invoice review saved.",
        duration: Number(result.duration || 0),
        screenshot: `/artifacts/${screenshotFileName}`,
        filledItems: result.filledItems || [],
        notes:
          result.notes ||
          "Goods received completed and invoice review saved.",
      })
    );
  } catch (error) {
    setExecutionPhase("invoice-error");
    return res.status(500).json(
      structuredResponse({
        ok: false,
        status: "failed",
        executionId: execution.executionId,
        phase: "invoice-error",
        errorCode: "BOT_SERVICE_INTERNAL_ERROR",
        message: error?.message || "Unexpected goods received execution error.",
        duration: 0,
        screenshot: "",
        filledItems: [],
        notes: error?.message || "Unexpected goods received execution error.",
      })
    );
  } finally {
    clearExecution();
  }
});

app.post("/submit-daily-order", async (req, res) => {
  if (requirePortalConfiguration(res)) {
    return;
  }

  if (currentExecution) {
    return res.status(409).json(buildExecutionLockResponse());
  }

  const normalized = normalizeOrderInput(req.body);
  if (!normalized.ok) {
    return res.status(400).json(
      structuredResponse({
        ok: false,
        status: "failed",
        phase: "validation",
        errorCode: normalized.errorCode,
        message: normalized.message,
      })
    );
  }

  const execution = beginExecution("final-submit", normalized.order.supplier);
  const finalScreenshotFileName = `final-${Date.now()}-${Math.floor(
    Math.random() * 10000
  )}.png`;
  const finalScreenshotPath = path.join(artifactsDir, finalScreenshotFileName);

  try {
    setExecutionPhase("submit-running");
    const result = await runDailyOrderFinalSubmit({
      order: normalized.order,
      baseUrl: BOT_BASE_URL,
      finalScreenshotPath,
      headless: true,
    });

    if (!result.ok) {
      setExecutionPhase("submit-failed");
      return res.status(500).json(
        structuredResponse({
          ok: false,
          status: "failed",
          executionId: execution.executionId,
          phase: "submit-failed",
          errorCode: "FINAL_SUBMIT_FAILED",
          message: result.finalExecutionNotes || "Final submit failed.",
          orderNumber: "",
          finalScreenshot: "",
          submitStartedAt: result.submitStartedAt,
          submittedAt: null,
          submitFinishedAt: result.submitFinishedAt,
          submitDuration: result.submitDuration,
          finalExecutionNotes: result.finalExecutionNotes,
        })
      );
    }

    setExecutionPhase("submit-completed");
    return res.json(
      structuredResponse({
        ok: true,
        status: result.status,
        executionId: execution.executionId,
        phase: "submit-completed",
        errorCode: "",
        message:
          result.finalExecutionNotes || "Final submit completed successfully.",
        orderNumber: result.orderNumber,
        finalScreenshot: `/artifacts/${finalScreenshotFileName}`,
        submitStartedAt: result.submitStartedAt,
        submittedAt: result.submittedAt,
        submitFinishedAt: result.submitFinishedAt,
        submitDuration: result.submitDuration,
        finalExecutionNotes: result.finalExecutionNotes,
      })
    );
  } catch (error) {
    setExecutionPhase("submit-error");
    return res.status(500).json(
      structuredResponse({
        ok: false,
        status: "failed",
        executionId: execution.executionId,
        phase: "submit-error",
        errorCode: "BOT_SERVICE_INTERNAL_ERROR",
        message: error?.message || "Unexpected final submit error.",
        orderNumber: "",
        finalScreenshot: "",
        submitStartedAt: new Date().toISOString(),
        submittedAt: null,
        submitFinishedAt: new Date().toISOString(),
        submitDuration: 0,
        finalExecutionNotes: error?.message || "Unexpected final submit error.",
      })
    );
  } finally {
    clearExecution();
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Bot service running on 0.0.0.0:${PORT}`);
});
