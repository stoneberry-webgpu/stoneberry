import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    fs: {
      // TODO temporary, to allow serving locally built thimbleberry
      allow: [".."],
    },
  },
  test: {
    browser: {
      enabled: true,
      name: "chrome",
    },
  },
});
