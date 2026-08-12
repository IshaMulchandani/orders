import axios from "axios";

/**
 * Single shared Axios instance. Every API call in the app goes through
 * this client so auth headers, base URL, and error handling live in
 * one place instead of being repeated per feature.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// TODO(Phase 1): attach the JWT access token from useAuth via a
// request interceptor, and handle 401 -> refresh-token retry via a
// response interceptor.
