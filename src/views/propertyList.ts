import type { VersionStore } from "../versionStore/types";
import { propertyTypeLabel } from "./propertyTypeLabel";
import { tryLoad } from "./tryLoad";

export async function renderPropertyList(container: HTMLElement, store: VersionStore): Promise<void> {
  container.innerHTML = "<p>Loading properties…</p>";

  const properties = await tryLoad(container, () => store.listProperties(), "Failed to load properties");
  if (!properties) {
    return;
  }

  if (properties.length === 0) {
    container.innerHTML = "<p>No properties tracked yet.</p>";
    return;
  }

  const list = document.createElement("ul");
  list.className = "property-list";

  for (const property of properties) {
    const item = document.createElement("li");

    const link = document.createElement("a");
    link.href = `#/property/${encodeURIComponent(property.id)}`;
    link.textContent = property.name;
    item.appendChild(link);

    const badge = document.createElement("span");
    badge.className = "property-type-badge";
    badge.textContent = propertyTypeLabel(property.type);
    item.appendChild(badge);

    list.appendChild(item);
  }

  container.innerHTML = "";
  container.appendChild(list);
}
