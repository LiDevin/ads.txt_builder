import { beforeEach, describe, expect, it } from "vitest";
import { renderPropertyAdd } from "./propertyAdd";
import { FakeVersionStore } from "../versionStore/fakeVersionStore";

function fillForm(container: HTMLElement, name: string, type: "OO" | "PARTNER", content: string): void {
  (container.querySelector(".add-name") as HTMLInputElement).value = name;
  (container.querySelector(".add-type") as HTMLSelectElement).value = type;
  (container.querySelector(".add-content") as HTMLTextAreaElement).value = content;
}

function submit(container: HTMLElement): void {
  const form = container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("renderPropertyAdd", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("renders name, type, and content inputs", () => {
    const store = new FakeVersionStore([], { accessLevel: "can-write" });
    const container = document.createElement("div");

    renderPropertyAdd(container, store);

    expect(container.querySelector(".add-name")).not.toBeNull();
    expect(container.querySelector(".add-type")).not.toBeNull();
    expect(container.querySelector(".add-content")).not.toBeNull();
  });

  it("blocks submission with an error when the name is empty", async () => {
    const store = new FakeVersionStore([], { accessLevel: "can-write" });
    const container = document.createElement("div");
    renderPropertyAdd(container, store);

    fillForm(container, "", "OO", "example.com, 1, DIRECT");
    submit(container);
    await flush();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("name");
    await expect(store.listProperties()).resolves.toHaveLength(0);
  });

  it("blocks submission when the name has no letters or digits to slugify into an id", async () => {
    const store = new FakeVersionStore([], { accessLevel: "can-write" });
    const container = document.createElement("div");
    renderPropertyAdd(container, store);

    fillForm(container, "!!!", "OO", "example.com, 1, DIRECT");
    submit(container);
    await flush();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("letter or number");
    await expect(store.listProperties()).resolves.toHaveLength(0);
  });

  it("creates the property and navigates to its detail page on success", async () => {
    const store = new FakeVersionStore([], { accessLevel: "can-write" });
    const container = document.createElement("div");
    renderPropertyAdd(container, store);

    fillForm(container, "New Partner", "PARTNER", "ourcompany.example, 1, RESELLER");
    submit(container);
    await flush();

    await expect(store.listProperties()).resolves.toContainEqual({
      id: "new-partner",
      name: "New Partner",
      type: "PARTNER",
    });
    await expect(store.getProperty("new-partner")).resolves.toMatchObject({
      content: "ourcompany.example, 1, RESELLER",
    });
    expect(window.location.hash).toBe("#/property/new-partner");
  });

  it("shows an error and does not navigate when creation fails (e.g. no write access)", async () => {
    const store = new FakeVersionStore([], { accessLevel: "no-write" });
    const container = document.createElement("div");
    renderPropertyAdd(container, store);

    fillForm(container, "New Partner", "PARTNER", "content");
    submit(container);
    await flush();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("write access");
    expect(window.location.hash).toBe("");
    await expect(store.listProperties()).resolves.toHaveLength(0);
  });
});
