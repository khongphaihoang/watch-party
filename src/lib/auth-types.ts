export type UserRole = "viewer" | "vip" | "host";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  role: UserRole;
  points: number;
  createdAt: number;
}

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

export type AuthTab = "login" | "register";
