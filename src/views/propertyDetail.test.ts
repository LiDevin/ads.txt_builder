import { describe, expect, it } from "vitest";
import { renderPropertyDetail } from "./propertyDetail";
import { FakeVersionStore } from "../versionStore/fakeVersionStore";

describe("renderPropertyDetail", () => {
  it("renders the property's name, type, and current content", async () => {
    const store = new FakeVersionStore([
      { id: "oo-1", name: "Main Site", type: "OO", content: "example.com, 123, DIRECT" },
    ]);
    const container = document.createElement("div");

    await renderPropertyDetail(container, store, "oo-1");

    expect(container.querySelector("h1")?.textContent).toBe("Main Site");
    expect(container.textContent).toContain("Owned & Operated");
    expect(container.querySelector("pre")?.textContent).toBe("example.com, 123, DIRECT");
  });

  it("links back to the property list", async () => {
    const store = new FakeVersionStore([{ id: "oo-1", name: "Main Site", type: "OO", content: "" }]);
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
});
