const paginate = (page, limit) => {
  const currentPage = Math.min(10000, Math.max(1, parseInt(page, 10) || 1));
  const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (currentPage - 1) * perPage;

  return { skip, limit: perPage, page: currentPage };
};

const paginateMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

module.exports = { paginate, paginateMeta };
