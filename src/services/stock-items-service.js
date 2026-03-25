import { httpClient } from "./http-client";

export function getStockItems() {
  return httpClient.get("/stock-items");
}

export function createStockItem(payload) {
  return httpClient.post("/stock-items", payload);
}

export function updateStockItem(itemId, payload) {
  return httpClient.patch(`/stock-items/${itemId}`, payload);
}

export function deleteStockItem(itemId) {
  return httpClient.delete(`/stock-items/${itemId}`);
}
