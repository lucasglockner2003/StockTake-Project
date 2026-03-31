const LEGACY_MOCK_ARTIFACT_MARKERS = [
  'mock://image',
  'mock.png',
  '/public/mock.png',
  'via.placeholder.com',
];

function normalizeStringValue(value: unknown) {
  return String(value || '').trim();
}

export function isLegacyMockArtifactUrl(value: unknown) {
  const normalizedValue = normalizeStringValue(value).toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return LEGACY_MOCK_ARTIFACT_MARKERS.some((marker) =>
    normalizedValue.includes(marker),
  );
}

export function normalizePublicBotArtifactUrl(
  baseUrl: string | undefined,
  value: unknown,
) {
  const pathValue = normalizeStringValue(value);

  if (!pathValue || isLegacyMockArtifactUrl(pathValue)) {
    return '';
  }

  if (
    pathValue.startsWith('http://') ||
    pathValue.startsWith('https://') ||
    pathValue.startsWith('data:image/')
  ) {
    return pathValue;
  }

  const normalizedBaseUrl = normalizeStringValue(baseUrl).replace(/\/+$/, '');

  if (!normalizedBaseUrl) {
    return pathValue;
  }

  if (pathValue.startsWith('/')) {
    return `${normalizedBaseUrl}${pathValue}`;
  }

  return `${normalizedBaseUrl}/${pathValue}`;
}
