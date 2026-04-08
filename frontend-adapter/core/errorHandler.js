export class ApiClientError extends Error {
  constructor(message, options = {}) {
    super(message || 'API request failed');
    this.name = 'ApiClientError';
    this.status = options.status || 0;
    this.code = options.code || 'API_ERROR';
    this.data = options.data || null;
    this.original = options.original || null;
  }
}

export function normalizeApiError(error) {
  const status = error?.response?.status || 0;
  const payload = error?.response?.data || null;
  const message = payload?.message || error?.message || 'API request failed';

  return new ApiClientError(message, {
    status,
    code: payload?.code || (status ? `HTTP_${status}` : 'NETWORK_ERROR'),
    data: payload,
    original: error,
  });
}
