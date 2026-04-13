'use strict';

/**
 * Barrel file untuk semua direct scrapers.
 *
 * Usage:
 *   const { samehadaku, oploverz, anoboy, animekuindo, kusonime, animasu, animesail, donghub, nimegami, stream } = require('../shared/scrapers');
 *   const data = await samehadaku.getRecent({ page: 1 });
 */

const samehadaku = require('./samehadaku.scraper');
const oploverz   = require('./oploverz.scraper');
const anoboy     = require('./anoboy.scraper');
const animekuindo = require('./animekuindo.scraper');
const kusonime   = require('./kusonime.scraper');
const animasu    = require('./animasu.scraper');
const animesail  = require('./animesail.scraper');
const donghub    = require('./donghub.scraper');
const nimegami   = require('./nimegami.scraper');
const stream     = require('./stream.scraper');

module.exports = { samehadaku, oploverz, anoboy, animekuindo, kusonime, animasu, animesail, donghub, nimegami, stream };
