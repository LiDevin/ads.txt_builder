import { loadToken } from "./auth/tokenStore";
import { startRouter } from "./router";
import { GitHubVersionStore } from "./versionStore/githubVersionStore";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing #app container in index.html");
}

const store = new GitHubVersionStore();
store.setToken(loadToken());

startRouter(container, store);
