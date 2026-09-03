import { describe, expect, it } from "vitest";
import { renderPropertyArchive } from "./propertyArchive";
import { FakeVersionStore } from "../versionStore/fakeVersionStore";
import { createFailingVersionStore } from "../versionStore/testHelpers";
import { formatTimestamp } from "./formatTimestamp";

function noVersionProperty(id: string, name: string, archived?: boolean, archivedAt?: string) {
  return {
    id,
    name,
    type: "OO" as const,
    archived,
    archivedAt,
    versions: [{ ref: "sha-1", comment: "", author: "", timestamp: "", content: "" }],
  };
}

describe("renderPropertyArchive", () => {
  it("shows only archived properties, not active ones", async () => {
    const store = new FakeVersionStore([
      noVersionProperty("oo-1", "Active Site"),
      noVersionProperty("oo-2", "Archived Site", true, "2026-08-01T00:00:00Z"),
    ]);
    const container = document.createElement("div");

    await renderPropertyArchive(container, store);

    const names = Array.from(container.querySelectorAll(".property-list a")).map((a) => a.textContent);
    expect(names).toEqual(["Archived Site"]);
  });

  it("sorts archived properties oldest-archived-first", async () => {
    const store = new FakeVersionStore([
      noVersionProperty("oo-1", "Newer", true, "2026-08-15T00:00:00Z"),
      noVersionProperty("oo-2", "Older", true, "2026-08-01T00:00:00Z"),
    ]);
    const container = document.createElement("div");

    await renderPropertyArchive(container, store);

    const names = Array.from(container.querySelectorAll(".property-list a")).map((a) => a.textContent);
    expect(names).toEqual(["Older", "Newer"]);
  });

  it("links each entry to its detail page", async () => {
    const store = new FakeVersionStore([noVersionProperty("oo-1", "Archived Site", true, "2026-08-01T00:00:00Z")]);
    const container = document.createElement("div");

    await renderPropertyArchive(container, store);

    const link = container.querySelector(".property-list a");
    expect(link?.getAttribute("href")).toBe("#/property/oo-1");
  });

  it("shows when each property was archived", async () => {
    const store = new FakeVersionStore([noVersionProperty("oo-1", "Archived Site", true, "2026-08-01T00:00:00Z")]);
    const container = document.createElement("div");

    await renderPropertyArchive(container, store);

    expect(container.querySelector(".archived-at")?.textContent).toContain(formatTimestamp("2026-08-01T00:00:00Z"));
  });

  it("links back to the main property list", async () => {
    const store = new FakeVersionStore([]);
    const container = document.createElement("div");

    await renderPropertyArchive(container, store);

    expect(container.querySelector("a[href='#/']")).not.toBeNull();
  });

  it("shows an empty message when there are no archived properties", async () => {
    const store = new FakeVersionStore([noVersionProperty("oo-1", "Active Site")]);
    const container = document.createElement("div");

    await renderPropertyArchive(container, store);

    expect(container.textContent).toContain("No archived properties");
  });

  it("shows an error message when loading fails", async () => {
    const failingStore = createFailingVersionStore({
      listProperties: () => Promise.reject(new Error("network down")),
    });
    const container = document.createElement("div");

    await renderPropertyArchive(container, failingStore);

    expect(container.textContent).toContain("network down");
  });
});
