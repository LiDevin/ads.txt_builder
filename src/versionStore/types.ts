export type PropertyType = "OO" | "PARTNER";

export interface PropertySummary {
  id: string;
  name: string;
  type: PropertyType;
}

export interface PropertyDetail extends PropertySummary {
  content: string;
  // Opaque token identifying this exact content, to pass back to saveVersion
  // for optimistic-concurrency checks. Not a version ref usable with getVersion.
  baseVersion: string;
}

export interface VersionSummary {
  ref: string;
  // Absent for versions saved before version names existed; callers should
  // fall back to something else (e.g. the timestamp) for display.
  name?: string;
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
  saveVersion(
    propertyId: string,
    content: string,
    name: string,
    comment: string,
    baseVersion: string,
  ): Promise<PropertyVersion>;
  createProperty(id: string, name: string, type: PropertyType, content: string): Promise<void>;
  renameProperty(id: string, newName: string): Promise<void>;
  deleteProperty(id: string): Promise<void>;
}

export class PropertyNotFoundError extends Error {
  constructor(public readonly propertyId: string) {
    super(`Property not found: ${propertyId}`);
    this.name = "PropertyNotFoundError";
  }
}

export class PropertyAlreadyExistsError extends Error {
  constructor(public readonly propertyId: string) {
    super(`A property with id "${propertyId}" already exists`);
    this.name = "PropertyAlreadyExistsError";
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

export const CONFLICT_MESSAGE = "This property changed since you started editing";

export class SaveConflictError extends Error {
  constructor(public readonly propertyId: string) {
    super(`${CONFLICT_MESSAGE}: ${propertyId}`);
    this.name = "SaveConflictError";
  }
}
