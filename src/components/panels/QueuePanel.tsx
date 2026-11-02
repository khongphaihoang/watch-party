"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ListVideo,
  Play,
  Plus,
  SkipForward,
  Trash2,
  Video,
} from "lucide-react";
import { formatClock, formatDuration } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { QueueItem, RoomState } from "@/lib/room-types";
import { PanelShell } from "./PanelShell";

function itemTitle(item: QueueItem, t: ReturnType<typeof useT>): string {
  return item.title.trim() || t("queue.unknownTitle", { id: item.videoId });
}

export function QueuePanel({
  room,
  isHost,
  canManage,
  onAdd,
  onRemove,
  onMove,
  onPlayNext,
  onPlayItem,
  onPlayNow,
  onClose,
}: {
  room: RoomState;
  isHost: boolean;
  canManage: boolean;
  onAdd: (url: string) => Promise<boolean>;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onPlayNext: () => void;
  onPlayItem: (id: string) => void;
  onPlayNow: (url: string, isLive: boolean) => Promise<boolean>;
  onClose: () => void;
}) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (busy || url.trim().length === 0) return;
    setBusy(true);
    const ok = await onAdd(url);
    setBusy(false);
    if (ok) setUrl("");
  };

  const playNow = async () => {
    if (busy || url.trim().length === 0) return;
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
          {canManage ? t("queue.hostHint") : t("queue.memberHint")}
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
              if (event.key === "Enter") void add();
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || url.trim().length === 0}
            onClick={() => {
              void add();
            }}
          >
            <Plus size={15} aria-hidden="true" />
            {busy ? t("queue.adding") : t("queue.add")}
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

      {canManage && room.queue.length > 0 ? (
        <button type="button" className="btn btn-secondary btn-block" onClick={onPlayNext}>
          <SkipForward size={15} aria-hidden="true" />
          {t("queue.playNext")}
        </button>
      ) : null}

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
          {room.queue.map((item, index) => {
            const title = itemTitle(item, t);
            const canRemove = canManage || item.addedById === room.viewerId;
            return (
              <li key={item.id} className="row-item">
                <span
                  className="chip"
                  style={{ minWidth: 26, justifyContent: "center" }}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="row-item__main">
                  <span className="row-item__title">{title}</span>
                  <span className="row-item__meta">
                    {item.channelTitle ? `${item.channelTitle} · ` : ""}
                    {item.durationSec > 0 ? `${formatDuration(item.durationSec)} · ` : ""}
                    {item.addedBy} · {formatClock(item.createdAt)}
                  </span>
                </span>
                {canManage ? (
                  <>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onMove(item.id, -1)}
                      disabled={index === 0}
                      aria-label={t("queue.moveUp", { title })}
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onMove(item.id, 1)}
                      disabled={index === room.queue.length - 1}
                      aria-label={t("queue.moveDown", { title })}
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onPlayItem(item.id)}
                      aria-label={t("queue.playItem", { title })}
                      data-tip={t("queue.playNow")}
                    >
                      <Play size={16} aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                {canRemove ? (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onRemove(item.id)}
                    aria-label={t("queue.remove", { title })}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Video size={13} aria-hidden="true" />
        {t("queue.footnote")}
      </p>
    </PanelShell>
  );
}
