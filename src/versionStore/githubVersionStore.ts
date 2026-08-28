import { GITHUB_OWNER, GITHUB_REPO, MANIFEST_PATH, contentPath } from "../config";
import type { AccessLevel, PropertyDetail, PropertySummary, PropertyType, PropertyVersion, VersionStore, VersionSummary } from "./types";
import { PropertyNotFoundError, SaveConflictError, VersionNotFoundError } from "./types";

const API_ROOT = "https://api.github.com";
const ACCEPT_HEADER = "application/vnd.github+json";

interface GitHubAuthor {
  name: string;
  date: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: GitHubAuthor | null;
  };
}

// Shape of the "commit" field in a Contents API PUT response — flatter than
// the list-commits shape above (message/author sit directly on it).
interface GitHubPutCommit {
  sha: string;
  message: string;
  author: GitHubAuthor | null;
}

interface GitHubRequestInit {
  method?: string;
  body?: string;
}

function authorFields(author: GitHubAuthor | null): { author: string; timestamp: string } {
  return { author: author?.name ?? "Unknown", timestamp: author?.date ?? "" };
}

// A version's name and comment are both stored in the one commit message
// GitHub gives us, using git's own subject/body convention (subject line,
// blank line, body). A version saved before names existed has no blank-line
// separator, so it decodes as comment-only with no name.
//
// Splitting on the first "\n\n" is only safe because both fields come from
// single-line <input type="text"> elements, which can't contain a newline.
// If either field ever became multi-line, this would need a real delimiter.
function formatVersionMessage(name: string, comment: string): string {
  return `${name}\n\n${comment}`;
}

function parseVersionMessage(message: string): { name?: string; comment: string } {
  const separatorIndex = message.indexOf("\n\n");
  if (separatorIndex === -1) {
    return { comment: message };
  }
  return {
    name: message.slice(0, separatorIndex),
    comment: message.slice(separatorIndex + 2),
  };
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
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

async function githubFetch(url: URL, token: string | null, init?: GitHubRequestInit): Promise<Response> {
  const headers = buildHeaders(token);
  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url.toString(), { method: init?.method, headers, body: init?.body });
}

