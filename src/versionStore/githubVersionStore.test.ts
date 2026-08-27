import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubVersionStore } from "./githubVersionStore";
import { PropertyNotFoundError } from "./types";

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
});
