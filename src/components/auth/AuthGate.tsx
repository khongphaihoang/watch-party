"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { AuthModal } from "./AuthModal";

/**
 * Nạp phiên từ server và mở popup đăng nhập khi chưa có tài khoản.
 *
 * Rạp chỉ dành cho thành viên nên popup này là cửa duy nhất đi tiếp: không có
 * nút đóng, `Esc` cũng không tắt. Đăng nhập/đăng ký xong thì popup tự đóng và
 * phòng tự join lại.
 */
export function AuthGate() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isModalOpen = useAuthStore((state) => state.isModalOpen);
  const loadSession = useAuthStore((state) => state.loadSession);
  const openModal = useAuthStore((state) => state.openModal);
  const autoOpened = useRef(false);

  useEffect(() => {
    if (status === "unknown") void loadSession();
  }, [status, loadSession]);

  useEffect(() => {
    if (autoOpened.current) return;
    if (status === "unknown") return;
    if (user) return;
    if (isModalOpen) return;
    autoOpened.current = true;
    openModal("login");
  }, [status, user, isModalOpen, openModal]);

  return <AuthModal />;
}
