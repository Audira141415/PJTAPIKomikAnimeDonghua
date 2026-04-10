'use strict';

const router = require('express').Router();
const ctrl   = require('./winbu.controller');

router.get('/home',              ctrl.home);
router.get('/search',            ctrl.search);
router.get('/anime/:id',         ctrl.animeDetail);
router.get('/series',            ctrl.seriesList);
router.get('/series/:id',        ctrl.seriesDetail);
router.get('/film',              ctrl.filmList);
router.get('/film/:id',          ctrl.filmDetail);
router.get('/episode/:id',       ctrl.episodeDetail);
router.get('/server',            ctrl.server);
router.get('/animedonghua',      ctrl.animeDonghua);
router.get('/tvshow',            ctrl.tvShow);
router.get('/others',            ctrl.others);
router.get('/genres',            ctrl.genres);
router.get('/genre/:slug',       ctrl.byGenre);
router.get('/catalog',           ctrl.catalog);
router.get('/schedule',          ctrl.schedule);
router.get('/update',            ctrl.update);
router.get('/latest',            ctrl.latest);
router.get('/ongoing',           ctrl.ongoing);
router.get('/completed',         ctrl.completed);
router.get('/populer',           ctrl.populer);
router.get('/all-anime',         ctrl.allAnime);
router.get('/all-anime-reverse', ctrl.allAnimeRev);
router.get('/list',              ctrl.listAnime);

module.exports = router;
