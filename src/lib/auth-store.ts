"use client";

import { create } from "zustand";
import { t } from "./i18n";
import type { AuthTab, LoginCredentials, RegisterData, User } from "./auth-types";

const SESSION_STORAGE_KEY = "rap-chieu:auth-session";
const USERS_DB_KEY = "rap-chieu:users-db";
const GUEST_DISMISSED_KEY = "rap-chieu:guest-dismissed";

interface StoredAccount {
  user: User;
  passwordHash: string;
}

const DEFAULT_ACCOUNTS: StoredAccount[] = [];

function getStoredAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) return DEFAULT_ACCOUNTS;
    return JSON.parse(raw) as StoredAccount[];
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function saveAccount(account: StoredAccount) {
  if (typeof window === "undefined") return;
  try {
    const list = getStoredAccounts();
    const updated = [
      ...list.filter(
        (item) => item.user.username.toLowerCase() !== account.user.username.toLowerCase(),
      ),
      account,
    ];
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(updated));
  } catch {
    // Không ghi được local storage
  }
}

function loadInitialSession(): { user: User | null; isGuest: boolean } {
  if (typeof window === "undefined") return { user: null, isGuest: false };
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const user = JSON.parse(raw) as User;
      return { user, isGuest: false };
    }
    const isGuestDismissed = sessionStorage.getItem(GUEST_DISMISSED_KEY) === "1";
    return { user: null, isGuest: isGuestDismissed };
  } catch {
    return { user: null, isGuest: false };
  }
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isModalOpen: boolean;
  activeTab: AuthTab;
  loading: boolean;
  errorMessage: string | null;

  openModal: (tab?: AuthTab) => void;
  closeModal: () => void;
  setActiveTab: (tab: AuthTab) => void;
  clearError: () => void;

  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  continueAsGuest: () => void;
  logout: () => void;
  updateUserDisplayName: (name: string) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => {
  const initial = loadInitialSession();

  return {
    user: initial.user,
    isAuthenticated: Boolean(initial.user),
    isGuest: initial.isGuest,
    isModalOpen: false,
    activeTab: "login",
    loading: false,
    errorMessage: null,

    openModal: (tab = "login") =>
      set({
        isModalOpen: true,
        activeTab: tab,
        errorMessage: null,
      }),

    closeModal: () =>
      set({
        isModalOpen: false,
        errorMessage: null,
      }),

    setActiveTab: (tab) =>
      set({
        activeTab: tab,
        errorMessage: null,
      }),

    clearError: () => set({ errorMessage: null }),

    login: async (credentials) => {
      set({ loading: true, errorMessage: null });
      await new Promise((resolve) => setTimeout(resolve, 350));

      const inputUser = credentials.username.trim().toLowerCase();
      const pwd = credentials.password;

      const accounts = getStoredAccounts();
      const matched = accounts.find(
        (acc) =>
          acc.user.username.toLowerCase() === inputUser ||
          acc.user.displayName.toLowerCase() === inputUser,
      );

      if (!matched) {
        set({
          loading: false,
          errorMessage: t("auth.errNoAccount"),
        });
        return false;
      }

      if (matched.passwordHash !== pwd) {
        set({
          loading: false,
          errorMessage: t("auth.errWrongPassword"),
        });
        return false;
      }

      try {
        if (credentials.rememberMe !== false) {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(matched.user));
        }
      } catch {
        // Bỏ qua lỗi
      }

      set({
        user: matched.user,
        isAuthenticated: true,
        isGuest: false,
        isModalOpen: false,
        loading: false,
        errorMessage: null,
      });

      return true;
    },

    register: async (data) => {
      set({ loading: true, errorMessage: null });
      await new Promise((resolve) => setTimeout(resolve, 350));

      const username = data.username.trim();
      const displayName = data.displayName.trim() || username;
      const accounts = getStoredAccounts();

      if (
        accounts.some(
          (acc) => acc.user.username.toLowerCase() === username.toLowerCase(),
        )
      ) {
        set({
          loading: false,
          errorMessage: t("auth.errUsernameTaken"),
        });
        return false;
      }

      const colors = ["#D6E87F", "#8E9BD8", "#E0A48C", "#9CC7A6", "#C6A6D9", "#D9BE86"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newUser: User = {
        id: `u-${Date.now()}`,
        username,
        displayName,
        avatarColor: randomColor,
        role: "viewer",
        points: 500,
        createdAt: Date.now(),
      };

      saveAccount({
        user: newUser,
        passwordHash: data.password,
      });

      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));
      } catch {
        // Bỏ qua lỗi
      }

      set({
        user: newUser,
        isAuthenticated: true,
        isGuest: false,
        isModalOpen: false,
        loading: false,
        errorMessage: null,
      });

      return true;
    },

    continueAsGuest: () => {
      try {
        sessionStorage.setItem(GUEST_DISMISSED_KEY, "1");
      } catch {
        // Bỏ qua
      }
      set({
        isGuest: true,
        isModalOpen: false,
        errorMessage: null,
      });
    },

    logout: () => {
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(GUEST_DISMISSED_KEY);
      } catch {
        // Bỏ qua
      }
      set({
        user: null,
        isAuthenticated: false,
        isGuest: false,
        isModalOpen: true,
        activeTab: "login",
        errorMessage: null,
      });
    },

    updateUserDisplayName: (name) => {
      const current = get().user;
      if (!current) return;
      const updated: User = { ...current, displayName: name };
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Bỏ qua
      }
      set({ user: updated });
    },
  };
});
