"use client";

import { useState } from "react";
import {
  Armchair,
  EyeOff,
  Focus,
  Maximize2,
  MessageSquareMore,
  Minimize2,
  Send,
  Shrink,
  Smile,
  Users,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import type { PanelId, RoomMode, Viewpoint } from "@/lib/room-types";
import { useT } from "@/lib/i18n";
import { ViewpointSwitcher } from "./ViewpointSwitcher";

const MAX_LEN = 200;
const EMOJI = ["😀", "😂", "🍿", "🔥", "❤️", "👏", "😮", "🎬"];

export function BottomDock({
  draft,
  onDraftChange,
  onSend,
  soundOn,
  volume,
  onToggleSound,
  onVolume,
  mode,
  onToggleMode,
  isFullscreen,
  onToggleFullscreen,
  onOpenPanel,
  activePanel,
  focus,
  onToggleFocus,
  viewpoint,
  onViewpoint,
  uiHidden,
  onToggleUiHidden,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  soundOn: boolean;
  volume: number;
  onToggleSound: () => void;
  onVolume: (value: number) => void;
  mode: RoomMode;
  onToggleMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenPanel: (panel: PanelId) => void;
  activePanel: PanelId;
  focus: boolean;
  onToggleFocus: () => void;
  viewpoint: Viewpoint;
  onViewpoint: (viewpoint: Viewpoint) => void;
  uiHidden: boolean;
  onToggleUiHidden: () => void;
}) {
  const t = useT();
  const [emojiOpen, setEmojiOpen] = useState(false);
  const nearLimit = draft.length >= MAX_LEN - 20;

  return (
    <div className="dock">
      <div className="dock__group dock__group--view">
        <button
          type="button"
          className={`icon-btn ${focus ? "is-active" : ""}`}
          onClick={onToggleFocus}
          aria-pressed={focus}
          aria-label={focus ? t("dock.focusOff") : t("dock.focusOn")}
          data-tip={focus ? t("dock.focusTipOff") : t("dock.focusTipOn")}
        >
          {focus ? <Shrink size={18} aria-hidden="true" /> : <Focus size={18} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="icon-btn dock__dup"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? t("dock.exitFullscreen") : t("dock.fullscreen")}
          data-tip={isFullscreen ? t("dock.exitFullscreen") : t("dock.fullscreen")}
        >
          {isFullscreen ? (
            <Minimize2 size={18} aria-hidden="true" />
          ) : (
            <Maximize2 size={18} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={`icon-btn dock__dup ${activePanel === "seats" ? "is-active" : ""}`}
          onClick={() => onOpenPanel(activePanel === "seats" ? null : "seats")}
          aria-label={t("dock.seats")}
          data-tip={t("dock.seats")}
        >
          <Armchair size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn ${mode === "flat" ? "is-active" : ""}`}
          onClick={onToggleMode}
          aria-pressed={mode === "flat"}
          aria-label={mode === "flat" ? t("dock.theaterMode") : t("dock.flatMode")}
          data-tip={mode === "flat" ? t("dock.theaterTip") : t("dock.flatTip")}
        >
          <Waves size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn dock__dup ${activePanel === "members" ? "is-active" : ""}`}
          onClick={() => onOpenPanel(activePanel === "members" ? null : "members")}
          aria-label={t("dock.members")}
          data-tip={t("dock.membersTip")}
        >
          <Users size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn dock__ui-toggle ${uiHidden ? "is-active" : ""}`}
          onClick={onToggleUiHidden}
          aria-pressed={uiHidden}
          aria-label={t("dock.hideUi")}
          data-tip={t("dock.hideUiTip")}
        >
          <EyeOff size={18} aria-hidden="true" />
        </button>
      </div>

      <ViewpointSwitcher viewpoint={viewpoint} onChange={onViewpoint} />

      <div className="dock__chat">
        <label htmlFor="chat-input" className="sr-only">
          {t("dock.chatLabel")}
        </label>
        <input
          id="chat-input"
          className="dock__input"
          type="text"
          value={draft}
          maxLength={MAX_LEN}
          placeholder={t("dock.chatPlaceholder")}
          autoComplete="off"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <span className={`char-count ${nearLimit ? "is-warn" : ""}`} aria-live="polite">
          {draft.length}/{MAX_LEN}
        </span>
        <button
          type="button"
          className="icon-btn dock__expand"
          onClick={() => onOpenPanel("chat")}
          aria-label={t("dock.openChat")}
          data-tip={t("dock.openChat")}
        >
          <MessageSquareMore size={18} aria-hidden="true" />
        </button>
        <div className="dock__emoji">
          <button
            type="button"
            className="icon-btn"
            aria-expanded={emojiOpen}
            aria-label={t("dock.emoji")}
            data-tip={t("dock.emoji")}
            onClick={() => setEmojiOpen((open) => !open)}
          >
            <Smile size={18} aria-hidden="true" />
          </button>
          {emojiOpen ? (
            <div className="panel emoji-pop" role="dialog" aria-label={t("dock.emojiDialog")}>
              {EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    onDraftChange((draft + emoji).slice(0, MAX_LEN));
                    setEmojiOpen(false);
                  }}
                  aria-label={t("dock.insertEmoji", { emoji })}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-primary dock__send"
          onClick={onSend}
          disabled={draft.trim().length === 0}
        >
          <Send size={15} aria-hidden="true" />
          <span className="dock__send-label">{t("dock.send")}</span>
        </button>
      </div>

      <div className="dock__group dock__group--sound">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? t("dock.soundOff") : t("dock.soundOn")}
          data-tip={soundOn ? t("dock.soundOff") : t("dock.soundOn")}
        >
          {soundOn ? (
            <Volume2 size={18} aria-hidden="true" />
          ) : (
            <VolumeX size={18} aria-hidden="true" />
          )}
        </button>
        <div className="volume">
          <label htmlFor="volume" className="sr-only">
            {t("dock.volume")}
          </label>
          <input
            id="volume"
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => onVolume(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
