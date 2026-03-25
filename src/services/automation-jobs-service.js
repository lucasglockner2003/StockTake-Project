import { httpClient } from "./http-client";

export function getAutomationJobs() {
  return httpClient.get("/automation-jobs");
}

export function getAutomationJobsSummary() {
  return httpClient.get("/automation-jobs/summary");
}

export function createAutomationJob(payload) {
  return httpClient.post("/automation-jobs", payload);
}

export function updateAutomationJobStatus(jobId, payload) {
  return httpClient.patch(`/automation-jobs/${jobId}/status`, payload);
}

export function updateAutomationJobError(jobId, payload) {
  return httpClient.patch(`/automation-jobs/${jobId}/error`, payload);
}

export function updateAutomationJobNotes(jobId, payload) {
  return httpClient.patch(`/automation-jobs/${jobId}/notes`, payload);
}

export function resetAutomationJob(jobId) {
  return httpClient.patch(`/automation-jobs/${jobId}/reset`, {});
}

export function deleteAutomationJob(jobId) {
  return httpClient.delete(`/automation-jobs/${jobId}`);
}

export function deleteAllAutomationJobs() {
  return httpClient.delete("/automation-jobs");
}

export function runAutomationJob(jobId, payload = {}) {
  return httpClient.post(`/automation-jobs/${jobId}/run`, payload);
}

export function retryAutomationJob(jobId, payload = {}) {
  return httpClient.post(`/automation-jobs/${jobId}/retry`, payload);
}

export function getSupplierOrderHistory() {
  return httpClient.get("/automation-jobs/supplier-history");
}

export function clearSupplierOrderHistory() {
  return httpClient.delete("/automation-jobs/supplier-history");
}
