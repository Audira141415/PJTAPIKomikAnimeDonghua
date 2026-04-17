const fs = require('fs');

const envPath = process.argv[2];
if (!envPath) {
  console.error('Usage: node update-cron.js <path-to-env>');
  process.exit(1);
}

let content = fs.readFileSync(envPath, 'utf8');

const updates = {
  'ENDPOINT_MONITOR_CRON': '*/10 * * * *',
  'SCRAPER_EPISODE_CRON': '0 * * * *',
  'SCRAPER_ANIME_ALL_CRON': '0 2 * * *',
  'SCRAPER_COMIC_DAILY_CRON': '30 3 * * *',
  'SCRAPER_FULL_IMPORT_CRON': '0 5 * * *',
  'SCRAPER_TZ': 'Asia/Jakarta',
  'SCRAPER_RUN_ON_STARTUP': 'true'
};

Object.entries(updates).forEach(([key, value]) => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
});

fs.writeFileSync(envPath, content);
console.log('Cron schedules updated successfully in .env');
