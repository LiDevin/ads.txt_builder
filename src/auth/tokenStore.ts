const STORAGE_KEY = "ads-txt-builder:github-token";

export function loadToken(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

export function saveToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
