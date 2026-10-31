"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Eye,
  EyeOff,
  Film,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
  Ticket,
  User as UserIcon,
  UserPlus,
  X,
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

export function AuthModal() {
  const {
    isModalOpen,
    activeTab,
    loading,
    errorMessage,
    setActiveTab,
    clearError,
    login,
    register,
    continueAsGuest,
  } = useAuthStore();

  const t = useT();
  const updateViewerProfile = useRoomStore((state) => state.updateViewerProfile);
  const pushToast = useRoomStore((state) => state.pushToast);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const regUsernameInputRef = useRef<HTMLInputElement>(null);

  const headingId = useId();

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [justSuccess, setJustSuccess] = useState(false);

  // Mở/đóng dialog native
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isModalOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      window.setTimeout(() => {
        if (activeTab === "login") {
          usernameInputRef.current?.focus();
        } else {
          regUsernameInputRef.current?.focus();
        }
      }, 50);
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isModalOpen, activeTab]);

  function validateLogin(): boolean {
    const errors: FormFieldErrors = {};
    if (!loginUsername.trim()) {
      errors.username = t("auth.errUsernameRequired");
    }
    if (!loginPassword) {
      errors.password = t("auth.errPasswordRequired");
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateRegister(): boolean {
    const errors: FormFieldErrors = {};
    const u = regUsername.trim();
    if (!u) {
      errors.username = t("auth.errUsernameRequired");
    } else if (u.length < 3) {
      errors.username = t("auth.errUsernameShort");
    }

    const d = regDisplayName.trim();
    if (!d) {
      errors.displayName = t("auth.errDisplayRequired");
    } else if (d.length < 2) {
      errors.displayName = t("auth.errDisplayShort");
    }

    if (!regPassword) {
      errors.password = t("auth.errPasswordRequired");
    } else if (regPassword.length < 6) {
      errors.password = t("auth.errPasswordShort");
    }

    if (!regConfirmPassword) {
      errors.confirmPassword = t("auth.errConfirmRequired");
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = t("auth.errConfirmMismatch");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    if (!validateLogin()) return;

    const ok = await login({
      username: loginUsername,
      password: loginPassword,
      rememberMe,
    });

    if (ok) {
      setJustSuccess(true);
      const user = useAuthStore.getState().user;
      if (user) {
        updateViewerProfile(user.displayName, user.avatarColor);
        pushToast(t("auth.toastWelcomeBack", { name: user.displayName }), "ok");
      }
      setTimeout(() => {
        setJustSuccess(false);
      }, 800);
    }
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

    if (ok) {
      setJustSuccess(true);
      const user = useAuthStore.getState().user;
      if (user) {
        updateViewerProfile(user.displayName, user.avatarColor);
        pushToast(t("auth.toastRegistered", { name: user.displayName }), "ok");
      }
      setTimeout(() => {
        setJustSuccess(false);
      }, 800);
    }
  }

  function handleGuestClick() {
    continueAsGuest();
    pushToast(t("auth.toastGuest"), "info");
  }

  if (!isModalOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      aria-labelledby={headingId}
      onCancel={(e) => {
        e.preventDefault();
        handleGuestClick();
      }}
    >
      <div className="auth-dialog__inner">
        {/* Nút đóng modal */}
        <button
          type="button"
          className="auth-dialog__close"
          onClick={handleGuestClick}
          aria-label={t("auth.closeAria")}
          title={t("auth.closeTitle")}
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Header thương hiệu rạp chiếu */}
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
            {activeTab === "login"
              ? t("auth.loginSubtitle")
              : t("auth.registerSubtitle")}
          </p>

          {/* Tab Switcher */}
          <div className="auth-tabs" role="tablist" aria-label={t("auth.tabsLabel")}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "login"}
              className={`auth-tab ${activeTab === "login" ? "auth-tab--active" : ""}`}
              onClick={() => {
                setActiveTab("login");
                setFieldErrors({});
                clearError();
              }}
            >
              <LogIn size={15} aria-hidden="true" />
              <span>{t("topbar.login")}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "register"}
              className={`auth-tab ${activeTab === "register" ? "auth-tab--active" : ""}`}
              onClick={() => {
                setActiveTab("register");
                setFieldErrors({});
                clearError();
              }}
            >
              <Ticket size={15} aria-hidden="true" />
              <span>{t("auth.registerTab")}</span>
            </button>
          </div>
        </header>

        {/* Global Error Alert */}
        {errorMessage ? (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* TAB 1: ĐĂNG NHẬP */}
        {activeTab === "login" ? (
          <form className="auth-form" noValidate onSubmit={handleLoginSubmit}>
            {/* Field: Tên đăng nhập */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="login-username">
                {t("auth.username")}
              </label>
              <div className={`auth-input-box ${fieldErrors.username ? "auth-input-box--error" : ""}`}>
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
                  value={loginUsername}
                  onChange={(e) => {
                    setLoginUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: undefined });
                  }}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? "login-user-err" : undefined}
                />
              </div>
              {fieldErrors.username ? (
                <p id="login-user-err" className="auth-field__error">
                  {fieldErrors.username}
                </p>
              ) : null}
            </div>

            {/* Field: Mật khẩu (Không có Quên mật khẩu) */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="login-password">
                {t("auth.password")}
              </label>
              <div className={`auth-input-box ${fieldErrors.password ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <KeyRound size={16} />
                </span>
                <input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "login-pwd-err" : undefined}
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id="login-pwd-err" className="auth-field__error">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            {/* Checkbox Ghi nhớ đăng nhập */}
            <div className="auth-checkbox-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="auth-checkbox"
                />
                <span>{t("auth.remember")}</span>
              </label>
            </div>

            {/* Nút Submit Đăng nhập */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary auth-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="auth-spin" aria-hidden="true" />
                  <span>{t("auth.loggingIn")}</span>
                </>
              ) : justSuccess ? (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{t("auth.loginSuccess")}</span>
                </>
              ) : (
                <>
                  <Clapperboard size={16} aria-hidden="true" />
                  <span>{t("auth.loginSubmit")}</span>
                </>
              )}
            </button>

            {/* Link Xem như Khách */}
            <div className="auth-guest-row">
              <button
                type="button"
                className="auth-link-guest"
                onClick={handleGuestClick}
              >
                {t("auth.guestLink")}
              </button>
            </div>
          </form>
        ) : (
          /* TAB 2: ĐĂNG KÝ VÉ ĐƠN GIẢN */
          <form className="auth-form" noValidate onSubmit={handleRegisterSubmit}>
            {/* Field 1: Tên đăng nhập */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-username">
                {t("auth.username")}
              </label>
              <div className={`auth-input-box ${fieldErrors.username ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <UserIcon size={16} />
                </span>
                <input
                  ref={regUsernameInputRef}
                  id="reg-username"
                  type="text"
                  maxLength={20}
                  className="auth-input"
                  placeholder={t("auth.regUsernamePlaceholder")}
                  autoComplete="username"
                  value={regUsername}
                  onChange={(e) => {
                    setRegUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: undefined });
                  }}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? "reg-user-err" : undefined}
                />
              </div>
              {fieldErrors.username ? (
                <p id="reg-user-err" className="auth-field__error">
                  {fieldErrors.username}
                </p>
              ) : (
                <p className="auth-field__hint">{t("auth.regUsernameHint")}</p>
              )}
            </div>

            {/* Field 2: Tên hiển thị trên ghế */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-display-name">
                {t("auth.displayName")}
              </label>
              <div className={`auth-input-box ${fieldErrors.displayName ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <Ticket size={16} />
                </span>
                <input
                  id="reg-display-name"
                  type="text"
                  maxLength={20}
                  className="auth-input"
                  placeholder={t("auth.displayNamePlaceholder")}
                  value={regDisplayName}
                  onChange={(e) => {
                    setRegDisplayName(e.target.value);
                    if (fieldErrors.displayName) setFieldErrors({ ...fieldErrors, displayName: undefined });
                  }}
                  aria-invalid={Boolean(fieldErrors.displayName)}
                  aria-describedby={fieldErrors.displayName ? "reg-display-err" : undefined}
                />
              </div>
              {fieldErrors.displayName ? (
                <p id="reg-display-err" className="auth-field__error">
                  {fieldErrors.displayName}
                </p>
              ) : (
                <p className="auth-field__hint">{t("auth.displayNameHint")}</p>
              )}
            </div>

            {/* Field 2: Mật khẩu */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-password">
                {t("auth.password")}
              </label>
              <div className={`auth-input-box ${fieldErrors.password ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <KeyRound size={16} />
                </span>
                <input
                  id="reg-password"
                  type={showRegPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder={t("auth.passwordMinPlaceholder")}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "reg-pwd-err" : undefined}
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id="reg-pwd-err" className="auth-field__error">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            {/* Field 3: Xác nhận lại mật khẩu */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-confirm-password">
                {t("auth.confirmPassword")}
              </label>
              <div className={`auth-input-box ${fieldErrors.confirmPassword ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <ShieldCheck size={16} />
                </span>
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder={t("auth.confirmPlaceholder")}
                  autoComplete="new-password"
                  value={regConfirmPassword}
                  onChange={(e) => {
                    setRegConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? "reg-confirm-err" : undefined}
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword ? (
                <p id="reg-confirm-err" className="auth-field__error">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            {/* Nút Submit Đăng ký */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary auth-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="auth-spin" aria-hidden="true" />
                  <span>{t("auth.registering")}</span>
                </>
              ) : justSuccess ? (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{t("auth.registerSuccess")}</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} aria-hidden="true" />
                  <span>{t("auth.registerSubmit")}</span>
                </>
              )}
            </button>

            {/* Link Xem như Khách */}
            <div className="auth-guest-row">
              <button
                type="button"
                className="auth-link-guest"
                onClick={handleGuestClick}
              >
                {t("auth.guestLink")}
              </button>
            </div>
          </form>
        )}

        <footer className="auth-dialog__foot">
          <Film size={13} aria-hidden="true" />
          <span>{t("auth.footer")}</span>
        </footer>
      </div>
    </dialog>
  );
}
