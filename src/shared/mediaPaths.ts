export function normalizePublishMediaPath(value: unknown) {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!path || path.startsWith('pending://')) {
    return '';
  }
  if (/^[a-z]:\\images?\\1\.jpg$/i.test(path) || /^[a-z]:\\image\.jpg$/i.test(path)) {
    return '';
  }
  return path;
}

export function normalizePublishMediaPaths(values: unknown[]) {
  return values.map(normalizePublishMediaPath).filter(Boolean);
}
