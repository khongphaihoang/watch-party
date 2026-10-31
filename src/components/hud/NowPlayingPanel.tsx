"use client";

import { ChevronLeft, Clapperboard, SkipForward, ThumbsUp } from "lucide-react";
import { formatDuration, percent } from "@/lib/format";
import { useT } from "@/lib/i18n";
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
  const t = useT();
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

  const title = playing?.title ?? t("nowPlaying.empty");
  const subtitle = playing?.channelTitle ?? t("nowPlaying.waitingFirst");
  const description =
    playing?.description ??
    (nextInQueue
      ? t("nowPlaying.nextInQueue", { title: nextInQueue.title })
      : t("nowPlaying.emptyQueue"));

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
        {collapsed ? <Clapperboard size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
      </button>

      <div className="now-playing__content">
        <div className="now-playing__head">
          <span className="eyebrow">{t("nowPlaying.eyebrow")}</span>
          {playing?.isLive ? (
            <span className="chip chip--live">
              <span className="dot" /> {t("common.live")}
            </span>
          ) : playing ? (
            <span className="chip">
              {playing.state === "playing" ? t("common.playing") : t("common.paused")}
            </span>
          ) : (
            <span className="chip chip--warn">{t("common.waiting")}</span>
          )}
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
            aria-valuenow={progress}
            aria-label={t("nowPlaying.progress")}
          >
            <div className="progress__bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress__labels" style={{ marginTop: 6 }}>
            <span>{playing?.isLive ? t("common.live") : formatDuration(position)}</span>
            <span>
              {playing?.isLive || duration <= 0 ? "—" : formatDuration(duration)}
            </span>
          </div>
        </div>

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
            <button type="button" className="btn btn-ghost btn-block" onClick={onPlayNext}>
              {t("nowPlaying.playNext")}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary btn-block" onClick={onPlayNext}>
            {t("nowPlaying.chooseNext")}
          </button>
        )}
      </div>
    </section>
  );
}
