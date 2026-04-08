export function createAuthService(api, tokenStore) {
  return {
    register: async (payload) => {
      const result = await api.post('/auth/register', payload);
      const accessToken = result?.data?.accessToken;
      const refreshToken = result?.data?.refreshToken;
      if (accessToken && refreshToken) tokenStore.setTokens(accessToken, refreshToken);
      return result;
    },

    login: async (payload) => {
      const result = await api.post('/auth/login', payload);
      const accessToken = result?.data?.accessToken;
      const refreshToken = result?.data?.refreshToken;
      if (!accessToken || !refreshToken) {
        throw new Error('Login response does not contain both tokens');
      }
      tokenStore.setTokens(accessToken, refreshToken);
      return result;
    },

    refresh: async () => {
      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token available');
      const result = await api.post('/auth/refresh', { refreshToken });

      const accessToken = result?.data?.accessToken;
      const nextRefreshToken = result?.data?.refreshToken;
      if (!accessToken || !nextRefreshToken) {
        throw new Error('Refresh response does not contain both tokens');
      }

      tokenStore.setTokens(accessToken, nextRefreshToken);
      return result;
    },

    logout: async () => {
      const refreshToken = tokenStore.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
      tokenStore.clearTokens();
      return { success: true };
    },

    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

    resetPassword: (token, password) =>
      api.post('/auth/reset-password', { token, password }),

    verifyEmail: (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  };
}
