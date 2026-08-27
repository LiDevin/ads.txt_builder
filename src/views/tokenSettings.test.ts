import { beforeEach, describe, expect, it } from "vitest";
import { renderTokenSettings } from "./tokenSettings";
import { FakeVersionStore } from "../versionStore/fakeVersionStore";
import { createFailingVersionStore } from "../versionStore/testHelpers";
import { clearToken, loadToken, saveToken } from "../auth/tokenStore";

function submitForm(container: HTMLElement, tokenValue: string): void {
  const input = container.querySelector("input") as HTMLInputElement;
  input.value = tokenValue;
  const form = container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

describe("renderTokenSettings", () => {
  beforeEach(() => {
    clearToken();
  });

  it("pre-fills the input with a previously saved token", async () => {
    saveToken("existing-token");
    const store = new FakeVersionStore([], { accessLevel: "can-write" });
    const container = document.createElement("div");

    await renderTokenSettings(container, store);

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("existing-token");
  });

  it("checks access on load when a token is already saved, without requiring re-entry", async () => {
    saveToken("existing-token");
    const store = new FakeVersionStore([], { accessLevel: "can-write" });
    const container = document.createElement("div");

    await renderTokenSettings(container, store);

    expect(store.lastToken).toBe("existing-token");
    expect(container.textContent).toContain("can save changes");
  });

  it("shows 'no token saved' when nothing is stored yet", async () => {
    const store = new FakeVersionStore([]);
    const container = document.createElement("div");

    await renderTokenSettings(container, store);

    expect(container.textContent).toContain("No token saved");
  });

  it("saving a token persists it, passes it to the store, and shows a can-write result", async () => {
    const store = new FakeVersionStore([], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderTokenSettings(container, store);

    submitForm(container, "new-token");
    await Promise.resolve();
    await Promise.resolve();

    expect(loadToken()).toBe("new-token");
    expect(store.lastToken).toBe("new-token");
    expect(container.textContent).toContain("can save changes");
  });

  it("reports a no-write token distinctly from a can-write one", async () => {
    const store = new FakeVersionStore([], { accessLevel: "no-write" });
    const container = document.createElement("div");
    await renderTokenSettings(container, store);

    submitForm(container, "read-only-token");
    await Promise.resolve();
    await Promise.resolve();

    expect(container.textContent).toContain("does not grant write access");
  });

  it("reports an invalid token distinctly from a no-write token", async () => {
    const store = new FakeVersionStore([], { accessLevel: "invalid-token" });
    const container = document.createElement("div");
    await renderTokenSettings(container, store);

    submitForm(container, "bad-token");
    await Promise.resolve();
    await Promise.resolve();

    expect(container.textContent).toContain("invalid or expired");
    expect(container.textContent).not.toContain("does not grant write access");
  });

  it("clears the saved token and status when Clear is pressed", async () => {
    saveToken("existing-token");
    const store = new FakeVersionStore([], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderTokenSettings(container, store);

    const clearButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Clear",
    ) as HTMLButtonElement;
    clearButton.click();

    expect(loadToken()).toBeNull();
    expect(store.lastToken).toBeNull();
    expect(container.textContent).toContain("No token saved");
  });

  it("shows an error message when the access check fails unexpectedly", async () => {
    const failingStore = createFailingVersionStore({
      checkAccess: () => Promise.reject(new Error("network down")),
    });
    const container = document.createElement("div");
    await renderTokenSettings(container, failingStore);

    submitForm(container, "any-token");
    await Promise.resolve();
    await Promise.resolve();

    expect(container.textContent).toContain("network down");
  });
});
