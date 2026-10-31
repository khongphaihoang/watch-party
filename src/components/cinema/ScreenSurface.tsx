"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clapperboard,
  MonitorPlay,
  PlayCircle,
  Radio,
  RotateCcw,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useRoomStore } from "@/lib/room-store";
import type { NowPlaying, UiStatus } from "@/lib/room-types";
import { YouTubePlayer } from "./YouTubePlayer";

function ScreenPoster({
  eyebrow,
  title,
  subtitle,
  busy,
  steps,
  footer,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  busy?: boolean;
  steps?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className="screen-poster">
      <span className="screen-poster__mark">
        <Clapperboard size={112} strokeWidth={0.8} aria-hidden="true" />
      </span>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="screen-poster__title">{title}</h2>
      <p className="screen-poster__sub">{subtitle}</p>
      {steps ? (
        <div className="screen-poster__steps">
          <span>
            <Radio size={24} aria-hidden="true" /> Rạp đang mở cửa
          </span>
          <span>
            <Users size={24} aria-hidden="true" /> Ghế đơn và ghế đôi
          </span>
        </div>
      ) : null}
      {busy ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="spinner" />
          <span style={{ fontSize: "0.46em", color: "var(--text-faint)" }}>
            Đang kết nối YouTube…
          </span>
        </span>
      ) : null}
      {footer}
    </div>
  );
}

