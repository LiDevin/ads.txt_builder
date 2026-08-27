import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubVersionStore } from "./githubVersionStore";
import { PropertyNotFoundError, SaveConflictError, VersionNotFoundError } from "./types";

function requestInit(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): RequestInit & { headers: Record<string, string> } {
  const [, init] = fetchMock.mock.calls[callIndex] as [string, RequestInit & { headers: Record<string, string> }];
  return init;
}

function authHeader(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0): string | undefined {
  return requestInit(fetchMock, callIndex).headers.Authorization;
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function githubContentsResponse(text: string, sha = "blob-sha") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: encodeBase64Utf8(text),
      encoding: "base64",
      sha,
    }),
  };
}

function githubPutResponse(commit: { sha: string; message: string; authorName: string; date: string }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      commit: {
        sha: commit.sha,
        message: commit.message,
        author: { name: commit.authorName, date: commit.date },
      },
    }),
  };
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): Record<string, unknown> {
  return JSON.parse(requestInit(fetchMock, callIndex).body as string) as Record<string, unknown>;
}

function requestMethod(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): string | undefined {
  return requestInit(fetchMock, callIndex).method;
}

function failedResponse(status: number) {
  return { ok: false, status, json: async () => ({}) };
}

function githubRepoResponse(permissions?: { push?: boolean; pull?: boolean }) {
  return { ok: true, status: 200, json: async () => ({ permissions }) };
}

function githubCommitsResponse(
  commits: { sha: string; message: string; authorName: string; date: string }[],
) {
  return {
    ok: true,
    status: 200,
    json: async () =>
      commits.map((commit) => ({
        sha: commit.sha,
        commit: {
          message: commit.message,
          author: { name: commit.authorName, date: commit.date },
        },
      })),
  };
}

