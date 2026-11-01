"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Clapperboard,
  Pause,
  Play,
  SkipForward,
  ThumbsUp,
} from "lucide-react";
import { formatDuration, percent } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { RoomState } from "@/lib/room-types";
import { useRoomStore } from "@/lib/room-store";
import { useTicker } from "@/lib/use-ticker";
import { positionAt } from "@/lib/video-sync";

/** Trạng thái còn điều khiển được bằng nút phát/tạm dừng trong panel. */
function isTransportable(state: string): boolean {
  return state === "playing" || state === "paused" || state === "buffering";
}

export function NowPlayingPanel({
  room,
  collapsed,
  isHost,
  onToggleCollapsed,
  onToggleSkipVote,
  onPlay,
  onPause,
  onSeek,
  onOpenVideoPicker,
}: {
  room: RoomState;
  collapsed: boolean;
  isHost: boolean;
  onToggleCollapsed: () => void;
  onToggleSkipVote: () => void;
  onPlay: (positionSec: number) => void;
  onPause: (positionSec: number) => void;
  onSeek: (positionSec: number) => void;
  onOpenVideoPicker: () => void;
}) {
  const t = useT();
  const now = useTicker(1000);
  const playerDurationSec = useRoomStore((state) => state.playerDurationSec);
  const [seekDraft, setSeekDraft] = useState<number | null>(null);
  const playing = room.nowPlaying;
  const nextInQueue = room.queue[0];

  const serverNow = now === null ? null : now + room.serverOffsetMs;
  const position = playing
    ? serverNow === null
      ? playing.offsetSec
      : positionAt(playing, serverNow)
    : 0;
  // durationSec của phòng có thể là 0 (video do người dùng dán link), khi đó lấy
  // độ dài Player đo được để vẫn hiển thị tiến trình và cho phép tua.
  const duration = playing?.isLive
    ? 0
    : Math.max(playing?.durationSec ?? 0, playerDurationSec);
  const canSeek = isHost && Boolean(playing) && !playing?.isLive && duration > 0;
  const shownPosition = seekDraft ?? position;
  const progress = playing?.isLive
    ? 100
    : duration > 0
      ? percent(shownPosition, duration)
      : 0;

  const title = playing?.title ?? t("nowPlaying.empty");
  const subtitle = playing?.channelTitle ?? t("nowPlaying.waitingFirst");
  const description =
    playing?.description ??
    (nextInQueue
      ? t("nowPlaying.nextInQueue", { title: nextInQueue.title })
      : t("nowPlaying.emptyQueue"));

  // Vị trí tua tạm chỉ sống trong lúc kéo; trạng thái chung mới thì xoá nháp.
  useEffect(() => {
    setSeekDraft(null);
  }, [playing?.version, playing?.videoId]);

  const statusChip = () => {
    if (!playing) return <span className="chip chip--warn">{t("common.waiting")}</span>;
    if (playing.isLive) {
      return (
        <span className="chip chip--live">
          <span className="dot" /> {t("common.live")}
        </span>
      );
    }
    if (playing.state === "playing") {
      return <span className="chip">{t("common.playing")}</span>;
    }
    if (playing.state === "paused") {
      return <span className="chip">{t("common.paused")}</span>;
    }
    if (playing.state === "buffering") {
      return <span className="chip">{t("common.buffering")}</span>;
    }
    if (playing.state === "ended") {
      return <span className="chip chip--warn">{t("common.ended")}</span>;
    }
    if (playing.state === "error") {
      return <span className="chip chip--warn">{t("common.error")}</span>;
    }
    return <span className="chip chip--warn">{t("common.waiting")}</span>;
  };

  return (
    <section
      className={`now-playing panel ${collapsed ? "is-collapsed" : ""}`}
      aria-label={t("nowPlaying.aria")}
    >
      <button
        type="button"
        className="now-playing__toggle"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t("nowPlaying.expand") : t("nowPlaying.collapse")}
        data-tip={collapsed ? t("nowPlaying.infoTip") : t("nowPlaying.collapseTip")}
      >
        {collapsed ? (
          <Clapperboard size={18} aria-hidden="true" />
        ) : (
          <ChevronLeft size={18} aria-hidden="true" />
        )}
      </button>

      <div className="now-playing__content">
        <div className="now-playing__head">
          <span className="eyebrow">{t("nowPlaying.eyebrow")}</span>
          {statusChip()}
        </div>

        <h1 id="now-playing-title" className="now-playing__title">
          {title}
        </h1>

        <div className="now-playing__meta">
          <span>{subtitle}</span>
          {playing && !playing.isLive && duration > 0 ? (
            <span>· {formatDuration(duration)}</span>
          ) : null}
        </div>

        <p className="now-playing__desc">{description}</p>

        <div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label={t("nowPlaying.progress")}
          >
            <div className="progress__bar" style={{ width: `${progress}%` }} />
          </div>
          {canSeek ? (
            <input
              className="input"
              style={{ width: "100%", marginTop: 8, padding: 0 }}
              type="range"
              min={0}
              max={Math.floor(duration)}
              step={1}
              value={Math.round(shownPosition)}
              aria-label={t("playback.seek")}
              onChange={(event) => setSeekDraft(Number(event.target.value))}
              onPointerUp={() => {
                if (seekDraft !== null) onSeek(seekDraft);
              }}
              onKeyUp={() => {
                if (seekDraft !== null) onSeek(seekDraft);
              }}
            />
          ) : null}
          <div className="progress__labels" style={{ marginTop: 6 }}>
            <span>
              {playing?.isLive ? t("common.live") : formatDuration(shownPosition)}
            </span>
            <span>{playing?.isLive || duration <= 0 ? "—" : formatDuration(duration)}</span>
          </div>
        </div>

        {playing && !playing.isLive && isTransportable(playing.state) ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={!isHost}
              title={isHost ? undefined : t("playback.memberWait")}
              onClick={() => {
                if (!isHost) return;
                if (playing.state === "playing") onPause(position);
                else onPlay(position);
              }}
            >
              {playing.state === "playing" ? (
                <Pause size={15} aria-hidden="true" />
              ) : (
                <Play size={15} aria-hidden="true" />
              )}
              {playing.state === "playing" ? t("playback.pause") : t("playback.play")}
            </button>
            {isHost ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={onOpenVideoPicker}
              >
                {t("playback.pickVideo")}
              </button>
            ) : null}
          </div>
        ) : null}

        {room.skipVote && playing ? (
          <div className="vote">
            <div className="vote__row">
              <span>{t("nowPlaying.skipVote")}</span>
              <span className="vote__ratio">
                {percent(room.skipVote.yes, room.skipVote.total)}%
              </span>
            </div>
            <div className="vote__row">
              <span>
                {t("nowPlaying.agreeCount", {
                  yes: room.skipVote.yes,
                  total: room.skipVote.total,
                })}
              </span>
              <span style={{ color: "var(--text-faint)" }}>{t("nowPlaying.needHalf")}</span>
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
              {room.skipVote.voted ? t("nowPlaying.voted") : t("nowPlaying.vote")}
            </button>
          </div>
        ) : null}

        {isHost && (!playing || !isTransportable(playing.state)) ? (
          <button type="button" className="btn btn-primary btn-block" onClick={onOpenVideoPicker}>
            {t("playback.pickVideo")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
