"use client";

import { useEffect, useRef } from "react";
import type { PlaybackErrorCode } from "@/lib/room-types";
import { phaseFromPlayerState, type PlayerHandle } from "@/lib/player-controller";
import type { PlayerPhase } from "@/lib/video-sync";

type YTPlayer = {
  playVideo?: () => void;
  pauseVideo?: () => void;
  mute?: () => void;
  unMute?: () => void;
  setVolume?: (volume: number) => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  getPlayerState?: () => number;
  destroy?: () => void;
};

type YTNamespace = {
  Player: new (element: HTMLElement | string, options: Record<string, unknown>) => YTPlayer;
  PlayerState?: { PLAYING: number; PAUSED: number; BUFFERING: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise<void>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        // Cho phép lần mount sau thử lại thay vì treo promise vĩnh viễn.
        apiPromise = null;
        reject(new Error("iframe_api_failed"));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

export function errorCodeFromYouTube(code: number): PlaybackErrorCode {
  if (code === 100) return "removed";
  if (code === 101 || code === 150) return "embed-disabled";
  return "unavailable";
}

/**
 * Nhúng YouTube bằng IFrame Player API.
 *
 * Player chỉ được tạo lại khi `videoId` đổi. Mọi thay đổi play/pause/seek được áp
 * qua `PlayerHandle`, không đưa `startAtSec` vào dependency (nếu không mỗi lần seek
 * sẽ destroy + tạo lại iframe và video nhảy về đầu).
 */
export function YouTubePlayer({
  videoId,
  onReady,
  onFirstFrame,
  onPhaseChange,
  onError,
  onEnded,
}: {
  videoId: string;
  onReady: (handle: PlayerHandle) => void;
  onFirstFrame: () => void;
  onPhaseChange: (phase: PlayerPhase) => void;
  onError: (code: PlaybackErrorCode) => void;
  onEnded: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const firstFrameRef = useRef(false);
  const callbacks = useRef({ onReady, onFirstFrame, onPhaseChange, onError, onEnded });
  callbacks.current = { onReady, onFirstFrame, onPhaseChange, onError, onEnded };

  useEffect(() => {
    let cancelled = false;
    firstFrameRef.current = false;
    const wrap = hostRef.current;
    if (!wrap) return;

    // YouTube thay thế chính phần tử được truyền vào bằng một <iframe>. Phần tử đó
    // phải do mình tạo bằng tay (không nằm trong cây React) để React không cố
    // removeChild một node mà nó không còn quản lý.
    const holder = document.createElement("div");
    wrap.appendChild(holder);

    const handle: PlayerHandle = {
      play: () => playerRef.current?.playVideo?.(),
      pause: () => playerRef.current?.pauseVideo?.(),
      seekTo: (seconds) => playerRef.current?.seekTo?.(Math.max(0, seconds), true),
      getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
      getDuration: () => playerRef.current?.getDuration?.() ?? 0,
      getPlayerState: () => playerRef.current?.getPlayerState?.() ?? -1,
      mute: () => playerRef.current?.mute?.(),
      unMute: () => playerRef.current?.unMute?.(),
      setVolume: (volume) =>
        playerRef.current?.setVolume?.(Math.max(0, Math.min(100, volume))),
    };

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !holder.isConnected || !window.YT?.Player) return;

        const player = new window.YT.Player(holder, {
          videoId,
          playerVars: {
            // Không autoplay có tiếng. Chỉ play khi shared state là playing và
            // luôn muted cho tới khi người dùng bấm nút âm thanh.
            autoplay: 0,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: { target: YTPlayer }) => {
              if (cancelled) return;
              playerRef.current = event.target;
              event.target.mute?.();
              callbacks.current.onReady(handle);
            },
            onError: (event: { data?: number }) => {
              if (cancelled) return;
              callbacks.current.onError(errorCodeFromYouTube(Number(event.data)));
            },
            onStateChange: (event: { data: number }) => {
              if (cancelled) return;
              const phase = phaseFromPlayerState(event.data);
              callbacks.current.onPhaseChange(phase);
              if (!firstFrameRef.current && (event.data === 1 || event.data === 3 || event.data === 5)) {
                firstFrameRef.current = true;
                callbacks.current.onFirstFrame();
              }
              if (event.data === 0) callbacks.current.onEnded();
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onError("unavailable");
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // Player đã bị gỡ khỏi DOM — không cần xử lý.
      }
      playerRef.current = null;
      wrap.replaceChildren();
    };
  }, [videoId]);

  return <div ref={hostRef} className="yt-host" />;
}
