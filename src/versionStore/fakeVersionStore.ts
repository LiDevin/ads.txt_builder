import type {
  AccessLevel,
  PropertyDetail,
  PropertySummary,
  PropertyType,
  PropertyVersion,
  VersionStore,
  VersionSummary,
} from "./types";
import { PropertyAlreadyExistsError, PropertyNotFoundError, SaveConflictError, VersionNotFoundError } from "./types";

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
    return {
      id: property.id,
      name: property.name,
      type: property.type,
      content: current.content,
      baseVersion: current.ref,
    };
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

  async saveVersion(
    propertyId: string,
    content: string,
    name: string,
    comment: string,
    baseVersion: string,
  ): Promise<PropertyVersion> {
    const property = this.findProperty(propertyId);
    if (this.accessLevel !== "can-write") {
      throw new Error("This token does not have write access to save changes.");
    }
    if (property.versions[0].ref !== baseVersion) {
      throw new SaveConflictError(propertyId);
    }

    const newVersion: PropertyVersion = {
      ref: `fake-sha-${property.versions.length + 1}`,
      name,
      comment,
      author: "Fake User",
      timestamp: new Date().toISOString(),
      content,
    };
    property.versions.unshift(newVersion);
    return newVersion;
  }

  async createProperty(id: string, name: string, type: PropertyType, content: string): Promise<void> {
    if (this.accessLevel !== "can-write") {
      throw new Error("This token does not have write access to create properties.");
    }
    if (this.properties.some((property) => property.id === id)) {
      throw new PropertyAlreadyExistsError(id);
    }

    this.properties.push({
      id,
      name,
      type,
      versions: [
        {
          ref: "fake-sha-1",
          comment: "Initial version",
          author: "Fake User",
          timestamp: new Date().toISOString(),
          content,
        },
      ],
    });
  }

  async renameProperty(id: string, newName: string): Promise<void> {
    const property = this.findProperty(id);
    if (this.accessLevel !== "can-write") {
      throw new Error("This token does not have write access to rename properties.");
    }
    property.name = newName;
  }
}
