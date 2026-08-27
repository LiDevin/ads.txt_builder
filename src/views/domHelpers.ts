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
