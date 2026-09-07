import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  use: { baseURL: process.env.TEST_BASE_URL || "http://localhost:3005", channel: "chrome", headless: true, screenshot: "only-on-failure", trace: "retain-on-failure" },
});
