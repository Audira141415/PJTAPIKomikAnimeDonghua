const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const urls=['https://animesail.com/','https://animesail.com/?s=naruto','https://animesail.com/genre/action/'];
  for (const url of urls){
    try{
      const html=await playwrightGet(url,{timeout:45000});
      const $=cheerio.load(html);
      console.log('\n'+url);
      console.log('title='+$('title').text().trim());
      console.log('counts='+['.bsx','.listupd article.bs','.venser','.venz li','.post','.entry-content','.info p'].map(s=>s+':'+$(s).length).join(' | '));
      const links=[]; $('a[href]').each((_,a)=>{const h=$(a).attr('href')||''; const t=$(a).text().trim(); if(/anime|episode|subtitle|nonton|donghua|movie|genre|season|studio/i.test(h)||/subtitle/i.test(t)) links.push({h,t});});
      const uniq=[]; const seen=new Set(); for(const x of links){if(seen.has(x.h)) continue; seen.add(x.h); uniq.push(x);} console.log('links='+uniq.length); console.log(JSON.stringify(uniq.slice(0,15),null,2));
    }catch(e){console.log(url+' ERR '+e.message)}
  }
})();
