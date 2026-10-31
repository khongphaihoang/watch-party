"use client";

import { X } from "lucide-react";
import { useT } from "@/lib/i18n";

export function PanelShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <div className="panel-layer">
      <aside
        className={`sheet panel ${className ?? ""}`}
        role="dialog"
        aria-label={title}
        aria-modal="false"
      >
        <div className="sheet__head">
          <div>
            <h2 className="sheet__title">{title}</h2>
            {subtitle ? <p className="hint" style={{ margin: "2px 0 0" }}>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("panel.close")}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer ? <div className="sheet__foot">{footer}</div> : null}
      </aside>
    </div>
  );
}
