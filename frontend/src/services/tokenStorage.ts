import { User } from '../types';

const TOKEN_KEY = 'resqnet_token';
const USER_KEY = 'resqnet_user';

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore storage quota errors
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  try {
    const serialized = JSON.stringify(user);
    sessionStorage.setItem(USER_KEY, serialized);
    localStorage.setItem(USER_KEY, serialized);
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAuthToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore
  }
}
