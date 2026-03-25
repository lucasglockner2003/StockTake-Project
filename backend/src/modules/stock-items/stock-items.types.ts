export type StockItemResponse = {
  id: number;
  name: string;
  unit: string;
  category: string;
  supplier: string;
  supplierName: string;
  aliases: string[];
  area: string;
  idealStock: number;
  critical: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StockItemMutationResponse = {
  ok: true;
  item: StockItemResponse;
};

export type StockItemDeleteResponse = {
  ok: true;
  itemId: number;
};
