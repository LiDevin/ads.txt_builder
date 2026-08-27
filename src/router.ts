import type { VersionStore } from "./versionStore/types";
import { renderPropertyDetail } from "./views/propertyDetail";
import { renderPropertyList } from "./views/propertyList";

const PROPERTY_ROUTE = /^#\/property\/(.+)$/;

export function startRouter(container: HTMLElement, store: VersionStore): void {
  const render = (): void => {
    const hash = window.location.hash || "#/";
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
