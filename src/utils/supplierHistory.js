import {
  ensureSupplierHistoryLoaded,
  fetchSupplierHistory,
  fetchSupplierHistoryById,
  fetchSupplierHistoryBySupplier,
  getCachedSupplierHistory,
  removeSupplierHistory,
  subscribeSupplierHistory,
} from "../repositories/supplier-history-repository";

export function subscribeSupplierOrderHistory(listener) {
  return subscribeSupplierHistory(listener);
}

export function ensureSupplierOrderHistoryLoaded() {
  return ensureSupplierHistoryLoaded();
}

export function refreshSupplierOrderHistory() {
  return fetchSupplierHistory();
}

export function getSupplierOrderHistory() {
  return getCachedSupplierHistory();
}

export function getSupplierOrderHistoryById(historyId) {
  return fetchSupplierHistoryById(historyId);
}

export function getSupplierOrderHistoryBySupplier(supplierId) {
  return fetchSupplierHistoryBySupplier(supplierId);
}

export function clearSupplierOrderHistory() {
  return removeSupplierHistory();
}
