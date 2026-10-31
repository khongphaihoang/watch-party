"use client";

import { Expand, Monitor, Sofa, Users } from "lucide-react";
import type { Viewpoint } from "@/lib/room-types";
import { useT, type MessageKey } from "@/lib/i18n";

const OPTIONS: Array<{
  id: Viewpoint;
  labelKey: MessageKey;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}> = [
  { id: "overview", labelKey: "viewpoint.overview", icon: Expand },
  { id: "seat", labelKey: "viewpoint.seat", icon: Sofa },
  { id: "screen", labelKey: "viewpoint.screen", icon: Monitor },
  { id: "audience", labelKey: "viewpoint.audience", icon: Users },
];

export function ViewpointSwitcher({
  viewpoint,
  onChange,
}: {
  viewpoint: Viewpoint;
  onChange: (viewpoint: Viewpoint) => void;
}) {
  const t = useT();
  return (
    <div className="viewpoints" role="group" aria-label={t("viewpoint.aria")}>
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const label = t(option.labelKey);
        const isActive = viewpoint === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`viewpoint ${isActive ? "is-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
            data-tip={label}
            aria-label={label}
          >
            <Icon size={15} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
