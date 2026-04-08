import { createTokenStore } from './core/tokenStore.js';
import { createApiClient } from './core/httpClient.js';
import { ApiClientError } from './core/errorHandler.js';

import { createAuthService } from './services/authService.js';
import { createMangaService } from './services/mangaService.js';
import { createSearchService } from './services/searchService.js';

export function createFrontendAdapter(options) {
  const {
    baseURL,
    storageKey,
    onAuthExpired,
    timeout,
  } = options || {};

  if (!baseURL) {
    throw new Error('createFrontendAdapter requires baseURL (example: https://api.domain.com/api/v1)');
  }

  const tokenStore = createTokenStore({ storageKey });
  const api = createApiClient({
    baseURL,
    tokenStore,
    onAuthExpired,
    timeout,
  });

  return {
    tokenStore,
    api,
    errors: { ApiClientError },
    auth: createAuthService(api, tokenStore),
    manga: createMangaService(api),
    search: createSearchService(api),
  };
}
