import type { VersionStore } from "../versionStore/types";
import { appendLink } from "./domHelpers";
import { formatTimestamp } from "./formatTimestamp";
import { propertyHash } from "./routes";
import { tryLoad } from "./tryLoad";

export async function renderPropertyArchive(container: HTMLElement, store: VersionStore): Promise<void> {
  container.innerHTML = "<p>Loading archived properties…</p>";

  const properties = await tryLoad(container, () => store.listProperties(), "Failed to load properties");
  if (!properties) {
    return;
  }

  container.innerHTML = "";

  appendLink(container, "#/", "← Back to properties");

  const heading = document.createElement("h1");
  heading.textContent = "Archived properties";
  container.appendChild(heading);

  const archivedProperties = properties
    .filter((property) => property.archived)
    .sort((a, b) => (a.archivedAt ?? "").localeCompare(b.archivedAt ?? ""));

  if (archivedProperties.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No archived properties.";
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "property-list";

  for (const property of archivedProperties) {
    const item = document.createElement("li");
    appendLink(item, propertyHash(property.id), property.name);

    const archivedAt = document.createElement("span");
    archivedAt.className = "archived-at";
    archivedAt.textContent = property.archivedAt ? `Archived ${formatTimestamp(property.archivedAt)}` : "";
    item.appendChild(archivedAt);

    list.appendChild(item);
  }

  container.appendChild(list);
}
