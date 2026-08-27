import type { VersionStore } from "../versionStore/types";
import { propertyTypeLabel } from "./propertyTypeLabel";

export async function renderPropertyDetail(
  container: HTMLElement,
  store: VersionStore,
  propertyId: string,
): Promise<void> {
  container.innerHTML = "<p>Loading property…</p>";

  let property;
  try {
    property = await store.getProperty(propertyId);
  } catch (error) {
    container.innerHTML = `<p role="alert">Failed to load property: ${(error as Error).message}</p>`;
    return;
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

  const content = document.createElement("pre");
  content.className = "property-content";
  content.textContent = property.content;
  container.appendChild(content);
}
