import type { VersionStore } from "../versionStore/types";
import { appendButton, appendLink } from "./domHelpers";
import { downloadFilename, toDownloadHref } from "./download";
import { formatTimestamp } from "./formatTimestamp";
import { propertyTypeLabel } from "./propertyTypeLabel";
import { eligibleForPermanentDeletionAt, isEligibleForPermanentDeletion } from "./retentionPolicy";
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
    if (property.archived) {
      const notice = document.createElement("p");
      notice.textContent = "This property is archived.";
      container.appendChild(notice);
    }

    const actionsArea = document.createElement("div");
    container.appendChild(actionsArea);

    function renderActions(): void {
      actionsArea.innerHTML = "";

      if (property.archived) {
        renderArchivedActions();
      } else {
        renderActiveActions();
      }
    }

    function appendDownloadLink(): void {
      appendLink(actionsArea, toDownloadHref(property.content), "Download .txt", {
        download: downloadFilename(property),
        className: "btn",
      });
    }

    function renderActiveActions(): void {
      appendButton(actionsArea, "Rename", { onClick: renderRenameForm });
      appendLink(actionsArea, editHash(propertyId), "Edit", { className: "btn" });
      appendDownloadLink();
      appendButton(actionsArea, "Archive", { onClick: renderArchiveConfirm });
    }

    function renderArchivedActions(): void {
      appendDownloadLink();

      const errorMessage = document.createElement("p");
      errorMessage.setAttribute("role", "alert");

      appendButton(actionsArea, "Restore", { onClick: () => void handleRestore(errorMessage) });

      // archivedAt is always set alongside archived by both stores, but the
      // type keeps it optional since old data predates archiving entirely.
      const eligible = property.archivedAt ? isEligibleForPermanentDeletion(property.archivedAt) : false;
      const permanentlyDeleteButton = appendButton(actionsArea, "Permanently delete", {
        onClick: renderPermanentlyDeleteConfirm,
      });
      permanentlyDeleteButton.disabled = !eligible;

      if (property.archivedAt) {
        const eligibleDate = document.createElement("span");
        eligibleDate.className = "eligible-date";
        eligibleDate.textContent = eligible
          ? "Eligible for permanent deletion now."
          : `Eligible for permanent deletion after ${formatTimestamp(eligibleForPermanentDeletionAt(property.archivedAt))}.`;
        actionsArea.appendChild(eligibleDate);
      }

      actionsArea.appendChild(errorMessage);
    }

    async function handleRestore(errorMessage: HTMLElement): Promise<void> {
      errorMessage.textContent = "";
      try {
        await store.restoreProperty(propertyId);
      } catch (error) {
        errorMessage.textContent = `Failed to restore: ${(error as Error).message}`;
        return;
      }
      window.location.hash = "#/";
    }

    function renderPermanentlyDeleteConfirm(): void {
      actionsArea.innerHTML = "";

      const confirmMessage = document.createElement("span");
      confirmMessage.textContent = `Permanently delete "${property.name}"? This cannot be undone.`;
      actionsArea.appendChild(confirmMessage);

      const errorMessage = document.createElement("p");
      errorMessage.setAttribute("role", "alert");

      appendButton(actionsArea, "Permanently delete", {
        onClick: () => void handlePermanentlyDeleteConfirm(errorMessage),
      });
      appendButton(actionsArea, "Cancel", { onClick: renderActions });

      actionsArea.appendChild(errorMessage);
    }

    async function handlePermanentlyDeleteConfirm(errorMessage: HTMLElement): Promise<void> {
      errorMessage.textContent = "";
      try {
        await store.permanentlyDeleteProperty(propertyId);
      } catch (error) {
        errorMessage.textContent = `Failed to permanently delete: ${(error as Error).message}`;
        return;
      }
      window.location.hash = "#/archived";
    }

    function renderRenameForm(): void {
      actionsArea.innerHTML = "";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "rename-name";
      nameInput.value = property.name;
      actionsArea.appendChild(nameInput);

      const errorMessage = document.createElement("p");
      errorMessage.setAttribute("role", "alert");

      appendButton(actionsArea, "Save", { onClick: () => void handleRenameSave(nameInput, errorMessage) });
      appendButton(actionsArea, "Cancel", { onClick: renderActions });

      actionsArea.appendChild(errorMessage);
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

    function renderArchiveConfirm(): void {
      actionsArea.innerHTML = "";

      const confirmMessage = document.createElement("span");
      confirmMessage.textContent = `Archive "${property.name}"? You can restore it later from the Archived page.`;
      actionsArea.appendChild(confirmMessage);

      const errorMessage = document.createElement("p");
      errorMessage.setAttribute("role", "alert");

      appendButton(actionsArea, "Archive", { onClick: () => void handleArchiveConfirm(errorMessage) });
      appendButton(actionsArea, "Cancel", { onClick: renderActions });

      actionsArea.appendChild(errorMessage);
    }

    async function handleArchiveConfirm(errorMessage: HTMLElement): Promise<void> {
      errorMessage.textContent = "";
      try {
        await store.archiveProperty(propertyId);
      } catch (error) {
        errorMessage.textContent = `Failed to archive: ${(error as Error).message}`;
        return;
      }
      window.location.hash = "#/";
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

    const formattedTimestamp = formatTimestamp(version.timestamp);
    appendLink(item, versionHash(propertyId, version.ref), version.name ?? formattedTimestamp);

    // When a version has a name, the name takes the primary label spot above,
    // so the timestamp needs its own element to stay visible; an unnamed
    // version already shows it as that label, so it isn't duplicated here.
    if (version.name) {
      const timestamp = document.createElement("span");
      timestamp.className = "version-timestamp";
      timestamp.textContent = formattedTimestamp;
      item.appendChild(timestamp);
    }

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
