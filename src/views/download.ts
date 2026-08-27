import type { PropertySummary } from "../versionStore/types";
import { slugify } from "./slugify";

export function downloadFilename(property: Pick<PropertySummary, "name" | "type">): string {
  if (property.type === "OO") {
    return "ads.txt";
  }
  return `${slugify(property.name)}-ads.txt-lines.txt`;
}

export function toDownloadHref(content: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
}
