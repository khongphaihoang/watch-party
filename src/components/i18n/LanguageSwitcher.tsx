"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { LOCALES, useLocaleStore, type Locale } from "@/lib/locale-store";
import { useT } from "@/lib/i18n";
import { FlagIcon } from "./FlagIcon";

export function LanguageSwitcher() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const t = useT();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const currentIndex = Math.max(0, LOCALES.indexOf(locale));

  useEffect(() => {
    if (!open) return;

    // Đưa tiêu điểm vào lựa chọn đang dùng để bàn phím thao tác ngay.
    optionRefs.current[currentIndex]?.focus();

    function onPointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = (currentIndex + step + LOCALES.length) % LOCALES.length;
        optionRefs.current[next]?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, currentIndex]);

  function choose(next: Locale) {
    setLocale(next);
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="lang-switch" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`icon-btn topbar__aux topbar__keep lang-switch__btn ${open ? "is-active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.switch")}
        data-tip={t("language.current", { language: t(`language.${locale}`) })}
      >
        <FlagIcon locale={locale} size={20} />
      </button>

      {open ? (
        <ul
          className="lang-menu panel"
          role="listbox"
          aria-label={t("language.label")}
          tabIndex={-1}
        >
          {LOCALES.map((option, index) => {
            const selected = option === locale;
            return (
              <li key={option} role="none">
                <button
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`lang-menu__item ${selected ? "is-selected" : ""}`}
                  onClick={() => choose(option)}
                  lang={option}
                >
                  <FlagIcon locale={option} size={20} />
                  <span className="lang-menu__label">{t(`language.${option}`)}</span>
                  <span className="lang-menu__check" aria-hidden="true">
                    {selected ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
