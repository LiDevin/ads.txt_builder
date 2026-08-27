import type {
  AccessLevel,
  PropertyDetail,
  PropertySummary,
  PropertyType,
  PropertyVersion,
  VersionStore,
  VersionSummary,
} from "./types";
import { PropertyNotFoundError, VersionNotFoundError } from "./types";

export interface FakeProperty {
  id: string;
  name: string;
  type: PropertyType;
  // Newest first; versions[0] is the current version.
  versions: PropertyVersion[];
}

export interface FakeVersionStoreOptions {
  accessLevel?: AccessLevel;
}

function toSummary({ content: _content, ...summary }: PropertyVersion): VersionSummary {
  return summary;
}

// In-memory stand-in for GitHubVersionStore, used in tests instead of a real network call.
export class FakeVersionStore implements VersionStore {
  public lastToken: string | null = null;
  private readonly properties: FakeProperty[];
  private readonly accessLevel: AccessLevel;

  constructor(properties: FakeProperty[], options: FakeVersionStoreOptions = {}) {
    // Clone so saveVersion's mutations never leak back into the caller's fixtures.
    this.properties = properties.map((property) => ({ ...property, versions: [...property.versions] }));
    this.accessLevel = options.accessLevel ?? "no-write";
  }

  setToken(token: string | null): void {
    this.lastToken = token;
  }

  async checkAccess(): Promise<AccessLevel> {
    return this.accessLevel;
  }

  private findProperty(id: string): FakeProperty {
    const property = this.properties.find((candidate) => candidate.id === id);
    if (!property) {
      throw new PropertyNotFoundError(id);
    }
    return property;
  }

  async listProperties(): Promise<PropertySummary[]> {
    return this.properties.map(({ id, name, type }) => ({ id, name, type }));
  }

  async getProperty(id: string): Promise<PropertyDetail> {
    const property = this.findProperty(id);
    const [current] = property.versions;
    return { id: property.id, name: property.name, type: property.type, content: current.content };
  }

  async listVersions(propertyId: string): Promise<VersionSummary[]> {
    const property = this.findProperty(propertyId);
    return property.versions.map(toSummary);
  }

  async getVersion(propertyId: string, versionRef: string): Promise<PropertyVersion> {
    const property = this.findProperty(propertyId);
    const version = property.versions.find((candidate) => candidate.ref === versionRef);
    if (!version) {
      throw new VersionNotFoundError(propertyId, versionRef);
    }
    return version;
  }

  async saveVersion(propertyId: string, content: string, comment: string): Promise<PropertyVersion> {
    const property = this.findProperty(propertyId);
    if (this.accessLevel !== "can-write") {
      throw new Error("This token does not have write access to save changes.");
    }

    const newVersion: PropertyVersion = {
      ref: `fake-sha-${property.versions.length + 1}`,
      comment,
      author: "Fake User",
      timestamp: new Date().toISOString(),
      content,
    };
    property.versions.unshift(newVersion);
    return newVersion;
  }
}
