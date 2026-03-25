import axios, { AxiosError, AxiosInstance } from 'axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
      screenshot: normalizePublicAssetUrl(
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
