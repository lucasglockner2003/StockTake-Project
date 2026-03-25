import { httpClient } from "./http-client";

export function intakeInvoice(payload) {
  return httpClient.post("/invoices/intake", payload);
}

export function getInvoices() {
  return httpClient.get("/invoices");
}

export function getInvoicesSummary() {
  return httpClient.get("/invoices/summary");
}

export function getInvoiceById(invoiceId) {
  return httpClient.get(`/invoices/${invoiceId}`);
}

export function executeInvoice(invoiceId) {
  return httpClient.post(`/invoices/${invoiceId}/execute`, {});
}

export function retryInvoice(invoiceId) {
  return httpClient.post(`/invoices/${invoiceId}/retry`, {});
}

export function deleteInvoice(invoiceId) {
  return httpClient.delete(`/invoices/${invoiceId}`);
}
