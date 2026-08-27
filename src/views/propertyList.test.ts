import { describe, expect, it } from "vitest";
import { renderPropertyList } from "./propertyList";
import { FakeVersionStore } from "../versionStore/fakeVersionStore";

describe("renderPropertyList", () => {
  it("renders a link and type label for each property", async () => {
    const store = new FakeVersionStore([
      { id: "oo-1", name: "Main Site", type: "OO", content: "" },
      { id: "partner-1", name: "Acme Partner", type: "PARTNER", content: "" },
    ]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe("Main Site");
    expect(links[0].getAttribute("href")).toBe("#/property/oo-1");
    expect(links[1].getAttribute("href")).toBe("#/property/partner-1");
    expect(container.textContent).toContain("Owned & Operated");
    expect(container.textContent).toContain("Partner");
  });

  it("shows a message when there are no properties", async () => {
    const store = new FakeVersionStore([]);
    const container = document.createElement("div");

    await renderPropertyList(container, store);

    expect(container.textContent).toContain("No properties tracked yet");
  });

  it("shows an error message when loading fails", async () => {
    const failingStore = {
      listProperties: () => Promise.reject(new Error("network down")),
      getProperty: () => Promise.reject(new Error("not used")),
    };
    const container = document.createElement("div");

    await renderPropertyList(container, failingStore);

    expect(container.textContent).toContain("network down");
  });
});
