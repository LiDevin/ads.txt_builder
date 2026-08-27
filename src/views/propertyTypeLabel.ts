import type { PropertyType } from "../versionStore/types";

export const TYPE_LABELS: Record<PropertyType, string> = {
  OO: "Owned & Operated",
  PARTNER: "Partner",
};

export function propertyTypeLabel(type: PropertyType): string {
  return TYPE_LABELS[type];
}
