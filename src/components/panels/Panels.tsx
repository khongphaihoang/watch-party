"use client";

import {
  BadgeCheck,
  Crop,
  ImagePlus,
  Info,
  ListChecks,
  Mic,
  Users,
} from "lucide-react";
import { formatCount, initials } from "@/lib/format";
import { useT, type MessageKey } from "@/lib/i18n";
import type { PlaybackState, RoomState, UiStatus } from "@/lib/room-types";
import { PanelShell } from "./PanelShell";

export { BoostPanel } from "./BoostPanel";

export function MembersPanel({ room, onClose }: { room: RoomState; onClose: () => void }) {
  const t = useT();
  return (
    <PanelShell
      title={t("members.title")}
      subtitle={t("members.subtitle", {
        count: room.members.length,
        capacity: room.capacity,
      })}
      onClose={onClose}
    >
      <ul className="list">
        {room.members.map((member) => (
          <li key={member.id} className="row-item">
            <span
              className="chat-msg__avatar"
              style={{ background: member.shirtColor }}
              aria-hidden="true"
            >
              {initials(member.displayName)}
            </span>
            <span className="row-item__main">
              <span className="row-item__title">{member.displayName}</span>
              <span className="row-item__meta">
                {member.seatId ? describeSeat(member.seatId, t) : t("members.noSeat")}
              </span>
            </span>
            {member.isHost ? (
              <span className="chip chip--warn">
                <BadgeCheck size={11} aria-hidden="true" /> {t("members.host")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

export function InfoPanel({
  room,
  onCopyLink,
  onClose,
}: {
  room: RoomState;
  onCopyLink: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <PanelShell
      title={t("topbar.info")}
      subtitle={t("info.subtitle")}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={onCopyLink}>
          {t("topbar.copyLink")}
        </button>
      }
    >
      <ul className="list">
        <InfoRow label={t("info.roomName")} value={room.title} />
        <InfoRow label={t("info.roomCode")} value={room.code} />
        <InfoRow label={t("info.nowShowing")} value={room.nowPlaying?.title ?? t("nowPlaying.empty")} />
        <InfoRow label={t("info.capacity")} value={t("info.countSeats", { count: room.capacity })} />
        <InfoRow
          label={t("info.present")}
          value={t("info.countPeople", { count: room.members.length })}
        />
        <InfoRow
          label={t("info.status")}
          value={room.lifecycle === "live" ? t("common.playing") : t("common.waiting")}
        />
        <InfoRow label={t("info.points")} value={formatCount(room.walletPoints)} />
      </ul>
      <div className="row-item">
        <span style={{ color: "var(--text-faint)" }}>
          <Info size={18} aria-hidden="true" />
        </span>
        <span className="row-item__main">
          <span className="row-item__title">{t("info.phase")}</span>
          <span className="row-item__meta">{t("info.phaseDesc")}</span>
        </span>
      </div>
    </PanelShell>
  );
}

export function PhotosPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <PanelShell
      title={t("photos.title")}
      subtitle={t("panels.unavailable")}
      onClose={onClose}
    >
      <Placeholder
        icon={<ImagePlus size={26} aria-hidden="true" />}
        title={t("photos.heading")}
        body={t("photos.body")}
        items={[t("photos.item1"), t("photos.item2")]}
      />
    </PanelShell>
  );
}

const DEMO_STATES: Array<{
  labelKey: MessageKey;
  ui?: UiStatus;
  playback?: PlaybackState;
}> = [
  { labelKey: "demo.1", ui: "loading" },
  { labelKey: "demo.2", ui: "ready", playback: "idle" },
  { labelKey: "demo.3", ui: "ready", playback: "playing" },
  { labelKey: "demo.4", ui: "ready", playback: "paused" },
  { labelKey: "demo.5", ui: "ready", playback: "buffering" },
  { labelKey: "demo.7", ui: "full" },
  { labelKey: "demo.9", ui: "reconnecting" },
  { labelKey: "demo.10", ui: "ready", playback: "error" },
  { labelKey: "demo.11", ui: "ended" },
];

export function SettingsPanel({
  room,
  demoVoice,
  onSetUi,
  onSetPlayback,
  onToggleDemoVoice,
  onDemoJoin,
  onClose,
}: {
  room: RoomState;
  demoVoice: boolean;
  onSetUi: (ui: UiStatus) => void;
  onSetPlayback: (state: PlaybackState) => void;
  onToggleDemoVoice: () => void;
  onDemoJoin: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <PanelShell
      title={t("topbar.settings")}
      subtitle={t("settings.subtitle")}
      onClose={onClose}
    >
      <div className="field">
        <span className="field__label">{t("settings.stateLabel")}</span>
        <p className="hint">{t("settings.stateHint")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DEMO_STATES.map((state) => {
            const isActive =
              room.ui === state.ui &&
              (!state.playback || room.nowPlaying?.state === state.playback);
            return (
              <button
                key={state.labelKey}
                type="button"
                className={`btn ${isActive ? "btn-primary" : "btn-secondary"}`}
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  if (state.playback) onSetPlayback(state.playback);
                  if (state.ui) onSetUi(state.ui);
                }}
              >
                <ListChecks size={15} aria-hidden="true" />
                {t(state.labelKey)}
              </button>
            );
          })}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ justifyContent: "flex-start" }}
            onClick={() => {
              onSetUi("ready");
              onSetPlayback("playing");
            }}
          >
            <Info size={15} aria-hidden="true" />
            {t("settings.reset")}
          </button>
          <button
            type="button"
            className="btn btn-gold"
            style={{ justifyContent: "flex-start" }}
            onClick={onDemoJoin}
          >
            <Users size={15} aria-hidden="true" />
            {t("settings.demoJoin")}
          </button>
        </div>
      </div>

      <div className="row-item">
        <span style={{ color: "var(--text-faint)" }}>
          <Crop size={18} aria-hidden="true" />
        </span>
        <span className="row-item__main">
          <span className="row-item__title">{t("settings.state6")}</span>
          <span className="row-item__meta">{t("settings.state6Desc")}</span>
        </span>
      </div>

      <div className="row-item">
        <span style={{ color: demoVoice ? "var(--accent)" : "var(--text-faint)" }}>
          <Mic size={18} aria-hidden="true" />
        </span>
        <span className="row-item__main">
          <span className="row-item__title">{t("settings.micTitle")}</span>
          <span className="row-item__meta">{t("settings.micDesc")}</span>
        </span>
      </div>
      <button
        type="button"
        className={`btn btn-block ${demoVoice ? "btn-gold" : "btn-secondary"}`}
        aria-pressed={demoVoice}
        onClick={onToggleDemoVoice}
      >
        <Mic size={15} aria-hidden="true" />
        {demoVoice ? t("settings.micOn") : t("settings.micOff")}
      </button>
    </PanelShell>
  );
}

function Placeholder({
  icon,
  title,
  body,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  items: string[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 52,
          height: 52,
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "rgba(255,255,255,0.03)",
          color: "var(--accent)",
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <p className="hint" style={{ marginTop: 4 }}>
          {body}
        </p>
      </div>
      <ul className="list">
        {items.map((item) => (
          <li key={item} className="row-item">
            <span className="row-item__main">
              <span className="row-item__meta">{item}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="row-item">
      <span className="row-item__main">
        <span className="row-item__meta">{label}</span>
        <span className="row-item__title">{value}</span>
      </span>
    </li>
  );
}

function describeSeat(seatIdValue: string, t: (key: MessageKey, params?: Record<string, string | number>) => string): string {
  const match = seatIdValue.match(/r(\d+)c(\d+)/);
  if (!match) return seatIdValue;
  return t("seats.position", { row: Number(match[1]) + 1, col: Number(match[2]) + 1 });
}
