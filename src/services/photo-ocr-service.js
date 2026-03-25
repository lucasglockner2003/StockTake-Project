const PHOTO_OCR_API_BASE_URL = String(
  import.meta.env.VITE_PHOTO_OCR_API_BASE_URL || "http://localhost:3001"
).replace(/\/+$/, "");

export async function extractPhotoOrderText(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${PHOTO_OCR_API_BASE_URL}/api/photo-order-ocr`, {
    method: "POST",
    body: formData,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to process image with OCR.");
  }

  return String(data.text || "");
}
