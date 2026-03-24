import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DailyOrderBotPayload } from './daily-orders.types';

function normalizeBaseUrl(value: string | undefined) {
  return String(value || 'http://localhost:4190').replace(/\/+$/, '');
}

function normalizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizePublicAssetUrl(baseUrl: string, value: unknown) {
  const pathValue = String(value || '').trim();

  if (!pathValue) {
    return '';
  }

  if (
    pathValue.startsWith('http://') ||
    pathValue.startsWith('https://') ||
    pathValue.startsWith('data:image')
  ) {
    return pathValue;
  }

  if (pathValue.startsWith('/')) {
    return `${baseUrl}${pathValue}`;
  }

  return `${baseUrl}/${pathValue}`;
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export interface DailyOrdersBotResponse {
  ok: boolean;
  status: string;
  executionId: string;
  phase: string;
  errorCode: string;
  message: string;
  executionDuration: number;
  executionStartedAt: string;
  executionFinishedAt: string;
  filledAt: string;
  readyForReviewAt: string;
  executionNotes: string;
  screenshotPath: string;
  reviewScreenshot: string;
  orderNumber: string;
  finalScreenshot: string;
  submitStartedAt: string;
  submittedAt: string;
  submitFinishedAt: string;
  submitDuration: number;
  finalExecutionNotes: string;
}

@Injectable()
export class DailyOrdersBotClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = normalizeBaseUrl(
      this.configService.get<string>('BOT_SERVICE_BASE_URL'),
    );
    this.timeoutMs = Number(
      this.configService.get<number>('BOT_SERVICE_TIMEOUT_MS', 30000),
    );
  }

  executeFill(payload: DailyOrderBotPayload) {
    return this.request('/execute-daily-order', {
      method: 'POST',
      body: payload,
    });
  }

  submitFinal(payload: DailyOrderBotPayload) {
    return this.request('/submit-daily-order', {
      method: 'POST',
      body: payload,
    });
  }

  private normalizeResponse(
    payload: unknown,
    fallback: Partial<DailyOrdersBotResponse> = {},
  ): DailyOrdersBotResponse {
    const data =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};

    return {
      ok: Boolean(data.ok ?? fallback.ok),
      status: normalizeString(data.status, fallback.status || 'failed'),
      executionId: normalizeString(data.executionId, fallback.executionId || ''),
      phase: normalizeString(data.phase, fallback.phase || ''),
      errorCode: normalizeString(data.errorCode, fallback.errorCode || ''),
      message: normalizeString(data.message, fallback.message || ''),
      executionDuration: normalizeNumber(
        data.executionDuration,
        fallback.executionDuration || 0,
      ),
      executionStartedAt: normalizeString(
        data.executionStartedAt,
        fallback.executionStartedAt || '',
      ),
      executionFinishedAt: normalizeString(
        data.executionFinishedAt,
        fallback.executionFinishedAt || '',
      ),
      filledAt: normalizeString(data.filledAt, fallback.filledAt || ''),
      readyForReviewAt: normalizeString(
        data.readyForReviewAt,
        fallback.readyForReviewAt || '',
      ),
      executionNotes: normalizeString(
        data.executionNotes,
        fallback.executionNotes || '',
      ),
      screenshotPath: normalizePublicAssetUrl(
        this.baseUrl,
        data.screenshotPath ?? fallback.screenshotPath,
      ),
      reviewScreenshot: normalizePublicAssetUrl(
        this.baseUrl,
        data.reviewScreenshot ?? fallback.reviewScreenshot,
      ),
      orderNumber: normalizeString(data.orderNumber, fallback.orderNumber || ''),
      finalScreenshot: normalizePublicAssetUrl(
        this.baseUrl,
        data.finalScreenshot ?? fallback.finalScreenshot,
      ),
      submitStartedAt: normalizeString(
        data.submitStartedAt,
        fallback.submitStartedAt || '',
      ),
      submittedAt: normalizeString(data.submittedAt, fallback.submittedAt || ''),
      submitFinishedAt: normalizeString(
        data.submitFinishedAt,
        fallback.submitFinishedAt || '',
      ),
      submitDuration: normalizeNumber(
        data.submitDuration,
        fallback.submitDuration || 0,
      ),
      finalExecutionNotes: normalizeString(
        data.finalExecutionNotes,
        fallback.finalExecutionNotes || '',
      ),
    };
  }

  private async request(
    pathname: string,
    options: {
      method?: string;
      body?: DailyOrderBotPayload;
    } = {},
  ): Promise<DailyOrdersBotResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${pathname}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const payload = await safeParseJson(response);

      if (response.ok) {
        return this.normalizeResponse(payload, {
          ok: true,
          status: 'ok',
        });
      }

      return this.normalizeResponse(payload, {
        ok: false,
        status: 'failed',
        phase: 'http-error',
        errorCode: 'BOT_SERVICE_HTTP_ERROR',
        message: `Bot service returned HTTP ${response.status}.`,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return this.normalizeResponse(null, {
          ok: false,
          status: 'failed',
          phase: 'transport-timeout',
          errorCode: 'BOT_SERVICE_TIMEOUT',
          message: 'Bot service request timed out.',
        });
      }

      return this.normalizeResponse(null, {
        ok: false,
        status: 'failed',
        phase: 'transport-error',
        errorCode: 'BOT_SERVICE_UNREACHABLE',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to reach bot service.',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
