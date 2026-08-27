import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/ads.txt_builder/",
  test: {
    environment: "jsdom",
    globals: true,
  },
});
