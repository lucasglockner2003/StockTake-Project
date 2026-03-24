import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
export class InvoicesBotClient {
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

  private async request(
    pathname: string,
    body: InvoiceBotPayload,
  ): Promise<InvoiceBotResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${pathname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = await safeParseJson(response);

      if (response.ok) {
        return this.normalizeResponse(payload, {
          ok: true,
          status: 'executed',
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
