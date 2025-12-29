import axios from 'axios';

const TOKEN_KEY = 'bb_admin_token';
const DEFAULT_ADMIN_PREFIX = '/admin';

function normalizePrefix(raw: unknown, fallback: string) {
  const v = String(raw || '').trim() || fallback;
  if (v === '/') return '/';
  const withSlash = v.startsWith('/') ? v : `/${v}`;
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

const ADMIN_API_PREFIX = normalizePrefix(
  (import.meta as any).env?.VITE_ADMIN_API_PREFIX,
  DEFAULT_ADMIN_PREFIX
);

export function getToken(): string {
  return String(localStorage.getItem(TOKEN_KEY) || '');
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export const http = axios.create({
  baseURL: String((import.meta as any).env?.VITE_API_BASE_URL || ''),
  timeout: 30_000,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Support custom admin API prefix without changing call sites
  const url = String(config.url || '');
  if (ADMIN_API_PREFIX !== DEFAULT_ADMIN_PREFIX) {
    if (url === DEFAULT_ADMIN_PREFIX || url.startsWith(`${DEFAULT_ADMIN_PREFIX}/`)) {
      config.url = `${ADMIN_API_PREFIX}${url.slice(DEFAULT_ADMIN_PREFIX.length)}`;
    }
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      clearToken();
      const base = import.meta.env.BASE_URL || '/';
      if (!location.pathname.startsWith(`${base}login`)) {
        location.href = `${base}login`;
      }
    }
    return Promise.reject(err);
  }
);
