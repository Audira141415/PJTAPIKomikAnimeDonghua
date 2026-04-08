import { createFrontendAdapter } from './index.js';

const adapter = createFrontendAdapter({
  baseURL: import.meta.env.VITE_API_URL,
  storageKey: 'my_site_tokens',
  onAuthExpired: () => {
    // Optional: redirect ke login page
    window.location.href = '/login';
  },
});

export const authApi = adapter.auth;
export const mangaApi = adapter.manga;
export const searchApi = adapter.search;

// Example call:
// const { data, meta } = await mangaApi.list({ page: 1, limit: 20, type: 'donghua' });
// console.log(data, meta);
