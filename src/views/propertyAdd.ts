import type { PropertyType, VersionStore } from "../versionStore/types";
import { appendLink } from "./domHelpers";
import { propertyHash } from "./routes";
import { slugify } from "./slugify";
import { TYPE_LABELS } from "./propertyTypeLabel";

export function renderPropertyAdd(container: HTMLElement, store: VersionStore): void {
  container.innerHTML = "";

  appendLink(container, "#/", "← Back to properties");

  const heading = document.createElement("h1");
  heading.textContent = "Add a new property";
  container.appendChild(heading);

  const form = document.createElement("form");

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "add-name";
  nameInput.placeholder = "Display name";
  form.appendChild(nameInput);

  const typeSelect = document.createElement("select");
  typeSelect.className = "add-type";
  for (const [type, label] of Object.entries(TYPE_LABELS) as [PropertyType, string][]) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = label;
    typeSelect.appendChild(option);
  }
  form.appendChild(typeSelect);

  const contentTextarea = document.createElement("textarea");
  contentTextarea.className = "add-content edit-content";
  contentTextarea.placeholder = "Starting content";
  form.appendChild(contentTextarea);

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Create property";
  form.appendChild(submitButton);

  container.appendChild(form);

  const errorMessage = document.createElement("p");
  errorMessage.setAttribute("role", "alert");
  container.appendChild(errorMessage);

  async function handleSubmit(): Promise<void> {
    errorMessage.textContent = "";

    const name = nameInput.value.trim();
    if (!name) {
      errorMessage.textContent = "A display name is required.";
      return;
    }

    const id = slugify(name);
    if (!id) {
      errorMessage.textContent = "Please choose a name that includes at least one letter or number.";
      return;
    }

    const type = typeSelect.value as PropertyType;

    try {
      await store.createProperty(id, name, type, contentTextarea.value);
    } catch (error) {
      errorMessage.textContent = `Failed to create property: ${(error as Error).message}`;
      return;
    }

    window.location.hash = propertyHash(id);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSubmit();
  });
}
