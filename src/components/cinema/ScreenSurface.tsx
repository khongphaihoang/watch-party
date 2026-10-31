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
import { useT } from "@/lib/i18n";
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
  const t = useT();
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
            <Radio size={24} aria-hidden="true" /> {t("screen.stepOpen")}
          </span>
          <span>
            <Users size={24} aria-hidden="true" /> {t("screen.stepSeats")}
          </span>
        </div>
      ) : null}
      {busy ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="spinner" />
          <span style={{ fontSize: "0.46em", color: "var(--text-faint)" }}>
            {t("screen.connectingYouTube")}
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
  const t = useT();
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
              eyebrow={
                nowPlaying ? t("screen.eyebrowConnecting") : t("screen.eyebrowIdle")
              }
              title={
                nowPlaying ? (
                  nowPlaying.title
                ) : (
                  <>
                    {t("screen.titleIdleLine1")}
                    <br />
                    {t("screen.titleIdleLine2")}
                  </>
                )
              }
              subtitle={
                playerFailed
                  ? t("screen.playerFailed")
                  : nowPlaying
                    ? t("screen.preparing", { channel: nowPlaying.channelTitle })
                    : t("screen.subtitleIdle")
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
                    {t("screen.retry")}
                  </button>
                ) : null
              }
            />
          ) : null}

          {nowPlaying && showPoster ? (
            <>
              <div className="screen-topline" aria-hidden="true">
                <span>{t("screen.topLeft")}</span>
                <span>
                  {nowPlaying.isLive ? t("screen.topRightLive") : t("screen.topRight")}
                </span>
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
              title={t("screen.loadingTitle")}
              description={t("screen.loadingDesc")}
            />
          ) : null}

          {ui === "full" ? (
            <StatusBlock
              icon={<Users size={56} aria-hidden="true" />}
              title={t("screen.fullTitle")}
              description={t("screen.fullDesc")}
              action={
                <button type="button" className="btn btn-secondary" onClick={onPlayNext}>
                  {t("screen.fullAction")}
                </button>
              }
            />
          ) : null}

          {ui === "ended" ? (
            <StatusBlock
              icon={<Clapperboard size={56} aria-hidden="true" />}
              title={t("screen.endedTitle")}
              description={t("screen.endedDesc")}
            />
          ) : null}

          {ui === "ready" && playingState === "paused" ? (
            <StatusBlock
              icon={<PlayCircle size={56} aria-hidden="true" />}
              title={t("screen.pausedTitle")}
              description={t("screen.pausedDesc")}
            />
          ) : null}

          {ui === "ready" && playingState === "buffering" ? (
            <StatusBlock
              icon={<span className="spinner" />}
              title={t("screen.bufferingTitle")}
              description={t("screen.bufferingDesc")}
            />
          ) : null}

          {ui === "ready" && playingState === "error" ? (
            <StatusBlock
              tone="danger"
              icon={<TriangleAlert size={56} aria-hidden="true" />}
              title={t("screen.errorTitle")}
              description={
                nowPlaying?.errorCode === "embed-disabled"
                  ? t("screen.errorEmbed")
                  : nowPlaying?.errorCode === "removed"
                    ? t("screen.errorRemoved")
                    : t("screen.errorGeneric")
              }
              action={
                <button type="button" className="btn btn-primary" onClick={onPlayNext}>
                  {t("screen.errorAction")}
                </button>
              }
            />
          ) : null}

          {ui === "ready" && playingState === "ended" ? (
            <StatusBlock
              icon={<MonitorPlay size={56} aria-hidden="true" />}
              title={t("screen.videoEndedTitle")}
              description={
                hasQueue
                  ? t("screen.videoEndedQueue", { name: viewerName })
                  : t("screen.videoEndedEmpty")
              }
              action={
                <button type="button" className="btn btn-primary" onClick={onPlayNext}>
                  {t("nowPlaying.playNext")}
                </button>
              }
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
