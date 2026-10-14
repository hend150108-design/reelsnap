const axios = require('axios');
const cheerio = require('cheerio');

async function testFetchMainPage(shortcode) {
  const url = `https://www.instagram.com/reel/${shortcode}/`;
  console.log('Testing main page fetch for:', url);

  const userAgents = [
    // Standard Chrome
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Googlebot
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    // Facebook External Hit (Crucial for Meta!)
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    // WhatsApp crawler (Meta crawler!)
    'WhatsApp/2.21.12.21 A',
    // Twitterbot
    'Twitterbot/1.0'
  ];

  for (const ua of userAgents) {
    console.log('\n--- UA:', ua.slice(0, 30), '---');
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 8000,
        validateStatus: () => true
      });
      console.log('Status:', res.status, 'Length:', res.data?.length);
      const html = String(res.data);
      const $ = cheerio.load(html);

      // 1. og:video
      const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[name="og:video"]').attr('content');
      console.log('og:video:', ogVideo ? ogVideo.slice(0, 80) : 'none');

      // 2. ld+json
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const json = JSON.parse($(el).html());
          console.log(`ld+json[${i}]:`, JSON.stringify(json).slice(0, 150));
        } catch(e) {}
      });

      // 3. Regex video_url or .mp4
      const mp4s = html.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/g) || html.match(/https?:\\\/\\\/[^"'\s\\]+\.mp4[^"'\s\\]*/g);
      console.log('mp4s count:', mp4s ? mp4s.length : 0);
      if (mp4s) {
        console.log('sample mp4:', mp4s[0].slice(0, 100));
      }
    } catch (e) {
      console.log('Err:', e.message);
    }
  }
}

testFetchMainPage('DAmN7uXh7uN');
