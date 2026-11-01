import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { API_URL, createRoomThroughUi, joinByLink, signUp } from "./support";

/**
 * Phase 3 - video synchronization end-to-end.
 *
 * YouTube IFrame API được thay bằng một player giả (xem `installFakeYouTube`):
 * test chạy offline, không phụ thuộc mạng hay chính sách nhúng của video thật,
 * nhưng vẫn đi qua đúng luồng PlayerHandle của ứng dụng.
 */

const OTHER_VIDEO_ID = "aqz-KE-bpKQ";

type FakePlayerSnapshot = {
  videoId: string;
  playing: boolean;
  position: number;
  muted: boolean;
  state: number;
  destroyed: boolean;
};

type FakeYouTubeWindow = {
  __fakeYouTube?: {
    players: Array<{
      videoId: string;
      playing: boolean;
      muted: boolean;
      state: number;
      destroyed: boolean;
      seeks: number;
      getCurrentTime: () => number;
      emitError: (code: number) => void;
      emitState: (state: number) => void;
    }>;
    seeks: number;
  };
};

/** Player giả tối thiểu, đủ để chạy đúng các nhánh của `YouTubePlayer`. */
const FAKE_YOUTUBE_SCRIPT = `
(() => {
  const registry = { players: [], seeks: 0 };
  window.__fakeYouTube = registry;

  class FakePlayer {
    constructor(_element, options) {
      this.options = options;
      this.videoId = options.videoId;
      this.duration = 240;
      this.position = 0;
      this.playing = false;
      this.muted = true;
      this.destroyed = false;
      this.state = -1;
      this.lastTick = Date.now();
      this.seeks = 0;
      registry.players.push(this);
      setTimeout(() => {
        if (this.destroyed) return;
        this.options.events.onReady({ target: this });
        setTimeout(() => this.emitState(5), 0);
      }, 0);
    }

    tick() {
      const now = Date.now();
      if (this.playing) this.position += (now - this.lastTick) / 1000;
      this.lastTick = now;
    }

    emitState(state) {
      if (this.destroyed || this.state === state) return;
      this.state = state;
      this.options.events.onStateChange({ data: state });
    }

    playVideo() {
      this.tick();
      this.playing = true;
      this.emitState(3);
      setTimeout(() => this.emitState(1), 0);
    }

    pauseVideo() {
      this.tick();
      this.playing = false;
      this.emitState(2);
    }

    seekTo(seconds) {
      this.tick();
      this.position = Math.max(0, Number(seconds) || 0);
      this.seeks += 1;
      registry.seeks += 1;
    }

    getCurrentTime() {
      this.tick();
      return this.position;
    }

    getDuration() {
      return this.duration;
    }

    getPlayerState() {
      return this.state;
    }

    mute() {
      this.muted = true;
    }

    unMute() {
      this.muted = false;
    }

    setVolume() {}

    destroy() {
      this.destroyed = true;
      this.playing = false;
    }

    emitError(code) {
      this.options.events.onError({ data: code });
    }
  }

  window.YT = {
    Player: FakePlayer,
    PlayerState: { PLAYING: 1, PAUSED: 2, BUFFERING: 3, ENDED: 0, CUED: 5 },
  };
})();
`;

async function installFakeYouTube(context: BrowserContext) {
  await context.addInitScript({ content: FAKE_YOUTUBE_SCRIPT });
  // Không tải iframe_api thật (window.YT đã có sẵn) và chặn luôn thumbnail.
  await context.route("https://www.youtube.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "/* fake */" }),
  );
  await context.route("https://i.ytimg.com/**", (route) => route.abort());
}

function fakePlayer(page: Page): Promise<FakePlayerSnapshot | null> {
  return page.evaluate(() => {
    const registry = (window as unknown as FakeYouTubeWindow).__fakeYouTube;
    const player = registry?.players.at(-1);
    if (!player) return null;
    return {
      videoId: player.videoId,
      playing: player.playing,
      position: player.getCurrentTime(),
      muted: player.muted,
      state: player.state,
      destroyed: player.destroyed,
    };
  });
}

function fakeSeekCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as FakeYouTubeWindow).__fakeYouTube?.seeks ?? 0,
  );
}

async function emitPlayerError(page: Page, code: number) {
  await page.evaluate((value) => {
    const registry = (window as unknown as FakeYouTubeWindow).__fakeYouTube;
    registry?.players.at(-1)?.emitError(value);
  }, code);
}

async function emitPlayerState(page: Page, state: number) {
  await page.evaluate((value) => {
    const registry = (window as unknown as FakeYouTubeWindow).__fakeYouTube;
    registry?.players.at(-1)?.emitState(value);
  }, state);
}