function stubFetch(...responses: unknown[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("GitHubVersionStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists properties from the manifest file", async () => {
    const manifest = [
      { id: "example-oo", name: "Example O&O", type: "OO" },
      { id: "example-partner", name: "Example Partner", type: "PARTNER" },
    ];
    const fetchMock = stubFetch(githubContentsResponse(JSON.stringify(manifest)));

    const properties = await new GitHubVersionStore().listProperties();

    expect(properties).toEqual(manifest);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/contents/data/properties.json"),
      expect.any(Object),
    );
  });

  it("gets a property's manifest details together with its current content", async () => {
    const manifest = [{ id: "example-oo", name: "Example O&O", type: "OO" }];
    stubFetch(
      githubContentsResponse(JSON.stringify(manifest)),
      githubContentsResponse("example.com, 12345, DIRECT\n"),
    );

    const property = await new GitHubVersionStore().getProperty("example-oo");

    expect(property).toEqual({
      id: "example-oo",
      name: "Example O&O",
      type: "OO",
      content: "example.com, 12345, DIRECT\n",
      baseVersion: "blob-sha",
    });
  });

  it("decodes non-ASCII content correctly", async () => {
    const manifest = [{ id: "example-oo", name: "Example O&O", type: "OO" }];
    stubFetch(
      githubContentsResponse(JSON.stringify(manifest)),
      githubContentsResponse("# comment: café\nexample.com, 1, DIRECT\n"),
    );

    const property = await new GitHubVersionStore().getProperty("example-oo");

    expect(property.content).toBe("# comment: café\nexample.com, 1, DIRECT\n");
  });

  it("throws PropertyNotFoundError when the id is missing from the manifest", async () => {
    stubFetch(githubContentsResponse(JSON.stringify([])));

    await expect(new GitHubVersionStore().getProperty("missing")).rejects.toBeInstanceOf(PropertyNotFoundError);
  });

  it("throws a descriptive error when the GitHub API request fails", async () => {
    stubFetch(failedResponse(500));

    await expect(new GitHubVersionStore().listProperties()).rejects.toThrow(/GitHub API request failed \(500\)/);
  });

  it("lists a property's versions from its commit history, newest first", async () => {
    const fetchMock = stubFetch(
      githubCommitsResponse([
        { sha: "sha-2", message: "Add reseller line", authorName: "Sam", date: "2026-08-28T09:00:00Z" },
        { sha: "sha-1", message: "Initial version", authorName: "Alex", date: "2026-08-27T10:00:00Z" },
      ]),
    );

    const versions = await new GitHubVersionStore().listVersions("example-oo");

    expect(versions).toEqual([
      { ref: "sha-2", comment: "Add reseller line", author: "Sam", timestamp: "2026-08-28T09:00:00Z" },
      { ref: "sha-1", comment: "Initial version", author: "Alex", timestamp: "2026-08-27T10:00:00Z" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/commits\?.*path=data%2Fproperties%2Fexample-oo%2Fcontent\.txt/),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/per_page=100/), expect.any(Object));
  });

  it("gets a specific past version's content by its ref", async () => {
    stubFetch(
      githubCommitsResponse([
        { sha: "sha-2", message: "Add reseller line", authorName: "Sam", date: "2026-08-28T09:00:00Z" },
        { sha: "sha-1", message: "Initial version", authorName: "Alex", date: "2026-08-27T10:00:00Z" },
      ]),
      githubContentsResponse("example.com, 1, DIRECT\n"),
    );

    const version = await new GitHubVersionStore().getVersion("example-oo", "sha-1");

    expect(version).toEqual({
      ref: "sha-1",
      comment: "Initial version",
      author: "Alex",
      timestamp: "2026-08-27T10:00:00Z",
      content: "example.com, 1, DIRECT\n",
    });
  });

  it("fetches a past version's content pinned to its commit ref", async () => {
    const fetchMock = stubFetch(
      githubCommitsResponse([{ sha: "sha-1", message: "Initial version", authorName: "Alex", date: "2026-08-27T10:00:00Z" }]),
      githubContentsResponse("example.com, 1, DIRECT\n"),
    );

    await new GitHubVersionStore().getVersion("example-oo", "sha-1");

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/contents\/data\/properties\/example-oo\/content\.txt\?ref=sha-1/),
      expect.any(Object),
    );
  });

  it("throws VersionNotFoundError when the ref is missing from the commit history", async () => {
    stubFetch(githubCommitsResponse([]));

    await expect(new GitHubVersionStore().getVersion("example-oo", "missing")).rejects.toBeInstanceOf(
      VersionNotFoundError,
    );
  });

  it("sends no Authorization header when no token has been set", async () => {
    const fetchMock = stubFetch(githubContentsResponse(JSON.stringify([])));

    await new GitHubVersionStore().listProperties();

    expect(authHeader(fetchMock)).toBeUndefined();
  });

  it("sends the token as a Bearer Authorization header once set, on every subsequent call", async () => {
    const fetchMock = stubFetch(
      githubContentsResponse(JSON.stringify([])),
      githubCommitsResponse([]),
    );
    const store = new GitHubVersionStore();
    store.setToken("my-token");

    await store.listProperties();
    await store.listVersions("example-oo");

    expect(authHeader(fetchMock, 0)).toBe("Bearer my-token");
    expect(authHeader(fetchMock, 1)).toBe("Bearer my-token");
  });

  it("reports can-write when the token grants push access", async () => {
    stubFetch(githubRepoResponse({ push: true, pull: true }));
    const store = new GitHubVersionStore();
    store.setToken("my-token");

    await expect(store.checkAccess()).resolves.toBe("can-write");
  });

  it("reports no-write when the token only grants read access", async () => {
    stubFetch(githubRepoResponse({ push: false, pull: true }));
    const store = new GitHubVersionStore();
    store.setToken("my-token");

    await expect(store.checkAccess()).resolves.toBe("no-write");
  });

  it("reports no-write when no token is set", async () => {
    stubFetch(githubRepoResponse(undefined));
    const store = new GitHubVersionStore();

    await expect(store.checkAccess()).resolves.toBe("no-write");
  });

  it("reports invalid-token on a 401 response", async () => {
    stubFetch(failedResponse(401));
    const store = new GitHubVersionStore();
    store.setToken("bad-token");

    await expect(store.checkAccess()).resolves.toBe("invalid-token");
  });

  it("throws on an unexpected access-check failure", async () => {
    stubFetch(failedResponse(500));
    const store = new GitHubVersionStore();
    store.setToken("my-token");

    await expect(store.checkAccess()).rejects.toThrow(/GitHub API request failed \(500\)/);
  });

  it("saves a new version via a PUT to the Contents API, returning the resulting commit", async () => {
    stubFetch(
      githubPutResponse({ sha: "new-sha", message: "Add reseller", authorName: "Alex", date: "2026-08-29T12:00:00Z" }),
    );
    const store = new GitHubVersionStore();
    store.setToken("my-token");

    const version = await store.saveVersion(
      "example-oo",
      "example.com, 1, DIRECT\nreseller.com, 2, RESELLER\n",
      "Add reseller",
      "current-blob-sha",
    );

    expect(version).toEqual({
      ref: "new-sha",
      comment: "Add reseller",
      author: "Alex",
      timestamp: "2026-08-29T12:00:00Z",
      content: "example.com, 1, DIRECT\nreseller.com, 2, RESELLER\n",
    });
  });

  it("PUTs the new content, comment, and the passed-in base version as the sha, authenticated with the token", async () => {
    const fetchMock = stubFetch(
      githubPutResponse({ sha: "new-sha", message: "Add reseller", authorName: "Alex", date: "2026-08-29T12:00:00Z" }),
    );
    const store = new GitHubVersionStore();
    store.setToken("my-token");

    await store.saveVersion("example-oo", "new content", "Add reseller", "current-blob-sha");

    expect(requestMethod(fetchMock, 0)).toBe("PUT");
    expect(authHeader(fetchMock, 0)).toBe("Bearer my-token");
    const body = requestBody(fetchMock, 0);
    expect(body.message).toBe("Add reseller");
    expect(body.sha).toBe("current-blob-sha");
    expect(decodeBase64Utf8(body.content as string)).toBe("new content");
  });

  it("throws when the save is rejected (e.g. no write access), without pretending it succeeded", async () => {
    stubFetch(failedResponse(403));
    const store = new GitHubVersionStore();
    store.setToken("read-only-token");

    await expect(store.saveVersion("example-oo", "new content", "Add reseller", "current-blob-sha")).rejects.toThrow(
      /GitHub API request failed \(403\)/,
    );
  });

  it("throws SaveConflictError on a 409 response, without re-fetching a fresh sha and retrying", async () => {
    const fetchMock = stubFetch(failedResponse(409));
    const store = new GitHubVersionStore();
    store.setToken("my-token");

    await expect(
      store.saveVersion("example-oo", "new content", "Add reseller", "stale-blob-sha"),
    ).rejects.toBeInstanceOf(SaveConflictError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
