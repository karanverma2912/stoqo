import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 60000,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: [
    {
      command:
        "cd ../backend && bundle exec rails db:seed && bundle exec puma -C config/puma.rb",
      url: "http://localhost:3001/up",
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run start -- --hostname localhost",
      url: "http://localhost:3000",
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
