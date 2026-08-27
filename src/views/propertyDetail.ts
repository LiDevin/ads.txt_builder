import type { VersionStore } from "../versionStore/types";
import { propertyTypeLabel } from "./propertyTypeLabel";
import { tryLoad } from "./tryLoad";

function propertyHash(propertyId: string): string {
  return `#/property/${encodeURIComponent(propertyId)}`;
}

function versionHash(propertyId: string, versionRef: string): string {
  return `${propertyHash(propertyId)}/version/${encodeURIComponent(versionRef)}`;
}

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

  const backLink = document.createElement("a");
  backLink.href = "#/";
  backLink.textContent = "← Back to properties";
  container.appendChild(backLink);

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

    const currentLink = document.createElement("a");
    currentLink.href = propertyHash(propertyId);
    currentLink.textContent = "View current version";
    container.appendChild(currentLink);
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

    const link = document.createElement("a");
    link.href = versionHash(propertyId, version.ref);
    link.textContent = version.timestamp;
    item.appendChild(link);

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
