import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Luồng tài khoản thật: đăng ký, đăng nhập, đăng xuất. Rạp bắt buộc tài khoản —
 * không còn phiên khách vãng lai.
 */

const VIDEO_ID = "M7lc1UVf-VE";
const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";
const PASSWORD = "matkhau123";

function uniqueName(prefix: string): string {
  return `${prefix}.${Date.now().toString(36)}${Math.floor(Math.random() * 90 + 10)}`;
}

/** Đăng ký tài khoản qua API cho context này (dùng chung kho cookie với trang). */
async function signUp(context: BrowserContext, displayName: string): Promise<string> {
  const username = uniqueName("e2e");
  const res = await context.request.post(`${API_URL}/api/auth/register`, {
    data: { username, password: PASSWORD, displayName },
  });
  if (!res.ok()) {
    throw new Error(`Đăng ký tài khoản E2E thất bại: ${res.status()} ${await res.text()}`);
  }
  return username;
}

/** Vào `/` và chờ popup đăng nhập hiện ra. */
async function openAuthModal(page: Page) {
  await page.goto("/");
  const dialog = page.locator("dialog.auth-dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Trên `/`, popup tạo phòng (Phase 1) cũng là `<dialog>` modal và nằm ngay dưới
 * popup đăng nhập, nên sau khi đóng popup đăng nhập nó vẫn chặn click vào HUD.
 */
async function dismissOnboarding(page: Page) {
  const close = page.locator(".onboard__close");
  if (await close.isVisible()) {
    await close.click();
    await expect(page.locator("dialog.onboard")).toBeHidden();
  }
}

async function registerThroughUi(page: Page, username: string, displayName: string) {
  const dialog = await openAuthModal(page);
  await dialog.getByRole("tab", { name: "Đăng ký" }).click();

  await page.locator("#reg-username").fill(username);
  await page.locator("#reg-display-name").fill(displayName);
  await page.locator("#reg-password").fill("matkhau123");
  await page.locator("#reg-confirm-password").fill("matkhau123");
  await page.locator(".auth-submit-btn").click();

  await expect(page.locator("dialog.auth-dialog")).toBeHidden();
}

/**
 * Mở menu tài khoản ở góc phải thanh trên và trả về chính menu đó.
 *
 * Bấm bằng bàn phím (`focus` + Enter): nút này có tooltip `data-tip` bám theo con
 * trỏ nên click bằng chuột dễ rơi vào tooltip. Bàn phím cũng là đường đi thật của
 * người dùng và kiểm luôn khả năng truy cập.
 */
async function openAccountMenu(page: Page) {
  const dropdown = page.locator(".user-dropdown");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await dropdown.isVisible()) return dropdown;
    await page.locator(".account").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
  }
  await expect(dropdown).toBeVisible();
  return dropdown;
}

test("Popup đăng nhập tự mở ở trang chủ và có đủ hai tab", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const dialog = await openAuthModal(page);

  await expect(dialog.getByRole("tab", { name: "Đăng nhập" })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: "Đăng ký" })).toBeVisible();
  await expect(page.locator("#login-username")).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();
  await expect(page.locator("#login-remember")).toBeChecked();

  await context.close();
});

test("Đăng ký xong vào rạp được ngay, không cần reload", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const username = uniqueName("dangky");

  await registerThroughUi(page, username, "Người Đăng Ký");
  await dismissOnboarding(page);

  // Popup đóng, phiên tài khoản đã có hiệu lực.
  const menu = await openAccountMenu(page);
  await expect(menu.getByText(`@${username}`)).toBeVisible();

  await context.close();
});

