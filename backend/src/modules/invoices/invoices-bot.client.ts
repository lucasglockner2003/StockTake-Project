import axios, { AxiosError, AxiosInstance } from 'axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { normalizePublicBotArtifactUrl } from '../../common/utils/bot-artifact-url';
import {
  BOT_SERVICE_SHARED_SECRET_HEADER,
  normalizeBotServiceSharedSecret,
  resolveBotServiceBaseUrl,
} from '../../config/bot-service.config';

const DEFAULT_BOT_SERVICE_TIMEOUT_MS = 30000;

function normalizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

export interface InvoiceBotPayloadItem {
  sequence: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceBotPayload {
  invoiceId: string;
  supplier: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  totalItems: number;
  source: string;
  createdAt: string;
  items: InvoiceBotPayloadItem[];
}

export interface InvoiceBotResponse {
  ok: boolean;
  status: string;
  executionId: string;
  phase: string;
  errorCode: string;
  message: string;
  duration: number;
  screenshot: string;
  filledItems: unknown[];
  notes: string;
}

@Injectable()
export class InvoicesBotClient implements OnModuleInit {
  private readonly logger = new Logger(InvoicesBotClient.name);
  private readonly baseUrl: string;
  private readonly isConfigured: boolean;
  private readonly timeoutMs: number;
  private readonly sharedSecret: string;
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    this.baseUrl = resolveBotServiceBaseUrl(
      this.configService.get<string>('BOT_SERVICE_BASE_URL'),
      nodeEnv,
    );
    this.isConfigured = Boolean(this.baseUrl);
    this.timeoutMs = this.configService.get<number>(
      'BOT_SERVICE_TIMEOUT_MS',
      DEFAULT_BOT_SERVICE_TIMEOUT_MS,
    );
    this.sharedSecret = normalizeBotServiceSharedSecret(
      this.configService.get<string>('BOT_SERVICE_SHARED_SECRET'),
    );
    this.httpClient = axios.create({
      baseURL: this.baseUrl || undefined,
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...(this.sharedSecret
          ? { [BOT_SERVICE_SHARED_SECRET_HEADER]: this.sharedSecret }
          : {}),
      },
    });
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn(
        'BOT_SERVICE_BASE_URL is not configured. Invoice automation execution is disabled.',
      );
      return;
    }

    void this.logHealthCheck();
  }

  executeInvoiceIntake(payload: InvoiceBotPayload) {
    return this.request('/execute-invoice-intake', payload);
  }

  private normalizeResponse(
    payload: unknown,
    fallback: Partial<InvoiceBotResponse> = {},
  ): InvoiceBotResponse {
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
      duration: normalizeNumber(data.duration, fallback.duration || 0),
      screenshot: normalizePublicBotArtifactUrl(
        this.baseUrl,
        data.screenshot ?? fallback.screenshot,
      ),
      filledItems: Array.isArray(data.filledItems)
        ? data.filledItems
        : Array.isArray(fallback.filledItems)
          ? fallback.filledItems
          : [],
      notes: normalizeString(data.notes, fallback.notes || ''),
    };
  }

  private async logHealthCheck() {
    if (!this.isConfigured) {
      return;
    }

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
    body: InvoiceBotPayload,
  ): Promise<InvoiceBotResponse> {
    if (!this.isConfigured) {
      return this.normalizeResponse(null, {
        ok: false,
        status: 'failed',
        phase: 'not-configured',
        errorCode: 'BOT_SERVICE_NOT_CONFIGURED',
        message: 'Bot service base URL is not configured.',
      });
    }

    const url = `${this.baseUrl}${pathname}`;

    this.logger.log(
      `Bot service request -> POST ${url} payload=${safeJsonStringify(body)}`,
    );

    try {
      const response = await this.httpClient.post(pathname, body);
      const payload = response.data;

      this.logger.log(
        `Bot service response <- POST ${url} status=${response.status} payload=${safeJsonStringify(payload)}`,
      );

      return this.normalizeResponse(payload, {
        ok: true,
        status: 'executed',
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
