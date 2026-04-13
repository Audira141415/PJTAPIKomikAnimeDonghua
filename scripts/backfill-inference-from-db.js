'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Manga = require('../src/models/Manga');
const { env } = require('../src/config/env');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const FORCE = hasFlag('--force');
const ONLY_NETWORK = getArg('--network');
const ONLY_TYPE = getArg('--type');
const parsedBatch = parseInt(getArg('--batch') || '250', 10);
const safeBatch = Number.isFinite(parsedBatch) ? parsedBatch : 250;
const BATCH_SIZE = Math.min(1000, Math.max(50, safeBatch));

const SOURCE_FORCED_TYPE = {
  donghub: 'donghua',
  drachin: 'donghua',
};

const SOURCE_TYPE_HINTS = {
  donghub: { donghua: 3 },
  drachin: { donghua: 3 },
  winbu: { donghua: 1, anime: 1 },
  dramabox: { donghua: 1, movie: 2 },
  anime: { anime: 2 },
  samehadaku: { anime: 2 },
  animasu: { anime: 2 },
  kusonime: { anime: 2 },
  anoboy: { anime: 2 },
  animesail: { anime: 2 },
  oploverz: { anime: 2 },
  stream: { anime: 2 },
  animekuindo: { anime: 2 },
  nimegami: { anime: 2 },
  alqanime: { anime: 2 },
};

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function includesAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function inferConfidence(score) {
  if (score >= 100) return 0.99;
  if (score >= 8) return 0.92;
  if (score >= 6) return 0.85;
  if (score >= 4) return 0.75;
  if (score >= 2) return 0.65;
  return 0.55;
}

function inferFromDoc(doc) {
  const sourceKey = normalizeText(doc.network);
  const forcedType = SOURCE_FORCED_TYPE[sourceKey];
  if (forcedType) {
    return {
      inferenceConfidence: 0.99,
      inferenceReason: `forced-source:${sourceKey}`,
    };
  }

  const score = { anime: 0, donghua: 0, ona: 0, movie: 0 };
  const reasons = { anime: [], donghua: [], ona: [], movie: [] };

  const addScore = (type, points, reason) => {
    if (!Object.prototype.hasOwnProperty.call(score, type)) return;
    score[type] += points;
    reasons[type].push(reason);
  };

  const typeText = normalizeText(doc.type);
  const titleText = normalizeText(doc.title);
  const statusText = normalizeText(doc.status);
  const countryText = normalizeText(doc.country);
  const genreText = normalizeText(Array.isArray(doc.genres) ? doc.genres.join(' ') : '');

  if (includesAny(typeText, ['donghua'])) addScore('donghua', 8, `type:${typeText}`);
  if (includesAny(typeText, ['ona'])) addScore('ona', 8, `type:${typeText}`);
  if (includesAny(typeText, ['movie', 'film'])) addScore('movie', 8, `type:${typeText}`);
  if (includesAny(typeText, ['anime', 'tv'])) addScore('anime', 6, `type:${typeText}`);

  if (includesAny(countryText, ['china', 'chinese', 'cn'])) addScore('donghua', 4, `country:${countryText}`);
  if (includesAny(genreText, ['donghua', 'chinese'])) addScore('donghua', 3, `genre:${genreText}`);

  if (includesAny(titleText, ['donghua'])) addScore('donghua', 4, `title:${titleText}`);
  if (includesAny(titleText, ['movie', 'film'])) addScore('movie', 4, `title:${titleText}`);
  if (includesAny(statusText, ['movie'])) addScore('movie', 2, `status:${statusText}`);

  const sourceHints = SOURCE_TYPE_HINTS[sourceKey] || {};
  Object.entries(sourceHints).forEach(([type, points]) => {
    addScore(type, points, `source-hint:${sourceKey}`);
  });

  if (sourceKey.includes('dong')) addScore('donghua', 2, `source-name:${sourceKey}`);

  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = ranked[0];
  const [, runnerUpScore] = ranked[1];

  if (bestScore <= 0) {
    return {
      inferenceConfidence: 0.5,
      inferenceReason: `fallback:${sourceKey || 'unknown'}`,
    };
  }

  const confidence = Math.max(0.5, inferConfidence(bestScore - runnerUpScore >= 2 ? bestScore : bestScore - 1));
  const reason = reasons[bestType][0] || `score:${bestType}:${bestScore}`;

  return {
    inferenceConfidence: confidence,
    inferenceReason: reason,
  };
}

async function run() {
  await mongoose.connect(env.MONGO_URI);

  const query = { contentCategory: 'animation' };
  if (ONLY_NETWORK) query.network = ONLY_NETWORK;
  if (ONLY_TYPE) query.type = ONLY_TYPE;

  if (!FORCE) {
    query.$or = [
      { inferenceConfidence: { $exists: false } },
      { inferenceConfidence: null },
      { inferenceReason: { $exists: false } },
      { inferenceReason: null },
      { inferenceReason: '' },
    ];
  }

  const cursor = Manga.find(query)
    .select('_id title type status country genres network inferenceConfidence inferenceReason')
    .lean()
    .cursor();

  let scanned = 0;
  let queued = 0;
  let updated = 0;
  const ops = [];

  for await (const doc of cursor) {
    scanned += 1;
    const inferred = inferFromDoc(doc);

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            inferenceConfidence: inferred.inferenceConfidence,
            inferenceReason: inferred.inferenceReason,
          },
        },
      },
    });

    queued += 1;

    if (ops.length >= BATCH_SIZE) {
      const result = await Manga.bulkWrite(ops, { ordered: false });
      updated += result.modifiedCount || 0;
      ops.length = 0;
    }
  }

  if (ops.length > 0) {
    const result = await Manga.bulkWrite(ops, { ordered: false });
    updated += result.modifiedCount || 0;
  }

  console.log('----------------------------------------');
  console.log('Backfill inference from DB');
  console.log(`Scanned : ${scanned}`);
  console.log(`Queued  : ${queued}`);
  console.log(`Updated : ${updated}`);
  console.log(`Force   : ${FORCE ? 'yes' : 'no'}`);
  console.log(`Network : ${ONLY_NETWORK || '-'}`);
  console.log(`Type    : ${ONLY_TYPE || '-'}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('FATAL:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_err) {
    // noop
  }
  process.exit(1);
});
