import { describe, expect, it } from "vitest";
import { FakeVersionStore } from "./fakeVersionStore";
import { PropertyNotFoundError, VersionNotFoundError } from "./types";

const oneVersionProperty = {
  id: "oo-1",
  name: "Main Site",
  type: "OO" as const,
  versions: [
    { ref: "sha-1", comment: "Initial version", author: "Alex", timestamp: "2026-08-27T10:00:00Z", content: "example.com, 1, DIRECT" },
  ],
};

const twoVersionProperty = {
  id: "oo-2",
  name: "Other Site",
  type: "OO" as const,
  versions: [
    { ref: "sha-2", comment: "Add reseller line", author: "Sam", timestamp: "2026-08-28T09:00:00Z", content: "other.com, 2, DIRECT\nreseller.com, 3, RESELLER" },
    { ref: "sha-1", comment: "Initial version", author: "Alex", timestamp: "2026-08-27T10:00:00Z", content: "other.com, 2, DIRECT" },
  ],
};

describe("FakeVersionStore", () => {
  it("lists properties without their content", async () => {
    const store = new FakeVersionStore([oneVersionProperty]);

    await expect(store.listProperties()).resolves.toEqual([{ id: "oo-1", name: "Main Site", type: "OO" }]);
  });

  it("gets a property's current (most recent) content", async () => {
    const store = new FakeVersionStore([twoVersionProperty]);

    await expect(store.getProperty("oo-2")).resolves.toEqual({
      id: "oo-2",
      name: "Other Site",
      type: "OO",
      content: "other.com, 2, DIRECT\nreseller.com, 3, RESELLER",
    });
  });

  it("throws PropertyNotFoundError for an unknown id", async () => {
    const store = new FakeVersionStore([]);

    await expect(store.getProperty("missing")).rejects.toBeInstanceOf(PropertyNotFoundError);
  });

  it("lists versions newest first, without content", async () => {
    const store = new FakeVersionStore([twoVersionProperty]);

    await expect(store.listVersions("oo-2")).resolves.toEqual([
      { ref: "sha-2", comment: "Add reseller line", author: "Sam", timestamp: "2026-08-28T09:00:00Z" },
      { ref: "sha-1", comment: "Initial version", author: "Alex", timestamp: "2026-08-27T10:00:00Z" },
    ]);
  });

  it("throws PropertyNotFoundError when listing versions of an unknown property", async () => {
    const store = new FakeVersionStore([]);

    await expect(store.listVersions("missing")).rejects.toBeInstanceOf(PropertyNotFoundError);
  });

  it("gets a specific past version's content", async () => {
    const store = new FakeVersionStore([twoVersionProperty]);

    await expect(store.getVersion("oo-2", "sha-1")).resolves.toEqual({
      ref: "sha-1",
      comment: "Initial version",
      author: "Alex",
      timestamp: "2026-08-27T10:00:00Z",
      content: "other.com, 2, DIRECT",
    });
  });

  it("throws VersionNotFoundError for an unknown version ref", async () => {
    const store = new FakeVersionStore([oneVersionProperty]);

    await expect(store.getVersion("oo-1", "does-not-exist")).rejects.toBeInstanceOf(VersionNotFoundError);
  });

  it("reports the configured access level, defaulting to no-write", async () => {
    const defaultStore = new FakeVersionStore([]);
    await expect(defaultStore.checkAccess()).resolves.toBe("no-write");

    const writeStore = new FakeVersionStore([], { accessLevel: "can-write" });
    await expect(writeStore.checkAccess()).resolves.toBe("can-write");

    const invalidStore = new FakeVersionStore([], { accessLevel: "invalid-token" });
    await expect(invalidStore.checkAccess()).resolves.toBe("invalid-token");
  });

  it("records the last token passed to setToken", () => {
    const store = new FakeVersionStore([]);
    expect(store.lastToken).toBeNull();

    store.setToken("abc123");
    expect(store.lastToken).toBe("abc123");

    store.setToken(null);
    expect(store.lastToken).toBeNull();
  });

  it("saves a new version, making it the current content and prepending it to history", async () => {
    const store = new FakeVersionStore([oneVersionProperty], { accessLevel: "can-write" });

    const saved = await store.saveVersion("oo-1", "example.com, 1, DIRECT\nreseller.com, 2, RESELLER", "Add reseller");

    expect(saved.comment).toBe("Add reseller");
    expect(saved.content).toBe("example.com, 1, DIRECT\nreseller.com, 2, RESELLER");

    await expect(store.getProperty("oo-1")).resolves.toMatchObject({
      content: "example.com, 1, DIRECT\nreseller.com, 2, RESELLER",
    });
    await expect(store.listVersions("oo-1")).resolves.toEqual([
      expect.objectContaining({ comment: "Add reseller" }),
      expect.objectContaining({ comment: "Initial version" }),
    ]);
  });

  it("throws when saving without can-write access, leaving the property unchanged", async () => {
    const store = new FakeVersionStore([oneVersionProperty], { accessLevel: "no-write" });

    await expect(store.saveVersion("oo-1", "new content", "Attempted edit")).rejects.toThrow();
    await expect(store.getProperty("oo-1")).resolves.toMatchObject({ content: "example.com, 1, DIRECT" });
  });

  it("throws PropertyNotFoundError when saving to an unknown property", async () => {
    const store = new FakeVersionStore([], { accessLevel: "can-write" });

    await expect(store.saveVersion("missing", "content", "comment")).rejects.toBeInstanceOf(PropertyNotFoundError);
  });
});
