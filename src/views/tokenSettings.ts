import { clearToken, loadToken, saveToken } from "../auth/tokenStore";
import type { AccessLevel, VersionStore } from "../versionStore/types";
import { tryLoad } from "./tryLoad";

const ACCESS_LABELS: Record<AccessLevel, string> = {
  "invalid-token": "This token is invalid or expired.",
  "no-write": "This token is valid, but does not grant write access to this repo.",
  "can-write": "This token is valid and can save changes to this repo.",
};

export async function renderTokenSettings(container: HTMLElement, store: VersionStore): Promise<void> {
  container.innerHTML = "";

  const backLink = document.createElement("a");
  backLink.href = "#/";
  backLink.textContent = "← Back to properties";
  container.appendChild(backLink);

  const heading = document.createElement("h1");
  heading.textContent = "GitHub access token";
  container.appendChild(heading);

  const form = document.createElement("form");

  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "Paste your GitHub personal access token";
  form.appendChild(input);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Save";
  form.appendChild(submit);

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Clear";
  form.appendChild(clearButton);

  container.appendChild(form);

  const status = document.createElement("p");
  status.className = "token-status";
  container.appendChild(status);

  async function refreshStatus(): Promise<void> {
    const token = loadToken();
    store.setToken(token);

    if (!token) {
      status.textContent = "No token saved.";
      return;
    }

    status.textContent = "Checking…";
    const accessLevel = await tryLoad(status, () => store.checkAccess(), "Failed to check access");
    if (accessLevel === undefined) {
      return;
    }
    status.textContent = ACCESS_LABELS[accessLevel];
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveToken(input.value);
    void refreshStatus();
  });

  clearButton.addEventListener("click", () => {
    clearToken();
    input.value = "";
    void refreshStatus();
  });

  input.value = loadToken() ?? "";
  await refreshStatus();
}
