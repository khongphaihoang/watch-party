import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { fakePlayer, installFakeYouTube } from "./fake-youtube";
import { API_URL, createRoomThroughUi, joinByLink, signUp } from "./support";
/**
 * Phase 4 - tương tác realtime end-to-end với hai context trình duyệt độc lập
 * (hai người thật). Player YouTube vẫn là bản giả trong `fake-youtube.ts`;
 * mọi thao tác chat/hàng chờ/bình chọn đi qua REST như người dùng thật.
 */

const QUEUED_VIDEO_ID = "dQw4w9WgXcQ";
const OTHER_VIDEO_ID = "aqz-KE-bpKQ";

type RoomPayload = {
  lifecycle: string;
  nowPlaying: { videoId: string } | null;
  queue: Array<{ id: string; videoId: string; position: number; addedBy: string }>;
  queueVersion: number;
  skipVote: { videoId: string; yes: number; total: number; threshold: number } | null;
  members: Array<{ id: string; displayName: string; role: string; isHost: boolean }>;
};

async function roomPayload(context: BrowserContext, code: string): Promise<RoomPayload> {
  const response = await context.request.get(`${API_URL}/api/rooms/${code}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as RoomPayload;
}

async function openPanel(page: Page, name: string) {
  // Panel đang mở có thể che thanh công cụ → đóng trước rồi mở panel cần dùng.
  const panel = page.locator(".sheet.panel");
  if (await panel.isVisible()) {
    await panel.locator(".sheet__head button").click();
    await expect(panel).toBeHidden();
  }
  // Chỉ tìm trong thanh công cụ: tên hiển thị của người dùng cũng có thể chứa
  // chuỗi trùng (ví dụ "Khách Hàng Chờ" chứa "Hàng chờ").
  await page
    .locator("nav.tool-rail")
    .getByRole("button", { name: new RegExp(`^${name}( \\(\\d+\\))?$`) })
    .click();
  await expect(page.locator(".sheet.panel")).toBeVisible();
}

async function addToQueue(page: Page, url: string) {
  await openPanel(page, "Hàng chờ");
  await page.locator("#queue-url").fill(url);
  await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(page.locator(".sheet.panel .row-item")).toHaveCount(1);
}

async function sendChat(page: Page, body: string) {
  if (!(await page.locator(".chat-list").isVisible())) {
    await openPanel(page, "Trò chuyện");
  }
  await page.locator(".chat-compose__input").fill(body);
  await page.locator(".chat-compose__input").press("Enter");
}

async function newGuest(browser: Browser, code: string, name: string) {
  const context = await browser.newContext();
  await installFakeYouTube(context);
  const page = await context.newPage();
  await signUp(context, name);
  await joinByLink(page, code);
  return { context, page };
}

test("Hai máy nhận tin nhắn chat của nhau", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng chat");

  const guest = await newGuest(browser, code, "Khách Chat");
  await openPanel(hostPage, "Trò chuyện");

  await sendChat(guest.page, "Xin chào cả rạp");
  await expect(hostPage.locator(".chat-msg__text").last()).toHaveText(
    "Xin chào cả rạp",
  );

  await sendChat(hostPage, "Chào bạn nhé");
  await expect(guest.page.locator(".chat-msg__text").last()).toHaveText("Chào bạn nhé");
});

test("Tin nhắn dài bị chặn ngay ở ô nhập", async ({ browser }) => {
  const context = await browser.newContext();
  await installFakeYouTube(context);
  const page = await context.newPage();
  await createRoomThroughUi(page, "Phòng giới hạn");
  await openPanel(page, "Trò chuyện");

  const input = page.locator(".chat-compose__input");
  await expect(input).toHaveAttribute("maxlength", "200");
  await input.fill("a".repeat(260));
  await expect(input).toHaveValue("a".repeat(200));
});

test("Gửi lỗi khi mất mạng và gửi lại không nhân đôi tin", async ({ browser }) => {
  const context = await browser.newContext();
  await installFakeYouTube(context);
  const page = await context.newPage();
  const code = await createRoomThroughUi(page, "Phòng mất mạng");
  await openPanel(page, "Trò chuyện");

  await context.setOffline(true);
  await page.locator(".chat-compose__input").fill("Tin lúc mất mạng");
  await page.locator(".chat-compose__input").press("Enter");
  await expect(page.getByRole("button", { name: "Gửi lại" })).toBeVisible();

  await context.setOffline(false);
  await page.getByRole("button", { name: "Gửi lại" }).click();
  await expect(page.getByRole("button", { name: "Gửi lại" })).toHaveCount(0);
  await expect(page.locator(".chat-msg__text")).toHaveCount(1);

  const history = await context.request.get(`${API_URL}/api/rooms/${code}/messages`);
  expect(history.ok()).toBeTruthy();
  const payload = (await history.json()) as { messages: Array<{ body: string }> };
  expect(payload.messages.filter((message) => message.body === "Tin lúc mất mạng"))
    .toHaveLength(1);
});

test("Thành viên thêm video vào hàng chờ, chủ rạp xoá được", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng hàng chờ");

  const guest = await newGuest(browser, code, "Khách Hàng Chờ");
  await addToQueue(guest.page, `https://youtu.be/${QUEUED_VIDEO_ID}`);

  const shared = await roomPayload(hostContext, code);
  expect(shared.queue).toHaveLength(1);
  expect(shared.queue[0].videoId).toBe(QUEUED_VIDEO_ID);
  expect(shared.queue[0].addedBy).toBe("Khách Hàng Chờ");

  await openPanel(hostPage, "Hàng chờ");
  await expect(hostPage.locator(".sheet.panel .row-item")).toHaveCount(1);
  await hostPage
    .getByRole("button", { name: /Xoá .* khỏi hàng chờ/ })
    .click();
  await expect(hostPage.locator(".sheet.panel .row-item")).toHaveCount(0);
  expect((await roomPayload(hostContext, code)).queue).toHaveLength(0);
});

