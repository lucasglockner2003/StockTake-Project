export type StockTakeCatalogItem = {
  id: number;
  name: string;
  supplier: string;
  unit: string;
  area: string;
  idealStock: number;
  critical?: boolean;
};

export type StockTakeStatus = 'Pending' | 'Critical' | 'Low' | 'Check' | 'Ok';

export type StockTakeTodayItemResponse = {
  itemId: number;
  name: string;
  supplier: string;
  unit: string;
  area: string;
  idealStock: number;
  critical: boolean;
  quantity: number | null;
  status: StockTakeStatus;
  updatedAt: string | null;
};

export type StockTakeSummaryResponse = {
  takeDate: string;
  totalItems: number;
  filledItems: number;
  missingItems: number;
  progress: number;
  okCount: number;
  criticalCount: number;
  lowCount: number;
  checkCount: number;
  lastUpdatedAt: string | null;
};

export type StockTakeTodayResponse = {
  stockTakeId: string;
  takeDate: string;
  lastUpdatedAt: string | null;
  summary: StockTakeSummaryResponse;
  items: StockTakeTodayItemResponse[];
};

export type StockTakeMutationResponse = {
  itemId: number;
  quantity: number | null;
  updatedAt: string | null;
  summary: StockTakeSummaryResponse;
};
