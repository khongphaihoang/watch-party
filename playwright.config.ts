import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  // Ghi ra ngoài thư mục Next: `next dev` theo dõi cả cây dự án, nên trace ghi
  // liên tục vào `watch-party/test-results` sẽ kích hoạt Fast Refresh và làm
  // hỏng điều hướng khi chạy E2E trên dev server (E2E_BASE_URL).
  outputDir: "../test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "off",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Chạy trên bản production: dev-mode biên dịch lại mỗi lần điều hướng
        // và làm test chậm, dễ timeout giả.
        command: `npm run build && npm run start -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 300_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
