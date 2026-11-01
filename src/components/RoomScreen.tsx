"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, WifiOff } from "lucide-react";
import { CinemaStage } from "@/components/cinema/CinemaStage";
import { CrowdForeground } from "@/components/cinema/CrowdForeground";
import { EmptySeatForeground } from "@/components/cinema/EmptySeatForeground";
import { BottomDock } from "@/components/hud/BottomDock";
import { NowPlayingPanel } from "@/components/hud/NowPlayingPanel";
import { RoomTopBar } from "@/components/hud/RoomTopBar";
import { ToolRail } from "@/components/hud/ToolRail";
import { ChatPanel } from "@/components/panels/ChatPanel";
import { MembersPanel, InfoPanel, PhotosPanel, SettingsPanel } from "@/components/panels/Panels";
import { QueuePanel } from "@/components/panels/QueuePanel";
import { SeatsPanel } from "@/components/panels/SeatsPanel";
import { WardrobePanel } from "@/components/panels/WardrobePanel";
import { BoostPanel } from "@/components/panels/Panels";
import { useRoomStore } from "@/lib/room-store";
import { useT } from "@/lib/i18n";
import {
  CLOCK_REFRESH_MS,
  CLOCK_SAMPLES,
  CLOCK_SAMPLE_GAP_MS,
  pickServerOffset,
  type PingSample,
} from "@/lib/clock-sync";
import { pingServer } from "@/lib/api/realtime";
import type { ViewportTier } from "@/lib/theater-layout";

/** Chờ bao lâu không có thao tác thì HUD trong Focus Mode tự ẩn. */
const FOCUS_IDLE_MS = 2600;
/** Nhịp làm mới snapshot + giữ `last_seen_at` (server dọn sau ~2 phút). */
const HEARTBEAT_MS = 60_000;

function readTier(width: number): ViewportTier {
  if (width < 768) return "compact";
  if (width < 1200) return "medium";
  return "wide";
}

