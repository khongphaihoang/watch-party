"use client";

import { create } from "zustand";

export type Locale = "vi" | "en";

export const LOCALE_STORAGE_KEY = "rap-chieu:locale";
export const DEFAULT_LOCALE: Locale = "vi";

/** Thứ tự hiển thị trong menu chọn ngôn ngữ. */
export const LOCALES: Locale[] = ["vi", "en"];

export function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "en";
}

interface LocaleStore {
  locale: Locale;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  hydrate: () => void;
}

function syncDocumentLang(locale: Locale) {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: DEFAULT_LOCALE,
  hydrated: false,

  setLocale: (locale) => {
    set({ locale });
    syncDocumentLang(locale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Chế độ riêng tư có thể chặn localStorage — ngôn ngữ vẫn đổi trong phiên.
    }
  },

  hydrate: () => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      // Bỏ qua: dùng mặc định.
    }
    const locale = isLocale(stored) ? stored : DEFAULT_LOCALE;
    set({ locale, hydrated: true });
    syncDocumentLang(locale);
  },
}));