function StatusBlock({
  icon,
  title,
  description,
  tone = "normal",
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: "normal" | "danger";
  action?: React.ReactNode;
}) {
  return (
    <div className={`screen-status ${tone === "danger" ? "screen-status--danger" : ""}`}>
      <span className="screen-status__icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ScreenSurface({
  nowPlaying,
  ui,
  viewerName,
  onPlayNext,
  hasQueue,
}: {
  nowPlaying: NowPlaying | null;
  ui: UiStatus;
  viewerName: string;
  onPlayNext: () => void;
  hasQueue: boolean;
}) {
  const setPlaybackState = useRoomStore((state) => state.setPlaybackState);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const playingState = nowPlaying?.state ?? "idle";
  const mountsPlayer =
    Boolean(nowPlaying) &&
    (playingState === "playing" || playingState === "paused" || playingState === "buffering");

  useEffect(() => {
    setPlayerReady(false);
    setPlayerFailed(false);
  }, [nowPlaying?.videoId, attempt]);

  const handleReady = useCallback(() => {
    setPlayerReady(true);
    setPlayerFailed(false);
  }, []);
  const handleError = useCallback(() => setPlayerFailed(true), []);
  const handleEnded = useCallback(() => setPlaybackState("ended"), [setPlaybackState]);

  const showPoster = !mountsPlayer || !playerReady || playerFailed;

  return (
    <>
      <div className="screen-glow" aria-hidden="true" />
      <div className="screen-frame">
        <div className="screen-inner">
          {mountsPlayer && nowPlaying ? (
            <YouTubePlayer
              key={`${nowPlaying.videoId}-${attempt}`}
              videoId={nowPlaying.videoId}
              startAtSec={nowPlaying.offsetSec}
              onReady={handleReady}
              onError={handleError}
              onEnded={handleEnded}
            />
          ) : null}

          {showPoster ? (
            <ScreenPoster
              eyebrow={nowPlaying ? "ĐANG KẾT NỐI MÀN CHIẾU" : "MỘT CHIẾC RẠP · CẢ HỘI CÙNG XEM"}
              title={
                nowPlaying ? (
                  nowPlaying.title
                ) : (
                  <>
                    Chỗ này còn trống.
                    <br />
                    Chờ bạn và một bộ phim hay.
                  </>
                )
              }
              subtitle={
                playerFailed
                  ? "Chưa tải được YouTube. Bạn thử lại nhé."
                  : nowPlaying
                    ? `${nowPlaying.channelTitle} · màn chiếu đang chuẩn bị`
                    : "Chọn một chỗ ngồi · Gửi video bạn thích · Bình luận cùng nhau"
              }
              busy={mountsPlayer && !playerFailed}
              steps={!nowPlaying}
              footer={
                playerFailed && nowPlaying ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAttempt((value) => value + 1)}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    Thử lại
                  </button>
                ) : null
              }
            />
          ) : null}

          {nowPlaying && showPoster ? (
            <>
              <div className="screen-topline" aria-hidden="true">
                <span>RẠP NHÀ / PHÒNG CHIẾU CHUNG</span>
                <span>{nowPlaying.isLive ? "TRỰC TIẾP" : "CÙNG MỘT MÀN HÌNH"}</span>
              </div>
              <div className="screen-botline" aria-hidden="true">
                <span>{nowPlaying.channelTitle}</span>
                <span>EST. 2026</span>
              </div>
            </>
          ) : null}

          <div className="screen-scanlines" aria-hidden="true" />

          {ui === "loading" ? (
            <StatusBlock
              icon={<span className="spinner" />}
              title="Đang mở cửa rạp…"
              description="Đang lấy trạng thái phòng và xếp ghế. Chờ một nhịp thôi."
            />
          ) : null}

          {ui === "full" ? (
            <StatusBlock
              icon={<Users size={56} aria-hidden="true" />}
              title="Rạp đã kín chỗ"
              description="Cả 72 ghế đã có người. Bạn vẫn xem được ở chế độ khán giả và trò chuyện cùng rạp."
              action={
                <button type="button" className="btn btn-secondary" onClick={onPlayNext}>
                  Xem ở chế độ khán giả
                </button>
              }
            />
          ) : null}

          {ui === "ended" ? (
            <StatusBlock
              icon={<Clapperboard size={56} aria-hidden="true" />}
              title="Suất chiếu đã kết thúc"
              description="Cảm ơn cả hội đã cùng xem. Ghế của bạn được giữ trong 10 phút nếu muốn mở suất mới."
            />
          ) : null}

          {ui === "ready" && playingState === "paused" ? (
            <StatusBlock
              icon={<PlayCircle size={56} aria-hidden="true" />}
              title="Tạm dừng"
              description="Chủ rạp vừa tạm dừng để cả hội kịp vào. Video sẽ tiếp tục khi chủ rạp bấm phát."
            />
          ) : null}

          {ui === "ready" && playingState === "buffering" ? (
            <StatusBlock
              icon={<span className="spinner" />}
              title="Đang đồng bộ…"
              description="Đang căn lại thời điểm phát với cả rạp."
            />
          ) : null}

          {ui === "ready" && playingState === "error" ? (
            <StatusBlock
              tone="danger"
              icon={<TriangleAlert size={56} aria-hidden="true" />}
              title="Không phát được video này"
              description={
                nowPlaying?.errorCode === "embed-disabled"
                  ? "Chủ video không cho phép phát nhúng."
                  : nowPlaying?.errorCode === "removed"
                    ? "Video đã bị xoá hoặc đặt riêng tư."
                    : "YouTube không phát được video này. Bạn thử lại hoặc bỏ qua video."
              }
              action={
                <button type="button" className="btn btn-primary" onClick={onPlayNext}>
                  Bỏ qua video, chiếu mục tiếp theo
                </button>
              }
            />
          ) : null}

          {ui === "ready" && playingState === "ended" ? (
            <StatusBlock
              icon={<MonitorPlay size={56} aria-hidden="true" />}
              title="Hết video"
              description={
                hasQueue
                  ? `Xin chào ${viewerName} — hàng chờ còn video, bấm để chiếu tiếp.`
                  : "Hàng chờ đang trống. Gửi video để cả rạp xem tiếp."
              }
              action={
                <button type="button" className="btn btn-primary" onClick={onPlayNext}>
                  Chuyển bài tiếp theo
                </button>
              }
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
