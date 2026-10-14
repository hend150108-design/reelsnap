const axios = require('axios');
const cheerio = require('cheerio');

async function inspectEmbed(shortcode) {
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  console.log('Fetching embed for:', shortcode);
  try {
    const res = await axios.get(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
    });
    console.log('Status:', res.status, 'HTML length:', res.data.length);
    const $ = cheerio.load(res.data);
    
    console.log('video tags count:', $('video').length);
    $('video').each((i, el) => {
      console.log('video', i, $(el).attr('src'));
    });

    console.log('img tags count:', $('img').length);
    $('img').each((i, el) => {
      console.log('img', i, $(el).attr('src')?.slice(0, 80));
    });

    // Check script tags for any video URLs or JSON
    let foundPatterns = [];
    $('script').each((i, el) => {
      const text = $(el).html() || '';
      if (text.includes('video_url')) {
        foundPatterns.push(`script ${i} has video_url`);
        const matches = text.match(/"video_url":"([^"]+)"/g);
        console.log('matches:', matches);
      }
      if (text.includes('.mp4')) {
        foundPatterns.push(`script ${i} has .mp4`);
        const mp4s = text.match(/https?:\\\/\\\/[^"'\s\\]+\.mp4[^"'\s\\]*/g) || text.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g);
        console.log('mp4s:', mp4s);
      }
      if (text.includes('video_versions')) {
        foundPatterns.push(`script ${i} has video_versions`);
      }
      if (text.includes('shortcode_media')) {
        foundPatterns.push(`script ${i} has shortcode_media`);
      }
    });
    console.log('Found patterns:', foundPatterns);
  } catch (err) {
    console.error('Error fetching embed:', err.message);
  }
}

inspectEmbed('DAmN7uXh7uN');
