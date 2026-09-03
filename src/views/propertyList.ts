import type { PropertySummary, PropertyType, VersionStore } from "../versionStore/types";
import { appendLink } from "./domHelpers";
import { propertyHash } from "./routes";
import { propertyTypeLabel } from "./propertyTypeLabel";
import { tryLoad } from "./tryLoad";

const COLUMN_TYPES: PropertyType[] = ["OO", "PARTNER"];

export async function renderPropertyList(container: HTMLElement, store: VersionStore): Promise<void> {
  container.innerHTML = "<p>Loading properties…</p>";

  const properties = await tryLoad(container, () => store.listProperties(), "Failed to load properties");
  if (!properties) {
    return;
  }

  container.innerHTML = "";
  appendLink(container, "#/add", "Add a new property", { className: "btn" });

  const columns = document.createElement("div");
  columns.className = "property-columns";
  container.appendChild(columns);

  for (const type of COLUMN_TYPES) {
    appendColumn(columns, type, properties);
  }
}

function appendColumn(parent: HTMLElement, type: PropertyType, properties: PropertySummary[]): void {
  const column = document.createElement("div");
  column.className = "property-column";

  const heading = document.createElement("h2");
  heading.textContent = propertyTypeLabel(type);
  column.appendChild(heading);

  const columnProperties = properties
    .filter((property) => property.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (columnProperties.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = `No ${propertyTypeLabel(type)} properties yet.`;
    column.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "property-list";

    for (const property of columnProperties) {
      const item = document.createElement("li");
      appendLink(item, propertyHash(property.id), property.name);
      list.appendChild(item);
    }

    column.appendChild(list);
  }

  parent.appendChild(column);
}