async function roomSnapshot(context: BrowserContext, code: string) {
  const response = await context.request.get(`${API_URL}/api/rooms/${code}`);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    lifecycle: string;
    nowPlaying: { state: string; videoId: string; version: number } | null;
  };
  return payload;
}

test("Chủ rạp thấy video phát trên màn chiếu", async ({ browser }) => {
  const context = await browser.newContext();
  await installFakeYouTube(context);
  const page = await context.newPage();

  await createRoomThroughUi(page, "Phòng chiếu video");
  await expect(page.locator(".yt-host")).toHaveCount(1);

  await expect.poll(async () => (await fakePlayer(page))?.playing).toBe(true);
  await expect.poll(async () => (await fakePlayer(page))?.position ?? 0).toBeGreaterThan(0.5);

  // Player luôn bắt đầu ở chế độ tắt tiếng để không bị chặn autoplay.
  expect((await fakePlayer(page))?.muted).toBe(true);

  await context.close();
});

test("Khách vào phòng nhận đúng video và trạng thái phát", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng đồng bộ hai người");

  const guestContext = await browser.newContext();
  await installFakeYouTube(guestContext);
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khách xem phim");
  await joinByLink(guestPage, code);

  await expect(guestPage.locator(".yt-host")).toHaveCount(1);
  await expect.poll(async () => (await fakePlayer(guestPage))?.playing).toBe(true);
  await expect(guestPage.locator("#now-playing-title")).not.toBeEmpty();

  const host = await fakePlayer(hostPage);
  const guest = await fakePlayer(guestPage);
  expect(guest?.videoId).toBe(host?.videoId);
  expect(guest?.position ?? 0).toBeGreaterThan(0);

  await hostContext.close();
  await guestContext.close();
});

test("Chủ rạp tạm dừng và khách nhận trạng thái tạm dừng", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng tạm dừng");

  const guestContext = await browser.newContext();
  await installFakeYouTube(guestContext);
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khách tạm dừng");
  await joinByLink(guestPage, code);
  await expect.poll(async () => (await fakePlayer(guestPage))?.playing).toBe(true);

  await hostPage.getByRole("button", { name: "Tạm dừng" }).click();

  await expect.poll(async () => (await fakePlayer(hostPage))?.playing).toBe(false);
  await expect.poll(async () => (await fakePlayer(guestPage))?.playing).toBe(false);
  expect((await roomSnapshot(hostContext, code)).nowPlaying?.state).toBe("paused");

  await hostContext.close();
  await guestContext.close();
});

test("Khách không thể gọi API điều khiển phát", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng phân quyền phát");

  const guestContext = await browser.newContext();
  await installFakeYouTube(guestContext);
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khách điều khiển");
  await joinByLink(guestPage, code);

  const pause = await guestContext.request.post(`${API_URL}/api/rooms/${code}/video/pause`, {
    data: { positionSec: 5 },
  });
  expect(pause.status()).toBe(403);
  expect(((await pause.json()) as { code: string }).code).toBe("NOT_ROOM_HOST");

  const seek = await guestContext.request.post(`${API_URL}/api/rooms/${code}/video/seek`, {
    data: { positionSec: 30 },
  });
  expect(seek.status()).toBe(403);

  // Nút điều khiển của khách bị vô hiệu hoá, nhưng bảo vệ thật nằm ở Backend.
  await expect(guestPage.getByRole("button", { name: "Tạm dừng" })).toBeDisabled();
  expect((await roomSnapshot(hostContext, code)).nowPlaying?.state).toBe("playing");

  await hostContext.close();
  await guestContext.close();
});

test("Người vào sau được đồng bộ đúng vị trí đang phát", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng vào muộn");
  await expect.poll(async () => (await fakePlayer(hostPage))?.playing).toBe(true);
  await hostPage.waitForTimeout(3000);

  const guestContext = await browser.newContext();
  await installFakeYouTube(guestContext);
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khách vào muộn");
  await joinByLink(guestPage, code);
  await expect.poll(async () => (await fakePlayer(guestPage))?.playing).toBe(true);

  const host = await fakePlayer(hostPage);
  const guest = await fakePlayer(guestPage);
  expect(guest?.position ?? 0).toBeGreaterThan(2);
  expect(Math.abs((guest?.position ?? 0) - (host?.position ?? 0))).toBeLessThan(2);

  await hostContext.close();
  await guestContext.close();
});

