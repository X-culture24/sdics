import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE } from '@/constants';

const TOKEN_KEY = 'nvrcms:access';
const REFRESH_KEY = 'nvrcms:refresh';
const USER_KEY = 'nvrcms:user';

/**
 * The Go API uses snake_case JSON fields while the React application uses
 * camelCase. Keep that conversion at the HTTP boundary so authentication and
 * the rest of the UI share one consistent contract.
 */
const toCamelCase = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      toCamelCase(entry),
    ]),
  );
};

const toSnakeCase = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(toSnakeCase);
  if (!value || typeof value !== 'object' || value instanceof Date || value instanceof FormData) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      toSnakeCase(entry),
    ]),
  );
};

export class TokenManager {
  static getAccessToken = () => localStorage.getItem(TOKEN_KEY);
  static setAccessToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
  static clearAccessToken = () => localStorage.removeItem(TOKEN_KEY);

  static getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
  static setRefreshToken = (t: string) => localStorage.setItem(REFRESH_KEY, t);
  static clearRefreshToken = () => localStorage.removeItem(REFRESH_KEY);

  static getUser = () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  static setUser = (u: any) => localStorage.setItem(USER_KEY, JSON.stringify(u));
  static clearUser = () => localStorage.removeItem(USER_KEY);

  static clearAll = () => {
    TokenManager.clearAccessToken();
    TokenManager.clearRefreshToken();
    TokenManager.clearUser();
  };
}

export interface ApiErrorResponse {
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  original?: any;
  constructor(status: number, message: string, code: string, original?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.original = original;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE,
    timeout: 60_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  let refreshPromise: Promise<string> | null = null;

  client.interceptors.request.use(
    (config) => {
      const t = TokenManager.getAccessToken();
      if (t && config.headers) {
        config.headers.Authorization = `Bearer ${t}`;
      }
      if (config.data && !(config.data instanceof FormData)) {
        config.data = toSnakeCase(config.data);
      }
      if (config.params && typeof config.params === 'object') {
        config.params = toSnakeCase(config.params);
      }
      return config;
    },
    (err) => Promise.reject(err),
  );

  client.interceptors.response.use(
    (res) => {
      res.data = toCamelCase(res.data) as typeof res.data;
      return res;
    },
    async (error: AxiosError<ApiErrorResponse>) => {
      const status = error.response?.status ?? 500;
      const resp = error.response?.data;
      const msg = resp?.error?.message ?? resp?.message ?? error.message ?? 'Request failed';
      const code = resp?.error?.code ?? String(status);

      if (status === 401) {
        const refresh = TokenManager.getRefreshToken();
        if (refresh && !refreshPromise) {
          refreshPromise = (async () => {
            try {
              const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
                `${API_BASE}/auth/refresh`,
                { refresh_token: refresh },
              );
              TokenManager.setAccessToken(data.access_token);
              // Refresh tokens are rotated by the API, so the replacement must
              // be persisted as well or the next refresh will fail.
              TokenManager.setRefreshToken(data.refresh_token);
              return data.access_token;
            } catch {
              TokenManager.clearAll();
              throw new ApiError(401, 'Session expired. Please login again.', 'SESSION_EXPIRED');
            } finally {
              refreshPromise = null;
            }
          })();
        }
        if (refreshPromise) {
          try {
            const newToken = await refreshPromise;
            const cfg = { ...error.config } as AxiosRequestConfig;
            if (cfg.headers) cfg.headers.Authorization = `Bearer ${newToken}`;
            return client.request(cfg);
          } catch (refreshErr) {
            window.dispatchEvent(new CustomEvent('nvrcms:logout', { detail: { reason: 'session-expired' } }));
            return Promise.reject(refreshErr);
          }
        } else {
          TokenManager.clearAll();
          window.dispatchEvent(new CustomEvent('nvrcms:logout', { detail: { reason: 'unauthorized' } }));
        }
      }

      return Promise.reject(new ApiError(status, msg, code, error));
    },
  );

  return client;
};

export const apiClient = createApiClient();

export async function getData<T>(path: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<T> {
  const res: AxiosResponse<T> = await apiClient.get(path, { params, ...config });
  return res.data;
}

export async function postData<T, R = any>(path: string, body?: T, config?: AxiosRequestConfig): Promise<R> {
  const res: AxiosResponse<R> = await apiClient.post(path, body, config);
  return res.data;
}

export async function putData<T, R = any>(path: string, body?: T, config?: AxiosRequestConfig): Promise<R> {
  const res: AxiosResponse<R> = await apiClient.put(path, body, config);
  return res.data;
}

export async function patchData<T, R = any>(path: string, body?: T, config?: AxiosRequestConfig): Promise<R> {
  const res: AxiosResponse<R> = await apiClient.patch(path, body, config);
  return res.data;
}

export async function deleteData<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const res: AxiosResponse<T> = await apiClient.delete(path, config);
  return res.data;
}
