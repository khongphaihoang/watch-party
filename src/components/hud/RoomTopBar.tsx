"use client";

import { useEffect, useRef, useState } from "react";
import {
  Coins,
  Copy,
  Info,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Settings2,
  Shirt,
  Shrink,
  Sparkles,
  Users,
} from "lucide-react";
import { formatCount, initials } from "@/lib/format";
import type { PanelId, RoomState } from "@/lib/room-types";
import { useAuthStore } from "@/lib/auth-store";

export function BrandMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="3.5" width="19" height="10.5" rx="2.4" />
      <path d="M4.5 20.5h15" />
      <circle cx="8" cy="17.4" r="1.5" />
      <circle cx="12" cy="17.4" r="1.5" />
      <circle cx="16" cy="17.4" r="1.5" />
    </svg>
  );
}

export function RoomTopBar({
  room,
  isFullscreen,
  focus,
  onCopyLink,
  onToggleFullscreen,
  onToggleFocus,
  onOpenPanel,
}: {
  room: RoomState;
  isFullscreen: boolean;
  focus: boolean;
  onCopyLink: () => void;
  onToggleFullscreen: () => void;
  onToggleFocus: () => void;
  onOpenPanel: (panel: PanelId) => void;
}) {
  const { user, isAuthenticated, openModal, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLive = room.lifecycle === "live";
  const occupied = room.members.length;
  const stack = room.members.slice(0, 4);
  const restCount = Math.max(0, occupied - stack.length);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const displayName = user ? user.displayName : "Khách";
  const avatarBg = user ? user.avatarColor : "#D6E87F";

  return (
    <header className="topbar">
      <button
        type="button"
        className="brand"
        onClick={() => onOpenPanel("info")}
        aria-label="Rạp Nhà — thông tin phòng chiếu"
      >
        <span className="brand__mark">
          <BrandMark />
        </span>
        <span className="brand__text">
          <span className="brand__name">Rạp Nhà</span>
          <span className="brand__sub">Cả hội cùng một màn hình</span>
        </span>
      </button>

      <div className="room-tag">
        <span className="room-tag__title">{room.title}</span>
        <span className="room-tag__code">Phòng chiếu chung · {room.code}</span>
      </div>

      <div className="topbar__center">
        {isLive ? (
          <span className="chip chip--ok">
            <span className="dot" /> Đang chiếu
          </span>
        ) : (
          <span className="chip chip--warn">
            <span className="dot" /> Đang chờ
          </span>
        )}
        <span className="occupancy" title={`${occupied} / ${room.capacity} ghế đã có người`}>
          <Users size={13} aria-hidden="true" />
          <strong>{occupied}</strong> / {room.capacity}
          <span className="occupancy__unit"> ghế</span>
        </span>
        <span className="avatar-stack" aria-hidden="true">
          {stack.map((member) => (
            <span
              key={member.id}
              className="avatar-stack__item"
              style={{ background: member.shirtColor }}
            >
              {initials(member.displayName)}
            </span>
          ))}
          {restCount > 0 ? <span className="avatar-stack__more">+{restCount}</span> : null}
        </span>
      </div>

      <div className="topbar__actions">
        <span className="points topbar__aux" data-tip="Điểm thưởng của bạn">
          <Coins size={13} aria-hidden="true" />
          {formatCount(user ? user.points : room.walletPoints)}
        </span>
        <button
          type="button"
          className="icon-btn topbar__aux topbar__copy"
          onClick={onCopyLink}
          aria-label="Sao chép link phòng"
          data-tip="Sao chép link phòng"
        >
          <Copy size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn topbar__aux topbar__keep"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          data-tip={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        >
          {isFullscreen ? (
            <Minimize2 size={18} aria-hidden="true" />
          ) : (
            <Maximize2 size={18} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="icon-btn topbar__aux topbar__settings"
          onClick={() => onOpenPanel("settings")}
          aria-label="Cài đặt phòng"
          data-tip="Cài đặt phòng"
        >
          <Settings2 size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn topbar__aux"
          onClick={() => onOpenPanel("info")}
          aria-label="Thông tin phòng"
          data-tip="Thông tin phòng"
        >
          <Info size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn topbar__exit"
          onClick={onToggleFocus}
          aria-label={focus ? "Thoát chế độ tập trung" : "Bật chế độ tập trung"}
          aria-pressed={focus}
          data-tip={focus ? "Thoát Focus (Esc)" : "Focus Mode (F)"}
        >
          {focus ? <Shrink size={18} aria-hidden="true" /> : null}
        </button>

        {/* Khu vực Tài khoản / Đăng nhập */}
        {isAuthenticated && user ? (
          <div className="topbar-user-menu" ref={menuRef}>
            <button
              type="button"
              className="account topbar__aux"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={`Tài khoản của ${displayName}`}
              data-tip={displayName}
              style={{ background: avatarBg }}
            >
              {initials(displayName)}
            </button>

            {menuOpen && (
              <div className="user-dropdown" role="menu">
                <div className="user-dropdown__header">
                  <div
                    className="user-dropdown__avatar"
                    style={{ background: avatarBg }}
                    aria-hidden="true"
                  >
                    {initials(displayName)}
                  </div>
                  <div className="user-dropdown__info">
                    <strong className="user-dropdown__name">{displayName}</strong>
                    <span className="user-dropdown__email">{user.email}</span>
                    <span className="user-dropdown__badge">
                      <Sparkles size={11} aria-hidden="true" />
                      {user.role === "vip" ? "Khán giả VIP" : "Khán giả tiêu chuẩn"}
                    </span>
                  </div>
                </div>

                <div className="user-dropdown__divider" />

                <button
                  type="button"
                  className="user-dropdown__item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenPanel("wardrobe");
                  }}
                >
                  <Shirt size={15} aria-hidden="true" />
                  <span>Tủ đồ & Đổi Avatar</span>
                </button>

                <div className="user-dropdown__divider" />

                <button
                  type="button"
                  className="user-dropdown__item user-dropdown__item--danger"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={15} aria-hidden="true" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="topbar-login-btn"
            onClick={() => openModal("login")}
            aria-label="Đăng nhập hoặc đăng ký"
          >
            <LogIn size={15} aria-hidden="true" />
            <span>Đăng nhập</span>
          </button>
        )}
      </div>
    </header>
  );
}
