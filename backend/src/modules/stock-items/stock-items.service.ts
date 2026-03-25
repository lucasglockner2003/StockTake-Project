import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { StockItemRecord, StockItemsRepository } from './stock-items.repository';
import {
  StockItemDeleteResponse,
  StockItemMutationResponse,
  StockItemResponse,
} from './stock-items.types';

const STOCK_ITEMS_CACHE_TTL_MS = 60_000;

function normalizeString(value: unknown, fallback = '') {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue || fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeAliases(value: Prisma.JsonValue | string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((alias) => normalizeString(alias))
    .filter(Boolean);
}

function buildAliasesJson(aliases: string[] | undefined): Prisma.InputJsonValue | undefined {
  if (!Array.isArray(aliases)) {
    return undefined;
  }

  return aliases
    .map((alias) => normalizeString(alias))
    .filter(Boolean) satisfies Prisma.InputJsonArray;
}

@Injectable()
export class StockItemsService {
  private cachedStockItems:
    | {
        expiresAt: number;
        items: StockItemResponse[];
      }
    | null = null;

  constructor(private readonly stockItemsRepository: StockItemsRepository) {}

  async listStockItems(): Promise<StockItemResponse[]> {
    const now = Date.now();

    if (this.cachedStockItems && this.cachedStockItems.expiresAt > now) {
      return this.cachedStockItems.items;
    }

    const stockItems = await this.stockItemsRepository.listActive();
    const mappedStockItems = stockItems.map((stockItem) =>
      this.mapStockItem(stockItem),
    );

    this.cachedStockItems = {
      expiresAt: now + STOCK_ITEMS_CACHE_TTL_MS,
      items: mappedStockItems,
    };

    return mappedStockItems;
  }

  async createStockItem(
    createStockItemDto: CreateStockItemDto,
  ): Promise<StockItemMutationResponse> {
    const stockItemId =
      createStockItemDto.id ?? (await this.stockItemsRepository.getNextId());
    const existingStockItem = await this.stockItemsRepository.findById(stockItemId);

    if (existingStockItem) {
      throw new ConflictException('A stock item with this id already exists.');
    }

    const createdStockItem = await this.stockItemsRepository.create({
      id: stockItemId,
      name: normalizeString(createStockItemDto.name),
      unit: normalizeString(createStockItemDto.unit),
      category: normalizeString(createStockItemDto.category),
      supplierName:
        normalizeString(createStockItemDto.supplierName ?? createStockItemDto.supplier) ||
        null,
      aliases: buildAliasesJson(createStockItemDto.aliases),
      area: normalizeString(createStockItemDto.area),
      idealStock: Math.max(normalizeNumber(createStockItemDto.idealStock), 0),
      critical: Boolean(createStockItemDto.critical),
      isActive: createStockItemDto.isActive ?? true,
    });

    this.invalidateStockItemsCache();

    return {
      ok: true,
      item: this.mapStockItem(createdStockItem),
    };
  }

  async updateStockItem(
    id: number,
    updateStockItemDto: UpdateStockItemDto,
  ): Promise<StockItemMutationResponse> {
    const existingStockItem = await this.stockItemsRepository.findById(id);

    if (!existingStockItem) {
      throw new NotFoundException('Stock item was not found.');
    }

    const updateData: Prisma.StockItemUpdateInput = {};

    if (updateStockItemDto.name !== undefined) {
      updateData.name = normalizeString(updateStockItemDto.name);
    }

    if (updateStockItemDto.unit !== undefined) {
      updateData.unit = normalizeString(updateStockItemDto.unit);
    }

    if (updateStockItemDto.category !== undefined) {
      updateData.category = normalizeString(updateStockItemDto.category);
    }

    if (
      updateStockItemDto.supplierName !== undefined ||
      updateStockItemDto.supplier !== undefined
    ) {
      updateData.supplierName =
        normalizeString(updateStockItemDto.supplierName ?? updateStockItemDto.supplier) ||
        null;
    }

    if (updateStockItemDto.aliases !== undefined) {
      updateData.aliases = buildAliasesJson(updateStockItemDto.aliases);
    }

    if (updateStockItemDto.area !== undefined) {
      updateData.area = normalizeString(updateStockItemDto.area);
    }

    if (updateStockItemDto.idealStock !== undefined) {
      updateData.idealStock = Math.max(
        normalizeNumber(updateStockItemDto.idealStock),
        0,
      );
    }

    if (updateStockItemDto.critical !== undefined) {
      updateData.critical = Boolean(updateStockItemDto.critical);
    }

    if (updateStockItemDto.isActive !== undefined) {
      updateData.isActive = Boolean(updateStockItemDto.isActive);
    }

    const updatedStockItem = await this.stockItemsRepository.update(id, updateData);

    this.invalidateStockItemsCache();

    return {
      ok: true,
      item: this.mapStockItem(updatedStockItem),
    };
  }

  async deleteStockItem(id: number): Promise<StockItemDeleteResponse> {
    const existingStockItem = await this.stockItemsRepository.findById(id);

    if (!existingStockItem) {
      throw new NotFoundException('Stock item was not found.');
    }

    await this.stockItemsRepository.update(id, {
      isActive: false,
    });
    this.invalidateStockItemsCache();

    return {
      ok: true,
      itemId: id,
    };
  }

  private mapStockItem(stockItem: StockItemRecord): StockItemResponse {
    const supplierName = normalizeString(stockItem.supplierName);

    return {
      id: stockItem.id,
      name: stockItem.name,
      unit: stockItem.unit,
      category: stockItem.category,
      supplier: supplierName,
      supplierName,
      aliases: normalizeAliases(stockItem.aliases),
      area: stockItem.area,
      idealStock: stockItem.idealStock,
      critical: stockItem.critical,
      isActive: stockItem.isActive,
      createdAt: stockItem.createdAt.toISOString(),
      updatedAt: stockItem.updatedAt.toISOString(),
    };
  }

  private invalidateStockItemsCache() {
    this.cachedStockItems = null;
  }
}
