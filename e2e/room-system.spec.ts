import { expect, test } from "@playwright/test";

/**
 * Phase 2 - Room System end-to-end.
 *
 * Mỗi test dùng context trình duyệt riêng để có cookie phiên riêng, đúng như hai
 * người thật trên hai máy khác nhau. Rạp bắt buộc tài khoản thật nên mỗi context
 * đăng ký một tài khoản mới trước khi vào phòng.
 */

import {
  API_URL,
  LINK_COPIED,
  PASSWORD,
  SEAT_TOAST_TAKEN,
  createRoomThroughUi,
  joinByLink,
  openHome,
  openMembersPanel,
  pickSeat,
  seatButton,
  signUp,
  uniqueUsername,
  VIDEO_ID,
} from "./support";

test("Chủ rạp tạo phòng và được đưa vào URL /room/{code}", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const code = await createRoomThroughUi(page, "Đêm phim kiểm thử");
  expect(page.url()).toContain(`/room/${code}`);

  // Chủ rạp là thành viên đầu tiên và chưa có ghế.
  await expect(page.locator(".occupancy strong")).toHaveText("1");
  await expect(page.locator(".seat-prompt")).toBeVisible();

  await context.close();
});

test("Khách mở link thấy rạp và thấy 2 người", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng hai người");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await joinByLink(guestPage, code);

  await expect(guestPage.locator(".occupancy strong")).toHaveText("2");
  // Chủ rạp thấy cập nhật realtime qua room:snapshot.
  await expect(hostPage.locator(".occupancy strong")).toHaveText("2");

  await hostContext.close();
  await guestContext.close();
});

test("Hai máy thấy cùng một danh sách thành viên", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng danh sách");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await joinByLink(guestPage, code);
  await expect(guestPage.locator(".occupancy strong")).toHaveText("2");

  const hostPanel = await openMembersPanel(hostPage);
  await expect(hostPanel.locator(".row-item__title")).toHaveText([
    "Chủ Rạp E2E",
    "Khach E2E",
  ]);

  const guestPanel = await openMembersPanel(guestPage);
  await expect(guestPanel.locator(".row-item__title")).toHaveText([
    "Chủ Rạp E2E",
    "Khach E2E",
  ]);

  await hostContext.close();
  await guestContext.close();
});

test("Khách vào phòng bằng mã từ trang chủ", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng vào bằng mã");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await openHome(guestPage);

  const dialog = guestPage.locator("dialog.onboard");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Vào phòng bằng mã" }).click();
  await guestPage.locator("#join-room-code").fill(code);
  await dialog.locator("button[type=submit]").click();

  await expect(guestPage).toHaveURL(new RegExp(`/room/${code}$`));
  await expect(guestPage.locator(".occupancy strong")).toHaveText("2");

  await hostContext.close();
  await guestContext.close();
});

test("Hai người chọn ghế khác nhau, avatar ở đúng vị trí", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng hai ghế");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await joinByLink(guestPage, code);

  await pickSeat(hostPage, 2, 4);
  await expect(hostPage.locator(".toast--ok")).toContainText("Đã chọn ghế");

  await pickSeat(guestPage, 4, 9);
  await expect(guestPage.locator(".toast--ok")).toContainText("Đã chọn ghế");

  await expect(hostPage.locator(".seat--mine")).toHaveCount(1);
  await expect(guestPage.locator(".seat--mine")).toHaveCount(1);
  // Ghế của người kia hiện trạng thái có người ngồi ở cả hai máy.
  await expect(hostPage.locator(".seat--occupied")).toHaveCount(1);
  await expect(guestPage.locator(".seat--occupied")).toHaveCount(1);

  await hostContext.close();
  await guestContext.close();
});

test("Hai người chọn cùng một ghế: người sau nhận toast seatTaken", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng tranh ghế");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await joinByLink(guestPage, code);

  await pickSeat(hostPage, 3, 3);
  await expect(hostPage.locator(".toast--ok")).toContainText("Đã chọn ghế");
  await expect(guestPage.locator(".seat--occupied")).toHaveCount(1);

  await pickSeat(guestPage, 3, 3);
  await expect(guestPage.locator(".toast--warn")).toContainText(SEAT_TOAST_TAKEN);

  await hostContext.close();
  await guestContext.close();
});

