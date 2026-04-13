require('dotenv').config();
const mongoose = require('mongoose');
const { env } = require('./src/config/env');
const Manga = require('./src/models/Manga');

const sourceLabelExpr = {
  $let: {
    vars: {
      networkLabel: {
        $cond: [
          { $and: [{ $ne: ['$network', null] }, { $ne: ['$network', ''] }] },
          '$network',
          null,
        ],
      },
      sourceKeyLabel: {
        $cond: [
          { $and: [{ $ne: ['$sourceKey', null] }, { $ne: ['$sourceKey', ''] }] },
          '$sourceKey',
          null,
        ],
      },
      sourceUrlHost: {
        $let: {
          vars: {
            urlMatch: {
              $regexFind: {
                input: { $ifNull: ['$sourceUrl', ''] },
                regex: /^https?:\/\/([^/?#]+)/i,
              },
            },
          },
          in: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$$urlMatch.captures', []] } }, 0] },
              { $arrayElemAt: ['$$urlMatch.captures', 0] },
              null,
            ],
          },
        },
      },
    },
    in: { $ifNull: ['$$networkLabel', { $ifNull: ['$$sourceKeyLabel', '$$sourceUrlHost'] }] },
  },
};

(async () => {
  await mongoose.connect(env.MONGO_URI);
  const [coverage, topSources] = await Promise.all([
    Promise.all([
      Manga.countDocuments({ type: 'manga' }),
      Manga.countDocuments({ type: 'manga', network: { $exists: true, $nin: [null, ''] } }),
      Manga.countDocuments({ type: 'manga', sourceKey: { $exists: true, $nin: [null, ''] } }),
      Manga.countDocuments({ type: 'manga', sourceUrl: { $exists: true, $nin: [null, ''] } }),
    ]),
    Manga.aggregate([
      { $match: { type: 'manga' } },
      { $addFields: { sourceLabel: sourceLabelExpr } },
      { $match: { sourceLabel: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$sourceLabel', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 15 },
    ]),
  ]);

  console.log(JSON.stringify({
    totalManga: coverage[0],
    withNetwork: coverage[1],
    withSourceKey: coverage[2],
    withSourceUrl: coverage[3],
    topSources,
  }, null, 2));

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
