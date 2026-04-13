const nimegami = require('./src/shared/scrapers/nimegami.scraper');
(async()=>{
  const home = await nimegami.getHome({ page: 1 });
  console.log('meta=' + home.status + '|' + home.creator + '|' + home.source + ', animeListAlias=' + ((home.animeList || []).length === (home.anime_list || []).length));
  const liveDetail = await nimegami.getLiveDetail('3d-kanojo-real-girl-live-action-sub-indo-1');
  console.log('liveDetail_download_links=' + ((liveDetail.detail?.download_links || []).length));
  const detail = await nimegami.getDetail('naruto-sub-indo');
  console.log('detail_streamEpisodeKeys=' + Object.keys(detail.streams_by_episode || {}).length + ', download_links=' + ((detail.detail?.download_links || []).length));
})();
