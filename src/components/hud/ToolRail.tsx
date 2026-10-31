"use client";

import {
  Armchair,
  Gamepad2,
  Gift,
  ImagePlus,
  ListVideo,
  MessageCircle,
  Shirt,
  Video,
} from "lucide-react";
import type { PanelId } from "@/lib/room-types";

interface ToolDef {
  id: Exclude<PanelId, null>;
  label: string;
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
  const tools: ToolDef[] = [
    { id: "game", label: "Chơi game", icon: Gamepad2 },
    { id: "seats", label: "Chọn ghế", icon: Armchair },
    { id: "send-video", label: "Gửi video", icon: Video },
    { id: "photos", label: "Chia sẻ ảnh", icon: ImagePlus },
    { id: "queue", label: "Hàng chờ", icon: ListVideo, badge: queueCount },
    { id: "chat", label: "Trò chuyện", icon: MessageCircle, badge: unread },
    { id: "wardrobe", label: "Tủ đồ", icon: Shirt },
    { id: "boost", label: "Ủng hộ", icon: Gift },
  ];

  return (
    <nav className="tool-rail" aria-label="Chức năng trong rạp">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive =
          activePanel === tool.id || (tool.id === "queue" && activePanel === "send-video");
        const badge = tool.badge && tool.badge > 0 ? (tool.badge > 99 ? "99+" : tool.badge) : null;
        return (
          <button
            key={tool.id}
            type="button"
            className={`tool ${isActive ? "is-active" : ""}`}
            aria-pressed={isActive}
            aria-label={badge ? `${tool.label} (${tool.badge})` : tool.label}
            data-tip={badge ? `${tool.label} · ${tool.badge} mới` : tool.label}
            onClick={() => onSelect(isActive ? null : tool.id)}
          >
            <Icon size={20} aria-hidden />
            <span className="tool__label">{tool.label}</span>
            {badge ? <span className="tool__badge">{badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
