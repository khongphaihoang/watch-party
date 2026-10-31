"use client";

import { useState } from "react";
import { Check, Shirt } from "lucide-react";
import { PanelShell } from "./PanelShell";

const SHIRT_COLORS = [
  "#8e9bd8",
  "#e0a48c",
  "#9cc7a6",
  "#c6a6d9",
  "#d9be86",
  "#d6e87f",
  "#8fc3ce",
  "#d8a0b4",
];

export function WardrobePanel({
  currentColor,
  currentName,
  onClose,
}: {
  currentColor: string;
  currentName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [color, setColor] = useState(currentColor);
  const [style, setStyle] = useState<"male" | "female">("male");

  return (
    <PanelShell
      title="Tủ đồ · Avatar"
      subtitle="Đổi tên in trên áo và màu áo của bạn"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" disabled>
          <Check size={15} aria-hidden="true" />
          Lưu thay đổi (Phase 2)
        </button>
      }
    >
      <div className="field">
        <label className="field__label" htmlFor="wardrobe-name">
          Tên in trên áo
        </label>
        <input
          id="wardrobe-name"
          className="input"
          value={name}
          maxLength={16}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="hint">Tối đa 16 ký tự, hiển thị trên tên nhân vật và trong chat.</p>
      </div>

      <div className="field">
        <span className="field__label">Ngoại hình</span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["male", "female"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`btn ${style === option ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1 }}
              onClick={() => setStyle(option)}
              aria-pressed={style === option}
            >
              {option === "male" ? "Nam" : "Nữ"}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">Màu áo</span>
        <div className="swatches">
          {SHIRT_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              className={`swatch ${color === value ? "is-active" : ""}`}
              style={{ background: value }}
              aria-label={`Màu áo ${value}`}
              aria-pressed={color === value}
              onClick={() => setColor(value)}
            />
          ))}
        </div>
      </div>

      <div className="row-item" style={{ marginTop: 4 }}>
        <span style={{ color: "var(--text-faint)" }}>
          <Shirt size={18} aria-hidden="true" />
        </span>
        <span className="row-item__main">
          <span className="row-item__title">Xem trước</span>
          <span className="row-item__meta">
            Áo {color} · {style === "male" ? "Nam" : "Nữ"} · tên &ldquo;{name || "—"}&rdquo;
          </span>
        </span>
      </div>
    </PanelShell>
  );
}
