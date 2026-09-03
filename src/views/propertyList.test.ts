import { describe, expect, it } from "vitest";
import { renderPropertyList } from "./propertyList";
import { FakeVersionStore } from "../versionStore/fakeVersionStore";
import { createFailingVersionStore } from "../versionStore/testHelpers";

function noVersionProperty(id: string, name: string, type: "OO" | "PARTNER", archived?: boolean) {
  return { id, name, type, archived, versions: [{ ref: "sha-1", comment: "", author: "", timestamp: "", content: "" }] };
}

function findColumn(container: HTMLElement, heading: string): HTMLElement {
  return Array.from(container.querySelectorAll(".property-column")).find(
    (column) => column.querySelector("h2")?.textContent === heading,
  ) as HTMLElement;
}

describe("renderPropertyList", () => {
  it("places the O&O column first (left) and the Partner column second (right)", async () => {
    const store = new FakeVersionStore([]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    const headings = Array.from(container.querySelectorAll(".property-column h2")).map((h) => h.textContent);
    expect(headings).toEqual(["Owned & Operated", "Partner"]);
  });

  it("splits properties into an O&O column and a Partner column", async () => {
    const store = new FakeVersionStore([
      noVersionProperty("oo-1", "Main Site", "OO"),
      noVersionProperty("partner-1", "Acme Partner", "PARTNER"),
    ]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    const ooColumn = findColumn(container, "Owned & Operated");
    const partnerColumn = findColumn(container, "Partner");
    expect(ooColumn.querySelector("a")?.textContent).toBe("Main Site");
    expect(ooColumn.querySelector("a")?.getAttribute("href")).toBe("#/property/oo-1");
    expect(partnerColumn.querySelector("a")?.textContent).toBe("Acme Partner");
    expect(partnerColumn.querySelector("a")?.getAttribute("href")).toBe("#/property/partner-1");
  });

  it("no longer shows a per-item type badge, since the column already conveys type", async () => {
    const store = new FakeVersionStore([noVersionProperty("oo-1", "Main Site", "OO")]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    expect(container.querySelector(".property-type-badge")).toBeNull();
  });

  it("sorts each column alphabetically by name", async () => {
    const store = new FakeVersionStore([
      noVersionProperty("oo-2", "Zebra Site", "OO"),
      noVersionProperty("oo-1", "acme Site", "OO"),
      noVersionProperty("oo-3", "Beta Site", "OO"),
    ]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    const names = Array.from(findColumn(container, "Owned & Operated").querySelectorAll("a")).map((a) => a.textContent);
    expect(names).toEqual(["acme Site", "Beta Site", "Zebra Site"]);
  });

  it("shows a per-column empty message when a column has no properties", async () => {
    const store = new FakeVersionStore([noVersionProperty("oo-1", "Main Site", "OO")]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    expect(findColumn(container, "Partner").textContent).toContain("No Partner properties yet");
    expect(findColumn(container, "Owned & Operated").querySelector("p")).toBeNull();
  });

  it("shows both columns' empty messages when there are no properties at all", async () => {
    const store = new FakeVersionStore([]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    expect(findColumn(container, "Owned & Operated").textContent).toContain("No Owned & Operated properties yet");
    expect(findColumn(container, "Partner").textContent).toContain("No Partner properties yet");
  });

  it("links to the add-property form with a single shared button above both columns", async () => {
    const store = new FakeVersionStore([]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    const addLink = Array.from(container.querySelectorAll("a")).find((a) => a.getAttribute("href") === "#/add");
    expect(addLink?.textContent).toContain("Add");
    expect(addLink?.className).toBe("btn");
    expect(container.querySelectorAll("a[href='#/add']")).toHaveLength(1);
  });

  it("excludes archived properties from the main columns", async () => {
    const store = new FakeVersionStore([
      noVersionProperty("oo-1", "Active Site", "OO"),
      noVersionProperty("oo-2", "Archived Site", "OO", true),
    ]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    const names = Array.from(findColumn(container, "Owned & Operated").querySelectorAll("a")).map((a) => a.textContent);
    expect(names).toEqual(["Active Site"]);
  });

  it("shows an error message when loading fails", async () => {
    const failingStore = createFailingVersionStore({
      listProperties: () => Promise.reject(new Error("network down")),
    });
    const container = document.createElement("div");

    await renderPropertyList(container, failingStore);

    expect(container.textContent).toContain("network down");
  });
});
