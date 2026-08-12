// Small wrapper around localStorage so token persistence logic lives
// in one place. The Axios interceptors (outside React) and useAuth
// (inside React) both read/write through this module instead of
// touching localStorage directly.
//
// Tradeoff: localStorage is readable by any script on the page (XSS
// risk), vs. an httpOnly cookie which isn't. Acceptable for a v1
// internal tool behind Google-invite-only auth; worth revisiting
// (backend-set httpOnly refresh cookie) if this ever faces the public
// internet with untrusted user content.
const ACCESS_KEY = "os_access_token";
const REFRESH_KEY = "os_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess: (access: string) => {
    localStorage.setItem(ACCESS_KEY, access);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