test("Tải lại trang vẫn khôi phục đúng video đang phát", async ({ browser }) => {
  const context = await browser.newContext();
  await installFakeYouTube(context);
  const page = await context.newPage();
  await createRoomThroughUi(page, "Phòng tải lại video");
  await expect.poll(async () => (await fakePlayer(page))?.playing).toBe(true);
  const before = await fakePlayer(page);

  await page.reload();
  await expect.poll(async () => (await fakePlayer(page))?.playing).toBe(true);
  const after = await fakePlayer(page);
  expect(after?.videoId).toBe(before?.videoId);
  expect(after?.position ?? 0).toBeGreaterThan(0);

  await context.close();
});

test("Chủ rạp đổi video và khách nhận video mới", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng đổi video");

  const guestContext = await browser.newContext();
  await installFakeYouTube(guestContext);
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khách đổi video");
  await joinByLink(guestPage, code);
  await expect.poll(async () => (await fakePlayer(guestPage))?.playing).toBe(true);

  await hostPage.getByRole("button", { name: "Gửi video" }).click();
  await hostPage.locator("#queue-url").fill(`https://youtu.be/${OTHER_VIDEO_ID}`);
  await hostPage.getByRole("button", { name: "Chiếu ngay" }).click();

  await expect.poll(async () => (await fakePlayer(hostPage))?.videoId).toBe(OTHER_VIDEO_ID);
  await expect.poll(async () => (await fakePlayer(guestPage))?.videoId).toBe(OTHER_VIDEO_ID);
  expect((await roomSnapshot(hostContext, code)).nowPlaying?.videoId).toBe(OTHER_VIDEO_ID);

  await hostContext.close();
  await guestContext.close();
});

test("Video không nhúng được thì cả phòng thấy thông báo lỗi", async ({ browser }) => {
  const hostContext = await browser.newContext();
  await installFakeYouTube(hostContext);
  const hostPage = await hostContext.newPage();
  const code = await createRoomThroughUi(hostPage, "Phòng video lỗi");

  const guestContext = await browser.newContext();
  await installFakeYouTube(guestContext);
  const guestPage = await guestContext.newPage();
  await signUp(guestContext, "Khách video lỗi");
  await joinByLink(guestPage, code);
  await expect.poll(async () => (await fakePlayer(guestPage))?.playing).toBe(true);

  await emitPlayerError(hostPage, 101);

  await expect(hostPage.getByText("Không phát được video này")).toBeVisible();
  await expect(hostPage.getByText("Chủ video không cho phép phát nhúng.")).toBeVisible();
  await expect(guestPage.getByText("Chủ video không cho phép phát nhúng.")).toBeVisible();
  expect((await roomSnapshot(hostContext, code)).nowPlaying?.state).toBe("error");

  await hostContext.close();
  await guestContext.close();
});

test("Buffering không sinh vòng lặp điều khiển", async ({ browser }) => {
  const context = await browser.newContext();
  await installFakeYouTube(context);
  const page = await context.newPage();
  await createRoomThroughUi(page, "Phòng buffering");
  await expect.poll(async () => (await fakePlayer(page))?.playing).toBe(true);

  const before = await fakeSeekCount(page);
  await emitPlayerState(page, 3);
  await page.waitForTimeout(2500);
  const after = await fakeSeekCount(page);

  // Trong lúc buffering, thuật toán đồng bộ phải đứng yên hoàn toàn.
  expect(after - before).toBeLessThanOrEqual(1);

  await context.close();
});

test("Hai phòng không ảnh hưởng trạng thái phát của nhau", async ({ browser }) => {
  const firstContext = await browser.newContext();
  await installFakeYouTube(firstContext);
  const firstPage = await firstContext.newPage();
  const firstCode = await createRoomThroughUi(firstPage, "Phòng một");
  await expect.poll(async () => (await fakePlayer(firstPage))?.playing).toBe(true);

  const secondContext = await browser.newContext();
  await installFakeYouTube(secondContext);
  const secondPage = await secondContext.newPage();
  const secondCode = await createRoomThroughUi(secondPage, "Phòng hai");
  await expect.poll(async () => (await fakePlayer(secondPage))?.playing).toBe(true);

  await firstPage.getByRole("button", { name: "Tạm dừng" }).click();
  await expect.poll(async () => (await fakePlayer(firstPage))?.playing).toBe(false);

  expect((await roomSnapshot(firstContext, firstCode)).nowPlaying?.state).toBe("paused");
  expect((await roomSnapshot(secondContext, secondCode)).nowPlaying?.state).toBe("playing");
  expect((await fakePlayer(secondPage))?.playing).toBe(true);

  await firstContext.close();
  await secondContext.close();
});
