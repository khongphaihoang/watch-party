import type { BrowserContext, Page } from "@playwright/test";

/**
 * YouTube IFrame API giả cho mọi bộ E2E: test chạy offline và vẫn đi đúng luồng
 * `PlayerHandle` của ứng dụng. Dùng chung giữa `video-sync.spec.ts` và
 * `realtime.spec.ts` để hai bản giả không lệch nhau.
 */

export type FakePlayerSnapshot = {
  videoId: string;
  playing: boolean;
  position: number;
  muted: boolean;
  state: number;
  destroyed: boolean;
};

export type FakeYouTubeWindow = {
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

export async function installFakeYouTube(context: BrowserContext) {
  await context.addInitScript({ content: FAKE_YOUTUBE_SCRIPT });
  // Không tải iframe_api thật (window.YT đã có sẵn) và chặn luôn thumbnail.
  await context.route("https://www.youtube.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "/* fake */" }),
  );
  await context.route("https://i.ytimg.com/**", (route) => route.abort());
}

export function fakePlayer(page: Page): Promise<FakePlayerSnapshot | null> {
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

export function fakeSeekCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as FakeYouTubeWindow).__fakeYouTube?.seeks ?? 0,
  );
}

export async function emitPlayerError(page: Page, code: number) {
  await page.evaluate((value) => {
    const registry = (window as unknown as FakeYouTubeWindow).__fakeYouTube;
    registry?.players.at(-1)?.emitError(value);
  }, code);
}

export async function emitPlayerState(page: Page, state: number) {
  await page.evaluate((value) => {
    const registry = (window as unknown as FakeYouTubeWindow).__fakeYouTube;
    registry?.players.at(-1)?.emitState(value);
  }, state);
}
