function toQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function createSearchService(api) {
  return {
    searchManga: ({ q, type, page = 1, limit = 10 }) =>
      api.get(`/search${toQuery({ q, type, page, limit })}`),
  };
}
