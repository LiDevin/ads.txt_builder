import { describe, expect, it } from "vitest";
import { renderPropertyDetail } from "./propertyDetail";
import { FakeVersionStore } from "../versionStore/fakeVersionStore";

const property = {
  id: "oo-1",
  name: "Main Site",
  type: "OO" as const,
  versions: [
    {
      ref: "sha-2",
      comment: "Add reseller line",
      author: "Sam",
      timestamp: "2026-08-28T09:00:00Z",
      content: "example.com, 1, DIRECT\nreseller.com, 2, RESELLER",
    },
    {
      ref: "sha-1",
      comment: "Initial version",
      author: "Alex",
      timestamp: "2026-08-27T10:00:00Z",
      content: "example.com, 1, DIRECT",
    },
  ],
};

describe("renderPropertyDetail", () => {
  it("renders the property's name, type, and current content", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    expect(container.querySelector("h1")?.textContent).toBe("Main Site");
    expect(container.textContent).toContain("Owned & Operated");
    expect(container.querySelector("pre")?.textContent).toBe("example.com, 1, DIRECT\nreseller.com, 2, RESELLER");
  });

  it("links back to the property list", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    expect(container.querySelector("a")?.getAttribute("href")).toBe("#/");
  });

  it("shows an error message when the property is missing", async () => {
    const store = new FakeVersionStore([]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "missing");

    expect(container.textContent).toContain("not found");
  });

  it("renders the version history with comment, author, and timestamp per entry", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    const historyItems = container.querySelectorAll(".version-history li");
    expect(historyItems).toHaveLength(2);

    expect(historyItems[0].textContent).toContain("Add reseller line");
    expect(historyItems[0].textContent).toContain("Sam");
    expect(historyItems[0].textContent).toContain("2026-08-28T09:00:00Z");

    expect(historyItems[1].textContent).toContain("Initial version");
    expect(historyItems[1].textContent).toContain("Alex");
    expect(historyItems[1].textContent).toContain("2026-08-27T10:00:00Z");
  });

  it("links each history entry to that specific version", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    const historyLinks = container.querySelectorAll(".version-history a");
    expect(historyLinks[0].getAttribute("href")).toBe("#/property/oo-1/version/sha-2");
    expect(historyLinks[1].getAttribute("href")).toBe("#/property/oo-1/version/sha-1");
  });

  it("shows a past version's content instead of the current version when a versionRef is given", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1", "sha-1");

    expect(container.querySelector("pre")?.textContent).toBe("example.com, 1, DIRECT");
    expect(container.textContent).toContain("past version");
  });

  it("shows an error message when the requested version is missing", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1", "does-not-exist");

    expect(container.textContent).toContain("not found");
  });

  it("shows a Download action for an O&O property's current version, named ads.txt", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    const downloadLink = container.querySelector("a[download]") as HTMLAnchorElement | null;
    expect(downloadLink?.getAttribute("download")).toBe("ads.txt");
    expect(decodeURIComponent(downloadLink!.href.split(",")[1])).toBe(
      "example.com, 1, DIRECT\nreseller.com, 2, RESELLER",
    );
  });

  it("shows a Download action for a Partner property's current version, named from its slugified name", async () => {
    const partnerProperty = {
      id: "partner-1",
      name: "Acme Ad Partner",
      type: "PARTNER" as const,
      versions: [
        { ref: "sha-1", comment: "Initial version", author: "Alex", timestamp: "2026-08-27T10:00:00Z", content: "ourcompany.example, 1, RESELLER" },
      ],
    };
    const store = new FakeVersionStore([partnerProperty]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "partner-1");

    const downloadLink = container.querySelector("a[download]") as HTMLAnchorElement | null;
    expect(downloadLink?.getAttribute("download")).toBe("acme-ad-partner-ads.txt-lines.txt");
    expect(decodeURIComponent(downloadLink!.href.split(",")[1])).toBe("ourcompany.example, 1, RESELLER");
  });

  it("does not show a Download action when viewing a past version", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1", "sha-1");

    expect(container.querySelector("a[download]")).toBeNull();
  });
});
