import { GITHUB_OWNER, GITHUB_REPO, MANIFEST_PATH, contentPath } from "../config";
import type { AccessLevel, PropertyDetail, PropertySummary, PropertyVersion, VersionStore, VersionSummary } from "./types";
import { PropertyNotFoundError, VersionNotFoundError } from "./types";

const API_ROOT = "https://api.github.com";
const ACCEPT_HEADER = "application/vnd.github+json";

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

function repoApiUrl(pathSuffix: string): URL {
  return new URL(`${API_ROOT}/repos/${GITHUB_OWNER}/${GITHUB_REPO}${pathSuffix}`);
}

function buildHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { Accept: ACCEPT_HEADER };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function githubFetch(url: URL, token: string | null): Promise<Response> {
  return fetch(url.toString(), { headers: buildHeaders(token) });
}

async function githubApiRequest(url: URL, description: string, token: string | null): Promise<unknown> {
  const response = await githubFetch(url, token);
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}) for ${description}`);
  }
  return response.json();
}

async function fetchFileContent(path: string, token: string | null, ref?: string): Promise<string> {
  const url = repoApiUrl(`/contents/${path}`);
  if (ref) {
    url.searchParams.set("ref", ref);
  }

  const body = (await githubApiRequest(url, path, token)) as { content: string; encoding: string };
  if (body.encoding !== "base64") {
    throw new Error(`Unexpected encoding "${body.encoding}" for ${path}`);
  }
  return decodeBase64Utf8(body.content);
}

async function fetchCommitHistory(path: string, token: string | null): Promise<VersionSummary[]> {
  const url = repoApiUrl("/commits");
  url.searchParams.set("path", path);
  // GitHub defaults to 30 commits per page; 100 (its max) covers realistic
  // history for this tool without building full pagination.
  url.searchParams.set("per_page", "100");

  const commits = (await githubApiRequest(url, path, token)) as GitHubCommit[];
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
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  async listProperties(): Promise<PropertySummary[]> {
    const manifestText = await fetchFileContent(MANIFEST_PATH, this.token);
    return JSON.parse(manifestText) as PropertySummary[];
  }

  async getProperty(id: string): Promise<PropertyDetail> {
    const properties = await this.listProperties();
    const summary = properties.find((property) => property.id === id);
    if (!summary) {
      throw new PropertyNotFoundError(id);
    }
    const content = await fetchFileContent(contentPath(id), this.token);
    return { ...summary, content };
  }

  async listVersions(propertyId: string): Promise<VersionSummary[]> {
    return fetchCommitHistory(contentPath(propertyId), this.token);
  }

  async getVersion(propertyId: string, versionRef: string): Promise<PropertyVersion> {
    const versions = await this.listVersions(propertyId);
    const summary = versions.find((version) => version.ref === versionRef);
    if (!summary) {
      throw new VersionNotFoundError(propertyId, versionRef);
    }
    const content = await fetchFileContent(contentPath(propertyId), this.token, versionRef);
    return { ...summary, content };
  }

  async checkAccess(): Promise<AccessLevel> {
    const response = await githubFetch(repoApiUrl(""), this.token);

    if (response.status === 401) {
      return "invalid-token";
    }
    if (!response.ok) {
      throw new Error(`GitHub API request failed (${response.status}) for repository access check`);
    }

    const body = (await response.json()) as { permissions?: { push?: boolean } };
    return body.permissions?.push ? "can-write" : "no-write";
  }
}
