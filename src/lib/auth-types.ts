export type UserRole = "viewer" | "vip" | "host";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
  role: UserRole;
  points: number;
  createdAt: number;
}

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export type AuthTab = "login" | "register";
