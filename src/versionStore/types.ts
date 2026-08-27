export type PropertyType = "OO" | "PARTNER";

export interface PropertySummary {
  id: string;
  name: string;
  type: PropertyType;
}

export interface PropertyDetail extends PropertySummary {
  content: string;
}

export interface VersionSummary {
  ref: string;
  comment: string;
  author: string;
  timestamp: string;
}

export interface PropertyVersion extends VersionSummary {
  content: string;
}

export type AccessLevel = "invalid-token" | "no-write" | "can-write";

export interface VersionStore {
  listProperties(): Promise<PropertySummary[]>;
  getProperty(id: string): Promise<PropertyDetail>;
  listVersions(propertyId: string): Promise<VersionSummary[]>;
  getVersion(propertyId: string, versionRef: string): Promise<PropertyVersion>;
  setToken(token: string | null): void;
  checkAccess(): Promise<AccessLevel>;
  saveVersion(propertyId: string, content: string, comment: string): Promise<PropertyVersion>;
}

export class PropertyNotFoundError extends Error {
  constructor(public readonly propertyId: string) {
    super(`Property not found: ${propertyId}`);
    this.name = "PropertyNotFoundError";
  }
}

export class VersionNotFoundError extends Error {
  constructor(
    public readonly propertyId: string,
    public readonly versionRef: string,
  ) {
    super(`Version not found: ${versionRef} for property ${propertyId}`);
    this.name = "VersionNotFoundError";
  }
}