test("Đăng xuất rồi đăng nhập lại bằng đúng mật khẩu", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const username = uniqueName("dangnhap");
  const password = "matkhau123";

  await registerThroughUi(page, username, "Người Đăng Nhập");
  await dismissOnboarding(page);

  // Đăng xuất qua menu tài khoản.
  const menu = await openAccountMenu(page);
  await menu.getByRole("button", { name: "Đăng xuất" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("dialog.auth-dialog");
  await expect(dialog).toBeVisible();

  // Đăng xuất xong vẫn còn popup tạo phòng phía sau — dọn luôn cho chắc.
  await dismissOnboarding(page);

  // Sai mật khẩu → báo lỗi, vẫn ở trong popup.
  await page.locator("#login-username").fill(username);
  await page.locator("#login-password").fill("sai-mat-khau");
  await page.locator(".auth-submit-btn").click();
  await expect(page.locator(".auth-alert")).toContainText("mật khẩu chưa đúng");

  // Đúng mật khẩu → vào được.
  await page.locator("#login-password").fill(password);
  await page.locator(".auth-submit-btn").click();
  await expect(dialog).toBeHidden();
  await dismissOnboarding(page);
  const relogged = await openAccountMenu(page);
  await expect(relogged.getByText(`@${username}`)).toBeVisible();

  await context.close();
});

test("Đăng ký trùng tên đăng nhập bị chặn", async ({ browser }) => {
  const username = uniqueName("trungten");

  const first = await browser.newContext();
  const firstPage = await first.newPage();
  await registerThroughUi(firstPage, username, "Người Một");
  await first.close();

  const second = await browser.newContext();
  const secondPage = await second.newPage();
  const dialog = await openAuthModal(secondPage);
  await dialog.getByRole("tab", { name: "Đăng ký" }).click();
  await secondPage.locator("#reg-username").fill(username.toUpperCase());
  await secondPage.locator("#reg-display-name").fill("Người Hai");
  await secondPage.locator("#reg-password").fill("matkhau123");
  await secondPage.locator("#reg-confirm-password").fill("matkhau123");
  await secondPage.locator(".auth-submit-btn").click();

  await expect(secondPage.locator(".auth-alert")).toContainText("đã có người dùng");

  await second.close();
});

test("Mật khẩu ngắn bị chặn ngay ở client", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const dialog = await openAuthModal(page);
  await dialog.getByRole("tab", { name: "Đăng ký" }).click();

  await page.locator("#reg-username").fill(uniqueName("matkhau"));
  await page.locator("#reg-display-name").fill("Ngắn");
  await page.locator("#reg-password").fill("1234567");
  await page.locator("#reg-confirm-password").fill("1234567");
  await page.locator(".auth-submit-btn").click();

  await expect(page.locator(".auth-field__error")).toContainText("tối thiểu 8 ký tự");
  await expect(dialog).toBeVisible();

  await context.close();
});

test("Mật khẩu xác nhận không khớp bị chặn", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const dialog = await openAuthModal(page);
  await dialog.getByRole("tab", { name: "Đăng ký" }).click();

  await page.locator("#reg-username").fill(uniqueName("xacnhan"));
  await page.locator("#reg-display-name").fill("Không Khớp");
  await page.locator("#reg-password").fill("matkhau123");
  await page.locator("#reg-confirm-password").fill("matkhau999");
  await page.locator(".auth-submit-btn").click();

  await expect(page.locator(".auth-field__error")).toContainText("không trùng khớp");

  await context.close();
});

test("Popup đăng nhập không có nút đóng và không tắt được bằng Esc", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const dialog = await openAuthModal(page);
  // Rạp bắt buộc tài khoản: không có nút X, `Esc` cũng bị chặn.
  await expect(page.locator(".auth-dialog__close")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  await context.close();
});

test("Chưa có tài khoản không vào được rạp dù biết mã phòng", async ({ browser }) => {
  const host = await browser.newContext();
  await signUp(host, "Chủ Phòng E2E");
  const created = await host.request.post(`${API_URL}/api/rooms`, {
    data: { title: "Phòng cần tài khoản", videoId: VIDEO_ID },
  });
  expect(created.ok()).toBeTruthy();
  const code: string = (await created.json()).code;

  const stranger = await browser.newContext();
  const strangerPage = await stranger.newPage();
  await strangerPage.goto(`/room/${code}`);

  // Không có tài khoản: popup đăng nhập chặn ngay, không vào được HUD của phòng.
  await expect(strangerPage.locator("dialog.auth-dialog")).toBeVisible();
  await expect(strangerPage.locator(".auth-dialog__close")).toHaveCount(0);
  await expect(strangerPage.locator("main.room .topbar")).toHaveCount(0);
  await expect(strangerPage.locator(".seat-prompt")).toHaveCount(0);

  await stranger.close();
  await host.close();
});

test("Đăng nhập từ link phòng đưa người dùng vào đúng phòng", async ({ browser }) => {
  const host = await browser.newContext();
  await signUp(host, "Chủ Phòng Đăng Nhập");
  const created = await host.request.post(`${API_URL}/api/rooms`, {
    data: { title: "Phòng đăng nhập", videoId: VIDEO_ID },
  });
  expect(created.ok()).toBeTruthy();
  const code: string = (await created.json()).code;

  // Tài khoản có sẵn nhưng chưa đăng nhập trong context này.
  const member = await browser.newContext();
  const username = await signUp(member, "Người Đăng Nhập Lại");
  const loggedOut = await member.request.post(`${API_URL}/api/auth/logout`);
  expect(loggedOut.ok()).toBeTruthy();

  const page = await member.newPage();
  await page.goto(`/room/${code}`);

  const dialog = page.locator("dialog.auth-dialog");
  await expect(dialog).toBeVisible();
  await page.locator("#login-username").fill(username);
  await page.locator("#login-password").fill(PASSWORD);
  await page.locator(".auth-submit-btn").click();

  await expect(dialog).toBeHidden();
  await expect(page.locator(".room-tag__code")).toContainText(code);
  await expect(page.locator(".occupancy strong")).toHaveText("2");

  await member.close();
  await host.close();
});
