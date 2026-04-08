export function createTokenStore(options = {}) {
  const storageKey = options.storageKey || 'comic_api_tokens';
  const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);

  let accessToken = null;
  let refreshToken = null;

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(storageKey, JSON.stringify({ accessToken, refreshToken }));
    } catch {
      // no-op
    }
  }

  function hydrate() {
    if (!storage) return;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      accessToken = parsed?.accessToken || null;
      refreshToken = parsed?.refreshToken || null;
    } catch {
      accessToken = null;
      refreshToken = null;
    }
  }

  function setTokens(nextAccessToken, nextRefreshToken) {
    accessToken = nextAccessToken || null;
    refreshToken = nextRefreshToken || null;
    persist();
  }

  function updateAccessToken(nextAccessToken) {
    accessToken = nextAccessToken || null;
    persist();
  }

  function clearTokens() {
    accessToken = null;
    refreshToken = null;
    if (!storage) return;
    try {
      storage.removeItem(storageKey);
    } catch {
      // no-op
    }
  }

  hydrate();

  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    setTokens,
    updateAccessToken,
    clearTokens,
    hydrate,
  };
}
