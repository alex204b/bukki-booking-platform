/**
 * Auth storage using sessionStorage (per-tab).
 * Each browser tab maintains its own auth state, so logging into a different
 * account in one tab does not affect other tabs.
 */
const AUTH_KEYS = ['token', 'user'] as const;

function getStorage(): Storage | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage;
}

export const authStorage = {
  getToken: (): string | null => getStorage()?.getItem('token') ?? null,
  setToken: (value: string): void => getStorage()?.setItem('token', value),
  removeToken: (): void => getStorage()?.removeItem('token'),

  getUser: (): string | null => getStorage()?.getItem('user') ?? null,
  setUser: (value: string): void => getStorage()?.setItem('user', value),
  removeUser: (): void => getStorage()?.removeItem('user'),

  clear: (): void => AUTH_KEYS.forEach((k) => getStorage()?.removeItem(k)),
};
