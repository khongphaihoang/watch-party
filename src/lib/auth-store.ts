"use client";

import { create } from "zustand";
import { isApiError } from "./api/client";
import {
  loginAccount,
  logoutAccount,
  me,
  registerAccount,
  updateProfile,
} from "./api/rooms";
import { t } from "./i18n";
import type {
  AuthStatus,
  AuthTab,
  LoginCredentials,
  RegisterData,
  User,
} from "./auth-types";

/**
 * Tăng mỗi khi có thao tác phiên mới. `loadSession()` đang chờ mà thấy số này đổi
 * thì bỏ kết quả của mình — tránh việc một `401` đến muộn xoá phiên vừa tạo.
 */
let sessionEpoch = 0;

function toUser(raw: {
  id: string;
  username?: string | null;
  displayName: string;
  shirtColor: string;
  bodyStyle: "male" | "female";
}): User {
  return {
    id: raw.id,
    username: raw.username ?? "",
    displayName: raw.displayName,
    shirtColor: raw.shirtColor,
    bodyStyle: raw.bodyStyle,
  };
}

interface AuthStore {
  user: User | null;
  status: AuthStatus;
  isModalOpen: boolean;
  activeTab: AuthTab;
  loading: boolean;
  errorMessage: string | null;

  loadSession: () => Promise<void>;
  openModal: (tab?: AuthTab) => void;
  setActiveTab: (tab: AuthTab) => void;
  clearError: () => void;

  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;

  /** Nạp phiên nếu chưa có. Không tạo phiên — rạp bắt buộc tài khoản thật. */
  ensureSession: () => Promise<User | null>;
  saveProfile: (payload: {
    displayName?: string;
    shirtColor?: string;
    bodyStyle?: "male" | "female";
  }) => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  status: "unknown",
  isModalOpen: false,
  activeTab: "login",
  loading: false,
  errorMessage: null,

  loadSession: async () => {
    const epoch = sessionEpoch;
    try {
      const user = toUser(await me());
      if (epoch !== sessionEpoch) return;
      set({ user, status: "ready" });
    } catch {
      if (epoch !== sessionEpoch) return;
      set({ user: null, status: "anonymous" });
    }
  },

  openModal: (tab = "login") =>
    set({ isModalOpen: true, activeTab: tab, errorMessage: null }),

  setActiveTab: (tab) => set({ activeTab: tab, errorMessage: null }),

  clearError: () => set({ errorMessage: null }),

  login: async ({ username, password, rememberMe }) => {
    set({ loading: true, errorMessage: null });
    sessionEpoch += 1;
    try {
      const user = toUser(
        await loginAccount({
          username: username.trim(),
          password,
          remember: rememberMe !== false,
        }),
      );
      set({
        user,
        status: "ready",
        isModalOpen: false,
        loading: false,
        errorMessage: null,
      });
      return true;
    } catch (error) {
      set({
        loading: false,
        errorMessage: isApiError(error) ? error.message : t("auth.errLoginFailed"),
      });
      return false;
    }
  },

  register: async ({ username, displayName, password }) => {
    set({ loading: true, errorMessage: null });
    sessionEpoch += 1;
    try {
      const user = toUser(
        await registerAccount({
          username: username.trim(),
          password,
          displayName: displayName.trim() || undefined,
        }),
      );
      set({
        user,
        status: "ready",
        isModalOpen: false,
        loading: false,
        errorMessage: null,
      });
      return true;
    } catch (error) {
      set({
        loading: false,
        errorMessage: isApiError(error) ? error.message : t("auth.errRegisterFailed"),
      });
      return false;
    }
  },

  logout: async () => {
    sessionEpoch += 1;
    try {
      await logoutAccount();
    } catch {
      // Đăng xuất là best-effort: cookie phía client vẫn bị bỏ sau khi gọi.
    }
    set({
      user: null,
      status: "anonymous",
      isModalOpen: true,
      activeTab: "login",
      errorMessage: null,
    });
  },

  ensureSession: async () => {
    if (get().user) return get().user;
    await get().loadSession();
    return get().user;
  },

  saveProfile: async (payload) => {
    if (!get().user) return false;
    set({ loading: true, errorMessage: null });
    try {
      const user = toUser(await updateProfile(payload));
      set({ user, loading: false });
      return true;
    } catch (error) {
      set({
        loading: false,
        errorMessage: isApiError(error) ? error.message : t("auth.errProfileFailed"),
      });
      return false;
    }
  },
}));
