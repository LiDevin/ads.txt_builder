export type PropertyType = "OO" | "PARTNER";

export interface PropertySummary {
  id: string;
  name: string;
  type: PropertyType;
}

export interface PropertyDetail extends PropertySummary {
  content: string;
}

export interface VersionStore {
  listProperties(): Promise<PropertySummary[]>;
  getProperty(id: string): Promise<PropertyDetail>;
}

export class PropertyNotFoundError extends Error {
  constructor(public readonly propertyId: string) {
    super(`Property not found: ${propertyId}`);
    this.name = "PropertyNotFoundError";
  }
}
