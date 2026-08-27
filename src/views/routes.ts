export function propertyHash(propertyId: string): string {
  return `#/property/${encodeURIComponent(propertyId)}`;
}

export function versionHash(propertyId: string, versionRef: string): string {
  return `${propertyHash(propertyId)}/version/${encodeURIComponent(versionRef)}`;
}

export function editHash(propertyId: string): string {
  return `${propertyHash(propertyId)}/edit`;
}
