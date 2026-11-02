import { expect, test, type Page } from "@playwright/test";

import { installFakeYouTube } from "./fake-youtube";
import { createRoomThroughUi, joinByLink, signUp } from "./support";

test.beforeEach(async ({ context }) => {
  await installFakeYouTube(context);
});

async function openPanel(page: Page, name: string) {
  const panel = page.locator(".sheet.panel");
  if (await panel.isVisible()) {
    await panel.locator(".sheet__head button").click();
    await expect(panel).toBeHidden();
  }
  await page
    .locator("nav.tool-rail")
    .getByRole("button", { name: new RegExp(`^${name}( \\(\\d+\\))?$`) })
    .click();
  await expect(panel).toBeVisible();
}

async function sendChat(page: Page, body: string) {
  if (!(await page.locator(".chat-list").isVisible())) {
    await openPanel(page, "Trò chuyện");
  }
  await page.locator(".chat-compose__input").fill(body);
  await page.locator(".chat-compose__input").press("Enter");
}

test.describe("Mobile 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("rạp không tràn ngang và vẫn gửi được chat", async ({ page }) => {
    await createRoomThroughUi(page, "Phòng mobile");
    await expect(page.locator("main.room")).toBeVisible();
    await expect(page.locator(".screen-frame")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await sendChat(page, "Xin chào từ điện thoại");
    await expect(page.locator(".chat-msg__text").last()).toHaveText("Xin chào từ điện thoại");
  });

  test("khách vào phòng bằng link trên mobile thấy màn chiếu", async ({ page, browser }) => {
    const code = await createRoomThroughUi(page, "Phòng mobile 2");

    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await installFakeYouTube(guestContext);
    const guestPage = await guestContext.newPage();
    await signUp(guestContext, "Khách Mobile");
    await joinByLink(guestPage, code);

    await expect(guestPage.locator(".screen-frame")).toBeVisible();
    const overflow = await guestPage.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await guestContext.close();
  });
});

test.describe("Tablet 768×1024", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("bố cục rạp không tràn ngang", async ({ page }) => {
    await createRoomThroughUi(page, "Phòng tablet");
    await expect(page.locator("main.room")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test("phím tắt F/H không cướp ký tự khi đang gõ chat", async ({ page }) => {
  await createRoomThroughUi(page, "Phòng phím tắt");
  if (!(await page.locator(".chat-list").isVisible())) {
    await openPanel(page, "Trò chuyện");
  }

  const input = page.locator(".chat-compose__input");
  await input.fill("");
  await input.press("f");
  await input.press("h");
  await expect(input).toHaveValue("fh");
  await expect(page.locator("main.room.is-focus")).toHaveCount(0);

  // Ngoài ô nhập thì phím tắt vẫn hoạt động.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("f");
  await expect(page.locator("main.room.is-focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("main.room.is-focus")).toHaveCount(0);
});
