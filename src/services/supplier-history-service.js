import { httpClient } from "./http-client";

export function getSupplierHistory() {
  return httpClient.get("/supplier-history");
}

export function getSupplierHistoryById(historyId) {
  return httpClient.get(`/supplier-history/${historyId}`);
}

export function getSupplierHistoryBySupplier(supplierId) {
  return httpClient.get(
    `/supplier-history/by-supplier/${encodeURIComponent(supplierId)}`
  );
}

export function clearSupplierHistory() {
  return httpClient.delete("/supplier-history");
}
