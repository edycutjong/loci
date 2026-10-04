import { defineConfig } from "@playwright/test";

// Two kinds of browser checks:
// - e2e/*.spec.ts run against the production build (`vite preview`) with the AI helpers and the microphone stubbed,
//   so they need no keys and never call an AI provider.
// - e2e/live/*.spec.ts (LIVE=1) drive the real app with real AI calls, against BASE_URL
//   (the dev server on :5174, or the deployed site).
const live = !!process.env.LIVE;
const base = process.env.BASE_URL;

export default defineConfig({
  testDir: live ? "e2e/live" : "e2e",
  testMatch: "**/*.spec.ts",
  testIgnore: live ? [] : ["**/live/**"],
  timeout: live ? 180_000 : 30_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: base ?? "http://localhost:4174",
    viewport: { width: 390, height: 844 },
    trace: "on-first-retry",
  },
  webServer: base
    ? undefined
    : {
        command: "npm run preview",
        url: "http://localhost:4174",
        reuseExistingServer: !process.env.CI,
      },
});
