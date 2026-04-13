const donghub = require('./src/shared/scrapers/donghub.scraper');
(async()=>{
  const home = await donghub.getHome();
  console.log('donghub_home_slider=' + (home.slider || []).length + ', popular=' + (home.popular || []).length + ', latest=' + (home.latest || []).length);
  const latest = await donghub.getLatest({ page: 1 });
  console.log('donghub_latest=' + (latest.data || []).length);
  const popular = await donghub.getPopular({ page: 1 });
  console.log('donghub_popular=' + (popular.data || []).length);
  const list = await donghub.getList({ page: 1 });
  console.log('donghub_list=' + (list.data || []).length);
  const genre = await donghub.getByGenre('action');
  console.log('donghub_genre_action=' + (genre.data || []).length);
  const detail = await donghub.getDetail('soul-land-2-the-unrivaled-tang-sect');
  console.log('donghub_detail_title=' + detail.title + ', eps=' + (detail.episodes || []).length);
  const episode = await donghub.getEpisode('soul-land-2-episode-135-subtitle-indonesia');
  console.log('donghub_episode_streams=' + (episode.streams || []).length + ', rel=' + (episode.related_episodes || []).length);
})();