test("Đổi ghế: avatar chuyển chỗ và ghế cũ trống", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await createRoomThroughUi(page, "Phòng đổi ghế");

  await pickSeat(page, 1, 2);
  await expect(page.locator(".seat--mine")).toHaveCount(1);

  await pickSeat(page, 4, 11);
  await expect(page.locator(".seat--mine")).toHaveCount(1);

  const label = await page.locator(".seat--mine").getAttribute("aria-label");
  expect(label).toContain("Hàng 4 số 11");
  await expect(seatButton(page, 1, 2)).toHaveClass(/seat--empty/);

  await context.close();
});

test("Sao chép link và mã phòng đều hiện toast xác nhận", async ({ browser }) => {
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  const code = await createRoomThroughUi(page, "Phòng sao chép link");

  await page.getByRole("button", { name: "Sao chép link phòng" }).click();
  await expect(page.getByText(LINK_COPIED)).toBeVisible();

  await page.getByRole("button", { name: "Thông tin phòng" }).first().click();
  await page.getByRole("button", { name: "Sao chép mã phòng" }).click();
  await expect(page.getByText("Đã sao chép mã rạp.")).toBeVisible();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard.trim()).toBe(code);

  await context.close();
});

test("Tải lại trang khách vẫn đúng phòng và đúng ghế", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng tải lại");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await joinByLink(guestPage, code);
  await pickSeat(guestPage, 5, 7);
  await expect(guestPage.locator(".seat--mine")).toHaveCount(1);

  await guestPage.reload();
  await expect(guestPage.locator(".room-tag__code")).toContainText(code);
  await expect(guestPage.locator(".occupancy strong")).toHaveText("2");
  await expect(guestPage.locator(".seat--mine")).toHaveCount(1);
  const label = await guestPage.locator(".seat--mine").getAttribute("aria-label");
  expect(label).toContain("Hàng 5 số 7");

  await hostContext.close();
  await guestContext.close();
});

test("Chủ rạp kick khách, khách không còn trong danh sách", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng kick");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await joinByLink(guestPage, code);
  await expect(hostPage.locator(".occupancy strong")).toHaveText("2");

  await hostPage.getByRole("button", { name: "Xem thành viên" }).click();
  const kickButton = hostPage.locator(".panel .row-item .icon-btn");
  await expect(kickButton).toHaveCount(1);
  await kickButton.click();

  await expect(hostPage.locator(".occupancy strong")).toHaveText("1");

  // Khách bị mời ra: snapshot realtime không còn mình nên màn hình đổi ngay.
  await expect(guestPage.getByText("Bạn không còn trong rạp")).toBeVisible();

  // Tải lại vẫn bị chặn vì join trả `ROOM_FORBIDDEN`.
  await guestPage.reload();
  await expect(guestPage.getByText("Bạn không còn trong rạp")).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});

test("Khách không thấy nút quản trị và API từ chối quyền host", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng phân quyền");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await joinByLink(guestPage, code);
  await expect(guestPage.locator(".occupancy strong")).toHaveText("2");

  // Chủ rạp thấy đủ hai thao tác quản trị.
  const hostPanel = await openMembersPanel(hostPage);
  await expect(hostPanel.locator(".row-item .icon-btn")).toHaveCount(1);
  await hostPanel.locator(".sheet__head button").click();
  await hostPage.getByRole("button", { name: "Thông tin phòng" }).first().click();
  await expect(hostPage.getByRole("button", { name: "Đóng phòng" })).toBeVisible();
  await hostPage.locator(".sheet.panel .sheet__head button").click();

  // Khách: không có nút kick, không có nút đóng phòng.
  const guestPanel = await openMembersPanel(guestPage);
  await expect(guestPanel.locator(".row-item .icon-btn")).toHaveCount(0);
  await guestPanel.locator(".sheet__head button").click();
  await guestPage.getByRole("button", { name: "Thông tin phòng" }).first().click();
  await expect(guestPage.getByRole("button", { name: "Đóng phòng" })).toHaveCount(0);

  // Gọi thẳng API cũng bị từ chối, không chỉ ẩn nút ở giao diện.
  const membersResponse = await guestContext.request.get(
    `${API_URL}/api/rooms/${code}/members`,
  );
  expect(membersResponse.ok()).toBeTruthy();
  const members = (await membersResponse.json()) as Array<{ id: string; isHost: boolean }>;
  const hostMemberId = members.find((member) => member.isHost)?.id;
  expect(hostMemberId).toBeTruthy();

  const kick = await guestContext.request.post(
    `${API_URL}/api/rooms/${code}/members/${hostMemberId}/kick`,
  );
  expect(kick.status()).toBe(403);
  expect((await kick.json()).code).toBe("NOT_ROOM_HOST");

  const close = await guestContext.request.post(`${API_URL}/api/rooms/${code}/close`);
  expect(close.status()).toBe(403);
  expect((await close.json()).code).toBe("NOT_ROOM_HOST");

  await hostContext.close();
  await guestContext.close();
});

