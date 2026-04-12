'use strict';

const { normalizeCard, normalizeRating, normalizeType } = require('../../../../../../src/modules/comic/scrapers/aggregator/cardNormalizer');

describe('modules/comic/scrapers/aggregator/cardNormalizer', () => {
  it('drops cards with blank titles', () => {
    expect(normalizeCard({ title: '   ', slug: 'abc' }, 'source-a')).toBeNull();
  });

  it('normalizes title, rating, and type fields', () => {
    const card = normalizeCard(
      {
        title: '  Naruto Shippuden  ',
        slug: 'naruto-shippuden',
        score: '4..6 / 10',
        type: 'Anime ??',
        link: ' /anime/naruto ',
      },
      'source-a',
    );

    expect(card).toEqual({
      source: 'source-a',
      title: 'Naruto Shippuden',
      slug: 'naruto-shippuden',
      cover: null,
      chapter: null,
      type: 'anime',
      rating: 4.6,
      link: '/anime/naruto',
    });
  });

  it('normalizes malformed type and rating values independently', () => {
    expect(normalizeType('Donghua - Sub Indo')).toBe('donghua');
    expect(normalizeType('unknown')).toBeNull();
    expect(normalizeRating('Score: 8/10')).toBe(8);
    expect(normalizeRating('4..6')).toBe(4.6);
    expect(normalizeRating('n/a')).toBeNull();
  });
});