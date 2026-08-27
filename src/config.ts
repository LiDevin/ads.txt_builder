export const GITHUB_OWNER = "LiDevin";
export const GITHUB_REPO = "ads.txt_builder";
export const MANIFEST_PATH = "data/properties.json";

export function contentPath(propertyId: string): string {
  return `data/properties/${propertyId}/content.txt`;
}
