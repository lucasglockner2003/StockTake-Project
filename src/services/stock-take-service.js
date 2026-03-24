import { httpClient } from "./http-client";

export function getTodayStockTake() {
  return httpClient.get("/stock-take/today");
}

export function updateStockTakeItem(itemId, payload) {
  return httpClient.put(`/stock-take/items/${itemId}`, payload);
}

export function resetTodayStockTake() {
  return httpClient.post("/stock-take/reset", {});
}

export function getTodayStockTakeSummary() {
  return httpClient.get("/stock-take/summary");
}
