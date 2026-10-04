import { defineConfig } from "vitest/config";

// Unit tests only (tests/*.test.ts). Browser checks live in e2e/ and run with `npm run e2e`.
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
});
