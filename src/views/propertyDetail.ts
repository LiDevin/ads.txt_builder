import type { VersionStore } from "../versionStore/types";
import { appendLink } from "./domHelpers";
import { downloadFilename, toDownloadHref } from "./download";
import { propertyTypeLabel } from "./propertyTypeLabel";
import { editHash, propertyHash, versionHash } from "./routes";
import { tryLoad } from "./tryLoad";

export async function renderPropertyDetail(
  container: HTMLElement,
  store: VersionStore,
  propertyId: string,
  versionRef?: string,
): Promise<void> {
  container.innerHTML = "<p>Loading property…</p>";

  const loaded = await tryLoad(
    container,
    () => Promise.all([store.getProperty(propertyId), store.listVersions(propertyId)]),
    "Failed to load property",
  );
  if (!loaded) {
    return;
  }
  const [property, versions] = loaded;

  let displayedContent = property.content;

  if (versionRef) {
    const version = await tryLoad(container, () => store.getVersion(propertyId, versionRef), "Failed to load version");
    if (!version) {
      return;
    }
    displayedContent = version.content;
  }

  container.innerHTML = "";

  appendLink(container, "#/", "← Back to properties");

  const heading = document.createElement("h1");
  heading.textContent = property.name;
  container.appendChild(heading);

  const typeLabel = document.createElement("p");
  typeLabel.className = "property-type-badge";
  typeLabel.textContent = propertyTypeLabel(property.type);
  container.appendChild(typeLabel);

  if (versionRef) {
    const notice = document.createElement("p");
    notice.textContent = "Viewing a past version.";
    container.appendChild(notice);

    appendLink(container, propertyHash(propertyId), "View current version");
  } else {
    const actionsArea = document.createElement("div");
    container.appendChild(actionsArea);

    function renderActions(): void {
      actionsArea.innerHTML = "";

      const renameButton = document.createElement("button");
      renameButton.type = "button";
      renameButton.className = "btn";
      renameButton.textContent = "Rename";
      renameButton.addEventListener("click", renderRenameForm);
      actionsArea.appendChild(renameButton);

      appendLink(actionsArea, editHash(propertyId), "Edit", { className: "btn" });
      appendLink(actionsArea, toDownloadHref(property.content), "Download .txt", {
        download: downloadFilename(property),
        className: "btn",
      });
    }

    function renderRenameForm(): void {
      actionsArea.innerHTML = "";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "rename-name";
      nameInput.value = property.name;
      actionsArea.appendChild(nameInput);

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "btn";
      saveButton.textContent = "Save";
      actionsArea.appendChild(saveButton);

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "btn";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", renderActions);
      actionsArea.appendChild(cancelButton);

      const errorMessage = document.createElement("p");
      errorMessage.setAttribute("role", "alert");
      actionsArea.appendChild(errorMessage);

      saveButton.addEventListener("click", () => {
        void handleRenameSave(nameInput, errorMessage);
      });
    }

    async function handleRenameSave(nameInput: HTMLInputElement, errorMessage: HTMLElement): Promise<void> {
      errorMessage.textContent = "";
      const newName = nameInput.value.trim();
      if (!newName) {
        errorMessage.textContent = "A display name is required.";
        return;
      }

      try {
        await store.renameProperty(propertyId, newName);
      } catch (error) {
        errorMessage.textContent = `Failed to rename: ${(error as Error).message}`;
        return;
      }

      await renderPropertyDetail(container, store, propertyId, versionRef);
    }

    renderActions();
  }

  const content = document.createElement("pre");
  content.className = "property-content";
  content.textContent = displayedContent;
  container.appendChild(content);

  const historyHeading = document.createElement("h2");
  historyHeading.textContent = "Version history";
  container.appendChild(historyHeading);

  const historyList = document.createElement("ul");
  historyList.className = "version-history";

  for (const version of versions) {
    const item = document.createElement("li");

    appendLink(item, versionHash(propertyId, version.ref), version.timestamp);

    const comment = document.createElement("span");
    comment.className = "version-comment";
    comment.textContent = version.comment;
    item.appendChild(comment);

    const author = document.createElement("span");
    author.className = "version-author";
    author.textContent = version.author;
    item.appendChild(author);

    historyList.appendChild(item);
  }

  container.appendChild(historyList);
}
