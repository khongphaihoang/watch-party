"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  Mail,
  ShieldCheck,
  Sparkles,
  Ticket,
  User as UserIcon,
  UserPlus,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useRoomStore } from "@/lib/room-store";
import { BrandMark } from "@/components/hud/RoomTopBar";

interface FormFieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
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
    loginWithDemo,
    continueAsGuest,
  } = useAuthStore();

  const updateViewerProfile = useRoomStore((state) => state.updateViewerProfile);
  const pushToast = useRoomStore((state) => state.pushToast);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const headingId = useId();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAgreeTerms, setRegAgreeTerms] = useState(true);
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
      // Focus vào input đầu tiên
      window.setTimeout(() => {
        if (activeTab === "login") {
          emailInputRef.current?.focus();
        } else {
          nameInputRef.current?.focus();
        }
      }, 50);
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isModalOpen, activeTab]);

  // Đánh giá độ mạnh mật khẩu
  const passwordStrength = useMemo(() => {
    const p = regPassword;
    if (!p) return { score: 0, label: "", color: "" };
    if (p.length < 6) return { score: 1, label: "Yếu", color: "var(--danger)" };
    const hasLetters = /[a-zA-Z]/.test(p);
    const hasNumbers = /\d/.test(p);
    const hasSpecial = /[^a-zA-Z0-9]/.test(p);

    if (p.length >= 8 && hasLetters && hasNumbers && hasSpecial) {
      return { score: 3, label: "Rất mạnh", color: "var(--ok)" };
    }
    if (p.length >= 6 && hasLetters && hasNumbers) {
      return { score: 2, label: "Khá an toàn", color: "var(--gold)" };
    }
    return { score: 1, label: "Yếu", color: "var(--danger)" };
  }, [regPassword]);

  function validateLogin(): boolean {
    const errors: FormFieldErrors = {};
    if (!loginEmail.trim()) {
      errors.email = "Vui lòng nhập email hoặc tên tài khoản.";
    }
    if (!loginPassword) {
      errors.password = "Vui lòng nhập mật khẩu.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateRegister(): boolean {
    const errors: FormFieldErrors = {};
    if (!regName.trim()) {
      errors.displayName = "Vui lòng nhập tên hiển thị trên vé / rạp.";
    } else if (regName.trim().length < 2) {
      errors.displayName = "Tên hiển thị cần tối thiểu 2 ký tự.";
    }

    if (!regEmail.trim()) {
      errors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.email = "Địa chỉ email không đúng định dạng.";
    }

    if (!regPassword) {
      errors.password = "Vui lòng nhập mật khẩu.";
    } else if (regPassword.length < 6) {
      errors.password = "Mật khẩu cần tối thiểu 6 ký tự.";
    }

    if (!regConfirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    if (!regAgreeTerms) {
      errors.agreeTerms = "Bạn cần đồng ý với nội quy phòng chiếu.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    if (!validateLogin()) return;

    const ok = await login({
      emailOrUsername: loginEmail,
      password: loginPassword,
      rememberMe,
    });

    if (ok) {
      setJustSuccess(true);
      const user = useAuthStore.getState().user;
      if (user) {
        updateViewerProfile(user.displayName, user.avatarColor);
        pushToast(`Chào mừng ${user.displayName} trở lại Rạp Nhà!`, "ok");
      }
      setTimeout(() => {
        setJustSuccess(false);
      }, 1000);
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    if (!validateRegister()) return;

    const ok = await register({
      displayName: regName,
      email: regEmail,
      password: regPassword,
      confirmPassword: regConfirmPassword,
      agreeTerms: regAgreeTerms,
    });

    if (ok) {
      setJustSuccess(true);
      const user = useAuthStore.getState().user;
      if (user) {
        updateViewerProfile(user.displayName, user.avatarColor);
        pushToast(`Đăng ký vé thành công! Chào mừng ${user.displayName} đến Rạp Nhà!`, "ok");
      }
      setTimeout(() => {
        setJustSuccess(false);
      }, 1000);
    }
  }

  async function handleDemoLogin() {
    clearError();
    const ok = await loginWithDemo();
    if (ok) {
      const user = useAuthStore.getState().user;
      if (user) {
        updateViewerProfile(user.displayName, user.avatarColor);
        pushToast(`Đã vào rạp với tài khoản thử nghiệm: ${user.displayName}`, "ok");
      }
    }
  }

  function handleGuestClick() {
    continueAsGuest();
    pushToast("Bạn đang tham quan rạp với tư cách Khách. Đăng nhập để lưu ghế và điểm thưởng nhé!", "info");
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
        {/* Nút đóng modal (vào với tư cách Khách) */}
        <button
          type="button"
          className="auth-dialog__close"
          onClick={handleGuestClick}
          aria-label="Đóng và xem rạp với tư cách Khách"
          title="Xem với tư cách Khách"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Header thương hiệu rạp chiếu */}
        <header className="auth-dialog__head">
          <div className="auth-dialog__badge">
            <span className="brand__mark" aria-hidden="true">
              <BrandMark />
            </span>
            <span className="auth-dialog__badge-text">Rạp Chiếu Chung · Watch Party</span>
          </div>

          <h2 id={headingId} className="auth-dialog__title">
            {activeTab === "login" ? "Chào mừng trở lại rạp" : "Nhận vé khán giả mới"}
          </h2>
          <p className="auth-dialog__subtitle">
            {activeTab === "login"
              ? "Đăng nhập để giữ ghế xem phim, tích điểm thưởng và trò chuyện cùng bạn bè."
              : "Tạo tài khoản miễn phí chỉ trong 30 giây để bắt đầu đêm xem phim của bạn."}
          </p>

          {/* Tab Switcher */}
          <div className="auth-tabs" role="tablist" aria-label="Lựa chọn đăng nhập hoặc đăng ký">
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
              <span>Đăng nhập</span>
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
              <span>Đăng ký vé</span>
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
            {/* Field: Email hoặc Tên tài khoản */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="login-email">
                Email hoặc Tên tài khoản
              </label>
              <div className={`auth-input-box ${fieldErrors.email ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <Mail size={16} />
                </span>
                <input
                  ref={emailInputRef}
                  id="login-email"
                  type="text"
                  className="auth-input"
                  placeholder="name@example.com hoặc tên bạn"
                  autoComplete="username"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "login-email-err" : undefined}
                />
              </div>
              {fieldErrors.email ? (
                <p id="login-email-err" className="auth-field__error">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            {/* Field: Mật khẩu */}
            <div className="auth-field">
              <div className="auth-field__header">
                <label className="auth-field__label" htmlFor="login-password">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    alert("Gợi ý: Bạn có thể bấm nút 'Đăng nhập nhanh (Tài khoản thử nghiệm)' bên dưới để trải nghiệm ngay!");
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>
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
                  aria-label={showLoginPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                <span>Ghi nhớ đăng nhập trên thiết bị này</span>
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
                  <span>Đang kiểm tra vé...</span>
                </>
              ) : justSuccess ? (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>Vào rạp thành công!</span>
                </>
              ) : (
                <>
                  <Clapperboard size={16} aria-hidden="true" />
                  <span>Vào Rạp Chiếu Phim</span>
                </>
              )}
            </button>

            {/* Phân cách Hoặc */}
            <div className="auth-divider">
              <span>hoặc trải nghiệm nhanh</span>
            </div>

            {/* Nút Đăng nhập Demo 1-Click */}
            <button
              type="button"
              disabled={loading}
              onClick={handleDemoLogin}
              className="auth-demo-btn"
            >
              <Sparkles size={16} className="text-amber-400" aria-hidden="true" />
              <div className="auth-demo-btn__text">
                <strong>Đăng nhập nhanh với tài khoản Demo</strong>
                <span>(Tài khoản VIP: Hoàng Duy · demo@rapchieu.vn)</span>
              </div>
            </button>

            {/* Link Xem như Khách */}
            <div className="auth-guest-row">
              <button
                type="button"
                className="auth-link-guest"
                onClick={handleGuestClick}
              >
                Tiếp tục xem với tư cách Khán giả vãng lai (Khách) →
              </button>
            </div>
          </form>
        ) : (
          /* TAB 2: ĐĂNG KÝ VÉ MỚI */
          <form className="auth-form" noValidate onSubmit={handleRegisterSubmit}>
            {/* Field: Tên hiển thị */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-name">
                Tên hiển thị / Biệt danh trên ghế
              </label>
              <div className={`auth-input-box ${fieldErrors.displayName ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <UserIcon size={16} />
                </span>
                <input
                  ref={nameInputRef}
                  id="reg-name"
                  type="text"
                  maxLength={24}
                  className="auth-input"
                  placeholder="Ví dụ: Hoàng Duy, Mai Linh..."
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    if (fieldErrors.displayName) {
                      setFieldErrors({ ...fieldErrors, displayName: undefined });
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.displayName)}
                  aria-describedby={fieldErrors.displayName ? "reg-name-err" : undefined}
                />
              </div>
              {fieldErrors.displayName ? (
                <p id="reg-name-err" className="auth-field__error">
                  {fieldErrors.displayName}
                </p>
              ) : (
                <p className="auth-field__hint">Tên này sẽ in trên ghế và xuất hiện khi bạn bình luận trong rạp.</p>
              )}
            </div>

            {/* Field: Email */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-email">
                Địa chỉ Email
              </label>
              <div className={`auth-input-box ${fieldErrors.email ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <Mail size={16} />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "reg-email-err" : undefined}
                />
              </div>
              {fieldErrors.email ? (
                <p id="reg-email-err" className="auth-field__error">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            {/* Field: Mật khẩu */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-password">
                Mật khẩu (tối thiểu 6 ký tự)
              </label>
              <div className={`auth-input-box ${fieldErrors.password ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <KeyRound size={16} />
                </span>
                <input
                  id="reg-password"
                  type={showRegPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="Tạo mật khẩu an toàn"
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
                  aria-label={showRegPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {regPassword ? (
                <div className="auth-pwd-strength">
                  <div className="auth-pwd-strength__bars">
                    <span
                      className={`auth-pwd-strength__bar ${
                        passwordStrength.score >= 1 ? "auth-pwd-strength__bar--active" : ""
                      }`}
                      style={{ background: passwordStrength.score >= 1 ? passwordStrength.color : undefined }}
                    />
                    <span
                      className={`auth-pwd-strength__bar ${
                        passwordStrength.score >= 2 ? "auth-pwd-strength__bar--active" : ""
                      }`}
                      style={{ background: passwordStrength.score >= 2 ? passwordStrength.color : undefined }}
                    />
                    <span
                      className={`auth-pwd-strength__bar ${
                        passwordStrength.score >= 3 ? "auth-pwd-strength__bar--active" : ""
                      }`}
                      style={{ background: passwordStrength.score >= 3 ? passwordStrength.color : undefined }}
                    />
                  </div>
                  <span className="auth-pwd-strength__label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              ) : null}

              {fieldErrors.password ? (
                <p id="reg-pwd-err" className="auth-field__error">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            {/* Field: Xác nhận mật khẩu */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-confirm-password">
                Xác nhận lại mật khẩu
              </label>
              <div className={`auth-input-box ${fieldErrors.confirmPassword ? "auth-input-box--error" : ""}`}>
                <span className="auth-input-icon" aria-hidden="true">
                  <ShieldCheck size={16} />
                </span>
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="Nhập lại mật khẩu vừa đặt"
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
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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

            {/* Checkbox Đồng ý điều khoản */}
            <div className="auth-checkbox-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={regAgreeTerms}
                  onChange={(e) => {
                    setRegAgreeTerms(e.target.checked);
                    if (fieldErrors.agreeTerms) {
                      setFieldErrors({ ...fieldErrors, agreeTerms: undefined });
                    }
                  }}
                  className="auth-checkbox"
                />
                <span>Tôi đồng ý với Nội quy rạp chiếu & bảo mật thông tin</span>
              </label>
              {fieldErrors.agreeTerms ? (
                <p className="auth-field__error">{fieldErrors.agreeTerms}</p>
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
                  <span>Đang in vé khán giả...</span>
                </>
              ) : justSuccess ? (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>Đã nhận vé! Vào rạp...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} aria-hidden="true" />
                  <span>Tạo Vé & Vào Rạp Ngay</span>
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
                Tiếp tục xem với tư cách Khán giả vãng lai (Khách) →
              </button>
            </div>
          </form>
        )}

        <footer className="auth-dialog__foot">
          <Film size={13} aria-hidden="true" />
          <span>Rạp Nhà — Trải nghiệm xem chung âm thanh & hình ảnh đồng bộ</span>
        </footer>
      </div>
    </dialog>
  );
}