export function RoomScreen({ code }: { code: string }) {
  const {
    room,
    seats,
    bootstrapped,
    bootstrap,
    tier,
    setTier,
    panel,
    setPanel,
    viewpoint,
    setViewpoint,
    mode,
    toggleMode,
    soundOn,
    toggleSound,
    volume,
    setVolume,
    chatDraft: draft,
    setDraft,
    unread,
    toasts,
    pushToast,
    dismissToast,
    takeSeat,
    releaseSeat,
    leaveRoom,
    kickMember,
    closeRoom,
    refresh,
    sendMessage,
    toggleSkipVote,
    enqueue,
    dequeue,
    playUrl,
    playQueueItem,
    playVideo,
    pauseVideo,
    seekVideo,
    setServerOffset,
    setUiStatus,
    focus,
    setFocus,
    toggleFocus,
    infoCollapsed,
    setInfoCollapsed,
    toggleInfo,
    uiHidden,
    toggleUiHidden,
    setUiHidden,
    speakingIds,
    demoVoice,
    setSpeaking,
    toggleDemoVoice,
  } = useRoomStore();

  const t = useT();
  const router = useRouter();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chromeIdle, setChromeIdle] = useState(false);

  useEffect(() => {
    // Điều hướng client-side từ `/` sang `/room/[code]` không reset store,
    // nên phải bootstrap lại khi mã phòng khác mã đang mở.
    if (!bootstrapped || room?.code !== code) void bootstrap(code);
  }, [bootstrapped, bootstrap, code, room?.code]);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      setTier(readTier(window.innerWidth));
    };
    const onResize = () => {
      if (!frame) frame = window.requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [setTier]);

  // Panel thông tin phim chỉ vừa lề trái ở màn rộng; hẹp hơn thì thu gọn sẵn.
  useEffect(() => {
    setInfoCollapsed(tier !== "wide");
  }, [tier, setInfoCollapsed]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      if (event.key === "Escape") {
        if (uiHidden) {
          event.preventDefault();
          setUiHidden(false);
        } else if (focus) {
          event.preventDefault();
          setFocus(false);
        } else if (panel) {
          setPanel(null);
        }
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        toggleFocus();
      }
      if (event.key === "h" || event.key === "H") {
        event.preventDefault();
        toggleUiHidden();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel, setPanel, focus, setFocus, toggleFocus, uiHidden, setUiHidden, toggleUiHidden]);

  useEffect(() => {
    // Nhịp giữ phiên: server dọn thành viên theo `last_seen_at` sau ~2 phút,
    // nên client còn mở tab phải làm mới dấu thời gian này.
    if (room?.ui !== "ready") return;
    const timer = window.setInterval(() => {
      void refresh();
    }, HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [refresh, room?.ui, room?.code]);

  // Đo lệch đồng hồ để tính vị trí phát theo giờ máy chủ, không theo giờ máy khách.
  useEffect(() => {
    if (!room?.code) return;
    let cancelled = false;

    const measure = async () => {
      const samples: PingSample[] = [];
      for (let index = 0; index < CLOCK_SAMPLES; index += 1) {
        const sample = await pingServer();
        if (cancelled) return;
        if (sample) samples.push(sample);
        await new Promise((resolve) => setTimeout(resolve, CLOCK_SAMPLE_GAP_MS));
      }
      if (cancelled) return;
      const offset = pickServerOffset(samples);
      if (offset !== null) setServerOffset(offset);
    };

    void measure();
    const timer = window.setInterval(() => {
      void measure();
    }, CLOCK_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [room?.code, setServerOffset]);

  // Focus Mode: HUD tự ẩn sau vài giây, hiện lại ngay khi có thao tác.
  useEffect(() => {
    if (!focus) {
      setChromeIdle(false);
      return;
    }
    let timer = window.setTimeout(() => setChromeIdle(true), FOCUS_IDLE_MS);
    const wake = () => {
      setChromeIdle((idle) => (idle ? false : idle));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChromeIdle(true), FOCUS_IDLE_MS);
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel"] as const;
    events.forEach((name) => window.addEventListener(name, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, wake));
    };
  }, [focus]);

  // Phase 1: nhịp "có người đang nói" giả lập. Lớp realtime thật sẽ thay bằng
  // setSpeaking(...) từ sự kiện voice-activity.
  useEffect(() => {
    if (!demoVoice || room?.ui !== "ready") {
      setSpeaking([]);
      return;
    }
    let silence = 0;
    const pick = () => {
      const state = useRoomStore.getState();
      const candidates = (state.room?.members ?? []).filter(
        (member) => member.micOn !== false && member.id !== state.room?.viewerId,
      );
      if (candidates.length === 0) return;
      const member = candidates[Math.floor(Math.random() * candidates.length)];
      setSpeaking([member.id]);
      window.clearTimeout(silence);
      silence = window.setTimeout(() => setSpeaking([]), 2800);
    };
    const startup = window.setTimeout(pick, 1600);
    const loop = window.setInterval(pick, 6800);
    return () => {
      window.clearTimeout(startup);
      window.clearTimeout(silence);
      window.clearInterval(loop);
    };
  }, [demoVoice, room?.ui, setSpeaking]);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/room/${room?.code ?? code}`;
    try {
      await navigator.clipboard.writeText(url);
      pushToast(t("room.linkCopied"), "ok");
    } catch {
      pushToast(t("room.linkFallback", { url }), "info");
    }
  }, [code, pushToast, room?.code, t]);

  const handleCopyCode = useCallback(async () => {
    const roomCode = room?.code ?? code;
    try {
      await navigator.clipboard.writeText(roomCode);
      pushToast(t("room.codeCopied"), "ok");
    } catch {
      pushToast(t("room.codeFallback", { code: roomCode }), "info");
    }
  }, [code, pushToast, room?.code, t]);

  const handleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      pushToast(t("room.fullscreenUnsupported"), "warn");
    }
  }, [pushToast, t]);

  const handleSend = useCallback(() => {
    if (draft.trim().length === 0) return;
    sendMessage(draft);
  }, [draft, sendMessage]);

  const handleLeave = useCallback(async () => {
    await leaveRoom();
    router.push("/");
  }, [leaveRoom, router]);

  if (!room) {
    return (
      <main className="room">
        <CinemaStage
          tier={tier}
          viewpoint={viewpoint}
          mode={mode}
          seats={[]}
          members={[]}
          nowPlaying={null}
          ui="loading"
          isHost={false}
          viewerSeatId={undefined}
          speakingIds={[]}
          onSeatSelect={() => undefined}
          onOpenVideoPicker={() => undefined}
        />
        <div className="banner">
          <span className="spinner" /> {t("room.opening")}
        </div>
      </main>
    );
  }

  // Phòng không tồn tại hoặc đã bị mời ra: chỉ hiện màn chiếu báo lỗi + đường về.
  if (room.ui === "missing" || room.ui === "removed") {
    return (
      <main className={`room room--${tier}`}>
        <CinemaStage
          tier={tier}
          viewpoint="overview"
          mode={mode}
          seats={[]}
          members={[]}
          nowPlaying={null}
          ui={room.ui}
          isHost={false}
          viewerSeatId={undefined}
          speakingIds={[]}
          onSeatSelect={() => undefined}
          onOpenVideoPicker={() => undefined}
        />
      </main>
    );
  }

  // Chưa có tài khoản: rạp chỉ dành cho thành viên nên chỉ dựng sân khấu trống,
  // popup đăng nhập (AuthGate) nằm đè lên và không đóng được.
  if (room.ui === "login") {
    return (
      <main className={`room room--${tier}`}>
        <CinemaStage
          tier={tier}
          viewpoint="overview"
          mode={mode}
          seats={[]}
          members={[]}
          nowPlaying={null}
          ui="login"
          isHost={false}
          viewerSeatId={undefined}
          speakingIds={[]}
          onSeatSelect={() => undefined}
          onOpenVideoPicker={() => undefined}
        />
      </main>
    );
  }

  const viewer = room.members.find((member) => member.id === room.viewerId);

  return (
    <main
      className={`room room--${tier}${focus ? " is-focus" : ""}${
        focus && chromeIdle ? " is-chrome-idle" : ""
      }${uiHidden ? " is-ui-hidden" : ""}${viewer?.seatId ? "" : " is-seatless"}`}
    >
      <CinemaStage
        tier={tier}
        viewpoint={viewpoint}
        mode={mode}
        seats={seats}
        members={room.members}
        nowPlaying={room.nowPlaying}
        ui={room.ui}
        isHost={Boolean(viewer?.isHost)}
        viewerSeatId={viewer?.seatId}
        speakingIds={speakingIds}
        onSeatSelect={takeSeat}
        onOpenVideoPicker={() => setPanel("send-video")}
      />

      <CrowdForeground
        members={room.members}
        viewerId={room.viewerId}
        viewerSeatId={viewer?.seatId}
        active={viewpoint === "seat" && mode === "seated" && !focus}
      />

      <EmptySeatForeground
        members={room.members}
        viewerId={room.viewerId}
        viewerSeatId={viewer?.seatId}
        active={viewpoint === "seat" && mode === "seated" && !focus}
      />

      <div className="hud">
        <RoomTopBar
          room={room}
          focus={focus}
          onCopyLink={handleCopyLink}
          onToggleFocus={toggleFocus}
          onOpenPanel={setPanel}
        />

        <BottomDock
          draft={draft}
          onDraftChange={setDraft}
          onSend={handleSend}
          soundOn={soundOn}
          volume={volume}
          onToggleSound={toggleSound}
          onVolume={setVolume}
          mode={mode}
          onToggleMode={toggleMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleFullscreen}
          onOpenPanel={setPanel}
          activePanel={panel}
          focus={focus}
          onToggleFocus={toggleFocus}
          viewpoint={viewpoint}
          onViewpoint={setViewpoint}
          uiHidden={uiHidden}
          onToggleUiHidden={toggleUiHidden}
        />
      </div>

      <NowPlayingPanel
        room={room}
        collapsed={infoCollapsed}
        isHost={Boolean(viewer?.isHost)}
        onToggleCollapsed={toggleInfo}
        onToggleSkipVote={toggleSkipVote}
        onPlay={(positionSec) => void playVideo(positionSec)}
        onPause={(positionSec) => void pauseVideo(positionSec)}
        onSeek={(positionSec) => void seekVideo(positionSec)}
        onOpenVideoPicker={() => setPanel("send-video")}
      />

      <ToolRail
        activePanel={panel}
        queueCount={room.queue.length}
        unread={unread}
        onSelect={setPanel}
      />

      {uiHidden ? (
        <button
          type="button"
          className="ui-restore"
          onClick={() => setUiHidden(false)}
          aria-label={t("room.showUiAria")}
        >
          <Eye size={16} aria-hidden="true" />
          {t("room.showUi")}
          <kbd>H</kbd>
        </button>
      ) : null}

      {room.ui === "reconnecting" ? (
        <div className="banner banner--warn" role="status">
          <WifiOff size={14} aria-hidden="true" />
          {t("room.reconnecting")}
        </div>
      ) : null}

      {room.ui === "ready" && !viewer?.seatId ? (
        <div className="seat-prompt" role="status">
          {t("room.seatPrompt")}
        </div>
      ) : null}

      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.tone}`}
            onClick={() => dismissToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {panel === "chat" ? (
        <ChatPanel
          room={room}
          draft={draft}
          onDraftChange={setDraft}
          onSend={handleSend}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel === "queue" || panel === "send-video" ? (
        <QueuePanel
          room={room}
          isHost={Boolean(viewer?.isHost)}
          onEnqueue={enqueue}
          onDequeue={dequeue}
          onPlayNow={playUrl}
          onPlayItem={(id) => void playQueueItem(id)}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel === "seats" ? (
        <SeatsPanel
          seats={seats}
          members={room.members}
          viewerId={room.viewerId}
          onTakeSeat={takeSeat}
          onReleaseSeat={releaseSeat}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel === "wardrobe" ? (
        <WardrobePanel
          currentColor={viewer?.shirtColor ?? "#8e9bd8"}
          currentName={viewer?.displayName ?? t("common.you")}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel === "members" ? (
        <MembersPanel room={room} onClose={() => setPanel(null)} onKick={kickMember} />
      ) : null}

      {panel === "info" ? (
        <InfoPanel
          room={room}
          onCopyLink={handleCopyLink}
          onCopyCode={handleCopyCode}
          onClose={() => setPanel(null)}
          onLeave={handleLeave}
          onCloseRoom={closeRoom}
        />
      ) : null}

      {panel === "photos" ? <PhotosPanel onClose={() => setPanel(null)} /> : null}
      {panel === "boost" ? <BoostPanel onClose={() => setPanel(null)} /> : null}

      {panel === "settings" ? (
        <SettingsPanel
          room={room}
          demoVoice={demoVoice}
          onSetUi={setUiStatus}
          onToggleDemoVoice={toggleDemoVoice}
          onDemoJoin={() => pushToast(t("room.welcome"), "ok")}
          onClose={() => setPanel(null)}
        />
      ) : null}
    </main>
  );
}
