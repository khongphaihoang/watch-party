"use client";

import { useMemo } from "react";
import { useLocaleStore, type Locale } from "../locale-store";
import { messages, type MessageKey } from "./messages";

export type { MessageKey };
export type TranslateParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const table = messages[locale] ?? messages.vi;
  const template = table[key] ?? messages.vi[key] ?? key;
  return interpolate(template, params);
}

/** Dùng ngoài React (store, toast, callback không phải component). */
export function t(key: MessageKey, params?: TranslateParams): string {
  return translate(useLocaleStore.getState().locale, key, params);
}

/** Dùng trong component: tự render lại khi đổi ngôn ngữ. */
export function useT() {
  const locale = useLocaleStore((state) => state.locale);
  return useMemo(
    () => (key: MessageKey, params?: TranslateParams) => translate(locale, key, params),
    [locale],
  );
}

export function useLocale(): Locale {
  return useLocaleStore((state) => state.locale);
}
