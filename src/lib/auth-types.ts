/**
 * Phiên người dùng. Rạp chỉ dành cho tài khoản thật — không còn vai trò khách.
 */
export interface User {
  id: string;
  username: string;
  displayName: string;
  shirtColor: string;
  bodyStyle: "male" | "female";
}

export type AuthStatus = "unknown" | "anonymous" | "ready";

export type AuthTab = "login" | "register";

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}
