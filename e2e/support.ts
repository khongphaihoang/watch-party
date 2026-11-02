import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { installFakeYouTube } from "./fake-youtube";

/**
 * Helper dùng chung cho các bộ E2E. Mỗi context trình duyệt là một người thật:
 * đăng ký tài khoản riêng rồi mới vào rạp.
 */
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";
export const SEAT_TOAST_TAKEN = "Ghế này đã có người ngồi. Chọn ghế khác nhé.";
export const LINK_COPIED = "Đã sao chép link rạp.";
export const VIDEO_ID = "M7lc1UVf-VE";
export const PASSWORD = "matkhau123";

let accountSeq = 0;

/**
 * Context mới đã cài YouTube giả. Test không phụ thuộc mạng ngoài và không bị
 * timeout vì iframe thật tải chậm.
 */
export async function newRoomContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  await installFakeYouTube(context);
  return context;
}

export function uniqueUsername(prefix = "e2e"): string {
  accountSeq += 1;
  return `${prefix}.${Date.now().toString(36)}${accountSeq}`;
}

/**
 * Đăng ký một tài khoản thật qua API cho context này.
 *
 * `context.request` dùng chung kho cookie với trình duyệt nên trang mở sau đó đã
 * có phiên — đúng như người dùng vừa đăng ký xong.
 */
export async function signUp(context: BrowserContext, displayName: string): Promise<string> {
  const username = uniqueUsername();
  const res = await context.request.post(`${API_URL}/api/auth/register`, {
    data: { username, password: PASSWORD, displayName },
  });
  if (!res.ok()) {
    throw new Error(`Đăng ký tài khoản E2E thất bại: ${res.status()} ${await res.text()}`);
  }
  return username;
}

/** `row` và `col` là số hiển thị (1-based), khớp aria-label của ghế. */
export function seatButton(page: Page, row: number, col: number) {
  return page.getByRole("button", { name: new RegExp(`^Hàng ${row} số ${col} —`, "i") });
}

/**
 * Chọn ghế qua bảng chọn ghế (lưới 2D). Ghế trong rạp 3D bị các lớp con và các
 * hàng phía trước che theo phối cảnh nên toạ độ bấm không ổn định trong test;
 * cả hai đường vào đều gọi chung một action `takeSeat(row, col)`.
 *
 * Toast chỉ sống vài giây nên được đọc **ngay sau khi bấm** (trước khi đóng panel),
 * tránh trường hợp máy chậm làm toast biến mất trước khi test assert.
 */
export async function pickSeat(page: Page, row: number, col: number): Promise<string> {
  const panel = page.locator(".sheet.panel");
  if (!(await panel.isVisible())) {
    await page.getByRole("button", { name: "Chọn ghế" }).first().click();
    await expect(panel).toBeVisible();
  }
  const before = await page.locator(".toast").allInnerTexts();
  await page.locator(`.seat-map__btn[title="Hàng ${row} số ${col}"]`).click();

  // Chờ toast **mới** (khác các toast đang có) thay vì đọc toast cũ còn sót.
  let toastText = "";
  await expect
    .poll(
      async () => {
        const current = await page.locator(".toast").allInnerTexts();
        const fresh = current.filter((text) => !before.includes(text)).map((t) => t.trim());
        toastText = fresh[fresh.length - 1] ?? "";
        return toastText;
      },
      { timeout: 15000 },
    )
    .not.toBe("");

  await page.locator(".sheet.panel .sheet__head button").click();
  await expect(panel).toBeHidden();
  return toastText;
}

/** Mở panel thành viên và trả về chính panel đó để assert nội dung. */
export async function openMembersPanel(page: Page) {
  await page.getByRole("button", { name: "Xem thành viên" }).click();
  const panel = page.locator(".sheet.panel");
  await expect(panel).toBeVisible();
  return panel;
}

/**
 * Mở `/` với phiên đã có: popup đăng nhập không được mở nên popup tạo phòng ở
 * dưới trở thành hộp thoại đang hoạt động.
 */
export async function openHome(page: Page) {
  await page.goto("/");
  await expect(page.locator("dialog.auth-dialog")).toBeHidden();
}

export async function createRoomThroughUi(page: Page, title: string): Promise<string> {
  await signUp(page.context(), "Chủ Rạp E2E");
  await openHome(page);

  const dialog = page.locator("dialog.onboard");
  await expect(dialog).toBeVisible();

  await page.locator("#room-title").fill(title);
  await dialog.locator("footer button[type=submit]").click();

  await expect(page.locator("#video-url")).toBeVisible();
  await page.locator("#video-url").fill(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
  await dialog.locator("footer button[type=submit]").click();

  // Bước chia sẻ chỉ hiện sau khi server tạo phòng xong.
  await expect(dialog.locator(".onboard__summary-code")).toBeVisible();
  const code = (await dialog.locator(".onboard__summary-code").innerText()).trim();
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);

  await dialog.locator("footer button[type=submit]").click();
  await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
  return code;
}

export async function joinByLink(page: Page, code: string) {
  await page.goto(`/room/${code}`);
  await expect(page.locator("main.room")).toBeVisible();
  await expect(page.locator(".room-tag__code")).toContainText(code);
}


