import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubVersionStore } from "./githubVersionStore";
import { PropertyNotFoundError, VersionNotFoundError } from "./types";

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

function githubContentsResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: encodeBase64Utf8(text),
      encoding: "base64",
    }),
  };
}

function failedResponse(status: number) {
  return { ok: false, status, json: async () => ({}) };
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
});
