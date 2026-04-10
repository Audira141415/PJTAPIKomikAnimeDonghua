'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const { sankaClient } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const search        = ({ q, page = 1 } = {})              => sankaGet('/dramabox/search', { q, page }).then(from);
const getLatest     = ({ page = 1 } = {})                  => sankaGet('/dramabox/latest', { page }).then(from);
const getTrending   = ()                                    => sankaGet('/dramabox/trending').then(from);
const getDetail     = ({ bookId } = {})                    => sankaGet('/dramabox/detail', { bookId }).then(from);
const getStream     = ({ bookId, episode } = {})           => sankaGet('/dramabox/stream', { bookId, episode }).then(from);
const refreshAuth   = ()                                    => sankaClient.post('/dramabox/auth/refresh').then(r => r.data);

module.exports = { search, getLatest, getTrending, getDetail, getStream, refreshAuth };
