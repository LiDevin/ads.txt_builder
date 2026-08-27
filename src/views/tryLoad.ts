// Shared by the view render functions: runs an async load, and on failure renders
// the error into the container (as the alert role) instead of throwing further.
export async function tryLoad<T>(
  container: HTMLElement,
  load: () => Promise<T>,
  errorPrefix: string,
): Promise<T | undefined> {
  try {
    return await load();
  } catch (error) {
    container.innerHTML = `<p role="alert">${errorPrefix}: ${(error as Error).message}</p>`;
    return undefined;
  }
}