test("Khách không có nút quản lý hàng chờ và bị chặn ở API", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng phân quyền");

  const guest = await newGuest(browser, code, "Khách Thường");
  await addToQueue(hostPage, `https://youtu.be/${QUEUED_VIDEO_ID}`);
  await openPanel(guest.page, "Hàng chờ");

  await expect(guest.page.getByRole("button", { name: /Chuyển .* lên/ })).toHaveCount(0);
  await expect(
    guest.page.getByRole("button", { name: "Chiếu video tiếp theo" }),
  ).toHaveCount(0);

  const state = await roomPayload(hostContext, code);
  const denied = await guest.context.request.patch(
    `${API_URL}/api/rooms/${code}/queue/order`,
    {
      data: { order: state.queue.map((item) => item.id), expectedVersion: state.queueVersion },
    },
  );
  expect(denied.status()).toBe(403);
  expect((await denied.json()).code).toBe("FORBIDDEN");
});

test("Chủ rạp sắp xếp hàng chờ và chuyển sang video tiếp theo", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng sắp xếp");

  const guest = await newGuest(browser, code, "Khách Xem");
  await openPanel(hostPage, "Hàng chờ");
  await hostPage.locator("#queue-url").fill(`https://youtu.be/${QUEUED_VIDEO_ID}`);
  await hostPage.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(hostPage.locator(".sheet.panel .row-item")).toHaveCount(1);
  await hostPage.locator("#queue-url").fill(`https://youtu.be/${OTHER_VIDEO_ID}`);
  await hostPage.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(hostPage.locator(".sheet.panel .row-item")).toHaveCount(2);

  // Đưa mục thứ hai lên đầu, rồi kiểm tra cả hai máy thấy cùng thứ tự.
  await hostPage.getByRole("button", { name: /Chuyển Video aqz-KE-bpKQ lên/ }).click();
  await expect
    .poll(async () => (await roomPayload(hostContext, code)).queue[0]?.videoId)
    .toBe(OTHER_VIDEO_ID);

  await openPanel(guest.page, "Hàng chờ");
  await expect(guest.page.locator(".sheet.panel .row-item").first()).toContainText(
    OTHER_VIDEO_ID,
  );

  await hostPage.getByRole("button", { name: "Chiếu video tiếp theo" }).click();
  await expect.poll(async () => (await fakePlayer(guest.page))?.videoId).toBe(
    OTHER_VIDEO_ID,
  );
  expect((await roomPayload(hostContext, code)).queue).toHaveLength(1);
});

test("Bình chọn bỏ qua đủ ngưỡng thì cả phòng chuyển video", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng bình chọn");

  const guest = await newGuest(browser, code, "Khách Bỏ Phiếu");
  await addToQueue(hostPage, `https://youtu.be/${QUEUED_VIDEO_ID}`);
  await hostPage.locator(".sheet.panel .sheet__head button").click();

  // Phòng 2 người → ngưỡng là 2 phiếu.
  await hostPage.getByRole("button", { name: "Vote bỏ qua" }).click();
  await expect.poll(async () => (await roomPayload(hostContext, code)).skipVote?.yes).toBe(1);
  await hostPage.getByRole("button", { name: /Bạn đã vote/ }).click();
  await expect.poll(async () => (await roomPayload(hostContext, code)).skipVote?.yes).toBe(0);

  await hostPage.getByRole("button", { name: "Vote bỏ qua" }).click();
  await expect.poll(async () => (await roomPayload(hostContext, code)).skipVote?.yes).toBe(1);
  await guest.page.getByRole("button", { name: "Vote bỏ qua" }).click();

  await expect.poll(async () => (await roomPayload(hostContext, code)).nowPlaying?.videoId).toBe(
    QUEUED_VIDEO_ID,
  );
  await expect.poll(async () => (await fakePlayer(hostPage))?.videoId).toBe(
    QUEUED_VIDEO_ID,
  );
});

test("Thông báo vào phòng chỉ phát trong đúng phòng", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng thông báo");

  const otherContext = await browser.newContext();
  await installFakeYouTube(otherContext);
  const otherPage = await otherContext.newPage();
  const otherCode = await createRoomThroughUi(otherPage, "Phòng khác");

  await newGuest(browser, code, "Khách Thông Báo");
  await expect(hostPage.locator(".toast").first()).toContainText("vừa vào rạp");
  await expect(otherPage.locator(".toast", { hasText: "vừa vào rạp" })).toHaveCount(0);
  expect(otherCode).not.toBe(code);
});

test("Tải lại trang khôi phục lịch sử chat và hàng chờ", async ({ browser }) => {
  const context = await browser.newContext();
  await installFakeYouTube(context);
  const page = await context.newPage();
  const code = await createRoomThroughUi(page, "Phòng khôi phục");

  await sendChat(page, "Tin trước khi tải lại");
  await addToQueue(page, `https://youtu.be/${QUEUED_VIDEO_ID}`);

  await page.reload();
  await expect(page.locator("main.room")).toBeVisible();
  await expect.poll(async () => (await roomPayload(context, code)).queue.length).toBe(1);
  await openPanel(page, "Trò chuyện");
  await expect(page.locator(".chat-msg__text").last()).toHaveText(
    "Tin trước khi tải lại",
  );
});
