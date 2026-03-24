import { httpClient } from "./http-client";

export function getDailyOrders() {
  return httpClient.get("/daily-orders");
}

export function getDailyOrdersSummary() {
  return httpClient.get("/daily-orders/summary");
}

export function createDailyOrdersFromPhoto(payload) {
  return httpClient.post("/daily-orders/from-photo", payload);
}

export function createDailyOrdersFromSuggestedOrder(payload) {
  return httpClient.post("/daily-orders/from-suggested-order", payload);
}

export function updateDailyOrderItemQuantity(orderId, itemIndex, payload) {
  return httpClient.patch(`/daily-orders/${orderId}/items/${itemIndex}`, payload);
}

export function markDailyOrderReady(orderId) {
  return httpClient.patch(`/daily-orders/${orderId}/mark-ready`, {});
}

export function unlockDailyOrder(orderId) {
  return httpClient.patch(`/daily-orders/${orderId}/unlock`, {});
}

export function runDailyOrderBotFill(orderId) {
  return httpClient.post(`/daily-orders/${orderId}/run-bot-fill`, {});
}

export function submitDailyOrderAfterChefApproval(orderId) {
  return httpClient.post(`/daily-orders/${orderId}/final-submit`, {});
}

export function resetDailyOrders() {
  return httpClient.delete("/daily-orders/reset");
}
