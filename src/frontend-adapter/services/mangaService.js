function toQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function createMangaService(api) {
  return {
    list: (params = {}) => api.get(`/mangas${toQuery(params)}`),
    getBySlug: (slug) => api.get(`/mangas/${encodeURIComponent(slug)}`),
    getRecommendations: (id) => api.get(`/mangas/${encodeURIComponent(id)}/recommendations`),
    rate: (id, score) => api.patch(`/mangas/${encodeURIComponent(id)}/rate`, { score }),

    create: (payload) => api.post('/mangas', payload),
    update: (id, payload) => api.put(`/mangas/${encodeURIComponent(id)}`, payload),
    remove: (id) => api.delete(`/mangas/${encodeURIComponent(id)}`),

    createWithCover: (payload, file) => {
      const form = new FormData();
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        form.append(key, String(value));
      });
      if (file) form.append('coverImage', file);

      return api.post('/mangas', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    updateWithCover: (id, payload, file) => {
      const form = new FormData();
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        form.append(key, String(value));
      });
      if (file) form.append('coverImage', file);

      return api.put(`/mangas/${encodeURIComponent(id)}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  };
}
