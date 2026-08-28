import { beforeEach, describe, expect, it } from "vitest";
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
  beforeEach(() => {
    window.location.hash = "";
  });

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

  it("shows a version's name as its primary label, with the comment alongside", async () => {
    const namedProperty = {
      ...property,
      versions: [
        { ref: "sha-2", name: "v2", comment: "Add reseller line", author: "Sam", timestamp: "2026-08-28T09:00:00Z", content: "x" },
      ],
    };
    const store = new FakeVersionStore([namedProperty]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    const historyLink = container.querySelector(".version-history a");
    expect(historyLink?.textContent).toBe("v2");
    expect(container.querySelector(".version-comment")?.textContent).toBe("Add reseller line");
  });

  it("falls back to the timestamp as the label for a version saved before names existed", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    const historyLink = container.querySelector(".version-history a");
    expect(historyLink?.textContent).toBe("2026-08-28T09:00:00Z");
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

  function findButton(container: HTMLElement, text: string): HTMLButtonElement {
    return Array.from(container.querySelectorAll("button")).find((b) => b.textContent === text) as HTMLButtonElement;
  }

  it("shows a Rename action on the current-version view", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    expect(findButton(container, "Rename")).toBeDefined();
  });

  it("places Rename in the same group as Edit and Download, not off by the heading", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    const renameButton = findButton(container, "Rename");
    const editLink = Array.from(container.querySelectorAll("a")).find((a) => a.textContent === "Edit");
    const downloadLink = container.querySelector("a[download]");

    expect(renameButton.parentElement).toBe(editLink?.parentElement);
    expect(renameButton.parentElement).toBe(downloadLink?.parentElement);
  });

  it("styles Edit and Download as buttons", async () => {
    const store = new FakeVersionStore([property]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    const editLink = Array.from(container.querySelectorAll("a")).find((a) => a.textContent === "Edit");
    const downloadLink = container.querySelector("a[download]");
    expect(editLink?.className).toBe("btn");
    expect(downloadLink?.className).toBe("btn");
  });

  it("does not show Rename when viewing a past version", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1", "sha-1");

    expect(findButton(container, "Rename")).toBeUndefined();
  });

  it("clicking Rename reveals an inline input pre-filled with the current name", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Rename").click();

    const nameInput = container.querySelector(".rename-name") as HTMLInputElement;
    expect(nameInput.value).toBe("Main Site");
    expect(findButton(container, "Save")).toBeDefined();
    expect(findButton(container, "Cancel")).toBeDefined();
  });

  it("blocks saving an empty name, without calling renameProperty", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Rename").click();
    const nameInput = container.querySelector(".rename-name") as HTMLInputElement;
    nameInput.value = "   ";
    findButton(container, "Save").click();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("name");
    await expect(store.getProperty("oo-1")).resolves.toMatchObject({ name: "Main Site" });
  });

  it("saving a valid new name calls renameProperty and the page reflects it", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Rename").click();
    const nameInput = container.querySelector(".rename-name") as HTMLInputElement;
    nameInput.value = "Renamed Site";
    findButton(container, "Save").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.querySelector("h1")?.textContent).toBe("Renamed Site");
    await expect(store.getProperty("oo-1")).resolves.toMatchObject({ name: "Renamed Site" });
  });

  it("Cancel reverts to the static heading without renaming", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Rename").click();
    const nameInput = container.querySelector(".rename-name") as HTMLInputElement;
    nameInput.value = "Some Draft Name";
    findButton(container, "Cancel").click();

    expect(container.querySelector(".rename-name")).toBeNull();
    expect(container.querySelector("h1")?.textContent).toBe("Main Site");
    await expect(store.getProperty("oo-1")).resolves.toMatchObject({ name: "Main Site" });
  });

  it("shows an error and keeps the input open when rename fails (e.g. no write access)", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "no-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Rename").click();
    const nameInput = container.querySelector(".rename-name") as HTMLInputElement;
    nameInput.value = "Renamed Site";
    findButton(container, "Save").click();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("write access");
    expect(container.querySelector(".rename-name")).not.toBeNull();
    await expect(store.getProperty("oo-1")).resolves.toMatchObject({ name: "Main Site" });
  });

  it("shows a Delete action in the same group as Rename/Edit/Download", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    const deleteButton = findButton(container, "Delete");
    const editLink = Array.from(container.querySelectorAll("a")).find((a) => a.textContent === "Edit");
    expect(deleteButton).toBeDefined();
    expect(deleteButton.parentElement).toBe(editLink?.parentElement);
  });

  it("does not show Delete when viewing a past version", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1", "sha-1");

    expect(findButton(container, "Delete")).toBeUndefined();
  });

  it("clicking Delete reveals an inline confirmation, without deleting anything yet", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Delete").click();

    expect(container.textContent).toContain("Main Site");
    expect(findButton(container, "Delete")).toBeDefined();
    expect(findButton(container, "Cancel")).toBeDefined();
    await expect(store.getProperty("oo-1")).resolves.toBeDefined();
  });

  it("Cancel in the delete confirmation returns to the normal actions, deleting nothing", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Delete").click();
    findButton(container, "Cancel").click();

    expect(findButton(container, "Rename")).toBeDefined();
    expect(findButton(container, "Delete")).toBeDefined();
    await expect(store.getProperty("oo-1")).resolves.toBeDefined();
  });

  it("confirming delete calls deleteProperty and navigates back to the property list", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Delete").click();
    findButton(container, "Delete").click();
    await Promise.resolve();
    await Promise.resolve();

    expect(window.location.hash).toBe("#/");
    await expect(store.getProperty("oo-1")).rejects.toThrow();
  });

  it("shows an error and keeps the confirmation open when delete fails (e.g. no write access), without navigating away", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "no-write" });
    const container = document.createElement("div");
    await renderPropertyDetail(container, store, "oo-1");

    findButton(container, "Delete").click();
    findButton(container, "Delete").click();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("write access");
    expect(window.location.hash).toBe("");
    expect(findButton(container, "Cancel")).toBeDefined();
    await expect(store.getProperty("oo-1")).resolves.toBeDefined();
  });
});
