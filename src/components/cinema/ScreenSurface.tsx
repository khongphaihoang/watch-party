"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { setPlayerHandle, type PlayerHandle } from "@/lib/player-controller";
import type { NowPlaying, PlaybackErrorCode, UiStatus } from "@/lib/room-types";
import {
  DRIFT_CHECK_MS,
  SYNC_SUPPRESS_MS,
  planSync,
  positionAt,
  type PlayerPhase,
} from "@/lib/video-sync";
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
  isHost,
  onOpenVideoPicker,
}: {
  nowPlaying: NowPlaying | null;
  ui: UiStatus;
  isHost: boolean;
  onOpenVideoPicker: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const reportEnded = useRoomStore((state) => state.reportEnded);
  const reportError = useRoomStore((state) => state.reportError);
  const refresh = useRoomStore((state) => state.refresh);
  const setPlayerDuration = useRoomStore((state) => state.setPlayerDuration);
  const serverOffsetMs = useRoomStore((state) => state.room?.serverOffsetMs ?? 0);
  const soundOn = useRoomStore((state) => state.soundOn);
  const volume = useRoomStore((state) => state.volume);

  const [playerReady, setPlayerReady] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);
  const [playerPhase, setPlayerPhase] = useState<PlayerPhase>("loading");
  const [attempt, setAttempt] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [localEnded, setLocalEnded] = useState(false);
  const handleRef = useRef<PlayerHandle | null>(null);
  const suppressedUntilRef = useRef(0);
  const syncTimerRef = useRef<number | null>(null);
  const blockedTimerRef = useRef<number | null>(null);
  const endedReportedRef = useRef(false);
  const errorReportedRef = useRef(false);

  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const playingState = nowPlaying?.state ?? "idle";
  const mountsPlayer =
    Boolean(nowPlaying) &&
    (playingState === "playing" || playingState === "paused" || playingState === "buffering");

  useEffect(() => {
    setPlayerReady(false);
    setPlayerFailed(false);
    setPlayerPhase("loading");
    setAutoplayBlocked(false);
    setLocalEnded(false);
    endedReportedRef.current = false;
    errorReportedRef.current = false;
    suppressedUntilRef.current = 0;
    setPlayerDuration(0);
  }, [nowPlaying?.videoId, attempt, setPlayerDuration]);

  useEffect(
    () => () => {
      setPlayerHandle(null);
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      if (blockedTimerRef.current) window.clearTimeout(blockedTimerRef.current);
    },
    [],
  );

  const showSyncing = useCallback(() => {
    setSyncing(true);
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => setSyncing(false), 1200);
  }, []);

  const clearBlockedTimer = useCallback(() => {
    if (blockedTimerRef.current) {
      window.clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = null;
    }
  }, []);

  /** Áp trạng thái chung một lần (onReady, đổi version, quay lại tab). */
  const applyState = useCallback(() => {
    const handle = handleRef.current;
    if (!handle || !nowPlaying) return;

    const target = positionAt(nowPlaying, Date.now() + serverOffsetMs);
    const current = handle.getCurrentTime();
    if (nowPlaying.isLive || nowPlaying.videoType === "live") {
      handle.play();
      showSyncing();
      return;
    }

    if (nowPlaying.state === "playing") {
      if (Math.abs(current - target) > 0.5) {
        handle.seekTo(target);
        suppressedUntilRef.current = Date.now() + SYNC_SUPPRESS_MS;
        showSyncing();
      }
      handle.play();
      clearBlockedTimer();
      // Muted autoplay vẫn có thể bị chặn; chỉ hiện nút local, không đổi state.
      blockedTimerRef.current = window.setTimeout(() => {
        const state = handle.getPlayerState();
        if (state !== 1 && state !== 3) setAutoplayBlocked(true);
      }, 2000);
      return;
    }

    setAutoplayBlocked(false);
    if (nowPlaying.state === "paused") {
      if (Math.abs(current - target) > 0.5) {
        handle.seekTo(target);
        suppressedUntilRef.current = Date.now() + SYNC_SUPPRESS_MS;
        showSyncing();
      }
      handle.pause();
      return;
    }
    handle.pause();
  }, [nowPlaying, serverOffsetMs, clearBlockedTimer, showSyncing]);

  useEffect(() => {
    if (playerReady) applyState();
  }, [applyState, playerReady]);

  const checkDrift = useCallback(() => {
    const handle = handleRef.current;
    if (!handle || !nowPlaying || !playerReady) return;
    const nowMs = Date.now();
    const plan = planSync({
      nowPlaying,
      serverNow: nowMs + serverOffsetMs,
      playerPosition: handle.getCurrentTime(),
      playerPhase,
      suppressedUntil: suppressedUntilRef.current,
      nowMs,
    });
    if (plan.action === "none") return;
    if (plan.action === "resync") void refresh();
    handle.seekTo(plan.targetSec);
    suppressedUntilRef.current = nowMs + SYNC_SUPPRESS_MS;
    if (plan.action !== "soft-seek") showSyncing();
  }, [nowPlaying, playerReady, playerPhase, serverOffsetMs, refresh, showSyncing]);

  useEffect(() => {
    if (!playerReady || !nowPlaying || nowPlaying.state !== "playing") return;
    const timer = window.setInterval(checkDrift, DRIFT_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [playerReady, nowPlaying?.state, checkDrift, nowPlaying]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") checkDrift();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkDrift]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle || !playerReady) return;
    if (soundOn) {
      handle.unMute();
      handle.setVolume(volume);
    } else {
      handle.mute();
    }
  }, [soundOn, volume, playerReady]);

  const handlePlayerReady = useCallback(
    (handle: PlayerHandle) => {
      handleRef.current = handle;
      setPlayerHandle(handle);
      setPlayerFailed(false);
      setPlayerDuration(handle.getDuration());
      if (soundOn) {
        handle.unMute();
        handle.setVolume(volume);
      } else {
        handle.mute();
      }
      applyState();
    },
    [applyState, soundOn, volume, setPlayerDuration],
  );

  const handleFirstFrame = useCallback(() => {
    setPlayerReady(true);
    setPlayerFailed(false);
    setPlayerDuration(handleRef.current?.getDuration() ?? 0);
  }, [setPlayerDuration]);

  const handlePhaseChange = useCallback((phase: PlayerPhase) => {
    setPlayerPhase(phase);
    if (phase === "playing") {
      setAutoplayBlocked(false);
      setPlayerFailed(false);
      if (!nowPlaying || nowPlaying.state === "playing") setLocalEnded(false);
    }
  }, [nowPlaying]);

  const handlePlayerError = useCallback(
    (code: PlaybackErrorCode) => {
      setPlayerFailed(true);
      if (isHost && !errorReportedRef.current) {
        errorReportedRef.current = true;
        void reportError(code);
      }
    },
    [isHost, reportError],
  );

  const handleEnded = useCallback(() => {
    setPlayerPhase("ended");
    setLocalEnded(true);
    if (isHost && !endedReportedRef.current) {
      endedReportedRef.current = true;
      void reportEnded();
    }
  }, [isHost, reportEnded]);

  // Rạp đang chờ đăng nhập: màn chiếu để trống, lời mời đăng nhập là thẻ 2D
  // phía trước nên không vẽ poster kẻo chữ chồng lên nhau. Lỗi/hết video có
  // StatusBlock riêng nên cũng không vẽ poster để khỏi chồng chữ.
  const hasStatusBlock =
    ui === "ready" && (playingState === "error" || playingState === "ended");
  const showPoster =
    ui !== "login" && !hasStatusBlock && (!mountsPlayer || !playerReady || playerFailed);

  return (
    <>
      <div className="screen-glow" aria-hidden="true" />
      <div className="screen-frame">
        <div className="screen-inner">
          {mountsPlayer && nowPlaying ? (
            <YouTubePlayer
              key={`${nowPlaying.videoId}-${attempt}`}
              videoId={nowPlaying.videoId}
              onReady={handlePlayerReady}
              onFirstFrame={handleFirstFrame}
              onPhaseChange={handlePhaseChange}
              onError={handlePlayerError}
              onEnded={handleEnded}
            />
          ) : null}

          {syncing ? (
            <span
              className="chip"
              style={{ position: "absolute", top: 12, right: 12, zIndex: 4 }}
              role="status"
            >
              {t("playback.syncing")}
            </span>
          ) : null}

          {localEnded && playingState === "playing" ? (
            <span
              className="chip chip--warn"
              style={{ position: "absolute", bottom: 12, left: 12, zIndex: 4 }}
              role="status"
            >
              {t("playback.waitingHost")}
            </span>
          ) : null}

          {autoplayBlocked && mountsPlayer && !playerFailed ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 5,
              }}
              onClick={() => {
                handleRef.current?.play();
                setAutoplayBlocked(false);
              }}
            >
              <PlayCircle size={16} aria-hidden="true" />
              {t("playback.autoplayBlocked")}
            </button>
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
                <button type="button" className="btn btn-secondary" onClick={goHome}>
                  {t("room.goHome")}
                </button>
              }
            />
          ) : null}

          {ui === "ended" ? (
            <StatusBlock
              icon={<Clapperboard size={56} aria-hidden="true" />}
              title={t("screen.endedTitle")}
              description={t("screen.endedDesc")}
              action={
                <button type="button" className="btn btn-secondary" onClick={goHome}>
                  {t("room.goHome")}
                </button>
              }
            />
          ) : null}

          {ui === "missing" ? (
            <StatusBlock
              tone="danger"
              icon={<TriangleAlert size={56} aria-hidden="true" />}
              title={t("room.missingTitle")}
              description={t("room.missingDesc")}
              action={
                <button type="button" className="btn btn-secondary" onClick={goHome}>
                  {t("room.goHome")}
                </button>
              }
            />
          ) : null}

          {ui === "removed" ? (
            <StatusBlock
              tone="danger"
              icon={<Users size={56} aria-hidden="true" />}
              title={t("room.removedTitle")}
              description={t("room.removedDesc")}
              action={
                <button type="button" className="btn btn-secondary" onClick={goHome}>
                  {t("room.goHome")}
                </button>
              }
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
                isHost ? (
                  <button type="button" className="btn btn-primary" onClick={onOpenVideoPicker}>
                    {t("playback.pickVideo")}
                  </button>
                ) : undefined
              }
            />
          ) : null}

          {ui === "ready" && playingState === "ended" ? (
            <StatusBlock
              icon={<MonitorPlay size={56} aria-hidden="true" />}
              title={t("screen.videoEndedTitle")}
              description={isHost ? t("screen.videoEndedEmpty") : t("playback.waitingHost")}
              action={
                isHost ? (
                  <button type="button" className="btn btn-primary" onClick={onOpenVideoPicker}>
                    {t("playback.pickVideo")}
                  </button>
                ) : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
