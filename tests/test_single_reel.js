const axios = require('axios');
const cheerio = require('cheerio');

async function testSingle() {
  const shortcode = 'DdtxuqmKr6n';
  const res = await axios.get(`https://www.instagram.com/p/${shortcode}/embed/captioned/`);
  const $ = cheerio.load(res.data);
  console.log('CAPTION:', $('div.Caption').text().trim().slice(0, 100));
}

testSingle();
