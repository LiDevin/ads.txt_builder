import { GITHUB_OWNER, GITHUB_REPO, MANIFEST_PATH, contentPath } from "../config";
import type { PropertyDetail, PropertySummary, VersionStore } from "./types";
import { PropertyNotFoundError } from "./types";

const API_ROOT = "https://api.github.com";

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

async function fetchFileContent(path: string): Promise<string> {
  const url = `${API_ROOT}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}) for ${path}`);
  }

  const body = (await response.json()) as { content: string; encoding: string };
  if (body.encoding !== "base64") {
    throw new Error(`Unexpected encoding "${body.encoding}" for ${path}`);
  }
  return decodeBase64Utf8(body.content);
}

// The only module that talks to the GitHub API directly; everything else in the
// app is layered on top of the VersionStore interface and tested against a fake.
export class GitHubVersionStore implements VersionStore {
  async listProperties(): Promise<PropertySummary[]> {
    const manifestText = await fetchFileContent(MANIFEST_PATH);
    return JSON.parse(manifestText) as PropertySummary[];
  }

  async getProperty(id: string): Promise<PropertyDetail> {
    const properties = await this.listProperties();
    const summary = properties.find((property) => property.id === id);
    if (!summary) {
      throw new PropertyNotFoundError(id);
    }
    const content = await fetchFileContent(contentPath(id));
    return { ...summary, content };
  }
}