test("Khách rời phòng về trang chủ và ghế được giải phóng", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng rời đi");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khach E2E");
  await joinByLink(guestPage, code);
  await pickSeat(guestPage, 2, 8);
  await expect(guestPage.locator(".seat--mine")).toHaveCount(1);

  await guestPage.getByRole("button", { name: "Thông tin phòng" }).first().click();
  await guestPage.getByRole("button", { name: "Rời phòng và giải phóng ghế" }).click();

  await expect(guestPage).toHaveURL("/");
  await expect(hostPage.locator(".occupancy strong")).toHaveText("1");
  await expect(seatButton(hostPage, 2, 8)).toHaveClass(/seat--empty/);

  await hostContext.close();
  await guestContext.close();
});

test("Phòng đầy hiển thị màn hình full", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  // Đi qua `/` để có phiên, sau đó tạo phòng sức chứa 2 qua API.
  await signUp(hostContext, "Chu Rap E2E");
  await openHome(hostPage);
  await expect(hostPage.locator("dialog.onboard")).toBeVisible();
  await hostPage.locator("dialog.onboard .onboard__tabs").isVisible();

  const created = await hostPage.request.post(`${API_URL}/api/rooms`, {
    data: { title: "Phòng sức chứa hai", videoId: VIDEO_ID, capacity: 2 },
  });
  expect(created.ok()).toBeTruthy();
  const code: string = (await created.json()).code;

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await signUp(secondContext, "Khach Hai E2E");
  await joinByLink(secondPage, code);
  await expect(secondPage.locator(".occupancy strong")).toHaveText("2");

  const thirdContext = await browser.newContext();
  const thirdPage = await thirdContext.newPage();
  await signUp(thirdContext, "Khach Ba E2E");
  await thirdPage.goto(`/room/${code}`);
  await expect(thirdPage.getByText("Rạp đã kín chỗ")).toBeVisible();
  await expect(thirdPage.getByRole("button", { name: "Về trang chủ" })).toBeVisible();

  await hostContext.close();
  await secondContext.close();
  await thirdContext.close();
});

test("Phòng không tồn tại hiện màn hình lỗi, không crash", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(context, "Nguoi Tim Phong E2E");

  await page.goto("/room/ZZZZZ");
  await expect(page.getByText("Không tìm thấy rạp này")).toBeVisible();
  await expect(page.getByRole("button", { name: "Về trang chủ" })).toBeVisible();

  await context.close();
});

test("Chưa đăng nhập mở link phòng: popup đăng nhập chặn, đăng ký xong vào rạp ngay", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng bắt buộc tài khoản");

  const strangerContext = await browser.newContext();
  const strangerPage = await strangerContext.newPage();
  await strangerPage.goto(`/room/${code}`);

  // Chưa có tài khoản thì không vào được rạp: popup đăng nhập bật ngay và không
  // có nút đóng, HUD của phòng không được dựng.
  const dialog = strangerPage.locator("dialog.auth-dialog");
  await expect(dialog).toBeVisible();
  await expect(strangerPage.locator(".auth-dialog__close")).toHaveCount(0);
  await expect(strangerPage.locator("main.room .topbar")).toHaveCount(0);

  await dialog.getByRole("tab", { name: "Đăng ký" }).click();

  await strangerPage.locator("#reg-username").fill(uniqueUsername("vaophong"));
  await strangerPage.locator("#reg-display-name").fill("Người Vào Sau");
  await strangerPage.locator("#reg-password").fill(PASSWORD);
  await strangerPage.locator("#reg-confirm-password").fill(PASSWORD);
  await strangerPage.locator(".auth-submit-btn").click();

  // Đăng ký xong tự join lại phòng, không cần tải lại trang.
  await expect(dialog).toBeHidden();
  await expect(strangerPage.locator(".room-tag__code")).toContainText(code);
  await expect(strangerPage.locator(".occupancy strong")).toHaveText("2");

  await hostContext.close();
  await strangerContext.close();
});
