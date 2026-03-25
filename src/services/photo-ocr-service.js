import { runtimeConfig } from "./runtime-config";

const PHOTO_OCR_API_BASE_URL = runtimeConfig.photoOcrApiBaseUrl;

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function extractPhotoOrderText(file) {
  if (!PHOTO_OCR_API_BASE_URL) {
    throw new Error("Photo OCR API base URL is not configured.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${PHOTO_OCR_API_BASE_URL}/api/photo-order-ocr`, {
    method: "POST",
    body: formData,
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      data.error || data.message || "Failed to process image with OCR."
    );
  }

  return String(data.text || "");
}
