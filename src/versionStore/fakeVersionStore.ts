import type { PropertyDetail, PropertySummary, VersionStore } from "./types";
import { PropertyNotFoundError } from "./types";

// In-memory stand-in for GitHubVersionStore, used in tests instead of a real network call.
export class FakeVersionStore implements VersionStore {
  constructor(private readonly properties: PropertyDetail[]) {}

  async listProperties(): Promise<PropertySummary[]> {
    return this.properties.map(({ id, name, type }) => ({ id, name, type }));
  }

  async getProperty(id: string): Promise<PropertyDetail> {
    const property = this.properties.find((candidate) => candidate.id === id);
    if (!property) {
      throw new PropertyNotFoundError(id);
    }
    return property;
  }
}
