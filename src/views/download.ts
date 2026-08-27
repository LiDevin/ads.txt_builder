import type { PropertySummary } from "../versionStore/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function downloadFilename(property: Pick<PropertySummary, "name" | "type">): string {
  if (property.type === "OO") {
    return "ads.txt";
  }
  return `${slugify(property.name)}-ads.txt-lines.txt`;
}

export function toDownloadHref(content: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
}
