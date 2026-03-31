const LEGACY_MOCK_ARTIFACT_MARKERS = [
  'mock://image',
  'mock.png',
  '/public/mock.png',
  'via.placeholder.com',
];

function normalizeStringValue(value: unknown) {
  return String(value || '').trim();
}

function normalizeArtifactPath(pathValue: string) {
  if (pathValue.startsWith('/artifacts/')) {
    return pathValue;
  }

  if (pathValue.startsWith('artifacts/')) {
    return `/${pathValue}`;
  }

  return '';
}

function isAllowedAbsoluteArtifactUrl(
  normalizedBaseUrl: string,
  pathValue: string,
) {
  try {
    const artifactUrl = new URL(pathValue);

    if (!artifactUrl.pathname.startsWith('/artifacts/')) {
      return false;
    }

    if (!normalizedBaseUrl) {
      return true;
    }

    return artifactUrl.origin === new URL(normalizedBaseUrl).origin;
  } catch {
    return false;
  }
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
  const normalizedBaseUrl = normalizeStringValue(baseUrl).replace(/\/+$/, '');

  if (!pathValue || isLegacyMockArtifactUrl(pathValue)) {
    return '';
  }

  if (isAllowedAbsoluteArtifactUrl(normalizedBaseUrl, pathValue)) {
    return pathValue;
  }

  const artifactPath = normalizeArtifactPath(pathValue);

  if (!artifactPath) {
    return '';
  }

  if (!normalizedBaseUrl) {
    return artifactPath;
  }

  return `${normalizedBaseUrl}${artifactPath}`;
}
