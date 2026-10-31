"use client";

import { Expand, Monitor, Sofa, Users } from "lucide-react";
import type { Viewpoint } from "@/lib/room-types";

const OPTIONS: Array<{
  id: Viewpoint;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}> = [
  { id: "overview", label: "Toàn cảnh rạp", icon: Expand },
  { id: "seat", label: "Góc nhìn từ ghế", icon: Sofa },
  { id: "screen", label: "Tập trung màn hình", icon: Monitor },
  { id: "audience", label: "Nhìn từ màn chiếu", icon: Users },
];

export function ViewpointSwitcher({
  viewpoint,
  onChange,
}: {
  viewpoint: Viewpoint;
  onChange: (viewpoint: Viewpoint) => void;
}) {
  return (
    <div className="viewpoints" role="group" aria-label="Chế độ xem">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = viewpoint === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`viewpoint ${isActive ? "is-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
            data-tip={option.label}
            aria-label={option.label}
          >
            <Icon size={15} aria-hidden />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
