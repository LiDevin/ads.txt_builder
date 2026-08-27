import { GITHUB_OWNER, GITHUB_REPO, MANIFEST_PATH, contentPath } from "../config";
import type { PropertyDetail, PropertySummary, PropertyVersion, VersionStore, VersionSummary } from "./types";
import { PropertyNotFoundError, VersionNotFoundError } from "./types";

const API_ROOT = "https://api.github.com";
const REQUEST_HEADERS = { Accept: "application/vnd.github+json" };

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

async function githubApiRequest(url: URL, description: string): Promise<unknown> {
  const response = await fetch(url.toString(), { headers: REQUEST_HEADERS });
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}) for ${description}`);
  }
  return response.json();
}

async function fetchFileContent(path: string, ref?: string): Promise<string> {
  const url = new URL(`${API_ROOT}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`);
  if (ref) {
    url.searchParams.set("ref", ref);
  }

  const body = (await githubApiRequest(url, path)) as { content: string; encoding: string };
  if (body.encoding !== "base64") {
    throw new Error(`Unexpected encoding "${body.encoding}" for ${path}`);
  }
  return decodeBase64Utf8(body.content);
}

async function fetchCommitHistory(path: string): Promise<VersionSummary[]> {
  const url = new URL(`${API_ROOT}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits`);
  url.searchParams.set("path", path);
  // GitHub defaults to 30 commits per page; 100 (its max) covers realistic
  // history for this tool without building full pagination.
  url.searchParams.set("per_page", "100");

  const commits = (await githubApiRequest(url, path)) as GitHubCommit[];
  return commits.map((commit) => ({
    ref: commit.sha,
    comment: commit.commit.message,
    author: commit.commit.author?.name ?? "Unknown",
    timestamp: commit.commit.author?.date ?? "",
  }));
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

  async listVersions(propertyId: string): Promise<VersionSummary[]> {
    return fetchCommitHistory(contentPath(propertyId));
  }

  async getVersion(propertyId: string, versionRef: string): Promise<PropertyVersion> {
    const versions = await this.listVersions(propertyId);
    const summary = versions.find((version) => version.ref === versionRef);
    if (!summary) {
      throw new VersionNotFoundError(propertyId, versionRef);
    }
    const content = await fetchFileContent(contentPath(propertyId), versionRef);
    return { ...summary, content };
  }
}
