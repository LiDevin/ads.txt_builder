import { beforeEach, describe, expect, it } from "vitest";
import { renderPropertyEdit } from "./propertyEdit";
import { FakeVersionStore } from "../versionStore/fakeVersionStore";

const property = {
  id: "oo-1",
  name: "Main Site",
  type: "OO" as const,
  versions: [
    { ref: "sha-1", comment: "Initial version", author: "Alex", timestamp: "2026-08-27T10:00:00Z", content: "example.com, 1, DIRECT" },
  ],
};

function setContentAndComment(container: HTMLElement, content: string, comment: string): void {
  setContentNameAndComment(container, content, "v2", comment);
}

function setContentNameAndComment(container: HTMLElement, content: string, name: string, comment: string): void {
  const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
  textarea.value = content;
  const nameInput = container.querySelector(".edit-version-name") as HTMLInputElement;
  nameInput.value = name;
  const commentInput = container.querySelector(".edit-comment") as HTMLInputElement;
  commentInput.value = comment;
}

function submit(container: HTMLElement): void {
  const form = container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

function editTextarea(container: HTMLElement, content: string): void {
  const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
  textarea.value = content;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function editComment(container: HTMLElement, comment: string): void {
  const commentInput = container.querySelector(".edit-comment") as HTMLInputElement;
  commentInput.value = comment;
  commentInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function editVersionName(container: HTMLElement, name: string): void {
  const nameInput = container.querySelector(".edit-version-name") as HTMLInputElement;
  nameInput.value = name;
  nameInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function reviewBoxIsVisible(container: HTMLElement): boolean {
  return container.querySelector(".edit-review")?.children.length !== 0;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("renderPropertyEdit", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("renders a textarea pre-filled with the current content", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");

    await renderPropertyEdit(container, store, "oo-1");

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("example.com, 1, DIRECT");
  });

  it("blocks saving without a version name, showing an error and no diff", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentNameAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "", "A comment");
    submit(container);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("version name");
    expect(container.querySelectorAll(".diff-line")).toHaveLength(0);

    await expect(store.getProperty("oo-1")).resolves.toMatchObject({ content: "example.com, 1, DIRECT" });
  });

  it("blocks saving without a comment, showing an error and no diff", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "");
    submit(container);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("comment");
    expect(container.querySelectorAll(".diff-line")).toHaveLength(0);

    await expect(store.getProperty("oo-1")).resolves.toMatchObject({ content: "example.com, 1, DIRECT" });
  });

  it("shows a line-by-line diff before confirming, given a valid comment", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "Add new partner");
    submit(container);

    const diffLines = container.querySelectorAll(".diff-line");
    expect(Array.from(diffLines).map((el) => el.textContent)).toEqual([
      "example.com, 1, DIRECT",
      "new.com, 2, RESELLER",
    ]);
    expect(container.querySelector(".diff-unchanged")?.textContent).toBe("example.com, 1, DIRECT");
    expect(container.querySelector(".diff-added")?.textContent).toBe("new.com, 2, RESELLER");

    expect(Array.from(container.querySelectorAll("button")).some((b) => b.textContent === "Confirm save")).toBe(true);
  });

  it("confirming the save calls saveVersion and navigates back to the property", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "Add new partner");
    submit(container);

    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Confirm save",
    ) as HTMLButtonElement;
    confirmButton.click();
    await flush();

    await expect(store.getProperty("oo-1")).resolves.toMatchObject({
      content: "example.com, 1, DIRECT\nnew.com, 2, RESELLER",
    });
    await expect(store.listVersions("oo-1")).resolves.toEqual([
      expect.objectContaining({ name: "v2", comment: "Add new partner" }),
      expect.objectContaining({ comment: "Initial version" }),
    ]);
    expect(window.location.hash).toBe("#/property/oo-1");
  });

  it("rejects the save when the token has no write access, without discarding the edit", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "no-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "Add new partner");
    submit(container);

    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Confirm save",
    ) as HTMLButtonElement;
    confirmButton.click();
    await flush();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("write access");
    expect(window.location.hash).toBe("");
    await expect(store.getProperty("oo-1")).resolves.toMatchObject({ content: "example.com, 1, DIRECT" });

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("example.com, 1, DIRECT\nnew.com, 2, RESELLER");
  });

  it("returns to editing without losing the draft when Back to editing is clicked", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "Add new partner");
    submit(container);

    const backButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Back to editing",
    ) as HTMLButtonElement;
    backButton.click();

    expect(container.querySelectorAll(".diff-line")).toHaveLength(0);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("example.com, 1, DIRECT\nnew.com, 2, RESELLER");
  });

  it("shows a conflict notice and diff against the newer version instead of a generic error", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    // Someone else saves a newer version while this editor session is still open.
    await store.saveVersion(
      "oo-1",
      "example.com, 1, DIRECT\nother-editor.com, 9, RESELLER",
      "v2",
      "Someone else's edit",
      "sha-1",
    );

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "My edit");
    submit(container);

    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Confirm save",
    ) as HTMLButtonElement;
    confirmButton.click();
    await flush();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("changed since you started editing");
    expect(container.textContent).toContain("other-editor.com, 9, RESELLER");
    expect(window.location.hash).toBe("");

    // The other editor's save is unaffected — still the current content.
    await expect(store.getProperty("oo-1")).resolves.toMatchObject({
      content: "example.com, 1, DIRECT\nother-editor.com, 9, RESELLER",
    });
  });

  it("hides the whole review box when the content is edited again after Save shows it", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "Add new partner");
    submit(container);
    expect(reviewBoxIsVisible(container)).toBe(true);

    editTextarea(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER\nthird.com, 3, RESELLER");

    expect(reviewBoxIsVisible(container)).toBe(false);
    expect(container.querySelectorAll(".diff-line")).toHaveLength(0);
    expect(Array.from(container.querySelectorAll("button")).some((b) => b.textContent === "Confirm save")).toBe(
      false,
    );
  });

  it("hides the whole review box when the version name is edited again after Save shows it", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "Add new partner");
    submit(container);
    expect(reviewBoxIsVisible(container)).toBe(true);

    editVersionName(container, "v3");

    expect(reviewBoxIsVisible(container)).toBe(false);
  });

  it("hides the whole review box when the comment is edited again after Save shows it", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "Add new partner");
    submit(container);
    expect(reviewBoxIsVisible(container)).toBe(true);

    editComment(container, "Add new partner, take two");

    expect(reviewBoxIsVisible(container)).toBe(false);
  });

  it("shows a fresh diff reflecting the latest edit when Save is clicked again after a post-review edit", async () => {
    const store = new FakeVersionStore([property], { accessLevel: "can-write" });
    const container = document.createElement("div");
    await renderPropertyEdit(container, store, "oo-1");

    setContentAndComment(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER", "Add new partner");
    submit(container);

    editTextarea(container, "example.com, 1, DIRECT\nnew.com, 2, RESELLER\nthird.com, 3, RESELLER");
    submit(container);

    const diffLines = container.querySelectorAll(".diff-line");
    expect(Array.from(diffLines).map((el) => el.textContent)).toEqual([
      "example.com, 1, DIRECT",
      "new.com, 2, RESELLER",
      "third.com, 3, RESELLER",
    ]);
  });

  it("shows an error message when the property fails to load", async () => {
    const store = new FakeVersionStore([]);
    const container = document.createElement("div");

    await renderPropertyEdit(container, store, "missing");

    expect(container.textContent).toContain("not found");
  });
});
