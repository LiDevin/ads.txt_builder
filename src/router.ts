import type { VersionStore } from "./versionStore/types";
import { renderPropertyAdd } from "./views/propertyAdd";
import { renderPropertyArchive } from "./views/propertyArchive";
import { renderPropertyDetail } from "./views/propertyDetail";
import { renderPropertyEdit } from "./views/propertyEdit";
import { renderPropertyList } from "./views/propertyList";
import { renderTokenSettings } from "./views/tokenSettings";

const PROPERTY_VERSION_ROUTE = /^#\/property\/([^/]+)\/version\/(.+)$/;
const PROPERTY_EDIT_ROUTE = /^#\/property\/([^/]+)\/edit$/;
const PROPERTY_ROUTE = /^#\/property\/([^/]+)$/;

export function startRouter(container: HTMLElement, store: VersionStore): void {
  const render = (): void => {
    const hash = window.location.hash || "#/";

    if (hash === "#/settings") {
      void renderTokenSettings(container, store);
      return;
    }

    if (hash === "#/add") {
      renderPropertyAdd(container, store);
      return;
    }

    if (hash === "#/archived") {
      void renderPropertyArchive(container, store);
      return;
    }

    const editMatch = hash.match(PROPERTY_EDIT_ROUTE);
    if (editMatch) {
      void renderPropertyEdit(container, store, decodeURIComponent(editMatch[1]));
      return;
    }

    const versionMatch = hash.match(PROPERTY_VERSION_ROUTE);
    if (versionMatch) {
      void renderPropertyDetail(
        container,
        store,
        decodeURIComponent(versionMatch[1]),
        decodeURIComponent(versionMatch[2]),
      );
      return;
    }

    const propertyMatch = hash.match(PROPERTY_ROUTE);
    if (propertyMatch) {
      void renderPropertyDetail(container, store, decodeURIComponent(propertyMatch[1]));
      return;
    }

    void renderPropertyList(container, store);
  };

  window.addEventListener("hashchange", render);
  render();
}
