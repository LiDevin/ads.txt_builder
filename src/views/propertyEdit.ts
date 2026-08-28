import { CONFLICT_MESSAGE, SaveConflictError, type VersionStore } from "../versionStore/types";
import { appendButton, appendLink } from "./domHelpers";
import { diffLines } from "./diffLines";
import { propertyHash } from "./routes";
import { tryLoad } from "./tryLoad";

export async function renderPropertyEdit(container: HTMLElement, store: VersionStore, propertyId: string): Promise<void> {
  container.innerHTML = "<p>Loading property…</p>";

  const property = await tryLoad(container, () => store.getProperty(propertyId), "Failed to load property");
  if (!property) {
    return;
  }

  const originalContent = property.content;
  const baseVersion = property.baseVersion;

  container.innerHTML = "";

  appendLink(container, propertyHash(propertyId), "← Cancel");

  const heading = document.createElement("h1");
  heading.textContent = `Edit ${property.name}`;
  container.appendChild(heading);

  const form = document.createElement("form");

  const textarea = document.createElement("textarea");
  textarea.className = "edit-content";
  textarea.value = originalContent;
  form.appendChild(textarea);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "edit-version-name";
  nameInput.placeholder = "Version name (e.g. v1.2 or Q3 update)";
  form.appendChild(nameInput);

  const commentInput = document.createElement("input");
  commentInput.type = "text";
  commentInput.className = "edit-comment";
  commentInput.placeholder = "Describe this change";
  form.appendChild(commentInput);

  appendButton(form, "Save", { type: "submit" });

  container.appendChild(form);

  const errorMessage = document.createElement("p");
  errorMessage.setAttribute("role", "alert");
  container.appendChild(errorMessage);

  const reviewSection = document.createElement("div");
  reviewSection.className = "edit-review";
  container.appendChild(reviewSection);

  function appendDiff(target: HTMLElement, before: string, after: string): void {
    const diff = document.createElement("div");
    diff.className = "diff";
    for (const line of diffLines(before, after)) {
      const lineEl = document.createElement("div");
      lineEl.className = `diff-line diff-${line.type}`;
      lineEl.textContent = line.text;
      diff.appendChild(lineEl);
    }
    target.appendChild(diff);
  }

  function renderDiff(): void {
    reviewSection.innerHTML = "";

    appendDiff(reviewSection, originalContent, textarea.value);

    appendButton(reviewSection, "Confirm save", { onClick: () => void confirmSave() });
    appendButton(reviewSection, "Back to editing", {
      onClick: () => {
        reviewSection.innerHTML = "";
      },
    });
  }

  async function showConflict(): Promise<void> {
    const latest = await tryLoad(reviewSection, () => store.getProperty(propertyId), "Failed to load the latest version");
    if (!latest) {
      return;
    }

    reviewSection.innerHTML = "";
    errorMessage.textContent = `${CONFLICT_MESSAGE}. Here's what changed:`;
    appendDiff(reviewSection, originalContent, latest.content);
  }

  async function confirmSave(): Promise<void> {
    errorMessage.textContent = "";
    try {
      await store.saveVersion(propertyId, textarea.value, nameInput.value, commentInput.value, baseVersion);
    } catch (error) {
      if (error instanceof SaveConflictError) {
        await showConflict();
        return;
      }
      errorMessage.textContent = `Failed to save: ${(error as Error).message}`;
      return;
    }
    window.location.hash = propertyHash(propertyId);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    reviewSection.innerHTML = "";

    if (!nameInput.value.trim()) {
      errorMessage.textContent = "A version name is required before saving.";
      return;
    }
    if (!commentInput.value.trim()) {
      errorMessage.textContent = "A comment is required before saving.";
      return;
    }

    renderDiff();
  });
}
