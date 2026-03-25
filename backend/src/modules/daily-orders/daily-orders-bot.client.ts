import axios, { AxiosError, AxiosInstance } from 'axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DailyOrderBotPayload } from './daily-orders.types';

const DEFAULT_BOT_SERVICE_BASE_URL = 'http://localhost:4190';
const DEFAULT_BOT_SERVICE_TIMEOUT_MS = 30000;

function resolveBotServiceBaseUrl(
  value: string | undefined,
) {
  return String(value || DEFAULT_BOT_SERVICE_BASE_URL).trim().replace(/\/+$/, '');
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

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
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
export class DailyOrdersBotClient implements OnModuleInit {
  private readonly logger = new Logger(DailyOrdersBotClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = resolveBotServiceBaseUrl(
      this.configService.get<string>('BOT_SERVICE_BASE_URL'),
    );
    this.timeoutMs = this.configService.get<number>(
      'BOT_SERVICE_TIMEOUT_MS',
      DEFAULT_BOT_SERVICE_TIMEOUT_MS,
    );
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async onModuleInit() {
    await this.logHealthCheck();
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

  private async logHealthCheck() {
    const pathname = '/health';
    const url = `${this.baseUrl}${pathname}`;

    this.logger.log(`Bot service request -> GET ${url}`);

    try {
      const response = await this.httpClient.get(pathname);

      this.logger.log(
        `Bot service response <- GET ${url} status=${response.status} payload=${safeJsonStringify(response.data)}`,
      );
    } catch (error) {
      this.logRequestError(url, error);
    }
  }

  private logRequestError(url: string, error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const responseStatus = axiosError.response?.status ?? 'no-response';
      const responseData = safeJsonStringify(axiosError.response?.data ?? null);
      const stack = axiosError.stack || axiosError.message;

      this.logger.error(
        `Bot service error <- ${url} status=${responseStatus} response=${responseData} message=${axiosError.message}`,
        stack,
      );
      return;
    }

    if (error instanceof Error) {
      this.logger.error(
        `Bot service error <- ${url} message=${error.message}`,
        error.stack,
      );
      return;
    }

    this.logger.error(`Bot service error <- ${url} message=${String(error)}`);
  }

  private async request(
    pathname: string,
    options: {
      method?: string;
      body?: DailyOrderBotPayload;
    } = {},
  ): Promise<DailyOrdersBotResponse> {
    const method = options.method || 'GET';
    const url = `${this.baseUrl}${pathname}`;

    this.logger.log(
      `Bot service request -> ${method} ${url} payload=${safeJsonStringify(options.body ?? null)}`,
    );

    try {
      const response = await this.httpClient.request({
        url: pathname,
        method,
        data: options.body,
      });

      const payload = response.data;

      this.logger.log(
        `Bot service response <- ${method} ${url} status=${response.status} payload=${safeJsonStringify(payload)}`,
      );

      return this.normalizeResponse(payload, {
        ok: true,
        status: 'ok',
      });
    } catch (error) {
      this.logRequestError(url, error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.code === 'ECONNABORTED') {
          return this.normalizeResponse(null, {
            ok: false,
            status: 'failed',
            phase: 'transport-timeout',
            errorCode: 'BOT_SERVICE_TIMEOUT',
            message: 'Bot service request timed out.',
          });
        }

        if (axiosError.response) {
          return this.normalizeResponse(axiosError.response.data, {
            ok: false,
            status: 'failed',
            phase: 'http-error',
            errorCode: 'BOT_SERVICE_HTTP_ERROR',
            message: `Bot service returned HTTP ${axiosError.response.status}.`,
          });
        }
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
    }
  }
}
