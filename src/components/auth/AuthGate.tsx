"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useRoomStore } from "@/lib/room-store";
import { AuthModal } from "./AuthModal";

export function AuthGate() {
  const { user, isAuthenticated, isGuest, isModalOpen, openModal } = useAuthStore();
  const updateViewerProfile = useRoomStore((state) => state.updateViewerProfile);

  // Khi tải trang, nếu chưa đăng nhập và chưa bỏ qua, tự động bật popup đăng nhập/đăng ký
  useEffect(() => {
    if (!isAuthenticated && !isGuest && !isModalOpen) {
      openModal("login");
    }
  }, [isAuthenticated, isGuest, isModalOpen, openModal]);

  // Đồng bộ thông tin người dùng vào phòng chiếu
  useEffect(() => {
    if (user) {
      updateViewerProfile(user.displayName, user.avatarColor);
    }
  }, [user, updateViewerProfile]);

  return <AuthModal />;
}
