"use client";

import {
  Armchair,
  Gift,
  ImagePlus,
  ListVideo,
  MessageCircle,
  Shirt,
  Video,
} from "lucide-react";
import type { PanelId } from "@/lib/room-types";
import { useT, type MessageKey } from "@/lib/i18n";

interface ToolDef {
  id: Exclude<PanelId, null>;
  labelKey: MessageKey;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  badge?: number;
}

export function ToolRail({
  activePanel,
  queueCount,
  unread,
  onSelect,
}: {
  activePanel: PanelId;
  queueCount: number;
  unread: number;
  onSelect: (panel: PanelId) => void;
}) {
  const t = useT();
  const tools: ToolDef[] = [
    { id: "seats", labelKey: "toolRail.seats", icon: Armchair },
    { id: "send-video", labelKey: "toolRail.sendVideo", icon: Video },
    { id: "photos", labelKey: "toolRail.photos", icon: ImagePlus },
    { id: "queue", labelKey: "toolRail.queue", icon: ListVideo, badge: queueCount },
    { id: "chat", labelKey: "toolRail.chat", icon: MessageCircle, badge: unread },
    { id: "wardrobe", labelKey: "toolRail.wardrobe", icon: Shirt },
    { id: "boost", labelKey: "toolRail.boost", icon: Gift },
  ];

  return (
    <nav className="tool-rail" aria-label={t("toolRail.aria")}>
      {tools.map((tool) => {
        const Icon = tool.icon;
        const label = t(tool.labelKey);
        const isActive =
          activePanel === tool.id || (tool.id === "queue" && activePanel === "send-video");
        const badge = tool.badge && tool.badge > 0 ? (tool.badge > 99 ? "99+" : tool.badge) : null;
        return (
          <button
            key={tool.id}
            type="button"
            className={`tool ${isActive ? "is-active" : ""}`}
            aria-pressed={isActive}
            aria-label={badge ? `${label} (${tool.badge})` : label}
            data-tip={
              badge ? t("toolRail.newBadge", { label, count: tool.badge ?? 0 }) : label
            }
            onClick={() => onSelect(isActive ? null : tool.id)}
          >
            <Icon size={20} aria-hidden />
            <span className="tool__label">{label}</span>
            {badge ? <span className="tool__badge">{badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
