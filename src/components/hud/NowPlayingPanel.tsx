"use client";

import { ChevronLeft, Clapperboard, SkipForward, ThumbsUp } from "lucide-react";
import { formatDuration, percent } from "@/lib/format";
import type { RoomState } from "@/lib/room-types";
import { useTicker } from "@/lib/use-ticker";
import { positionAt } from "@/lib/video-sync";

export function NowPlayingPanel({
  room,
  collapsed,
  onToggleCollapsed,
  onToggleSkipVote,
  onPlayNext,
}: {
  room: RoomState;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleSkipVote: () => void;
  onPlayNext: () => void;
}) {
  const now = useTicker(1000);
  const playing = room.nowPlaying;
  const nextInQueue = room.queue[0];

  const serverNow = now === null ? null : now + room.serverOffsetMs;
  const position = playing
    ? serverNow === null
      ? playing.offsetSec
      : positionAt(playing, serverNow)
    : 0;
  const duration = playing?.durationSec ?? 0;
  const progress = playing?.isLive ? 100 : percent(position, duration || 1);

  const title = playing?.title ?? "Chưa có suất chiếu";
  const subtitle = playing?.channelTitle ?? "Rạp đang chờ video đầu tiên";
  const description =
    playing?.description ??
    (nextInQueue
      ? `Mục tiếp theo trong hàng chờ: ${nextInQueue.title}. Chỉ chủ rạp mới bấm chiếu được.`
      : "Hàng chờ trống. Gửi một video YouTube để cả rạp cùng xem.");

  return (
    <section
      className={`now-playing panel ${collapsed ? "is-collapsed" : ""}`}
      aria-label="Thông tin suất chiếu"
    >
      <button
        type="button"
        className="now-playing__toggle"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Mở thông tin phim" : "Thu gọn thông tin phim"}
        data-tip={collapsed ? "Thông tin phim" : "Thu gọn"}
      >
        {collapsed ? <Clapperboard size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
      </button>

      <div className="now-playing__content">
        <div className="now-playing__head">
          <span className="eyebrow">Trên màn ảnh</span>
          {playing?.isLive ? (
            <span className="chip chip--live">
              <span className="dot" /> Trực tiếp
            </span>
          ) : playing ? (
            <span className="chip">{playing.state === "playing" ? "Đang chiếu" : "Tạm dừng"}</span>
          ) : (
            <span className="chip chip--warn">Đang chờ</span>
          )}
        </div>

        <h1 id="now-playing-title" className="now-playing__title">
          {title}
        </h1>

        <div className="now-playing__meta">
          <span>{subtitle}</span>
          {playing && !playing.isLive ? <span>· {formatDuration(duration)}</span> : null}
        </div>

        <p className="now-playing__desc">{description}</p>

        <div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Tiến trình phát"
          >
            <div className="progress__bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress__labels" style={{ marginTop: 6 }}>
            <span>{playing?.isLive ? "Trực tiếp" : formatDuration(position)}</span>
            <span>{playing?.isLive ? "—" : formatDuration(duration)}</span>
          </div>
        </div>

        {room.skipVote && playing ? (
          <div className="vote">
            <div className="vote__row">
              <span>Bình chọn bỏ qua video</span>
              <span className="vote__ratio">
                {percent(room.skipVote.yes, room.skipVote.total)}%
              </span>
            </div>
            <div className="vote__row">
              <span>
                {room.skipVote.yes} / {room.skipVote.total} người đồng ý
              </span>
              <span style={{ color: "var(--text-faint)" }}>cần 50%</span>
            </div>
            <button
              type="button"
              className={`btn ${room.skipVote.voted ? "btn-primary" : "btn-secondary"} btn-block`}
              onClick={onToggleSkipVote}
              aria-pressed={room.skipVote.voted}
            >
              {room.skipVote.voted ? (
                <ThumbsUp size={15} aria-hidden="true" />
              ) : (
                <SkipForward size={15} aria-hidden="true" />
              )}
              {room.skipVote.voted ? "Bạn đã vote · rút phiếu" : "Vote bỏ qua"}
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={onPlayNext}>
              Chuyển bài tiếp theo
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary btn-block" onClick={onPlayNext}>
            Chọn video tiếp theo
          </button>
        )}
      </div>
    </section>
  );
}
