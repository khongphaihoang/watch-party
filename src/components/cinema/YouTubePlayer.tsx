"use client";

import { useEffect, useRef } from "react";

type YTPlayer = {
  playVideo?: () => void;
  pauseVideo?: () => void;
  mute?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime?: () => number;
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
    apiPromise = new Promise<void>((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

/**
 * Nhúng YouTube bằng IFrame Player API.
 * `onReady` chỉ được gọi khi player thật sự sẵn sàng, nhờ vậy màn chiếu giữ
 * được tấm poster thay vì một khung đen trong lúc tải.
 */
export function YouTubePlayer({
  videoId,
  startAtSec,
  onReady,
  onError,
  onEnded,
}: {
  videoId: string;
  startAtSec: number;
  onReady: (player: YTPlayer) => void;
  onError: () => void;
  onEnded: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const wrap = hostRef.current;
    if (!wrap) return;

    // YouTube thay thế chính phần tử được truyền vào bằng một <iframe>. Phần tử đó
    // phải do mình tạo bằng tay (không nằm trong cây React) để React không cố
    // removeChild một node mà nó không còn quản lý.
    const holder = document.createElement("div");
    wrap.appendChild(holder);

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !holder.isConnected || !window.YT?.Player) return;

        const player = new window.YT.Player(holder, {
          videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            start: Math.max(0, Math.floor(startAtSec)),
            origin: window.location.origin,
          },
          events: {
            onReady: (event: { target: YTPlayer }) => {
              if (cancelled) return;
              event.target.mute?.();
              event.target.playVideo?.();
              playerRef.current = event.target;
            },
            onError: () => {
              if (!cancelled) onError();
            },
            onStateChange: (event: { data: number }) => {
              if (cancelled) return;
              if (event.data === 0) {
                onEnded();
                return;
              }
              // Chỉ ẩn poster khi player đã thực sự có khung hình
              // (đang phát / đệm / đã nạp xong).
              if (event.data === 1 || event.data === 3 || event.data === 5) {
                onReady(playerRef.current ?? ({} as YTPlayer));
              }
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) onError();
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
  }, [videoId, startAtSec, onReady, onError, onEnded]);

  return <div ref={hostRef} className="yt-host" />;
}
