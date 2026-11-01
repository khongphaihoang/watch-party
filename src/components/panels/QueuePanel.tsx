"use client";

import { useState } from "react";
import { ListVideo, Play, Plus, Trash2, Video } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { RoomState } from "@/lib/room-types";
import { PanelShell } from "./PanelShell";

export function QueuePanel({
  room,
  isHost,
  onEnqueue,
  onDequeue,
  onPlayNow,
  onPlayItem,
  onClose,
}: {
  room: RoomState;
  isHost: boolean;
  onEnqueue: (url: string) => boolean;
  onDequeue: (id: string) => void;
  onPlayNow: (url: string, isLive: boolean) => Promise<boolean>;
  onPlayItem: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [busy, setBusy] = useState(false);

  const playNow = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await onPlayNow(url, isLive);
    setBusy(false);
    if (ok) setUrl("");
  };

  return (
    <PanelShell
      title={t("queue.title")}
      subtitle={t("queue.subtitle", { count: room.queue.length })}
      onClose={onClose}
      footer={
        <p className="hint" style={{ margin: 0 }}>
          {isHost ? t("queue.hostHint") : t("queue.memberHint")}
        </p>
      }
    >
      <div className="field">
        <label className="field__label" htmlFor="queue-url">
          {t("queue.addLabel")}
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            id="queue-url"
            className="input"
            style={{ flex: 1 }}
            value={url}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onEnqueue(url)) setUrl("");
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (onEnqueue(url)) setUrl("");
            }}
          >
            <Plus size={15} aria-hidden="true" />
            {t("queue.add")}
          </button>
        </div>
        <p className="hint">{t("queue.hint")}</p>
        {isHost ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || url.trim().length === 0}
              onClick={() => {
                void playNow();
              }}
            >
              <Play size={15} aria-hidden="true" />
              {t("queue.playNow")}
            </button>
            <label className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={isLive}
                onChange={(event) => setIsLive(event.target.checked)}
              />
              {t("queue.live")}
            </label>
          </div>
        ) : null}
      </div>

      {room.queue.length === 0 ? (
        <div className="field" style={{ alignItems: "center", padding: "24px 0", gap: 10 }}>
          <ListVideo size={26} aria-hidden="true" style={{ color: "var(--text-faint)" }} />
          <p className="hint" style={{ textAlign: "center" }}>
            {t("queue.emptyLine1")}
            <br />
            {t("queue.emptyLine2")}
          </p>
        </div>
      ) : (
        <ul className="list">
          {room.queue.map((item, index) => (
            <li key={item.id} className="row-item">
              <span
                className="chip"
                style={{ minWidth: 26, justifyContent: "center" }}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="row-item__main">
                <span className="row-item__title">{item.title}</span>
                <span className="row-item__meta">
                  {item.channelTitle} · {formatDuration(item.durationSec)} · {item.addedBy}
                </span>
              </span>
              {isHost ? (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onPlayItem(item.id)}
                  aria-label={t("queue.playItem", { title: item.title })}
                  data-tip={t("queue.playNow")}
                >
                  <Play size={16} aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                className="icon-btn"
                onClick={() => onDequeue(item.id)}
                aria-label={t("queue.remove", { title: item.title })}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Video size={13} aria-hidden="true" />
        {t("queue.footnote")}
      </p>
    </PanelShell>
  );
}
