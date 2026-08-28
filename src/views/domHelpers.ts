export function appendLink(
  parent: HTMLElement,
  href: string,
  text: string,
  options?: { download?: string; className?: string },
): void {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = text;
  if (options?.download) {
    link.download = options.download;
  }
  if (options?.className) {
    link.className = options.className;
  }
  parent.appendChild(link);
}

// Every button in this app is styled the same way (the shared .btn class), so
// this centralizes that instead of repeating type/className/click-wiring at
// each of the ~9 call sites.
export function appendButton(
  parent: HTMLElement,
  text: string,
  options?: { type?: "button" | "submit"; onClick?: () => void },
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = options?.type ?? "button";
  button.className = "btn";
  button.textContent = text;
  if (options?.onClick) {
    button.addEventListener("click", options.onClick);
  }
  parent.appendChild(button);
  return button;
}
