"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Ticket,
  User as UserIcon,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useT } from "@/lib/i18n";
import { useRoomStore } from "@/lib/room-store";
import { BrandMark } from "@/components/hud/RoomTopBar";

interface FormFieldErrors {
  username?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
}

const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
const DISPLAY_NAME_MIN = 2;
const PASSWORD_MIN = 8;

export function AuthModal() {
  const isModalOpen = useAuthStore((state) => state.isModalOpen);
  const activeTab = useAuthStore((state) => state.activeTab);
  const loading = useAuthStore((state) => state.loading);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const setActiveTab = useAuthStore((state) => state.setActiveTab);
  const clearError = useAuthStore((state) => state.clearError);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);

  const updateViewerProfile = useRoomStore((state) => state.updateViewerProfile);
  const pushToast = useRoomStore((state) => state.pushToast);

  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const regUsernameInputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isModalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isModalOpen && dialog.open) {
      dialog.close();
    }
    if (isModalOpen) {
      const timer = window.setTimeout(() => {
        const root = dialogRef.current;
        // Không cướp focus nếu người dùng đã bấm vào một ô trong hộp thoại.
        const active = document.activeElement;
        const typingInside =
          root !== null &&
          active instanceof HTMLElement &&
          active !== root &&
          root.contains(active) &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
        if (typingInside) return;
        if (activeTab === "login") usernameInputRef.current?.focus();
        else regUsernameInputRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [isModalOpen, activeTab]);

  const validateLogin = useCallback((): boolean => {
    const errors: FormFieldErrors = {};
    if (!loginUsername.trim()) errors.username = t("auth.errUsernameRequired");
    if (!loginPassword) errors.password = t("auth.errPasswordRequired");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [loginPassword, loginUsername, t]);

  const validateRegister = useCallback((): boolean => {
    const errors: FormFieldErrors = {};
    const username = regUsername.trim();
    if (!username) {
      errors.username = t("auth.errUsernameRequired");
    } else if (username.length < USERNAME_MIN) {
      errors.username = t("auth.errUsernameShort");
    } else if (username.length > USERNAME_MAX) {
      errors.username = t("auth.errUsernameLong", { max: USERNAME_MAX });
    } else if (!/^[A-Za-z0-9._-]+$/.test(username)) {
      errors.username = t("auth.errUsernameChars");
    }

    const displayName = regDisplayName.trim();
    if (!displayName) {
      errors.displayName = t("auth.errDisplayRequired");
    } else if (displayName.length < DISPLAY_NAME_MIN) {
      errors.displayName = t("auth.errDisplayShort");
    }

    if (!regPassword) {
      errors.password = t("auth.errPasswordRequired");
    } else if (regPassword.length < PASSWORD_MIN) {
      errors.password = t("auth.errPasswordShort");
    }

    if (!regConfirmPassword) {
      errors.confirmPassword = t("auth.errConfirmRequired");
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = t("auth.errConfirmMismatch");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [regConfirmPassword, regDisplayName, regPassword, regUsername, t]);

  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    if (!validateLogin()) return;

    const ok = await login({
      username: loginUsername,
      password: loginPassword,
      rememberMe,
    });
    if (!ok) return;

    const user = useAuthStore.getState().user;
    if (user) {
      updateViewerProfile(user.displayName, user.shirtColor);
      pushToast(t("auth.toastWelcomeBack", { name: user.displayName }), "ok");
    }
    setLoginPassword("");
  }

  async function handleRegisterSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    if (!validateRegister()) return;

    const ok = await register({
      username: regUsername,
      displayName: regDisplayName,
      password: regPassword,
      confirmPassword: regConfirmPassword,
    });
    if (!ok) return;

    const user = useAuthStore.getState().user;
    if (user) {
      updateViewerProfile(user.displayName, user.shirtColor);
      pushToast(t("auth.toastRegistered", { name: user.displayName }), "ok");
    }
    setRegPassword("");
    setRegConfirmPassword("");
  }

  function switchTab(tab: "login" | "register") {
    setActiveTab(tab);
    setFieldErrors({});
    clearError();
  }

  if (!isModalOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      aria-labelledby={headingId}
      // Rạp bắt buộc tài khoản: không có nút đóng, `Esc` cũng không đóng được —
      // chỉ đăng nhập hoặc đăng ký mới đi tiếp.
      onCancel={(event) => event.preventDefault()}
    >
      <div className="auth-dialog__inner">
        <header className="auth-dialog__head">
          <div className="auth-dialog__badge">
            <span className="brand__mark" aria-hidden="true">
              <BrandMark />
            </span>
            <span className="auth-dialog__badge-text">{t("auth.badge")}</span>
          </div>

          <h2 id={headingId} className="auth-dialog__title">
            {activeTab === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
          </h2>
          <p className="auth-dialog__subtitle">
            {activeTab === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
          </p>

          <div className="auth-tabs" role="tablist" aria-label={t("auth.tabsLabel")}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "login"}
              className={`auth-tab ${activeTab === "login" ? "auth-tab--active" : ""}`}
              onClick={() => switchTab("login")}
            >
              <LogIn size={15} aria-hidden="true" />
              <span>{t("topbar.login")}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "register"}
              className={`auth-tab ${activeTab === "register" ? "auth-tab--active" : ""}`}
              onClick={() => switchTab("register")}
            >
              <Ticket size={15} aria-hidden="true" />
              <span>{t("auth.registerTab")}</span>
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {activeTab === "login" ? (
          <form className="auth-form" noValidate onSubmit={handleLoginSubmit}>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="login-username">
                {t("auth.username")}
              </label>
              <div
                className={`auth-input-box ${fieldErrors.username ? "auth-input-box--error" : ""}`}
              >
                <span className="auth-input-icon" aria-hidden="true">
                  <UserIcon size={16} />
                </span>
                <input
                  ref={usernameInputRef}
                  id="login-username"
                  type="text"
                  className="auth-input"
                  placeholder={t("auth.usernamePlaceholder")}
                  autoComplete="username"
                  maxLength={USERNAME_MAX}
                  value={loginUsername}
                  onChange={(event) => {
                    setLoginUsername(event.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors({ ...fieldErrors, username: undefined });
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? "login-username-error" : undefined}
                />
              </div>
              {fieldErrors.username ? (
                <span className="auth-field__error" id="login-username-error" role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {fieldErrors.username}
                </span>
              ) : null}
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="login-password">
                {t("auth.password")}
              </label>
              <div
                className={`auth-input-box ${fieldErrors.password ? "auth-input-box--error" : ""}`}
              >
                <input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => {
                    setLoginPassword(event.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors({ ...fieldErrors, password: undefined });
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowLoginPassword((value) => !value)}
                  aria-label={
                    showLoginPassword ? t("auth.hidePassword") : t("auth.showPassword")
                  }
                  title={showLoginPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showLoginPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <span className="auth-field__error" id="login-password-error" role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {fieldErrors.password}
                </span>
              ) : null}
            </div>

            <div className="auth-checkbox-row">
              <label className="auth-checkbox-label" htmlFor="login-remember">
                <input
                  id="login-remember"
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                {t("auth.remember")}
              </label>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="auth-spin" aria-hidden="true" />
              ) : (
                <LogIn size={16} aria-hidden="true" />
              )}
              {loading ? t("auth.loggingIn") : t("auth.loginSubmit")}
            </button>
          </form>
        ) : (
          <form className="auth-form" noValidate onSubmit={handleRegisterSubmit}>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-username">
                {t("auth.username")}
              </label>
              <div
                className={`auth-input-box ${fieldErrors.username ? "auth-input-box--error" : ""}`}
              >
                <span className="auth-input-icon" aria-hidden="true">
                  <UserIcon size={16} />
                </span>
                <input
                  ref={regUsernameInputRef}
                  id="reg-username"
                  type="text"
                  className="auth-input"
                  placeholder={t("auth.regUsernamePlaceholder")}
                  autoComplete="username"
                  maxLength={USERNAME_MAX}
                  value={regUsername}
                  onChange={(event) => {
                    setRegUsername(event.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors({ ...fieldErrors, username: undefined });
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={
                    fieldErrors.username ? "reg-username-error" : "reg-username-hint"
                  }
                />
              </div>
              {fieldErrors.username ? (
                <span className="auth-field__error" id="reg-username-error" role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {fieldErrors.username}
                </span>
              ) : (
                <p className="auth-field__hint" id="reg-username-hint">
                  {t("auth.regUsernameHint")}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-display-name">
                {t("auth.displayName")}
              </label>
              <div
                className={`auth-input-box ${fieldErrors.displayName ? "auth-input-box--error" : ""}`}
              >
                <input
                  id="reg-display-name"
                  type="text"
                  className="auth-input"
                  placeholder={t("auth.displayNamePlaceholder")}
                  autoComplete="nickname"
                  maxLength={32}
                  value={regDisplayName}
                  onChange={(event) => {
                    setRegDisplayName(event.target.value);
                    if (fieldErrors.displayName) {
                      setFieldErrors({ ...fieldErrors, displayName: undefined });
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.displayName)}
                  aria-describedby={
                    fieldErrors.displayName ? "reg-display-name-error" : "reg-display-name-hint"
                  }
                />
              </div>
              {fieldErrors.displayName ? (
                <span className="auth-field__error" id="reg-display-name-error" role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {fieldErrors.displayName}
                </span>
              ) : (
                <p className="auth-field__hint" id="reg-display-name-hint">
                  {t("auth.displayNameHint")}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-password">
                {t("auth.password")}
              </label>
              <div
                className={`auth-input-box ${fieldErrors.password ? "auth-input-box--error" : ""}`}
              >
                <input
                  id="reg-password"
                  type={showRegPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder={t("auth.passwordMinPlaceholder")}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(event) => {
                    setRegPassword(event.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors({ ...fieldErrors, password: undefined });
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "reg-password-error" : undefined}
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowRegPassword((value) => !value)}
                  aria-label={showRegPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  title={showRegPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showRegPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <span className="auth-field__error" id="reg-password-error" role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {fieldErrors.password}
                </span>
              ) : null}
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-confirm-password">
                {t("auth.confirmPassword")}
              </label>
              <div
                className={`auth-input-box ${fieldErrors.confirmPassword ? "auth-input-box--error" : ""}`}
              >
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder={t("auth.confirmPlaceholder")}
                  autoComplete="new-password"
                  value={regConfirmPassword}
                  onChange={(event) => {
                    setRegConfirmPassword(event.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={
                    fieldErrors.confirmPassword ? "reg-confirm-error" : undefined
                  }
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")
                  }
                  title={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword ? (
                <span className="auth-field__error" id="reg-confirm-error" role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {fieldErrors.confirmPassword}
                </span>
              ) : null}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="auth-spin" aria-hidden="true" />
              ) : (
                <Ticket size={16} aria-hidden="true" />
              )}
              {loading ? t("auth.registering") : t("auth.registerSubmit")}
            </button>
          </form>
        )}

        <div className="auth-dialog__foot">
          <span>{t("auth.footer")}</span>
        </div>
      </div>
    </dialog>
  );
}
