import { getDefaultScreenshotPath, readOrderFromFile, runDailyOrderBot } from "./dailyOrderBotRunner.mjs";

function parseArgs(argv) {
  const options = {
    orderPath: "",
    baseUrl: process.env.MOCK_PORTAL_URL || "http://localhost:4177",
    screenshotPath: "",
    headless: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--order") {
      options.orderPath = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (arg === "--base-url") {
      options.baseUrl = argv[index + 1] || options.baseUrl;
      index += 1;
      continue;
    }

    if (arg === "--screenshot") {
      options.screenshotPath = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (arg === "--headful") {
      options.headless = false;
    }
  }

  return options;
}

async function run() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const order = readOrderFromFile(options.orderPath);
    const screenshotPath = options.screenshotPath || getDefaultScreenshotPath();
    const result = await runDailyOrderBot({
      order,
      baseUrl: options.baseUrl,
      screenshotPath,
      headless: options.headless,
    });

    if (result.ok) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } catch (error) {
    const failed = {
      ok: false,
      status: "failed",
      reviewScreenshot: "",
      filledAt: null,
      readyForReviewAt: null,
      executionNotes: error?.message || "Mock bot execution failed.",
    };
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
}

run();
