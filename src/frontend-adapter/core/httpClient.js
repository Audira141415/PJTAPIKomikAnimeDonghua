import axios from 'axios';
import { normalizeApiError } from './errorHandler.js';

export function createApiClient(config) {
  const {
    baseURL,
    timeout = 15000,
    tokenStore,
    onAuthExpired,
    refreshPath = '/auth/refresh',
  } = config;

  if (!baseURL) throw new Error('createApiClient requires baseURL');
  if (!tokenStore) throw new Error('createApiClient requires tokenStore');

  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const refreshClient = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  let refreshPromise = null;

  client.interceptors.request.use((request) => {
    const accessToken = tokenStore.getAccessToken();
    if (accessToken) {
      request.headers = request.headers || {};
      request.headers.Authorization = `Bearer ${accessToken}`;
    }
    return request;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status;
      const originalRequest = error?.config || {};
      const isRefreshRequest = (originalRequest.url || '').includes(refreshPath);

      if (status !== 401 || originalRequest._retry || isRefreshRequest) {
        throw normalizeApiError(error);
      }

      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) {
        tokenStore.clearTokens();
        if (typeof onAuthExpired === 'function') onAuthExpired();
        throw normalizeApiError(error);
      }

      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post(refreshPath, { refreshToken })
          .then((response) => {
            const nextAccess = response?.data?.data?.accessToken;
            const nextRefresh = response?.data?.data?.refreshToken;

            if (!nextAccess || !nextRefresh) {
              throw new Error('Refresh endpoint returned invalid token payload');
            }

            tokenStore.setTokens(nextAccess, nextRefresh);
            return { accessToken: nextAccess };
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        const { accessToken } = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        tokenStore.clearTokens();
        if (typeof onAuthExpired === 'function') onAuthExpired();
        throw normalizeApiError(refreshError);
      }
    }
  );

  async function request(method, url, options = {}) {
    try {
      const response = await client.request({ method, url, ...options });
      return response?.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  }

  return {
    client,
    request,
    get: (url, options) => request('get', url, options),
    post: (url, data, options = {}) => request('post', url, { ...options, data }),
    put: (url, data, options = {}) => request('put', url, { ...options, data }),
    patch: (url, data, options = {}) => request('patch', url, { ...options, data }),
    delete: (url, options) => request('delete', url, options),
  };
}
