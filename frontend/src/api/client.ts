import axios from "axios";
import { tokenStorage } from "./tokenStorage";

/**
 * Single shared Axios instance. Every API call in the app goes through
 * this client so auth headers, base URL, and 401-refresh handling live
 * in one place instead of being repeated per feature.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const access = tokenStorage.getAccess();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Single-flight refresh: if several requests 401 at once, only the
// first triggers a refresh call; the rest wait on the same promise.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh/`, { refresh });
    tokenStorage.setAccess(data.access);
    return data.access;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newAccess = await refreshPromise;
      refreshPromise = null;
      if (newAccess) {
        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      }
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
