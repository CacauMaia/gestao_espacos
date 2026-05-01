export type UserRole = 'ADMIN' | 'MONITOR' | 'STUDENT';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  user: AuthenticatedUser;
}
