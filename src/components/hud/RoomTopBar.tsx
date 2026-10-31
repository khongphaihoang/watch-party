"use client";

import { useEffect, useRef, useState } from "react";
import {
  Coins,
  Copy,
  Info,
  LogIn,
  LogOut,
  Settings2,
  Shirt,
  Shrink,
  Sparkles,
  Users,
} from "lucide-react";
import { formatCount, initials } from "@/lib/format";
import type { PanelId, RoomState } from "@/lib/room-types";
import { useAuthStore } from "@/lib/auth-store";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

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
  focus,
  onCopyLink,
  onToggleFocus,
  onOpenPanel,
}: {
  room: RoomState;
  focus: boolean;
  onCopyLink: () => void;
  onToggleFocus: () => void;
  onOpenPanel: (panel: PanelId) => void;
}) {
  const t = useT();
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

  const displayName = user ? user.displayName : t("common.guest");
  const avatarBg = user ? user.avatarColor : "#D6E87F";

  return (
    <header className="topbar">
      <button
        type="button"
        className="brand"
        onClick={() => onOpenPanel("info")}
        aria-label={t("brand.aria")}
      >
        <span className="brand__mark">
          <BrandMark />
        </span>
        <span className="brand__text">
          <span className="brand__name">{t("brand.name")}</span>
          <span className="brand__sub">{t("brand.tagline")}</span>
        </span>
      </button>

      <div className="room-tag">
        <span className="room-tag__title">{room.title}</span>
        <span className="room-tag__code">{t("topbar.roomCode", { code: room.code })}</span>
      </div>

      <div className="topbar__center">
        {isLive ? (
          <span className="chip chip--ok">
            <span className="dot" /> {t("common.playing")}
          </span>
        ) : (
          <span className="chip chip--warn">
            <span className="dot" /> {t("common.waiting")}
          </span>
        )}
        <span
          className="occupancy"
          title={t("topbar.occupancyTitle", { occupied, capacity: room.capacity })}
        >
          <Users size={13} aria-hidden="true" />
          <strong>{occupied}</strong> / {room.capacity}
          <span className="occupancy__unit"> {t("common.seats")}</span>
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
        <span className="points topbar__aux" data-tip={t("topbar.points")}>
          <Coins size={13} aria-hidden="true" />
          {formatCount(user ? user.points : room.walletPoints)}
        </span>
        <button
          type="button"
          className="icon-btn topbar__aux topbar__copy"
          onClick={onCopyLink}
          aria-label={t("topbar.copyLink")}
          data-tip={t("topbar.copyLink")}
        >
          <Copy size={18} aria-hidden="true" />
        </button>
        <LanguageSwitcher />
        <button
          type="button"
          className="icon-btn topbar__aux topbar__settings"
          onClick={() => onOpenPanel("settings")}
          aria-label={t("topbar.settings")}
          data-tip={t("topbar.settings")}
        >
          <Settings2 size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn topbar__aux"
          onClick={() => onOpenPanel("info")}
          aria-label={t("topbar.info")}
          data-tip={t("topbar.info")}
        >
          <Info size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn topbar__exit"
          onClick={onToggleFocus}
          aria-label={focus ? t("topbar.focusOff") : t("topbar.focusOn")}
          aria-pressed={focus}
          data-tip={focus ? t("topbar.focusTipOff") : t("topbar.focusTipOn")}
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
              aria-label={t("topbar.account", { name: displayName })}
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
                    <span className="user-dropdown__email">@{user.username}</span>
                    <span className="user-dropdown__badge">
                      <Sparkles size={11} aria-hidden="true" />
                      {user.role === "vip" ? t("topbar.roleVip") : t("topbar.roleStandard")}
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
                  <span>{t("topbar.wardrobe")}</span>
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
                  <span>{t("topbar.logout")}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="topbar-login-btn"
            onClick={() => openModal("login")}
            aria-label={t("topbar.loginAria")}
          >
            <LogIn size={15} aria-hidden="true" />
            <span>{t("topbar.login")}</span>
          </button>
        )}
      </div>
    </header>
  );
}