function throwIfFailed(response: Response, description: string): void {
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}) for ${description}`);
  }
}

async function githubApiRequest(
  url: URL,
  description: string,
  token: string | null,
  init?: GitHubRequestInit,
): Promise<unknown> {
  let response = await githubFetch(url, token, init);
  if (response.status === 401 && token) {
    // A saved token that's actually invalid must not break reads that would
    // otherwise succeed anonymously against this public repo.
    response = await githubFetch(url, null, init);
  }
  throwIfFailed(response, description);
  return response.json();
}

async function fetchFileMeta(path: string, token: string | null, ref?: string): Promise<{ content: string; sha: string }> {
  const url = repoApiUrl(`/contents/${path}`);
  if (ref) {
    url.searchParams.set("ref", ref);
  }

  const body = (await githubApiRequest(url, path, token)) as { content: string; encoding: string; sha: string };
  if (body.encoding !== "base64") {
    throw new Error(`Unexpected encoding "${body.encoding}" for ${path}`);
  }
  return { content: decodeBase64Utf8(body.content), sha: body.sha };
}

async function fetchFileContent(path: string, token: string | null, ref?: string): Promise<string> {
  return (await fetchFileMeta(path, token, ref)).content;
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
    ...parseVersionMessage(commit.commit.message),
    ...authorFields(commit.commit.author),
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
    const { content, sha } = await fetchFileMeta(contentPath(id), this.token);
    return { ...summary, content, baseVersion: sha };
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
    throwIfFailed(response, "repository access check");

    const body = (await response.json()) as { permissions?: { push?: boolean } };
    return body.permissions?.push ? "can-write" : "no-write";
  }

  async saveVersion(
    propertyId: string,
    content: string,
    name: string,
    comment: string,
    baseVersion: string,
  ): Promise<PropertyVersion> {
    const path = contentPath(propertyId);
    const url = repoApiUrl(`/contents/${path}`);
    const requestBody = JSON.stringify({
      message: formatVersionMessage(name, comment),
      content: encodeBase64Utf8(content),
      sha: baseVersion,
    });

    const response = await githubFetch(url, this.token, { method: "PUT", body: requestBody });
    if (response.status === 409) {
      throw new SaveConflictError(propertyId);
    }
    throwIfFailed(response, `saving ${path}`);

    const body = (await response.json()) as { commit: GitHubPutCommit };
    return {
      ref: body.commit.sha,
      ...parseVersionMessage(body.commit.message),
      ...authorFields(body.commit.author),
      content,
    };
  }

  async createProperty(id: string, name: string, type: PropertyType, content: string): Promise<void> {
    // Create the content file first: if this fails (e.g. no write access), the
    // manifest is never touched, so a property never appears without content.
    const contentUrl = repoApiUrl(`/contents/${contentPath(id)}`);
    const createResponse = await githubFetch(contentUrl, this.token, {
      method: "PUT",
      body: JSON.stringify({ message: "Initial version", content: encodeBase64Utf8(content) }),
    });
    throwIfFailed(createResponse, `creating ${contentPath(id)}`);

    const manifest = await fetchFileMeta(MANIFEST_PATH, this.token);
    const properties = JSON.parse(manifest.content) as PropertySummary[];
    properties.push({ id, name, type });

    const manifestResponse = await githubFetch(repoApiUrl(`/contents/${MANIFEST_PATH}`), this.token, {
      method: "PUT",
      body: JSON.stringify({
        message: `Add property: ${name}`,
        content: encodeBase64Utf8(`${JSON.stringify(properties, null, 2)}\n`),
        sha: manifest.sha,
      }),
    });
    throwIfFailed(manifestResponse, "updating property manifest");
  }

  async renameProperty(id: string, newName: string): Promise<void> {
    const manifest = await fetchFileMeta(MANIFEST_PATH, this.token);
    const properties = JSON.parse(manifest.content) as PropertySummary[];
    const property = properties.find((candidate) => candidate.id === id);
    if (!property) {
      throw new PropertyNotFoundError(id);
    }
    property.name = newName;

    const manifestResponse = await githubFetch(repoApiUrl(`/contents/${MANIFEST_PATH}`), this.token, {
      method: "PUT",
      body: JSON.stringify({
        message: `Rename property to "${newName}"`,
        content: encodeBase64Utf8(`${JSON.stringify(properties, null, 2)}\n`),
        sha: manifest.sha,
      }),
    });
    throwIfFailed(manifestResponse, "updating property manifest");
  }

  async deleteProperty(id: string): Promise<void> {
    const manifest = await fetchFileMeta(MANIFEST_PATH, this.token);
    const properties = JSON.parse(manifest.content) as PropertySummary[];
    const property = properties.find((candidate) => candidate.id === id);
    if (!property) {
      throw new PropertyNotFoundError(id);
    }
    const contentMeta = await fetchFileMeta(contentPath(id), this.token);

    // Remove the manifest entry first, then delete the content file: if the
    // content deletion fails, the property is merely hidden with its content
    // file left behind (harmless), rather than listed with content missing.
    const remainingProperties = properties.filter((candidate) => candidate.id !== id);
    const manifestResponse = await githubFetch(repoApiUrl(`/contents/${MANIFEST_PATH}`), this.token, {
      method: "PUT",
      body: JSON.stringify({
        message: `Delete property: ${property.name}`,
        content: encodeBase64Utf8(`${JSON.stringify(remainingProperties, null, 2)}\n`),
        sha: manifest.sha,
      }),
    });
    throwIfFailed(manifestResponse, "updating property manifest");

    const deleteResponse = await githubFetch(repoApiUrl(`/contents/${contentPath(id)}`), this.token, {
      method: "DELETE",
      body: JSON.stringify({ message: `Delete property: ${property.name}`, sha: contentMeta.sha }),
    });
    throwIfFailed(deleteResponse, `deleting ${contentPath(id)}`);
  }
}
